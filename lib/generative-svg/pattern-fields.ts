import type { Mark, Point, Study } from './definition'

const CENTER: Point = [160, 116]
const TAU = Math.PI * 2
const line = (points: readonly Point[], accent = false, closed = false): Mark => ({ kind: 'line', points, role: accent ? 'accent' : 'ink', stroke: 'fine', closed })
const at = (x: number, y: number): Point => [CENTER[0] + x, CENTER[1] - y]

/** A line n·p=offset clipped to a regular octagon, with unit normals. */
export function octagonalGridSegment(angle: number, offset: number, apothem = 90): readonly [Point, Point] | null {
  if (![angle, offset, apothem].every(Number.isFinite) || apothem <= 0) throw new Error('Invalid clipping inputs')
  const nx = Math.cos(angle), ny = Math.sin(angle), vx = -ny, vy = nx
  const px = nx * offset, py = ny * offset
  let lo = -4 * apothem, hi = 4 * apothem
  for (let side = 0; side < 8; side++) {
    const a = side * TAU / 8, sx = Math.cos(a), sy = Math.sin(a)
    const denominator = vx * sx + vy * sy, remaining = apothem - px * sx - py * sy
    if (Math.abs(denominator) < 1e-12) { if (remaining < -1e-10) return null; continue }
    const boundary = remaining / denominator
    if (denominator > 0) hi = Math.min(hi, boundary)
    else lo = Math.max(lo, boundary)
  }
  return hi - lo > 1e-8 ? [at(px + lo * vx, py + lo * vy), at(px + hi * vx, py + hi * vy)] : null
}

/** One cell's exact scalar-field level, approximated between sampled vertices. */
export function standingWaveLoop(cellX: number, cellY: number, cells: number, level: number, intervals = 128): Point[] {
  if (!Number.isInteger(cells) || cells < 1 || cells > 8 || !Number.isInteger(cellX) || !Number.isInteger(cellY)
    || cellX < 0 || cellY < 0 || cellX >= cells || cellY >= cells || !Number.isFinite(level) || level <= 0 || level >= 1
    || !Number.isInteger(intervals) || intervals < 8 || intervals > 512) throw new Error('Invalid contour inputs')
  const halfWidth = Math.PI / 2 - Math.asin(level)
  const local = Array.from({ length: intervals + 1 }, (_, i) => {
    // Cluster at both vertical tangencies instead of using long end chords.
    const x = Math.PI / 2 - halfWidth * Math.cos(Math.PI * i / intervals)
    const y = i === 0 || i === intervals ? Math.PI / 2 : Math.asin(Math.min(1, level / Math.sin(x)))
    return [x, y] as const
  })
  const points = [...local, ...local.slice(1, -1).reverse().map(([x, y]) => [x, Math.PI - y] as const)]
    .map(([x, y]) => at(-96 + 192 * (cellX + x / Math.PI) / cells, -96 + 192 * (cellY + y / Math.PI) / cells))
  return [...points, points[0]]
}

export const PATTERN_FIELDS: readonly Study[] = [
  {
    id: 'rotated-grid-interference', title: 'Rotated-grid interference', category: 'Mathematics', provenance: 'math-derived',
    description: 'Two square line grids meet inside an octagonal aperture. Tune the angle and spacing to draw broad diamonds or a fine interference textile.',
    basis: 'Four line families n·p = js: normals at 0, π/2, α and α+π/2; integer j and spacing s in drawing units. Each segment is clipped against all eight half-planes of a regular octagon with apothem 90. A separate frame has apothem 98. The red center lines belong to the rotated grid. Crossings are planar superposition, not woven junctions or an optical simulation.',
    tags: ['pattern', 'line-textiles', 'interference', 'geometry'], aliases: ['moire grid', 'rotated square grids', 'octagonal textile'],
    parameters: [{ key: 'angle', label: 'Grid angle (degrees)', min: 12, max: 30, step: 3, initial: 21 }, { key: 'spacing', label: 'Grid spacing', min: 10, max: 18, step: 2, initial: 12 }],
    model: p => {
      const marks: Mark[] = []
      for (const [family, angle] of [0, Math.PI / 2, p.angle * Math.PI / 180, p.angle * Math.PI / 180 + Math.PI / 2].entries()) {
        for (let j = -Math.ceil(100 / p.spacing); j <= Math.ceil(100 / p.spacing); j++) {
          const segment = octagonalGridSegment(angle, j * p.spacing)
          if (segment) marks.push(line(segment, family >= 2 && j === 0))
        }
      }
      const frame = Array.from({ length: 8 }, (_, i) => at(98 / Math.cos(Math.PI / 8) * Math.cos(Math.PI / 8 + i * TAU / 8), 98 / Math.cos(Math.PI / 8) * Math.sin(Math.PI / 8 + i * TAU / 8)))
      marks.push(line([...frame, frame[0]], false, true))
      return { marks }
    },
  },
  {
    id: 'standing-wave-lace', title: 'Standing-wave lace', category: 'Mathematics', provenance: 'math-derived',
    description: 'Nested rounded-square contours form a square of quiet, repeating cells. The highlighted contour family follows the same scalar field as the graphite loops.',
    basis: 'Contours of |f(u,v)| = c for f = sin(kπu)sin(kπv), (u,v) ∈ [0,1]², c ∈ {0.18,0.42,0.70}. In cell (i,j), the signed level is (−1)^(i+j)c. Local branches y = asin(c/sin x) and π−asin(c/sin x), x ∈ [asin c,π−asin c], meet at y=π/2. Each loop uses 256 straight segments with cosine-clustered x samples; vertices lie on the exact level, segments approximate it. Equal display scales, no wave propagation or physical boundary-condition claim.',
    tags: ['pattern', 'contour-fields', 'trigonometry', 'symmetry'], aliases: ['standing wave contours', 'sine product lace', 'lens contour grid'],
    parameters: [{ key: 'cells', label: 'Cells per side', min: 2, max: 4, step: 1, initial: 3 }],
    model: p => ({ marks: Array.from({ length: p.cells }, (_, j) => Array.from({ length: p.cells }, (_, i) => [.18, .42, .7].map((level, index) => line(standingWaveLoop(i, j, p.cells, level), index === 1 && (i + j) % 2 === 0, true)))).flat(2) }),
  },
]
