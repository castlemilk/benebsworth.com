import { describe, expect, it } from 'vitest'
import { parametersFor, type Point } from './definition'
import { geometryFor } from './model'
import { renderStudySvg } from './render'
import { createStudyRegistry, searchStudies } from './registry'
import {
  CONTOUR_EXACT_HIT_SHIFT, PATTERN_RIPPLES, RIPPLE_BOUNDS, RIPPLE_LEVELS, TWIN_SOURCE_RIPPLE_STUDY,
  contourSampledGrid, rippleField, sampleRippleGrid, type ContourGrid, type ContourResult,
} from './pattern-ripples'

const configurations = [24, 36, 48].flatMap(separation => [48, 60, 72].map(wavelength => ({ separation, wavelength })))
const keyOf = (a: string, b: string) => [a, b].sort().join('|')
const oneCell = (a: number, b: number, c: number, d: number): ContourGrid => ({ columns: 1, rows: 1, bounds: [0, 1, 0, 1], values: [a, b, d, c] })
const pairings = (result: ContourResult) => result.segments.map(segment => keyOf(...segment.keys)).sort()
const components = (result: ContourResult) => ({ open: result.paths.filter(path => !path.closed).length, closed: result.paths.filter(path => path.closed).length })
const totalLength = (result: ContourResult) => result.segments.reduce((sum, segment) => {
  const p = result.crossings.get(segment.keys[0])!.point, q = result.crossings.get(segment.keys[1])!.point
  return sum + Math.hypot(q[0] - p[0], q[1] - p[1])
}, 0)
const analyticError = (result: ContourResult, separation: number, wavelength: number, level: number) => {
  let maximum = 0
  for (const segment of result.segments) {
    const p = result.crossings.get(segment.keys[0])!.point, q = result.crossings.get(segment.keys[1])!.point
    for (const t of [0, .25, .5, .75, 1]) maximum = Math.max(maximum,
      Math.abs(rippleField(p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1]), separation, wavelength) - level))
  }
  return maximum
}
const pointSegmentDistance = (p: Point, a: Point, b: Point): number => {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}

describe('twin-source scalar field', () => {
  it('uses the declared distances, amplitudes, phase and equal axes', () => {
    for (const { separation: d, wavelength } of configurations) {
      const k = 2 * Math.PI / wavelength
      expect(rippleField(0, 0, d, wavelength)).toBeCloseTo(2 * Math.cos(k * d), 13)
      expect(rippleField(d, 0, d, wavelength)).toBeCloseTo(1 + Math.cos(k * 2 * d), 13)
      for (const [x, y] of [[13, 27], [-81, 49], [120, 88]]) {
        const independent = Math.cos(k * Math.sqrt((x + d) ** 2 + y ** 2)) + Math.cos(k * Math.sqrt((x - d) ** 2 + y ** 2))
        expect(rippleField(x, y, d, wavelength)).toBeCloseTo(independent, 13)
        expect(rippleField(-x, y, d, wavelength)).toBe(rippleField(x, y, d, wavelength))
        expect(rippleField(x, -y, d, wavelength)).toBe(rippleField(x, y, d, wavelength))
      }
    }
  })

  it('bounds the grid, validates controls and rejects malformed inputs', () => {
    const grid = sampleRippleGrid(36, 60)
    expect([grid.columns, grid.rows, grid.values.length]).toEqual([160, 120, 161 * 121])
    expect(grid.bounds).toEqual(RIPPLE_BOUNDS)
    expect(parametersFor(TWIN_SOURCE_RIPPLE_STUDY)).toEqual({ separation: 36, wavelength: 60 })
    for (const [d, wavelength] of [[25, 60], [36, 61], [NaN, 60]]) expect(() => sampleRippleGrid(d, wavelength)).toThrow()
    for (const [columns, rows] of [[0, 120], [160, 0], [321, 120], [160, 241], [1.5, 2]]) expect(() => sampleRippleGrid(36, 60, columns, rows)).toThrow()
    expect(() => rippleField(Infinity, 0, 36, 60)).toThrow()
    expect(() => rippleField(0, 0, -1, 60)).toThrow()
    expect(() => rippleField(0, 0, 36, 0)).toThrow()
    expect(() => contourSampledGrid({ ...grid, values: [0] }, .6)).toThrow()
    expect(() => contourSampledGrid({ ...oneCell(0, 1, 2, 1), bounds: [1, 0, 0, 1] }, .6)).toThrow()
    expect(() => contourSampledGrid(oneCell(0, NaN, 2, 1), .6)).toThrow()
    expect(() => contourSampledGrid(grid, NaN)).toThrow()
    expect(() => parametersFor(TWIN_SOURCE_RIPPLE_STUDY, { separation: 30 })).toThrow()
  })
})

