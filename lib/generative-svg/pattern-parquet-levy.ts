import type { InkRole, Mark, Point, Study } from './definition'
import { hexagonalPatch } from './pattern-rolling-tiles'

const ROOT_THREE = Math.sqrt(3)
const HEX_VERTICES = [[2, 0], [1, 1], [-1, 1], [-2, 0], [-1, -1], [1, -1]] as const
const integerIn = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max
const line = (points: readonly Point[], role: InkRole = 'ink', closed = false, emphasis = false): Mark => ({ kind: 'line', points, role, closed, emphasis, stroke: 'fine' })

export interface RhombilleFace {
  tile: readonly [number, number]
  orientation: number
  nodes: readonly string[]
  points: readonly Point[]
  centroid: Point
  inset: readonly Point[]
  accent: boolean
}

export interface RhombilleEdge {
  nodes: readonly [string, string]
  points: readonly [Point, Point]
}

/** Exact integer lattice keys share both hexagon boundaries and internal spokes. */
export function rhombilleParquet(patch: number, inset: number): { side: number; faces: RhombilleFace[]; edges: RhombilleEdge[] } {
  // At 80%, the emphasized inset meets its boundary at maximum supported weight.
  if (![60, 70].includes(inset)) throw new Error('Invalid rhombille inset scale')
  const { side, tiles } = hexagonalPatch(patch), nodes = new Map<string, Point>()
  const node = (u: number, v: number): readonly [string, Point] => {
    const key = `${u},${v}`
    if (!nodes.has(key)) nodes.set(key, [160 + u * side / 2, 120 + v * ROOT_THREE * side / 2])
    return [key, nodes.get(key)!]
  }
  const faces: RhombilleFace[] = [], edges = new Map<string, RhombilleEdge>()
  for (const { axial: [q, r] } of tiles) {
    const center = node(3 * q, 2 * r + q)
    const vertices = HEX_VERTICES.map(([u, v]) => node(3 * q + u, 2 * r + q + v))
    for (let orientation = 0; orientation < 3; orientation++) {
      const start = 2 * orientation
      const corners = [center, vertices[start], vertices[(start + 1) % 6], vertices[(start + 2) % 6]]
      const points = corners.map(corner => corner[1])
      const centroid: Point = [points.reduce((sum, point) => sum + point[0], 0) / 4, points.reduce((sum, point) => sum + point[1], 0) / 4]
      faces.push({
        tile: [q, r], orientation, nodes: corners.map(corner => corner[0]), points, centroid,
        inset: points.map(([x, y]): Point => [centroid[0] + (x - centroid[0]) * inset / 100, centroid[1] + (y - centroid[1]) * inset / 100]),
        accent: q === 0 && r === 0 && orientation === 0,
      })
      for (let edge = 0; edge < 4; edge++) {
        const a = corners[edge], b = corners[(edge + 1) % 4]
        const key = [a[0], b[0]].sort().join(';')
        if (!edges.has(key)) edges.set(key, { nodes: [a[0], b[0]], points: [a[1], b[1]] })
      }
    }
  }
  return { side, faces, edges: [...edges.values()] }
}

/** Replace every directed segment by its two equal +45°/−45° children. */
export function levyLacePolygon(order: number): Point[] {
  if (!integerIn(order, 0, 8)) throw new Error('Invalid Lévy order')
  let points: Point[] = [[0, 0], [1, 0]]
  for (let iteration = 0; iteration < order; iteration++) {
    const next: Point[] = [points[0]]
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1], [bx, by] = points[i]
      next.push([(ax + bx - by + ay) / 2, (ay + by + bx - ax) / 2], points[i])
    }
    points = next
  }
  return points
}

/** One similarity transform, with screen-y inversion, retains all real contacts. */
export function levyLacePath(order: number): Point[] {
  const points = levyLacePolygon(order), xs = points.map(point => point[0]), ys = points.map(point => point[1])
  const left = Math.min(...xs), right = Math.max(...xs), bottom = Math.min(...ys), top = Math.max(...ys)
  const scale = Math.min(244 / (right - left || 1), 184 / (top - bottom || 1))
  const mx = (left + right) / 2, my = (bottom + top) / 2
  return points.map(([x, y]): Point => [160 + (x - mx) * scale, 120 - (y - my) * scale])
}

