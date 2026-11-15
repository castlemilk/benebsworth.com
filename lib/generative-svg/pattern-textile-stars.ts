import type { InkRole, Mark, Point, Study } from './definition'

const CENTER: Point = [160, 120]
const HEXAGON_APOTHEM = 88
const FRAME_APOTHEM = 92
const THREAD_OFFSET = 2.4
const TAU = Math.PI * 2
const at = (x: number, y: number): Point => [CENTER[0] + x, CENTER[1] - y]
const line = (points: readonly Point[], role: InkRole = 'ink', closed = false): Mark => ({ kind: 'line', points, role, stroke: 'fine', closed, ...(role === 'accent' ? { emphasis: true } : {}) })

/** Intersect n·p = offset with all six half-planes of a regular hexagon. */
export function hexagonalBrocadeSegment(angle: number, offset: number, apothem = HEXAGON_APOTHEM): readonly [Point, Point] | null {
  if (![angle, offset, apothem].every(Number.isFinite) || apothem <= 0) throw new Error('Invalid hexagonal clipping inputs')
  const nx = Math.cos(angle), ny = Math.sin(angle), vx = -ny, vy = nx
  const px = offset * nx, py = offset * ny
  let lo = -Infinity, hi = Infinity
  for (let side = 0; side < 6; side++) {
    const a = side * Math.PI / 3, sx = Math.cos(a), sy = Math.sin(a)
    const denominator = vx * sx + vy * sy, remaining = apothem - px * sx - py * sy
    if (Math.abs(denominator) < 1e-12) { if (remaining < -1e-10) return null; continue }
    const boundary = remaining / denominator
    if (denominator > 0) hi = Math.min(hi, boundary)
    else lo = Math.max(lo, boundary)
  }
  return hi - lo > 1e-8 ? [at(px + lo * vx, py + lo * vy), at(px + hi * vx, py + hi * vy)] : null
}

export const COPRIME_STAR_PAIRS = [[7, 2], [9, 4], [11, 3], [13, 5]] as const

/** A single star-polygon cycle, including its repeated starting vertex. */
export function coprimeStarCycle(vertices: number, step: number): number[] {
  if (!Number.isInteger(vertices) || vertices < 5 || vertices > 128 || !Number.isInteger(step) || step < 2 || 2 * step >= vertices) throw new Error('Invalid star-polygon pair')
  let a = vertices, b = step
  while (b) [a, b] = [b, a % b]
  if (a !== 1) throw new Error('Star-polygon pair must be coprime')
  return Array.from({ length: vertices + 1 }, (_, j) => j * step % vertices)
}

/** Equal-scale vertices joined in the declared modular order, not all pairs. */
export function coprimeStarPolygon(vertices: number, step: number, radius: number, angle = Math.PI / 2): Point[] {
  if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(angle)) throw new Error('Invalid star-polygon geometry')
  return coprimeStarCycle(vertices, step).map(index => at(radius * Math.cos(angle + TAU * index / vertices), radius * Math.sin(angle + TAU * index / vertices)))
}

export const PATTERN_TEXTILE_STARS: readonly Study[] = [
  {
    id: 'triangular-mesh-brocade', title: 'Triangular mesh brocade', category: 'Mathematics', provenance: 'math-derived',
    description: 'Paired lines cross in three directions inside a hexagonal frame, forming a fine triangular textile. Tune the spacing and highlight one central pair.',
    basis: 'In drawing units centered at (160,120), three unit normals nₖ = (cos(kπ/3),sin(kπ/3)), k = 0,1,2, define paired lines nₖ·p = js ± 2.4 for integer j and spacing s. The perpendicular separation within a pair is 4.8. Each line is clipped against nₖ·p ≤ 88 for k = 0,…,5: a regular hexagon with apothem 88 and circumradius 88/cos(π/6). Screen y is inverted. Optional guides are the clipped centerlines nₖ·p = js; a separate ink frame has apothem 92. Only the j = 0 pair of the selected family is accented and emphasized. Intersections are planar superposition, without over-under weaving or a material simulation.',
    tags: ['pattern', 'line-textiles', 'geometry', 'symmetry'], aliases: ['triangular grid textile', 'hexagonal brocade', 'paired thread mesh'],
    parameters: [{ key: 'spacing', label: 'Pair spacing', min: 22, max: 30, step: 2, initial: 26 }, { key: 'accentFamily', label: 'Accent family (0–2)', min: 0, max: 2, step: 1, initial: 0 }],
    model: p => {
      const guides: Mark[] = [], threads: Mark[] = []
      const limit = Math.ceil(HEXAGON_APOTHEM / p.spacing)
      for (let family = 0; family < 3; family++) {
        const angle = family * Math.PI / 3
        for (let j = -limit; j <= limit; j++) {
          const centerline = hexagonalBrocadeSegment(angle, j * p.spacing)
          if (centerline) guides.push(line(centerline, 'guide'))
          for (const shift of [-THREAD_OFFSET, THREAD_OFFSET]) {
            const segment = hexagonalBrocadeSegment(angle, j * p.spacing + shift)
            if (segment) threads.push(line(segment, family === p.accentFamily && j === 0 ? 'accent' : 'ink'))
          }
        }
      }
      const radius = FRAME_APOTHEM / Math.cos(Math.PI / 6)
      const frame = Array.from({ length: 6 }, (_, i) => at(radius * Math.cos(Math.PI / 6 + i * Math.PI / 3), radius * Math.sin(Math.PI / 6 + i * Math.PI / 3)))
      return { marks: [...guides, ...threads, line([...frame, frame[0]], 'ink', true)] }
    },
  },
  {
    id: 'coprime-star-polygons', title: 'Coprime star polygons', category: 'Mathematics', provenance: 'math-derived',
    description: 'Nested star polygons trace a single closed cycle at each radius. Four coprime vertex-and-step pairs change the silhouette from open points to a dense central rosette.',
    basis: 'Choose (N,s) from (7,2), (9,4), (11,3), (13,5), all with gcd(N,s) = 1. A layer joins vertex indices j·s mod N for j = 0,…,N, closing after exactly N edges and visiting every vertex once before closure. Vertices are pᵢ = r(cos(π/2 + 2πi/N),sin(π/2 + 2πi/N)); all layers share this angle and equal display scales, centered at (160,120) with inverted screen y. Three layers use radii 48,72,96 drawing units; two use 72,96. The radius-72 cycle is accented and emphasized. Straight chords are exact polygon edges, with planar crossings; no complete graph or woven connections.',
    tags: ['pattern', 'polygons', 'number-theory', 'symmetry'], aliases: ['regular star polygons', 'Schläfli star polygons', 'coprime polygon cycles'],
    parameters: [{ key: 'pair', label: 'Pair: 1=7/2, 2=9/4, 3=11/3, 4=13/5', min: 1, max: 4, step: 1, initial: 3 }, { key: 'layers', label: 'Nested layers', min: 2, max: 3, step: 1, initial: 3 }],
    model: p => {
      const [vertices, step] = COPRIME_STAR_PAIRS[p.pair - 1]
      const radii = p.layers === 3 ? [48, 72, 96] : [72, 96]
      return { marks: radii.map(radius => line(coprimeStarPolygon(vertices, step, radius), radius === 72 ? 'accent' : 'ink', true)) }
    },
  },
]
