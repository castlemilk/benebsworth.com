import {describe,it,expect,vi,afterEach} from 'vitest'
import {readFileSync} from 'node:fs'
import {webcrypto,createHash} from 'node:crypto'
import type {Asset} from '@/lib/gen/content'
import {connectPhotosToTrail,nearestReferenceMetres,readPhotoTrailReference,readRetainedPhotoTrail,OVERLAND_REFERENCE_SHA256,type PhotoTrailReference} from './photo-trail'
import {coordinatePixel,fitViewport,projectLines} from './route-geography'
import {reviewedSharedAssetIds} from './gallery-source-review'
const text=readFileSync(new URL('../../public/hiking/routes/overland-standard-osm.json',import.meta.url),'utf8')
const reference=readPhotoTrailReference(JSON.parse(text))
const photo=(id:string,lng:number,lat:number):Asset=>({id,url:`/photo-${id}.webp`,thumb:'',alt:id,caption:'',slot:'',takenAt:'',lat,lng,width:1000,height:800})
const simple:PhotoTrailReference={slug:'overland-track',lines:[[[146,-42],[146.1,-42]],[[146.2,-42],[146.3,-42]]],bounds:{west:145.9,south:-42.1,east:146.4,north:-41.9}}
afterEach(()=>vi.unstubAllGlobals())
describe('retained Overland photo reference',()=>{
 it('pins every retained route byte and preserves six unjoined sections and source gap',async()=>{
  vi.stubGlobal('crypto',webcrypto)
  expect(createHash('sha256').update(text).digest('hex')).toBe(OVERLAND_REFERENCE_SHA256)
  expect((await readRetainedPhotoTrail(text)).lines).toEqual(reference.lines)
  await expect(readRetainedPhotoTrail(text+' ')).rejects.toThrow('integrity mismatch')
  expect(reference.lines.map(l=>l.length)).toEqual([702,716,1067,527,1093,969])
  expect(reference.lines[0].at(-1)).not.toEqual(reference.lines[1][0])
  const viewport=fitViewport(reference.bounds,384,600)
  const paths=projectLines(reference.lines,viewport)
  expect(paths).toHaveLength(6)
  expect(paths[0].at(-1)).toEqual(coordinatePixel(reference.lines[0].at(-1)!,viewport))
 })
 it('rejects wrong source, missing sections and malformed coordinates',()=>{
  for(const mutate of [(x:{properties:Record<string,unknown>;geometry:{coordinates:number[][][]}})=>x.properties.source='other',(x:{properties:Record<string,unknown>;geometry:{coordinates:number[][][]}})=>x.geometry.coordinates.pop(),(x:{properties:Record<string,unknown>;geometry:{coordinates:number[][][]}})=>x.geometry.coordinates[0][0]=[NaN,-42]]){const x=JSON.parse(text);mutate(x);expect(()=>readPhotoTrailReference(x)).toThrow()}
 })
 it('measures each actual section, never the empty gap or Mercator projected metres',()=>{
  expect(nearestReferenceMetres([146.15,-42],simple.lines)).toBeGreaterThan(4000)
  expect(nearestReferenceMetres([146.05,-41.99],simple.lines)).toBeGreaterThan(1100)
  expect(nearestReferenceMetres([146.05,-41.99],simple.lines)).toBeLessThan(1120)
 })
 it('filters per-photo proximity before coarse grouping, even within the same cell',()=>{
  const photos=[photo('near',146.005,-41.983),photo('far',146.005,-41.981)]
  const result=connectPhotosToTrail('overland-track',photos,simple)
  expect(result.linkedCount).toBe(1);expect(result.areas[0].photos).toEqual([photos[0]])
  expect(result.unmatched.get(photos[1].url)).toBe('outside-reference')
  expect(result.areas[0].center).not.toEqual([photos[0].lng,photos[0].lat])
  expect(result.areas[0].id).toBe('trail-area-1')
 })
 it('retains missing, invalid, unsupported and remote metadata without positioning it',()=>{
  const photos=[photo('missing',0,0),photo('invalid',NaN,-42),photo('polar',146,89),photo('remote',7,46)]
  const result=connectPhotosToTrail('overland-track',photos,simple)
  expect(result.areas).toHaveLength(0);expect([...result.unmatched.values()]).toEqual(['no-location','no-location','unsupported-projection','outside-reference'])
  expect(photos[0].lat).toBe(0)
 })
 it('does not assign a different or known ambiguous hike gallery to a reference',()=>{
  const asset={...photo('shared',146.005,-42),url:`https://storage.googleapis.com/benebsworth-hiking/assets/${reviewedSharedAssetIds[0]}.webp`}
  for(const slug of ['dolomites-alta-via-1','haute-route'])expect(connectPhotosToTrail(slug,[asset],simple).unmatched.get(asset.url)).toBe('unverified-source')
 })
 it('keeps source coordinates and gallery identity unchanged and fits only the route',()=>{
  const asset=photo('near',146.005,-41.999),before=JSON.stringify(asset),bounds=JSON.stringify(simple.bounds)
  const result=connectPhotosToTrail('overland-track',[asset,photo('far',10,50)],simple)
  expect(result.areas[0].photos[0]).toBe(asset);expect(JSON.stringify(asset)).toBe(before);expect(JSON.stringify(simple.bounds)).toBe(bounds)
  const viewport=fitViewport(simple.bounds,384,600)
  const point=coordinatePixel(result.areas[0].center,viewport)
  expect(point.x).toBeGreaterThan(0);expect(point.x).toBeLessThan(384);expect(point.y).toBeGreaterThan(0);expect(point.y).toBeLessThan(600)
 })
})