export const PATTERN_PARQUET_LEVY: readonly Study[] = [
  {
    id: 'rhombille-parquet', title: 'Rhombille parquet', category: 'Mathematics', provenance: 'math-derived',
    description: 'An exact rhombus tessellation carries a second, inset contour in every face. A single emphasized inset picks out one of its three orientations; the planar parquet merely suggests cubes.',
    basis: 'Flat-topped axial hexagons (q,r), max(|q|,|r|,|q+r|) ≤ h, h = 1 or 2, form a patch of 1+3h(h+1) hexagons. Side s = 192/(√3(2h+1)); centers are (160+3sq/2,120+√3s(2r+q)/2). Relative vertex lattice coordinates are (2,0),(1,1),(−1,1),(−2,0),(−1,−1),(1,−1), mapped by (u,v) ↦ (su/2,√3sv/2). Split each hexagon into [C,v₀,v₁,v₂], [C,v₂,v₃,v₄], [C,v₄,v₅,v₀]. These exact straight-sided rhombi have side s and angles 60°/120°; their areas sum to the hexagon area. Integer lattice endpoint keys deduplicate shared edges before rendering. Each face has a permanent closed inset obtained by scaling about its four-vertex centroid by t/100, t = 60 or 70. Only the first inset of the central hexagon is accented and emphasized. The skeleton and insets use unfilled fine strokes. A finite planar tiling, not a three-dimensional cube model, physical weave or perspective projection.',
    tags: ['pattern', 'tiling', 'lattice', 'geometry'], aliases: ['rhombille tiling', 'rhombus parquet', 'lozenge tessellation'],
    parameters: [{ key: 'patch', label: 'Hexagon patch radius', min: 1, max: 2, step: 1, initial: 2 }, { key: 'inset', label: 'Inset rhombus scale (%)', min: 60, max: 70, step: 10, initial: 70 }],
    model: p => {
      const { faces, edges } = rhombilleParquet(p.patch, p.inset)
      return { marks: [...edges.map(edge => line(edge.points)), ...faces.map(face => line(face.inset, face.accent ? 'accent' : 'ink', true, face.accent))] }
    },
  },
  {
    id: 'levy-lace', title: 'Lévy lace', category: 'Mathematics', provenance: 'math-derived',
    description: 'One recursive polygon curls into a branching, lace-like arch. Its final recursive quarter is accented, while genuine repeated contacts and overlaps remain part of the construction.',
    basis: 'Finite Lévy C polygon with P₀ = [(0,0),(1,0)]. At each iteration replace every directed segment A→B by A→M→B, M = (A+B)/2 + Rot₉₀(B−A)/2, where Rot₉₀(x,y) = (−y,x). Order n has exactly 2ⁿ segments of length 2^(−n/2), with unchanged endpoints (0,0) and (1,0). Supported display orders are 5…8. A single uniform scale min(244/(xmax−xmin),184/(ymax−ymin)) centers the polygon at (160,120), inverting screen y. The final 2ⁿ/4 segments of that same path are overlaid in accent with emphasis; radius-2.4 endpoint circles identify the two original ends. No smoothing or jitter is applied. This finite polygon may have genuine repeated vertices and overlapping segments; it is not claimed to be simple, a smooth lace contour, a physical fold simulation or the infinite fractal.',
    tags: ['pattern', 'recursion', 'fractals', 'curves'], aliases: ['Lévy C curve', 'Levy C fractal', 'recursive C lace'],
    parameters: [{ key: 'order', label: 'Recursion order', min: 5, max: 8, step: 1, initial: 8 }],
    model: p => {
      const points = levyLacePath(p.order), quarter = (points.length - 1) / 4
      return { marks: [line(points), line(points.slice(3 * quarter), 'accent', false, true), ...[points[0], points.at(-1)!].map((center): Mark => ({ kind: 'circle', center, radius: 2.4, role: 'ink', stroke: 'fine' }))] }
    },
  },
]
