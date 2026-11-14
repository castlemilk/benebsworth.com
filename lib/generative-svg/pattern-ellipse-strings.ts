import type { InkRole, Mark, Point, Study } from './definition'

const TAU = 2 * Math.PI
export const LOOM_FOCAL_DISTANCE = 46
export const LOOM_ELLIPSE_SEGMENTS = 512
export const LOOM_BRANCH_SEGMENTS = 256
const at = (x: number, y: number): Point => [160 + x, 120 - y]
const line = (points: readonly Point[], role: InkRole = 'ink', closed = false): Mark => ({ kind: 'line', points, role, closed, stroke: 'fine', ...(role === 'accent' ? { emphasis: true } : {}) })

export function ellipticPoint(mu: number, nu: number): Point {
  if (![mu, nu].every(Number.isFinite) || Math.abs(mu) > 2) throw new Error('Invalid elliptic coordinate')
  return [LOOM_FOCAL_DISTANCE * Math.cosh(mu) * Math.cos(nu), LOOM_FOCAL_DISTANCE * Math.sinh(mu) * Math.sin(nu)]
}

export function confocalLoom(outer: number, density: number) {
  if (!Number.isFinite(outer) || outer < 1.1 - 1e-10 || outer > 1.5 + 1e-10 || Math.abs(outer * 10 - Math.round(outer * 10)) > 1e-8 || ![3, 4, 5].includes(density)) throw new Error('Invalid loom parameters')
  const scale = Math.min(112 / (LOOM_FOCAL_DISTANCE * Math.cosh(outer)), 92 / (LOOM_FOCAL_DISTANCE * Math.sinh(outer)))
  const project = (mu: number, nu: number) => { const [x, y] = ellipticPoint(mu, nu); return at(x * scale, y * scale) }
  const ellipses = Array.from({ length: density }, (_, i) => {
    const mu = outer * (.4 + .6 * i / (density - 1))
    const points = Array.from({ length: LOOM_ELLIPSE_SEGMENTS }, (_, j) => project(mu, TAU * j / LOOM_ELLIPSE_SEGMENTS))
    return { mu, points: [...points, points[0]] }
  })
  const angles = Array.from({ length: density }, (_, i) => (i + 1) * Math.PI / (2 * (density + 1)))
  const branches = angles.flatMap(nu => [nu, Math.PI - nu]).map(nu => ({ nu, points: Array.from({ length: LOOM_BRANCH_SEGMENTS + 1 }, (_, j) => project(-outer + 2 * outer * j / LOOM_BRANCH_SEGMENTS, nu)) }))
  return { scale, ellipses, branches, foci: [at(-LOOM_FOCAL_DISTANCE * scale, 0), at(LOOM_FOCAL_DISTANCE * scale, 0)] }
}

export const STRING_SQUARE_SIDE = 184
export function stringCornerPoint(corner: number, [x, y]: Point): Point {
  if (![0, 1, 2, 3].includes(corner) || ![x, y].every(Number.isFinite)) throw new Error('Invalid string corner')
  return ([[68 + x, 28 + y], [252 - y, 28 + x], [252 - x, 212 - y], [68 + y, 212 - x]] as const)[corner]
}

export function parabolicCornerStrings(count: number, leg: number) {
  if (![14, 18, 22].includes(count) || ![116, 128, 140].includes(leg)) throw new Error('Invalid string-fan parameters')
  // The endpoint strings on adjacent corners overlap. Their union is each
  // complete outer edge, drawn once; this is not an additional decorative frame.
  const boundary = Array.from({ length: 4 }, (_, corner) => ({ corner, u: null, points: [stringCornerPoint(corner, [0, 0]), stringCornerPoint(corner, [STRING_SQUARE_SIDE, 0])] as readonly Point[], accent: false }))
  const strings = Array.from({ length: 4 }, (_, corner) => Array.from({ length: count - 2 }, (_, j) => {
    const i = j + 1, u = i / (count - 1)
    return { corner, u, points: [stringCornerPoint(corner, [leg * u, 0]), stringCornerPoint(corner, [0, leg * (1 - u)])] as readonly Point[], accent: corner === 0 && Math.abs(i - Math.floor(count / 2)) <= 1 }
  })).flat()
  return { boundary, strings }
}

