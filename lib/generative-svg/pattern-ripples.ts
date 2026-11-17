import type { Point, Study } from './definition'

export const RIPPLE_LEVELS = [-1.2, -.6, .6, 1.2] as const
export const RIPPLE_BOUNDS = [-120, 120, -88, 88] as const
// A consistent upward perturbation only at exact sample/level equality. It avoids
// merging distinct grid edges at a vertex; it is not a proximity-stitching radius.
export const CONTOUR_EXACT_HIT_SHIFT = 2 ** -30

export interface ContourGrid {
  columns: number
  rows: number
  bounds: readonly [number, number, number, number]
  /** Row-major samples, starting at the lower-left corner in mathematical y. */
  values: readonly number[]
}
export interface ContourCrossing {
  key: string
  point: Point
  sampleIndices: readonly [number, number]
  fraction: number
  boundary: boolean
}
export interface ContourSegment { keys: readonly [string, string]; cell: readonly [number, number] }
export interface ContourPath { keys: readonly string[]; points: readonly Point[]; closed: boolean }
export interface ContourResult {
  crossings: ReadonlyMap<string, ContourCrossing>
  segments: readonly ContourSegment[]
  paths: readonly ContourPath[]
  ambiguousCells: number
  exactSaddleTies: number
  exactHits: number
}

/** Equal-amplitude, in-phase radial cosines, without spreading or time evolution. */
export function rippleField(x: number, y: number, halfSeparation: number, wavelength: number): number {
  if (![x, y, halfSeparation, wavelength].every(Number.isFinite) || halfSeparation < 0 || wavelength <= 0) throw new Error('Invalid ripple inputs')
  const k = 2 * Math.PI / wavelength
  return Math.cos(k * Math.hypot(x + halfSeparation, y)) + Math.cos(k * Math.hypot(x - halfSeparation, y))
}

