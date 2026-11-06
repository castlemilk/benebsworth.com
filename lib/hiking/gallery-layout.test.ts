import {describe,it,expect} from 'vitest'
import type {Asset} from '@/lib/gen/content'
import {justifyGalleryRows} from './gallery-layout'
const photo=(id:number,ratio:number)=>({id:String(id),width:ratio*100,height:100} as Asset)
describe('photographic contact sheet',()=>{
 it.each([280,347,640,960])('preserves every image and aspect ratio at %ipx, without narrow slivers',width=>{
  const photos=[.5,1.33,.65,1.5,.6,1.33,.75,1.33].map((ratio,i)=>photo(i,ratio))
  const rows=justifyGalleryRows(photos,width,150,12)
  expect(rows.flatMap(row=>row.items.map(item=>item.asset))).toEqual(photos)
  for(const row of rows){expect(row.items.reduce((n,item)=>n+item.width,0)+12*(row.items.length-1)).toBeLessThanOrEqual(width+.01)
   for(const item of row.items){expect(item.width).toBeGreaterThanOrEqual(112-.01);expect(item.width/row.height).toBeCloseTo(item.asset.width/item.asset.height)}
  }
 })
 it('does not stretch a lone normal photograph to fill a desktop row',()=>{expect(justifyGalleryRows([photo(1,1.5)],960,230,12)[0].height).toBe(230)})
 it('handles no available width and a tiny container without overflow',()=>{expect(justifyGalleryRows([photo(1,.5)],0,150,12)).toEqual([]);expect(justifyGalleryRows([photo(1,.5)],80,150,12)[0].items[0].width).toBe(80)})
})
