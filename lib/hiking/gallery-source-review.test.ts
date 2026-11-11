import {describe,expect,it} from 'vitest'
import type {Asset} from '@/lib/gen/content'
import {galleryAssignmentNotice,galleryForHike,reviewedSharedAssetIds} from './gallery-source-review'
const photo=(id:string,url:string):Asset=>({id,url,thumb:'',alt:'',caption:'',slot:'',takenAt:'',lat:0,lng:0,width:1200,height:800})
const shared=reviewedSharedAssetIds.map(id=>photo(id,`https://storage.googleapis.com/benebsworth-hiking/assets/${id}.webp`))
describe('reviewed cross-hike duplicate display guard',()=>{
  it('withholds all 51 reviewed Alta Via copies without mutating the source',()=>{
    const originals=shared.map(p=>Object.freeze({...p}));Object.freeze(originals)
    expect(shared).toHaveLength(51)
    expect(galleryForHike('dolomites-alta-via-1',originals)).toEqual([])
    expect(originals).toHaveLength(51)
    expect(galleryAssignmentNotice('dolomites-alta-via-1',originals)).toContain('copies are hidden')
  })
  it('preserves Haute Route, Overland and unrelated assignments exactly',()=>{
    for(const slug of ['haute-route','overland-track','other-hike']) {
      expect(galleryForHike(slug,shared)).toBe(shared)
      expect(galleryAssignmentNotice(slug,shared)).toBeNull()
    }
  })
  it('preserves unknown and corrected URLs in order without guessing from IDs, timestamps or coordinates',()=>{
    const first=photo(shared[0].id,'/corrected-first.webp'),last=photo('new','/corrected-last.webp')
    const mixed=[first,shared[0],last,shared[1]]
    expect(galleryForHike('dolomites-alta-via-1',mixed)).toEqual([first,last])
    expect(mixed).toHaveLength(4)
    expect(galleryAssignmentNotice('dolomites-alta-via-1',[first,last])).toBeNull()
  })
})
