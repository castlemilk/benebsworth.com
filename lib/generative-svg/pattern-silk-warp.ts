import type { InkRole, Mark, Point, Study } from './definition'

const TAU = 2 * Math.PI
const SILK_INTERVALS = 1536
const WARP_INTERVALS = 192
const PAIR_HALF_GAP = 2.4
const at = ([x, y]: Point): Point => [160 + x, 120 - y]
const line = (points: readonly Point[], role: InkRole = 'ink', closed = false): Mark => ({ kind: 'line', points, role, stroke: 'fine', closed, ...(role === 'accent' ? { emphasis: true } : {}) })

export const LISSAJOUS_SILK_PAIRS = [[3, 4], [4, 5], [5, 6]] as const

/** The local-coordinate shear is defined before the common screen transform. */
export function sinusoidalWarpPoint([x, y]: Point, amplitude: number): Point {
  if (![x, y, amplitude].every(Number.isFinite)) throw new Error('Invalid sinusoidal shear inputs')
  return [x + amplitude * Math.sin(TAU * y / 176), y]
}

export const PATTERN_SILK_WARP: readonly Study[] = [
  {
    id: 'lissajous-silk', title: 'Lissajous silk', category: 'Mathematics', provenance: 'math-derived',
    description: 'Three neighboring phases of a Lissajous curve form a fine, rectangular tangle. Tune the frequency pair and phase; the middle phase remains emphasized.',
    basis: 'In drawing units, x = 108 sin(pt + φ + h), y = 88 sin(qt), t ∈ [0,2π]. Choose (p,q) from (3,4), (4,5), (5,6); φ is 16°…56° in 10° steps and h is −10°, 0°, +10°. Each curve uses 1536 equal parameter intervals with its first point repeated exactly at closure. Coordinates are centered at (160,120), with inverted screen y. The h = 0 curve is accented and emphasized. These are phase-neighbor curves, not parallel offsets or woven threads. Crossings are retained. The supported phases exclude complete retracing, coincident neighboring loci and equivalent three-curve variants for each frequency pair. Straight segments approximate the sampled curves; there is no material model or frame.',
    tags: ['pattern', 'parametric-curves', 'trigonometry', 'line-textiles'], aliases: ['Lissajous phase textile', 'harmonic silk curves'],
    parameters: [
      { key: 'pair', label: 'Frequency pair: 1=3/4, 2=4/5, 3=5/6', min: 1, max: 3, step: 1, initial: 2 },
      { key: 'phase', label: 'Middle phase (degrees)', min: 16, max: 56, step: 10, initial: 46 },
    ],
    model: parameters => {
      const [p, q] = LISSAJOUS_SILK_PAIRS[parameters.pair - 1]
      // Draw the emphasized middle phase last so the non-color cue stays visible at crossings.
      return { marks: [-10, 10, 0].map(neighbor => {
        const phase = (parameters.phase + neighbor) * Math.PI / 180
        const points = Array.from({ length: SILK_INTERVALS }, (_, index) => {
          const t = TAU * index / SILK_INTERVALS
          return at([108 * Math.sin(p * t + phase), 88 * Math.sin(q * t)])
        })
        return line([...points, points[0]], neighbor === 0 ? 'accent' : 'ink', true)
      }) }
    },
  },
  {
    id: 'sinusoidal-warp-textile', title: 'Sinusoidal warp textile', category: 'Mathematics', provenance: 'math-derived',
    description: 'Paired lattice lines bend through a sinusoidal shear, making a curved textile. Tune the wave amplitude and bundle pitch; one central curved pair remains emphasized.',
    basis: 'Source coordinates are in the rectangle x ∈ [−96,96], y ∈ [−88,88] drawing units. Paired vertical and horizontal lines have source offsets js ± 2.4, with bundle pitch s = 24 or 28; include a bundle only when both offsets are inside its source interval. Each source pair is separated by 4.8. Apply T(x,y) = (x + A sin(2πy/176), y), with A = 8…24 in steps of 4. Its Jacobian is [[1,(2πA/176)cos(2πy/176)],[0,1]], so det DT = 1. The inverse subtracts the same sine displacement: the smooth shear preserves area and intersection topology without folding, but not lengths or angles. Vertical curves use 192 equal y intervals; horizontal lines are represented exactly by their transformed endpoints. Coordinates are centered at (160,120), with inverted screen y. The central vertical pair is accented and emphasized. Optional guides are undeformed bundle centerlines; paired detail remains visible without guides. Crossings are planar superposition, not over-under weaving or a material simulation.',
    tags: ['pattern', 'line-textiles', 'transformations', 'trigonometry'], aliases: ['area-preserving shear textile', 'sinusoidal lattice deformation', 'curved paired lattice'],
    parameters: [
      { key: 'amplitude', label: 'Shear amplitude', min: 8, max: 24, step: 4, initial: 20 },
      { key: 'pitch', label: 'Bundle pitch', min: 24, max: 28, step: 4, initial: 24 },
    ],
    model: parameters => {
      const guides: Mark[] = [], threads: Mark[] = []
      for (const vertical of [true, false]) {
        const bound = vertical ? 96 : 88, limit = Math.floor((bound - PAIR_HALF_GAP) / parameters.pitch)
        for (let j = -limit; j <= limit; j++) {
          const center = j * parameters.pitch
          guides.push(line(vertical ? [at([center, -88]), at([center, 88])] : [at([-96, center]), at([96, center])], 'guide'))
          for (const shift of [-PAIR_HALF_GAP, PAIR_HALF_GAP]) {
            const offset = center + shift
            const source: Point[] = vertical
              ? Array.from({ length: WARP_INTERVALS + 1 }, (_, index) => [offset, -88 + 176 * index / WARP_INTERVALS] as const)
              : [[-96, offset], [96, offset]]
            threads.push(line(source.map(point => at(sinusoidalWarpPoint(point, parameters.amplitude))), vertical && j === 0 ? 'accent' : 'ink'))
          }
        }
      }
      return { marks: [...guides, ...threads.filter(mark => mark.role !== 'accent'), ...threads.filter(mark => mark.role === 'accent')] }
    },
  },
]
