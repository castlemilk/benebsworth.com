import { describe, expect, it } from 'vitest'
import {galleryAssignmentNotice, reviewedSharedAssetIds} from './gallery-source-review'
import type { Asset } from '@/lib/gen/content'
import { discoverPhotos, hasRecordedLocation, photoAreas, photoDistanceMetres, photoPlaces, readPublishedGallery, PHOTO_AREA_RADIUS_METRES } from './photo-discovery'
const photo = (id:string, slot='',lat=0,lng=0):Asset => ({id,url:`/photos/${id}.webp`,thumb:'',alt:id,caption:'',slot,lat,lng,width:1200,height:800,takenAt:''})
describe('published photo discovery', () => {
  it('flags only known ambiguous assignments and clears for corrected source URLs', () => {
    const shared={...photo('known'),url:`https://storage.googleapis.com/benebsworth-hiking/assets/${reviewedSharedAssetIds[0]}.webp`}
    expect(galleryAssignmentNotice('dolomites-alta-via-1',[shared])).toContain('assignment to Alta Via 1 is unverified')
    expect(galleryAssignmentNotice('haute-route',[shared])).toBeNull()
    expect(galleryAssignmentNotice('dolomites-alta-via-1',[{...shared,url:'/corrected-photo.webp'}])).toBeNull()
    expect(galleryAssignmentNotice('dolomites-alta-via-1',[])).toBeNull()
  })
  it('orders existing place labels by trail order, preserves other labels and counts without guessing', () => {
    expect(photoPlaces([photo('1','B'),photo('2','A'),photo('3','B'),photo('4','Elsewhere'),photo('5',' ')],{waypoints:[{name:'A'},{name:'B'}] as never})).toEqual([{name:'A',count:1},{name:'B',count:2},{name:'Elsewhere',count:1}])
  })
  it('preserves original order and returns honest zero matches for absent places', () => {
    const gallery=[photo('1','A',46,12),photo('2','B'),photo('3','A'),photo('4')]
    expect(discoverPhotos(gallery,'A','all').map(p=>p.id)).toEqual(['1','3'])
    expect(discoverPhotos(gallery,'Missing','all')).toEqual([])
    expect(discoverPhotos(gallery,null,'all',true).map(p=>p.id)).toEqual(['4'])
    expect(discoverPhotos(gallery,'A','recorded').map(p=>p.id)).toEqual(['1'])
    expect(discoverPhotos(gallery,'A','unrecorded').map(p=>p.id)).toEqual(['3'])
  })
  it('validates coordinate pairs without rejecting the equator or prime meridian', () => {
    for (const [lat,lng] of [[0,12],[46,0],[-90,-180],[90,180]]) expect(hasRecordedLocation({lat,lng})).toBe(true)
    for (const [lat,lng] of [[0,0],[NaN,12],[45,Infinity],[91,12],[45,181],[undefined,12],['46',12]]) expect(hasRecordedLocation({lat,lng} as never)).toBe(false)
  })
  it('reads only assigned gallery photos and keeps missing or invalid coordinate pairs unrecorded', () => {
    const read=readPublishedGallery({hero:photo('private'),library:[photo('unpublished')],gallery:[photo('1'),{...photo('2'),lat:undefined,lng:12},{...photo('3'),lat:Infinity,lng:1}]})
    expect(read.map(p=>p.id)).toEqual(['1','2','3'])
    expect(read.every(p=>!hasRecordedLocation(p))).toBe(true)
    expect(readPublishedGallery({gallery:[]})).toEqual([])
  })
  it('rejects broken manifests and unsafe or duplicate image URLs instead of reporting an empty gallery', () => {
    for (const input of [null,{}, {gallery:{}},{gallery:[null]},{gallery:[{url:'javascript:alert(1)'}]},{gallery:[photo('1'),photo('1')]}]) expect(()=>readPublishedGallery(input)).toThrow()
  })
  it('forms deterministic anchored groups, not an expanding nearest-neighbour chain', () => {
    const gallery=[photo('a','',0,1),photo('b','',0,1.013),photo('c','',0,1.026),photo('no-gps')]
    const groups=photoAreas(gallery)
    expect(groups.map(g=>g.photos.map(p=>p.id))).toEqual([['a','b'],['c']])
    expect(photoAreas(gallery)).toEqual(groups)
    for(const group of groups) for(const member of group.photos) expect(photoDistanceMetres(group.cover,member)).toBeLessThanOrEqual(PHOTO_AREA_RADIUS_METRES)
    expect(gallery.map(p=>p.id)).toEqual(['a','b','c','no-gps'])
  })
  it('chooses the nearest eligible anchor when two areas overlap', () => {
    const groups=photoAreas([photo('west','',1,1),photo('east','',1,1.03),photo('middle','',1,1.017)])
    expect(groups.map(g=>g.photos.map(p=>p.id))).toEqual([['west'],['east','middle']])
  })
  it('uses ground distance across the dateline and excludes malformed positions', () => {
    const groups=photoAreas([photo('a','',0,179.999),photo('b','',0,-179.999),photo('bad','',NaN,12)])
    expect(groups).toHaveLength(1)
    expect(groups[0].photos).toHaveLength(2)
    expect(photoDistanceMetres(groups[0].photos[0],groups[0].photos[1])).toBeCloseTo(222.39,1)
  })
  it('keeps the radius boundary bounded and singleton groups discoverable', () => {
    const delta=PHOTO_AREA_RADIUS_METRES/6371008.8*180/Math.PI
    const groups=photoAreas([photo('a','',1,0),photo('inside','',1+delta*.999,0),photo('outside','',1+delta*1.001,0)])
    expect(groups.map(g=>g.photos.map(p=>p.id))).toEqual([['a','inside'],['outside']])
  })
})