export const PATTERN_ELLIPSE_STRINGS: readonly Study[] = [
  {
    id: 'confocal-ellipse-loom', title: 'Confocal ellipse loom', category: 'Mathematics', provenance: 'math-derived',
    description: 'Nested ellipses and separate hyperbola branches form an orthogonal oval loom. Tune its aspect and coordinate density while keeping both families confocal.',
    basis: 'Elliptic coordinates x = c cosh(μ) cos(ν), y = c sinh(μ) sin(ν), with fixed c = 46 model units. The m ellipse levels are evenly spaced from 0.4μmax to μmax and sampled with 512 segments. Hyperbola branches use ν = jπ/[2(m+1)] and π minus that angle, j = 1,…,m; each branch samples signed μ from −μmax to μmax with 256 segments. No segment joins opposite branches. Curves share foci (±c,0) and their exact coordinate families are orthogonal; straight sampled chords approximate them. One uniform display scale min(112/[c cosh μmax],92/[c sinh μmax]) centers them at (160,120), with inverted screen y. Focal marks are optional guides; the middle ellipse is accented. Changing the outer coordinate also changes the displayed focal distance through that fit. These are coordinate curves, not woven material or field simulation.',
    tags: ['pattern', 'contours', 'geometry', 'conic-sections'], aliases: ['elliptic coordinate net', 'confocal conics', 'ellipse hyperbola loom'],
    parameters: [{ key: 'outer', label: 'Outer elliptic coordinate', min: 1.1, max: 1.5, step: .1, initial: 1.4 }, { key: 'density', label: 'Ellipse levels', min: 3, max: 5, step: 1, initial: 4 }],
    model: p => {
      const loom = confocalLoom(p.outer, p.density)
      return { marks: [...loom.foci.map(center => ({ kind: 'circle' as const, center, radius: 1.8, role: 'guide' as const, stroke: 'fine' as const })), ...loom.branches.map(branch => line(branch.points)), ...loom.ellipses.map((ellipse, i) => line(ellipse.points, i === Math.floor(p.density / 2) ? 'accent' : 'ink', true))] }
    },
  },
  {
    id: 'parabolic-string-corners', title: 'Parabolic string corners', category: 'Mathematics', provenance: 'math-derived',
    description: 'Four straight-string fans curl around a central opening. Change the number of strings and their reach while keeping the corner construction exact.',
    basis: 'A local fan joins A(u) = (Lu,0) to B(u) = (0,L(1−u)), at N equally spaced u values from 0 to 1. These straight lines have continuous envelope (Lu²,L(1−u)²), a parabola; the envelope itself is not drawn. Four rigid rotations place fans at the corners of a 184-unit square. Adjacent endpoint strings overlap on the square boundary; their union is rendered as four unique outer edges. Interior strings remain distinct, including their intentional crossings. Every fan lies in its corner triangle x+y ≤ L, leaving at least the central open diamond |x−160|+|y−120| < 184−L untouched. Three consecutive strings in one fan are accented and emphasized. Drawing units only: no over-under weave, physical thread joints or material simulation.',
    tags: ['pattern', 'string-art', 'geometry', 'conic-sections'], aliases: ['parabolic string art', 'four corner curve stitching', 'straight line parabola envelopes'],
    parameters: [{ key: 'count', label: 'Strings per fan', min: 14, max: 22, step: 4, initial: 18 }, { key: 'leg', label: 'Fan reach', min: 116, max: 140, step: 12, initial: 128 }],
    model: p => { const { boundary, strings } = parabolicCornerStrings(p.count, p.leg); return { marks: [...boundary, ...strings].map(segment => line(segment.points, segment.accent ? 'accent' : 'ink')) } },
  },
]
