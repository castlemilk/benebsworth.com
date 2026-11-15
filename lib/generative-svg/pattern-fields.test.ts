import { describe, expect, it } from 'vitest'
import { PATTERN_FIELDS, octagonalGridSegment, standingWaveLoop } from './pattern-fields'
import { geometryFor } from './model'

describe('octagonal grid geometry', () => {
  it('clips every endpoint to the declared convex aperture', () => {
    for (let angle = 12; angle <= 30; angle += 3) for (let spacing = 10; spacing <= 18; spacing += 2) {
      const marks = geometryFor(PATTERN_FIELDS[0], { angle, spacing }).marks
      expect(marks.filter(m => m.role === 'accent')).toHaveLength(2)
      for (const mark of marks.slice(0, -1)) {
        if (mark.kind !== 'line') throw new Error('Expected grid segment')
        expect(mark.points).toHaveLength(2)
        for (const [x, y] of mark.points) {
          const planes = Array.from({ length: 8 }, (_, i) => (x - 160) * Math.cos(i * Math.PI / 4) + (116 - y) * Math.sin(i * Math.PI / 4))
          expect(Math.max(...planes)).toBeCloseTo(90, 8)
          expect(planes.every(distance => distance < 90 + 1e-8)).toBe(true)
        }
      }
    }
  })
  it('rejects invalid clipping inputs and omits lines outside the octagon', () => {
    expect(octagonalGridSegment(0, 91)).toBeNull()
    expect(octagonalGridSegment(0, 90)).not.toBeNull()
    expect(() => octagonalGridSegment(NaN, 0)).toThrow()
    expect(() => octagonalGridSegment(0, 0, -1)).toThrow()
  })
  it('preserves the source line equation at both clipped endpoints', () => {
    for (let degrees = 0; degrees <= 180; degrees += 3) for (let offset = -100; offset <= 100; offset += 5) {
      const angle = degrees * Math.PI / 180
      const segment = octagonalGridSegment(angle, offset)
      if (segment) for (const [x, y] of segment) expect((x - 160) * Math.cos(angle) + (116 - y) * Math.sin(angle)).toBeCloseTo(offset, 9)
    }
  })
})

describe('analytic standing-wave contours', () => {
  it('keeps every sampled vertex on its signed level, inside its nodal cell', () => {
    for (let cells = 2; cells <= 4; cells++) {
      expect(geometryFor(PATTERN_FIELDS[1], { cells }).marks).toHaveLength(3 * cells * cells)
      for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) for (const level of [.18, .42, .7]) {
        const points = standingWaveLoop(i, j, cells, level)
        expect(points).toHaveLength(257)
        expect(points[0]).toEqual(points.at(-1))
        for (const [index, [x, y]] of points.entries()) {
          const u = (x - 64) / 192, v = (212 - y) / 192
          expect(Math.sin(cells * Math.PI * u) * Math.sin(cells * Math.PI * v)).toBeCloseTo((-1) ** (i + j) * level, 10)
          expect(u).toBeGreaterThan(i / cells)
          expect(u).toBeLessThan((i + 1) / cells)
          expect(v).toBeGreaterThan(j / cells)
          expect(v).toBeLessThan((j + 1) / cells)
          if (index) expect(Math.hypot(x - points[index - 1][0], y - points[index - 1][1])).toBeGreaterThan(1e-6)
        }
      }
    }
  })
  it('has nested widths and handles branch endpoints without NaNs', () => {
    const widths = [.18, .42, .7].map(c => { const xs = standingWaveLoop(0, 0, 4, c).map(p => p[0]); return Math.max(...xs) - Math.min(...xs) })
    expect(widths[0]).toBeGreaterThan(widths[1])
    expect(widths[1]).toBeGreaterThan(widths[2])
    for (const level of [0, 1, NaN]) expect(() => standingWaveLoop(0, 0, 3, level)).toThrow()
    expect(() => standingWaveLoop(3, 0, 3, .5)).toThrow()
    expect(() => standingWaveLoop(0, 0, 3, .5, 0)).toThrow()
  })
})
