import { describe, it, expect } from 'vitest'
import { makeNoise2D } from './noise'

describe('makeNoise2D', () => {
  it('is deterministic per seed and in [-1,1]', () => {
    const a = makeNoise2D(42), b = makeNoise2D(42)
    for (let i = 0; i < 50; i++) {
      const x = i * 0.3, y = i * 0.7
      const v = a(x, y)
      expect(v).toBe(b(x, y))
      expect(v).toBeGreaterThanOrEqual(-1)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
  it('varies smoothly (small step → small change)', () => {
    const n = makeNoise2D(1)
    expect(Math.abs(n(0, 0) - n(0.01, 0))).toBeLessThan(0.2)
  })
})