describe('shared-edge marching squares', () => {
  it('interpolates a linear field exactly, sharing one crossing across adjacent cells', () => {
    const grid: ContourGrid = { columns: 2, rows: 2, bounds: [0, 2, 0, 2], values: [0, 1, 2, 1, 2, 3, 2, 3, 4] }
    const result = contourSampledGrid(grid, 1.5)
    expect(result.paths).toHaveLength(1)
    expect(result.paths[0].closed).toBe(false)
    expect(result.segments).toHaveLength(3)
    expect(result.crossings.size).toBe(4)
    for (const { point: [x, y], sampleIndices: [a, b], fraction } of result.crossings.values()) {
      expect(x + y).toBeCloseTo(1.5, 14)
      expect(grid.values[a] * (1 - fraction) + grid.values[b] * fraction).toBeCloseTo(1.5, 14)
    }
    expect(result.paths[0].keys).toContain('h:0:1')
    expect(result.segments.filter(segment => segment.keys.includes('h:0:1'))).toHaveLength(2)
  })

  it('uses the bilinear determinant instead of the center average in both alternating cases', () => {
    const bottomRight = ['h:0:0|v:1:0', 'h:0:1|v:0:0']
    const bottomLeft = ['h:0:0|v:0:0', 'h:0:1|v:1:0']
    expect(pairings(contourSampledGrid(oneCell(2, -1, 2, -1), 0))).toEqual(bottomRight)
    expect(pairings(contourSampledGrid(oneCell(-2, 1, -2, 1), 0))).toEqual(bottomRight)
    // Positive arithmetic center, negative saddle determinant: the common
    // center-average shortcut would incorrectly connect the positive corners.
    for (const sign of [1, -1]) {
      const result = contourSampledGrid(oneCell(5 * sign, -2 * sign, .2 * sign, -2 * sign), 0)
      expect(result.ambiguousCells).toBe(1)
      expect(pairings(result)).toEqual(bottomLeft)
    }
    // Exact saddle: explicit deterministic convention, not a topology claim.
    const saddle = contourSampledGrid(oneCell(1, -1, 1, -1), 0)
    expect(pairings(saddle)).toEqual(bottomRight)
    expect(saddle.exactSaddleTies).toBe(1)
  })

  it('handles exact samples consistently without vertex merging or zero-length segments', () => {
    const grid: ContourGrid = { columns: 2, rows: 2, bounds: [-1, 1, -1, 1], values: [-2, -1, 0, -1, 0, 1, 0, 1, 2] }
    const result = contourSampledGrid(grid, 0)
    expect(result.exactHits).toBe(3)
    expect(result.paths).toHaveLength(1)
    expect(result.paths[0].closed).toBe(false)
    expect(contourSampledGrid(grid, 0)).toEqual(result)
    for (const crossing of result.crossings.values()) {
      const [a, b] = crossing.sampleIndices
      const effective = (index: number) => grid.values[index] === 0 ? CONTOUR_EXACT_HIT_SHIFT : grid.values[index]
      expect(Math.abs(effective(a) * (1 - crossing.fraction) + effective(b) * crossing.fraction)).toBeLessThan(1e-15)
      expect(Math.abs(crossing.point[0] + crossing.point[1])).toBeLessThanOrEqual(CONTOUR_EXACT_HIT_SHIFT * 1.001)
    }
    for (const { keys: [a, b] } of result.segments) expect(result.crossings.get(a)!.point).not.toEqual(result.crossings.get(b)!.point)
    expect(contourSampledGrid(oneCell(0, 0, 0, 0), 0).paths).toEqual([])
  })

  it('does not join nearby crossings merely because their coordinates are close', () => {
    const result = contourSampledGrid(oneCell(1, -1e-10, 1, -1e-10), 0)
    expect(result.paths).toHaveLength(2)
    expect(result.crossings.size).toBe(4)
    for (const path of result.paths) {
      expect(path.closed).toBe(false)
      expect(path.points).toHaveLength(2)
      const length = Math.hypot(path.points[0][0] - path.points[1][0], path.points[0][1] - path.points[1][1])
      expect(length).toBeGreaterThan(0)
      expect(length).toBeLessThan(1e-8)
    }
  })
})

