import type { InkRole, Mark, Point, Study } from './definition'

/** Original engraved ornaments, not instruments, logos or scientific measurements. */
export const ORNAMENT_CENTER: Point = [160, 116]
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const TAU = Math.PI * 2
const polar = (r: number, theta: number): Point => [160 + r * Math.cos(theta), 116 - r * Math.sin(theta)]
const line = (points: readonly Point[], role: InkRole = 'ink', closed = false): Mark => ({ kind: 'line', points, role, closed, stroke: 'fine' })
const circle = (radius: number, role: InkRole = 'ink'): Mark => ({ kind: 'circle', center: ORNAMENT_CENTER, radius, role, stroke: 'fine' })
const contour = (radius: (theta: number) => number, role: InkRole = 'ink'): Mark => {
  // Exactly closed, with 1024 straight segments; no stochastic roughening.
  const points = Array.from({ length: 1024 }, (_, i) => polar(radius(TAU * i / 1024), TAU * i / 1024))
  return line([...points, points[0]], role, true)
}
const rim = (): Mark[] => [circle(98), ...Array.from({ length: 48 }, (_, i) => {
  const theta = i * TAU / 48
  return line([polar(i % 4 === 0 ? 101 : 100, theta), polar(104, theta)])
})]

export function phyllotaxisSeeds(count: number, rotation: number): Point[] {
  if (![55, 72, 89].includes(count) || !Number.isFinite(rotation) || rotation < 0 || rotation > 90 || rotation % 15 !== 0) throw new Error('Invalid phyllotaxis parameters')
  return Array.from({ length: count }, (_, n) => polar(88 * Math.sqrt((n + 0.5) / count), n * GOLDEN_ANGLE + rotation * Math.PI / 180))
}

export const ORNAMENTAL_STUDIES: readonly Study[] = [
  {
    id: 'guilloche-rosette', title: 'Guilloché rosette', category: 'Mathematics', provenance: 'math-derived',
    description: 'Thirteen nested harmonic contours, a small central seal and a finely divided rim. Tune the lobe count and relief of an engraved rosette.',
    basis: 'Original polar ornament: rⱼ(θ) = 20 + 5.4j + A cos(kθ) + 1.2 cos(2kθ + π/3), j = 0…12, θ ∈ [0,2π]. Each closed contour uses 1024 straight segments. Adjacent contours differ radially by 5.4 drawing units; k-fold rotational symmetry. Decorative geometry, not a security feature or a model of an engine-turning machine.',
    tags: ['ornament', 'engraving', 'polar-curves', 'symmetry'], aliases: ['guilloche', 'harmonic rosette', 'engine turned ornament'],
    parameters: [{ key: 'lobes', label: 'Rosette lobes', min: 6, max: 12, step: 1, initial: 9 }, { key: 'relief', label: 'Rosette relief', min: 3, max: 7, step: 1, initial: 5 }],
    model: p => ({ marks: [
      ...Array.from({ length: 13 }, (_, j) => contour(theta => 20 + 5.4 * j + p.relief * Math.cos(p.lobes * theta) + 1.2 * Math.cos(2 * p.lobes * theta + Math.PI / 3), j === 8 ? 'accent' : 'ink')),
      circle(8), circle(3, 'accent'), ...rim(),
    ] }),
  },
  {
    id: 'phyllotaxis-bloom', title: 'Phyllotaxis bloom', category: 'Mathematics', provenance: 'math-derived',
    description: 'A golden-angle seed field with two open spiral chains and a broken engraved rim. Rotation and seed count reveal a different rhythm of negative space.',
    basis: 'Seed n has rₙ = 88√((n+1/2)/N), θₙ = nπ(3−√5) + φ; n = 0…N−1. Consecutive squared radii differ by 88²/N. Small circles are seed markers, not measured botanical shapes. Two index-step-13 chains are straight chords trimmed 4.8 drawing units from seed centers. This is a phyllotactic construction, not a biological growth simulation or a logarithmic-spiral fit.',
    tags: ['ornament', 'engraving', 'phyllotaxis', 'golden-angle'], aliases: ['sunflower pattern', 'golden angle bloom', 'vogel seed pattern'],
    parameters: [{ key: 'seeds', label: 'Seed count', min: 55, max: 89, step: 17, initial: 89 }, { key: 'rotation', label: 'Bloom rotation (degrees)', min: 0, max: 90, step: 15, initial: 0 }],
    model: p => {
      const seeds = phyllotaxisSeeds(p.seeds, p.rotation), marks: Mark[] = []
      for (const offset of [0, 6]) for (let n = offset; n + 13 < seeds.length; n += 13) {
        const a = seeds[n], b = seeds[n + 13], length = Math.hypot(b[0] - a[0], b[1] - a[1])
        const dx = (b[0] - a[0]) / length * 4.8, dy = (b[1] - a[1]) / length * 4.8
        marks.push(line([[a[0] + dx, a[1] + dy], [b[0] - dx, b[1] - dy]], 'accent'))
      }
      seeds.forEach((center, n) => marks.push({ kind: 'circle', center, radius: 3.2, role: n % 13 === 0 || n % 13 === 6 ? 'accent' : 'ink', stroke: 'fine' }))
      for (let quadrant = 0; quadrant < 4; quadrant++) {
        marks.push(line(Array.from({ length: 97 }, (_, i) => polar(98, quadrant * TAU / 4 + 0.06 + i * (TAU / 4 - 0.12) / 96))))
        const theta = quadrant * TAU / 4
        marks.push(line([polar(94, theta), polar(104, theta)]))
      }
      return { marks }
    },
  },
  {
    id: 'harmonic-medallion', title: 'Harmonic medallion', category: 'Mathematics', provenance: 'math-derived',
    description: 'Three interlaced harmonic ribbons, each engraved with three radially offset contours. A quiet central seal and fine rim frame the dense annular pattern.',
    basis: 'Original polar ornament: rⱼ,ₕ(θ) = 69 + 5.4h + A cos(kθ + 2πj/3), j = 0,1,2; h = −1,0,1; θ ∈ [0,2π]. Nine closed contours use 1024 straight segments each. Ring radii are 14, 39 and 98 drawing units. The crossings are planar overlaps; this braid-like drawing does not model woven over/under topology or a physical knot.',
    tags: ['ornament', 'engraving', 'polar-curves', 'symmetry'], aliases: ['harmonic lace', 'engraved medallion', 'braid ornament'],
    parameters: [{ key: 'lobes', label: 'Medallion lobes', min: 5, max: 9, step: 1, initial: 7 }, { key: 'depth', label: 'Ribbon depth', min: 14, max: 18, step: 2, initial: 16 }],
    model: p => ({ marks: [
      ...Array.from({ length: 3 }, (_, j) => Array.from({ length: 3 }, (_, h) => contour(theta => 69 + 5.4 * (h - 1) + p.depth * Math.cos(p.lobes * theta + j * TAU / 3), j === 1 ? 'accent' : 'ink'))).flat(),
      circle(39), circle(14), ...Array.from({ length: 12 }, (_, i) => {
        const theta = i * TAU / 12
        return line([polar(18, theta), polar(23, theta)])
      }), ...rim(),
    ] }),
  },
]
