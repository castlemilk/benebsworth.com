import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {groupPhotoMarkers,markerPosition,PHOTO_MARKER_SIZE} from './photo-markers'
import {fitViewport,coordinatePixel} from './route-geography'
import type {TrailPhotoArea} from './photo-trail'
import {OVERLAND_LANDMARKS} from './overland-landmarks'
const areas:TrailPhotoArea[]=Array.from({length:27},(_,i)=>({id:`area-${i}`,number:i+1,center:[146+(i%3)*.01,-41.7-Math.floor(i/3)*.04],bounds:{west:146,east:146.02,south:-42,north:-41.98},photos:[]}))
describe('coarse photo stacks',()=>{
 it.each([240,360,640,1000])('partitions every area once, using existing anchors and non-overlapping in-view targets at %i',width=>{
  const viewport=fitViewport({west:145.9,east:146.2,south:-42.1,north:-41.6},width,600,32),groups=groupPhotoMarkers(areas,viewport)
  expect(groups).toEqual(groupPhotoMarkers(areas,viewport))
  expect(groups.flatMap(group=>group.areas).sort((a,b)=>a.number-b.number)).toEqual(areas)
  for(const group of groups){expect(group.areas).toContain(group.anchor);const p=markerPosition(group,viewport);expect(p.anchor).toEqual(coordinatePixel(group.anchor.center,viewport));expect(p.x).toBeGreaterThanOrEqual(36);expect(p.x).toBeLessThanOrEqual(width-36);expect(p.y).toBeGreaterThanOrEqual(36);expect(p.y).toBeLessThanOrEqual(564)}
  for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){const a=markerPosition(groups[i],viewport),b=markerPosition(groups[j],viewport);expect(Math.abs(a.x-b.x)>=PHOTO_MARKER_SIZE+8||Math.abs(a.y-b.y)>=PHOTO_MARKER_SIZE+8).toBe(true)}
 })
 it('has a truly empty state',()=>expect(groupPhotoMarkers([],fitViewport({west:146,east:147,south:-42,north:-41},300,500))).toEqual([]))
})
describe('verified Overland landmark',()=>{
 it('retains exactly the named saddle and coordinate from the pinned licensed node, without an altitude claim',()=>{
  expect(OVERLAND_LANDMARKS).toHaveLength(1)
  const landmark=OVERLAND_LANDMARKS[0],source=readFileSync(landmark.sourceFile)
  expect(createHash('sha256').update(source).digest('hex')).toBe(landmark.sourceSha256)
  const node=source.toString().match(new RegExp(`<node[^>]*id="${landmark.id}"[\\s\\S]*?<\\/node>`))![0]
  expect(node).toContain(`version="${landmark.version}"`);expect(node).toContain(`timestamp="${landmark.editedAt}"`)
  expect(Number(node.match(/lon="([^"]+)"/)![1])).toBe(landmark.coordinate[0]);expect(Number(node.match(/lat="([^"]+)"/)![1])).toBe(landmark.coordinate[1])
  expect(node).toContain('<tag k="natural" v="saddle"');expect(node).toContain('<tag k="name" v="Pelion Gap"')
  expect(landmark).not.toHaveProperty('elevation');expect(landmark.license).toBe('ODbL-1.0')
 })
})
