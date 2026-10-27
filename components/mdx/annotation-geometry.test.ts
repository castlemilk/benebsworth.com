import {describe,it,expect} from 'vitest'
import {connectorPath,underlinePaths,penCurve} from './annotation-geometry'
describe('annotation placement geometry',()=>{
 const target={x:0,y:100,width:400,height:250}
 it('connects an above note to an explicit feature instead of empty margin',()=>{const p=connectorPath(target,{x:240,y:0,width:130,height:60},{x:300,y:160,width:6,height:6});expect(p).toContain('303 163');expect(p).not.toMatch(/NaN|Infinity/);expect(p).toBe(connectorPath(target,{x:240,y:0,width:130,height:60},{x:300,y:160,width:6,height:6}))})
 it('routes right, left and below notes from their nearest edges',()=>{for(const note of [{x:450,y:130,width:120,height:80},{x:-150,y:130,width:120,height:80},{x:40,y:400,width:200,height:60}]){expect(connectorPath(target,note)).toMatch(/^M.+ C.+ M.+ [LQ]/);}})
 it('suppresses overlapping, unmeasurable or non-finite placements',()=>{expect(connectorPath(target,{x:10,y:120,width:100,height:50})).toBeNull();expect(connectorPath({...target,width:0},{x:500,y:0,width:100,height:50})).toBeNull();expect(connectorPath(target,{x:NaN,y:0,width:100,height:50})).toBeNull()})
 it('underlines each wrapped line at its measured width, not its SVG aspect ratio',()=>{const paths=underlinePaths([{x:0,y:0,width:100,height:24},{x:100,y:0,width:80,height:24},{x:0,y:30,width:95,height:24}]);expect(paths).toHaveLength(2);expect(paths[0]).toContain('180 26');expect(paths[1]).toContain('95 56');})
 it('sizes a grouping bracket to its target rather than its note',()=>{const p=connectorPath(target,{x:450,y:130,width:120,height:80},undefined,'bracket');expect(p).toContain('407 100');expect(p).toContain('407 350')})
 it('bows aligned endpoints instead of degenerating into a straight line',()=>{
  const p=connectorPath(target,{x:240,y:0,width:130,height:60},{x:295.5,y:160,width:6,height:6})!
  const values=p.split(' M')[0].match(/-?\d+(?:\.\d+)?/g)!.map(Number)
  const [sx,sy,cx,cy]=values
  const [ex,ey]=values.slice(-2)
  expect(Math.abs((cx-sx)*(ey-sy)-(cy-sy)*(ex-sx))).toBeGreaterThan(100)
  expect(p).toContain('298.5 163')
 })
 it('keeps short curves finite and rejects coincident endpoints',()=>{
  expect(connectorPath(target,{x:240,y:0,width:130,height:60},{x:295.5,y:64,width:6,height:6})).toBeNull()
  const p=connectorPath(target,{x:240,y:0,width:130,height:60},{x:295.5,y:70,width:6,height:6})
  expect(p).not.toMatch(/NaN|Infinity/)
 })
 it('uses a deterministic multi-segment pen gesture with exact endpoints',()=>{
  const args=[{x:0,y:0},{x:30,y:0},{x:70,y:0},{x:100,y:0}] as const
  const d=penCurve(...args)
  expect(d).toBe(penCurve(...args))
  expect(d.startsWith('M0 0')).toBe(true)
  expect(d.endsWith('100 0')).toBe(true)
  expect(d.match(/ C/g)).toHaveLength(7)
  const values=d.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
  expect(values.filter((_,i)=>i%2===1).some(y=>Math.abs(y)>.2)).toBe(true)
 })
 it('ignores empty text fragments',()=>{expect(underlinePaths([{x:0,y:0,width:0,height:20}])).toEqual([])})
})