describe.each(configurations)('ripple contours d=$separation, λ=$wavelength', ({ separation, wavelength }) => {
  it('keeps a finite, nonduplicated graph; interpolates edges; and preserves both reflection symmetries', () => {
    const grid = sampleRippleGrid(separation, wavelength)
    let totalPoints = 0
    for (const level of RIPPLE_LEVELS) {
      const result = contourSampledGrid(grid, level), degrees = new Map<string, number>()
      const segmentIds = new Set<string>(), pointPairs = new Set<string>()
      const pathSegments: string[] = []
      totalPoints += result.crossings.size
      let maxInterpolationResidual = 0, maxReflectionError = 0, minSegmentLength = Infinity
      for (const { keys: [a, b] } of result.segments) {
        const p = result.crossings.get(a)!.point, q = result.crossings.get(b)!.point
        segmentIds.add(keyOf(a, b))
        pointPairs.add(keyOf(JSON.stringify(p), JSON.stringify(q)))
        minSegmentLength = Math.min(minSegmentLength, Math.hypot(q[0] - p[0], q[1] - p[1]))
        degrees.set(a, (degrees.get(a) ?? 0) + 1)
        degrees.set(b, (degrees.get(b) ?? 0) + 1)
        // The shared serializer rounds to four decimals. All supported controls
        // must retain nonzero segments after that rounding as well.
        expect(p.map(n => Math.round(n * 1e4))).not.toEqual(q.map(n => Math.round(n * 1e4)))
      }
      const mirroredKey = (key: string, axis: 'x' | 'y') => {
        const [orientation, xString, yString] = key.split(':'), x = Number(xString), y = Number(yString)
        return `${orientation}:${axis === 'x' ? grid.columns - x - Number(orientation === 'h') : x}:${axis === 'y' ? grid.rows - y - Number(orientation === 'v') : y}`
      }
      for (const crossing of result.crossings.values()) {
        const [a, b] = crossing.sampleIndices, [x, y] = crossing.point
        expect(degrees.get(crossing.key)).toBe(crossing.boundary ? 1 : 2)
        expect([x, y, crossing.fraction].every(Number.isFinite)).toBe(true)
        expect(crossing.fraction).toBeGreaterThan(0)
        expect(crossing.fraction).toBeLessThan(1)
        expect(Math.abs(x)).toBeLessThanOrEqual(120)
        expect(Math.abs(y)).toBeLessThanOrEqual(88)
        maxInterpolationResidual = Math.max(maxInterpolationResidual, Math.abs(grid.values[a] * (1 - crossing.fraction) + grid.values[b] * crossing.fraction - level))
        for (const axis of ['x', 'y'] as const) {
          const mirrored = result.crossings.get(mirroredKey(crossing.key, axis))
          expect(mirrored).toBeDefined()
          maxReflectionError = Math.max(maxReflectionError, Math.abs(mirrored!.point[0] - (axis === 'x' ? -x : x)), Math.abs(mirrored!.point[1] - (axis === 'y' ? -y : y)))
        }
      }
      for (const segment of result.segments) for (const axis of ['x', 'y'] as const) {
        expect(segmentIds.has(keyOf(mirroredKey(segment.keys[0], axis), mirroredKey(segment.keys[1], axis)))).toBe(true)
      }
      for (const path of result.paths) {
        expect(path.keys.length).toBeGreaterThan(path.closed ? 2 : 1)
        expect(new Set(path.keys).size).toBe(path.keys.length)
        if (path.closed) expect(path.keys.every(key => !result.crossings.get(key)!.boundary)).toBe(true)
        else for (const key of [path.keys[0], path.keys.at(-1)!]) {
          const crossing = result.crossings.get(key)!
          expect(crossing.boundary).toBe(true)
          expect(Math.abs(crossing.point[0]) === 120 || Math.abs(crossing.point[1]) === 88).toBe(true)
        }
        for (let i = 1; i < path.keys.length; i++) pathSegments.push(keyOf(path.keys[i - 1], path.keys[i]))
        if (path.closed) pathSegments.push(keyOf(path.keys.at(-1)!, path.keys[0]))
      }
      expect(result.exactHits).toBe(0)
      expect(result.exactSaddleTies).toBe(0)
      expect(segmentIds.size).toBe(result.segments.length)
      expect(pointPairs.size).toBe(result.segments.length)
      expect(new Set(pathSegments)).toEqual(segmentIds)
      expect(pathSegments.length).toBe(result.segments.length)
      expect(minSegmentLength).toBeGreaterThan(1e-5)
      expect(maxInterpolationResidual).toBeLessThan(1e-13)
      expect(maxReflectionError).toBeLessThan(1e-10)
      // Numerical tolerance measured at edge crossings and four subintervals
      // per straight chord. This does not certify continuous exact topology.
      expect(analyticError(result, separation, wavelength, level)).toBeLessThan(.012)
    }
    expect(totalPoints).toBeGreaterThan(1500)
    expect(totalPoints).toBeLessThan(10000)
  })
})