const samplePoint = (grid: ContourGrid, x: number, y: number): Point => {
  const [left, right, bottom, top] = grid.bounds
  // Centered arithmetic preserves reflection symmetry of the sampling lattice.
  return [(left + right) / 2 + (2 * x - grid.columns) * (right - left) / (2 * grid.columns),
    (bottom + top) / 2 + (2 * y - grid.rows) * (top - bottom) / (2 * grid.rows)]
}
const compareKeys = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
const segmentKey = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`

function validateGrid(grid: ContourGrid): void {
  const { columns, rows, bounds, values } = grid
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1 || columns > 320 || rows > 240
    || bounds.length !== 4 || !bounds.every(Number.isFinite) || bounds[0] >= bounds[1] || bounds[2] >= bounds[3]
    || values.length !== (columns + 1) * (rows + 1) || !values.every(Number.isFinite)) throw new Error('Invalid contour grid')
}

export function sampleRippleGrid(halfSeparation: number, wavelength: number, columns = 160, rows = 120): ContourGrid {
  if (![24, 36, 48].includes(halfSeparation) || ![48, 60, 72].includes(wavelength)
    || !Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1 || columns > 320 || rows > 240) throw new Error('Invalid ripple grid inputs')
  const grid: ContourGrid = { columns, rows, bounds: RIPPLE_BOUNDS, values: [] }
  grid.values = Array.from({ length: (columns + 1) * (rows + 1) }, (_, index) => {
    const [x, y] = samplePoint(grid, index % (columns + 1), Math.floor(index / (columns + 1)))
    return rippleField(x, y, halfSeparation, wavelength)
  })
  return grid
}

/**
 * Marching squares with one canonical key per shared lattice edge. The
 * determinant q00*q11 - q10*q01 is the bilinear asymptotic decider, not a
 * center-value test. At an exact saddle determinant of zero the bottom/right
 * pairing wins deterministically; this convention is not a topology assertion.
 * Straight cell chords approximate the bilinear arcs. No proximity joins occur.
 */
export function contourSampledGrid(grid: ContourGrid, level: number): ContourResult {
  validateGrid(grid)
  if (!Number.isFinite(level)) throw new Error('Invalid contour level')
  const { columns, rows } = grid, stride = columns + 1
  let exactHits = 0, ambiguousCells = 0, exactSaddleTies = 0
  const signed = grid.values.map(value => {
    const q = value - level
    if (!Number.isFinite(q)) throw new Error('Non-finite signed sample')
    if (q !== 0) return q
    exactHits++
    return CONTOUR_EXACT_HIT_SHIFT
  })
  const crossings = new Map<string, ContourCrossing>()
  const segments: ContourSegment[] = []
  const segmentKeys = new Set<string>()
  const adjacency = new Map<string, string[]>()

  const crossing = (axis: 'h' | 'v', x: number, y: number): string | null => {
    const a = y * stride + x, b = a + (axis === 'h' ? 1 : stride)
    if ((signed[a] > 0) === (signed[b] > 0)) return null
    const key = `${axis}:${x}:${y}`
    if (crossings.has(key)) return key
    // Scale before division so opposite large finite values cannot overflow.
    const scale = Math.max(Math.abs(signed[a]), Math.abs(signed[b]))
    const qa = signed[a] / scale, qb = signed[b] / scale, fraction = qa / (qa - qb)
    const start = samplePoint(grid, x, y), end = samplePoint(grid, x + Number(axis === 'h'), y + Number(axis === 'v'))
    const point: Point = [start[0] + fraction * (end[0] - start[0]), start[1] + fraction * (end[1] - start[1])]
    crossings.set(key, { key, point, fraction, sampleIndices: [a, b], boundary: axis === 'h' ? y === 0 || y === rows : x === 0 || x === columns })
    return key
  }
  const addSegment = (a: string, b: string, x: number, y: number) => {
    const key = segmentKey(a, b), p = crossings.get(a)!.point, q = crossings.get(b)!.point
    if (a === b || (p[0] === q[0] && p[1] === q[1]) || segmentKeys.has(key)) throw new Error('Degenerate contour segment')
    segmentKeys.add(key)
    segments.push({ keys: [a, b], cell: [x, y] })
    for (const [from, to] of [[a, b], [b, a]]) {
      const neighbors = adjacency.get(from) ?? []
      neighbors.push(to)
      adjacency.set(from, neighbors)
    }
  }
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    // Bottom, right, top, left, each with the globally canonical orientation.
    const edges = [crossing('h', x, y), crossing('v', x + 1, y), crossing('h', x, y + 1), crossing('v', x, y)]
    const hits = edges.filter((key): key is string => key !== null)
    if (hits.length === 2) addSegment(hits[0], hits[1], x, y)
    else if (hits.length === 4) {
      ambiguousCells++
      const offsets = [y * stride + x, y * stride + x + 1, (y + 1) * stride + x + 1, (y + 1) * stride + x]
      const scale = Math.max(...offsets.map(i => Math.abs(signed[i])))
      const [a, b, c, d] = offsets.map(i => signed[i] / scale)
      const determinant = a * c - b * d
      if (determinant === 0) exactSaddleTies++
      const pairs = determinant >= 0 ? [[0, 1], [2, 3]] : [[0, 3], [1, 2]]
      for (const [i, j] of pairs) addSegment(hits[i], hits[j], x, y)
    } else if (hits.length !== 0) throw new Error('Invalid contour crossing parity')
  }

  for (const [key, neighbors] of adjacency) {
    neighbors.sort(compareKeys)
    if (neighbors.length !== (crossings.get(key)!.boundary ? 1 : 2)) throw new Error('Invalid contour graph degree')
  }
  const unused = new Set(segmentKeys), paths: ContourPath[] = []
  const orderedKeys = [...adjacency.keys()].sort(compareKeys)
  // Trace all boundary-to-boundary paths before loops; both groups use key order.
  const starts = [...orderedKeys.filter(key => adjacency.get(key)!.length === 1), ...orderedKeys.filter(key => adjacency.get(key)!.length === 2)]
  for (const start of starts) {
    if (!adjacency.get(start)!.some(next => unused.has(segmentKey(start, next)))) continue
    const keys = [start]
    let current = start, closed = false
    while (true) {
      const next = adjacency.get(current)!.find(candidate => unused.has(segmentKey(current, candidate)))
      if (next === undefined) break
      unused.delete(segmentKey(current, next))
      if (next === start) { closed = true; break }
      keys.push(next)
      current = next
    }
    if (keys.length < 2 || (!closed && (!crossings.get(keys[0])!.boundary || !crossings.get(keys.at(-1)!)!.boundary))) throw new Error('Invalid contour component')
    paths.push({ keys, points: keys.map(key => crossings.get(key)!.point), closed })
  }
  if (unused.size !== 0) throw new Error('Unstitched contour segments')
  return { crossings, segments, paths, ambiguousCells, exactSaddleTies, exactHits }
}

export const TWIN_SOURCE_RIPPLE_STUDY: Study = {
  id: 'twin-source-ripple-interference', title: 'Twin-source ripple interference', category: 'Mathematics', provenance: 'math-derived',
  description: 'Two radial cosine fields form interlocking contour ribbons. Tune the source spacing and wavelength to change the symmetric ripple lace.',
  basis: 'F(x,y) = cos(2πr₁/λ) + cos(2πr₂/λ), with r₁,₂ the distances to (−d,0) and (d,0). Domain [−120,120] × [−88,88], equal display scales, center (160,120); d and λ are drawing units. Levels −1.2, −0.6, +0.6 and +1.2, with +0.6 accented. Marching squares uses 160 × 120 rectangular cells, linearly interpolated edge crossings, canonical shared-edge keys and the bilinear asymptotic decider. Straight chords approximate the sampled bilinear contours, which approximate the analytic field, not its exact topology. Exact-level samples shift upward by 2⁻³⁰ field units; a zero saddle determinant uses the bottom/right pairing. Boundary contours remain open. Equal-amplitude, in-phase scalar fields only: no spreading, intensity, propagation or physical boundary-condition simulation.',
  tags: ['pattern', 'contour-fields', 'interference', 'trigonometry', 'symmetry'],
  aliases: ['two source ripples', 'radial wave contours', 'ripple contour lace'],
  parameters: [
    { key: 'separation', label: 'Source half-separation', min: 24, max: 48, step: 12, initial: 36 },
    { key: 'wavelength', label: 'Wavelength', min: 48, max: 72, step: 12, initial: 60 },
  ],
  model: p => {
    const grid = sampleRippleGrid(p.separation, p.wavelength)
    return { marks: RIPPLE_LEVELS.flatMap(level => contourSampledGrid(grid, level).paths.map(path => ({
      kind: 'line' as const, role: level === .6 ? 'accent' as const : 'ink' as const, stroke: 'fine' as const, closed: path.closed,
      points: path.points.map(([x, y]) => [160 + x, 120 - y] as const),
    }))) }
  },
}

export const PATTERN_RIPPLES: readonly Study[] = [TWIN_SOURCE_RIPPLE_STUDY]
