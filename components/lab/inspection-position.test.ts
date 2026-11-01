import { describe, it, expect } from 'vitest'
import { inspectionPosition } from './inspection-position'
import { waveSuperposition, defaults } from './effects/wave-superposition'
describe('Inspection placement and exact samples',()=>{
  it('flips near the right/bottom edges and clamps on narrow charts',()=>{
    for(const [w,h] of [[640,400],[320,210],[160,120]]) for(const [x,y] of [[0,0],[w,h],[w/2,h/2]]) {
      const p=inspectionPosition(x,y,w,h)
      expect(p.left).toBeGreaterThanOrEqual(8)
      expect(p.top).toBeGreaterThanOrEqual(8)
      expect(p.left+p.width).toBeLessThanOrEqual(w-8)
      expect(p.top+p.maxHeight).toBeLessThanOrEqual(h-8)
    }
  })
  it('samples the same rendered wave formula, with honest relative amplitude',()=>{
    const rows=waveSuperposition.inspect!(0,0,defaults)
    expect(rows.map(x=>x.value)).toEqual(['0.0%','0.000','0.000','0.000'])
    const quarter=waveSuperposition.inspect!(0,Math.PI/8*1000,defaults)
    expect(quarter.find(x=>x.label==='Wave 1')?.value).toBe('-0.600')
    expect(quarter.find(x=>x.label==='Sum')?.value).toBe('-1.200')
  })
})