describe('refinement evidence, without an exact-topology claim', () => {
  it.each([{ separation: 36, wavelength: 60 }, { separation: 48, wavelength: 48 }])('compares default and finer sampling at d=$separation, λ=$wavelength', ({ separation, wavelength }) => {
    const coarseGrid = sampleRippleGrid(separation, wavelength), fineGrid = sampleRippleGrid(separation, wavelength, 320, 240)
    for (const level of RIPPLE_LEVELS) {
      const coarse = contourSampledGrid(coarseGrid, level), fine = contourSampledGrid(fineGrid, level)
      expect(components(coarse)).toEqual(components(fine))
      expect(fine.exactSaddleTies).toBe(0)
      expect(analyticError(fine, separation, wavelength, level)).toBeLessThan(.4 * analyticError(coarse, separation, wavelength, level))
      expect(Math.abs(totalLength(fine) - totalLength(coarse)) / totalLength(fine)).toBeLessThan(.002)
      const fineSegments = fine.segments.map(segment => segment.keys.map(key => fine.crossings.get(key)!.point))
      let maximumDistance = 0
      // Independent nearest-segment comparison of every coarse vertex. It is a
      // one-sided geometric convergence check, not an exhaustive topology proof.
      for (const crossing of coarse.crossings.values()) {
        let nearest = Infinity
        for (const [a, b] of fineSegments) nearest = Math.min(nearest, pointSegmentDistance(crossing.point, a, b))
        maximumDistance = Math.max(maximumDistance, nearest)
      }
      expect(maximumDistance).toBeLessThan(.13)
    }
  })
})

describe('ripple study integration contract', () => {
  it('exposes curated discovery, a defined accent level and stable bounded geometry', () => {
    const registry = createStudyRegistry(PATTERN_RIPPLES)
    expect(searchStudies(registry, 'ripple', { tag: 'pattern' })).toHaveLength(1)
    expect(searchStudies(registry, 'two source ripples')).toHaveLength(1)
    const geometry = geometryFor(TWIN_SOURCE_RIPPLE_STUDY)
    expect(geometryFor(TWIN_SOURCE_RIPPLE_STUDY)).toEqual(geometry)
    const contours = RIPPLE_LEVELS.map(level => contourSampledGrid(sampleRippleGrid(36, 60), level))
    expect(geometry.marks.filter(mark => mark.role === 'accent')).toHaveLength(contours[2].paths.length)
    expect(geometry.marks.every(mark => mark.kind === 'line' && mark.stroke === 'fine')).toBe(true)
    expect(geometry.marks.flatMap(mark => mark.kind === 'line' ? mark.points : []).length).toBeLessThan(10000)
    expect(geometry.marks.filter(mark => mark.kind === 'line' && !mark.closed)).toHaveLength(contours.reduce((sum, contour) => sum + components(contour).open, 0))
  })

  it('exports deterministic transparent SVG with honest approximation metadata and no appearance-dependent coordinates', () => {
    const svg = renderStudySvg(TWIN_SOURCE_RIPPLE_STUDY)
    expect(renderStudySvg(TWIN_SOURCE_RIPPLE_STUDY)).toBe(svg)
    expect(svg).toContain('sampled bilinear contours')
    expect(svg).toContain('not its exact topology')
    expect(svg).toContain('fill="none"')
    expect(svg).not.toMatch(/<rect|<image|<script|filter=|url\(/)
    const coordinates = (source: string) => [...source.matchAll(/points="([^"]+)"/g)].map(match => match[1])
    expect(coordinates(renderStudySvg(TWIN_SOURCE_RIPPLE_STUDY, {}, { theme: 'dark', weight: 4 }))).toEqual(coordinates(svg))
    expect(coordinates(renderStudySvg(TWIN_SOURCE_RIPPLE_STUDY, {}, { palette: 'monochrome', weight: 1.5, guides: false }))).toEqual(coordinates(svg))
  })
})
