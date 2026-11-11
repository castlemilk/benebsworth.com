import { arrow, linspace, TAU } from './geometry'
import type { SpatialFrame, SpatialLesson, SpatialLine, SpatialParams, SpatialSurface, Vec3 } from './types'

const BLUE = '#61b5ff', TEAL = '#34e6c3', AMBER = '#ffbf69', PURPLE = '#ba91ff'
const dot = (a: Vec3, b: Vec3) => a.reduce((s, v, i) => s + v * b[i], 0)
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const mul = (v: Vec3, s: number): Vec3 => v.map(x => x * s) as Vec3
const add = (a: Vec3, b: Vec3): Vec3 => a.map((v, i) => v + b[i]) as Vec3

/** Rodrigues rotation with a unit axis; preserves tangent vectors on a great-circle arc. */
export function rotate(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle), s = Math.sin(angle), k = dot(axis, v) * (1 - c)
  const n = cross(axis, v)
  return v.map((x, i) => x * c + n[i] * s + axis[i] * k) as Vec3
}

function mesh(fn: (u: number, v: number) => Vec3, color: string, opacity = 0.12): SpatialSurface {
  const nu = 48, nv = 24, vertices: Vec3[] = [], indices: number[] = []
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) vertices.push(fn(i / nu, j / nv))
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + nu + 1
    indices.push(a, b, a + 1, a + 1, b, b + 1)
  }
  return { vertices, indices, color, opacity }
}

function spherePoint(u: number, v: number): Vec3 {
  const latitude = Math.PI * (v - 0.5), longitude = TAU * u
  return [Math.cos(latitude) * Math.cos(longitude), Math.sin(latitude), Math.cos(latitude) * Math.sin(longitude)]
}

function sphereLines(transform: (p: Vec3) => Vec3, color: string, opacity = 0.5): SpatialLine[] {
  const lines: SpatialLine[] = []
  for (let j = 1; j < 12; j++) lines.push({ points: linspace(97, u => transform(spherePoint(u, j / 12))), color, opacity })
  for (let j = 0; j < 16; j++) lines.push({ points: linspace(49, v => transform(spherePoint(j / 16, v))), color, opacity })
  return lines
}

/** A = Ry(angle) diag(s1,s2,s3) Rz(-π/6). The factors are exact, not an SVD solver. */
export function singularMap(v: Vec3, p: SpatialParams): Vec3 {
  const q = rotate(v, [0, 0, 1], -Math.PI / 6)
  return rotate([q[0] * p.s1, q[1] * p.s2, q[2] * p.s3], [0, 1, 0], p.angle * Math.PI / 180)
}

export function singularMetrics(p: SpatialParams) {
  const values = [p.s1, p.s2, p.s3]
  const smallest = Math.min(...values)
  return { volume: p.s1 * p.s2 * p.s3, condition: smallest === 0 ? Infinity : Math.max(...values) / smallest, rank: values.filter(v => v > 0).length }
}

const singularValues: SpatialLesson = {
  slug: 'singular-values', title: 'Singular values in 3D', category: 'maths', blogSlug: 'singular-values-are-stretches', accent: BLUE,
  description: 'Stretch a unit sphere into an ellipsoid and see where an inverse starts amplifying noise.',
  defaults: { s1: 2, s2: 1, s3: 0.5, angle: 30 },
  controls: [
    { key: 's1', label: 'First stretch', min: 0.2, max: 2.4, step: 0.1 },
    { key: 's2', label: 'Second stretch', min: 0.2, max: 2.4, step: 0.1 },
    { key: 's3', label: 'Third stretch', min: 0, max: 2.4, step: 0.1 },
    { key: 'angle', label: 'Output rotation', min: 0, max: 180, step: 1, unit: '°' },
  ],
  presets: [
    { label: 'Volume preserved', params: { s1: 2, s2: 1, s3: 0.5, angle: 30 } },
    { label: 'Almost singular', params: { s1: 2, s2: 1, s3: 0.1, angle: 30 } },
    { label: 'Flatten to a plane', params: { s1: 2, s2: 1, s3: 0, angle: 30 } },
  ],
  legend: [{ label: 'Unit sphere / input', color: BLUE }, { label: 'Image ellipsoid', color: TEAL }, { label: 'Corresponding vectors', color: AMBER }],
  explanation: 'The blue sphere contains unit input vectors. The green surface contains their images under A. Amber arrows track one input and its image; the three green axes are the output singular directions.',
  limitation: 'This constructs a real 3 × 3 matrix from known factors, with a fixed input rotation. It does not compute an SVD of an entered matrix. Stretch sliders are axis-labelled rather than sorted.',
  readouts: p => {
    const m = singularMetrics(p)
    return [{ label: 'Volume factor', value: m.volume.toFixed(3) }, { label: 'Condition number', value: Number.isFinite(m.condition) ? m.condition.toFixed(2) : '∞ (singular)' }, { label: 'Rank', value: String(m.rank) }]
  },
  build: (p, phase) => {
    const transform = (v: Vec3) => singularMap(v, p)
    const input = spherePoint(phase / TAU, 0.5 + 0.22 * Math.sin(phase * 2))
    const output = transform(input)
    const lines = [...sphereLines(v => v, BLUE, 0.2), ...sphereLines(transform, TEAL, 0.64)]
    for (let i = 0; i < 3; i++) {
      const basis: Vec3 = [0, 0, 0]; basis[i] = 1
      const v = rotate(basis, [0, 0, 1], Math.PI / 6)
      lines.push(...arrow([0, 0, 0], transform(v), TEAL))
    }
    lines.push(...arrow([0, 0, 0], input, BLUE), ...arrow([0, 0, 0], output, AMBER), { points: [input, output], color: AMBER, opacity: 0.35 })
    return { lines, surfaces: [mesh((u, v) => transform(spherePoint(u, v)), TEAL, 0.1)], points: [{ position: input, color: BLUE, size: 0.055 }, { position: output, color: AMBER, size: 0.065 }] }
  },
}

/** Exact transport along N→A→B→N, with two meridians and one equatorial arc. */
export function transportedArrow(gapDegrees: number, fraction: number): { position: Vec3; vector: Vec3 } {
  const beta = gapDegrees * Math.PI / 180
  const vertices: Vec3[] = [[0, 1, 0], [1, 0, 0], [Math.cos(beta), 0, Math.sin(beta)], [0, 1, 0]]
  const angles = [Math.PI / 2, beta, Math.PI / 2]
  let remaining = Math.max(0, Math.min(1, fraction)) * (Math.PI + beta)
  let vector: Vec3 = [1, 0, 0]
  for (let i = 0; i < 3; i++) {
    const axis0 = cross(vertices[i], vertices[i + 1]), axis = mul(axis0, 1 / Math.hypot(...axis0))
    const travelled = Math.min(angles[i], remaining)
    vector = rotate(vector, axis, travelled)
    const position = rotate(vertices[i], axis, travelled)
    if (remaining <= angles[i] + 1e-12 || i === 2) return { position, vector }
    remaining -= angles[i]
  }
  return { position: vertices[0], vector }
}

const parallelTransport: SpatialLesson = {
  slug: 'parallel-transport', title: 'Parallel transport on a sphere', category: 'maths', blogSlug: 'a-loop-on-a-sphere-turns-an-arrow', accent: PURPLE,
  description: 'Carry an arrow around a geodesic triangle without twisting it locally, then measure the turn that remains.',
  defaults: { gap: 90, radius: 1.4 },
  controls: [{ key: 'gap', label: 'Longitude gap', min: 15, max: 150, step: 1, unit: '°' }, { key: 'radius', label: 'Sphere radius', min: 0.8, max: 1.6, step: 0.1 }],
  presets: [{ label: 'One octant', params: { gap: 90, radius: 1.4 } }, { label: 'Narrow triangle', params: { gap: 30, radius: 1.4 } }, { label: 'Larger sphere', params: { gap: 90, radius: 1.6 } }],
  legend: [{ label: 'Geodesic triangle', color: TEAL }, { label: 'Transported arrow', color: AMBER }, { label: 'Initial direction', color: BLUE }],
  explanation: 'Follow north pole → equator → equator → north pole. The amber arrow stays tangent and keeps its length. At the end, compare it with the blue reference: its net turn equals the enclosed solid angle.',
  limitation: 'An exact geometric model on a round sphere. It transports a tangent vector, not a magnetic compass. Readouts give the complete-loop result; the time slider follows the route at constant arc-length speed.',
  readouts: p => [{ label: 'Loop holonomy', value: `${p.gap.toFixed(0)}°` }, { label: 'Enclosed area', value: `${(p.gap * Math.PI / 180 * p.radius ** 2).toFixed(3)}` }, { label: 'Gaussian curvature', value: (1 / p.radius ** 2).toFixed(3) }],
  build: (p, phase) => {
    const r = p.radius, fraction = phase / TAU
    const current = transportedArrow(p.gap, fraction)
    const position = mul(current.position, r * 1.012)
    const lines = sphereLines(v => mul(v, r), BLUE, 0.25)
    lines.push({ points: linspace(151, u => mul(transportedArrow(p.gap, u).position, r * 1.012)), color: TEAL })
    lines.push(...arrow([0, r * 1.02, 0], [0.65, r * 1.02, 0], BLUE))
    lines.push(...arrow(position, add(position, mul(current.vector, 0.65)), AMBER))
    // A small tangent cross makes tangency inspectable, rather than implied by the arrow alone.
    const side = cross(current.position, current.vector)
    lines.push({ points: [add(position, mul(side, -0.25)), add(position, mul(side, 0.25))], color: AMBER, opacity: 0.35 })
    const beta = p.gap * Math.PI / 180
    const surfaces = [mesh((u, v) => mul([Math.sin(v * Math.PI / 2) * Math.cos(u * beta), Math.cos(v * Math.PI / 2), Math.sin(v * Math.PI / 2) * Math.sin(u * beta)], r * 1.002), PURPLE, 0.2)]
    return { lines, surfaces, points: [{ position, color: AMBER, size: 0.07 }] }
  },
}

export function continuedRoot(radius: number, angle: number): { real: number; imaginary: number } {
  return { real: Math.sqrt(radius) * Math.cos(angle / 2), imaginary: Math.sqrt(radius) * Math.sin(angle / 2) }
}

function rootPoint(radius: number, angle: number): Vec3 {
  return [radius * Math.cos(angle), continuedRoot(radius, angle).real, radius * Math.sin(angle)]
}

const complexRoots: SpatialLesson = {
  slug: 'complex-roots', title: 'The two sheets of a square root', category: 'maths', blogSlug: 'complex-roots-need-another-floor', accent: PURPLE,
  description: 'Follow a square root continuously around zero: one circuit changes its sign, two restore it.',
  defaults: { radius: 1, turns: 2 },
  controls: [{ key: 'radius', label: 'Loop radius', min: 0.2, max: 1.8, step: 0.1 }, { key: 'turns', label: 'Input circuits', min: 1, max: 2, step: 1 }],
  presets: [{ label: 'One circuit', params: { radius: 1, turns: 1 } }, { label: 'Two circuits', params: { radius: 1, turns: 2 } }, { label: 'Near the branch point', params: { radius: 0.2, turns: 2 } }],
  legend: [{ label: 'First angular sheet', color: TEAL }, { label: 'Second angular sheet', color: PURPLE }, { label: 'Continued root / path', color: AMBER }, { label: 'Input circle', color: BLUE }],
  explanation: 'Horizontal coordinates show Re(z) and Im(z); height shows Re(√z). The amber marker follows the continuous root while its blue projection goes around the input circle. One input circuit ends at the opposite root.',
  limitation: 'This is a 3D projection of the relation w² = z in four real dimensions. The sheets overlap in the picture where Re(w) = 0; that overlap does not identify the two roots. Time is a path parameter, not physical time.',
  readouts: p => [{ label: 'Root modulus', value: Math.sqrt(p.radius).toFixed(3) }, { label: 'Root after sweep', value: `${p.turns === 1 ? '−' : '+'}${Math.sqrt(p.radius).toFixed(3)}` }, { label: 'Input winding number', value: p.turns.toFixed(0) }],
  build: (p, phase): SpatialFrame => {
    const lines: SpatialLine[] = [], surfaces: SpatialSurface[] = []
    for (let sheet = 0; sheet < 2; sheet++) {
      const color = sheet === 0 ? TEAL : PURPLE
      for (let j = 1; j <= 8; j++) lines.push({ points: linspace(97, u => rootPoint(j / 4, (u + sheet) * TAU)), color, opacity: 0.52 })
      for (let j = 0; j <= 16; j++) lines.push({ points: linspace(33, u => rootPoint(u * 2, (j / 16 + sheet) * TAU)), color, opacity: 0.35 })
      surfaces.push(mesh((u, v) => rootPoint(v * 2, (u + sheet) * TAU), color, 0.13))
    }
    const theta = phase * p.turns, point = rootPoint(p.radius, theta)
    const projected: Vec3 = [point[0], -1.85, point[2]]
    lines.push({ points: linspace(97, u => rootPoint(p.radius, u * theta)), color: AMBER })
    lines.push({ points: linspace(97, u => [p.radius * Math.cos(u * TAU), -1.85, p.radius * Math.sin(u * TAU)]), color: BLUE })
    lines.push({ points: [point, projected], color: AMBER, opacity: 0.5 })
    lines.push(...arrow([0, -1.85, 0], projected, BLUE))
    return { lines, surfaces, points: [{ position: point, color: AMBER, size: 0.075 }, { position: projected, color: BLUE, size: 0.055 }, { position: [0, 0, 0], color: '#ffffff', size: 0.065 }] }
  },
}

export const mathsLessons: SpatialLesson[] = [singularValues, parallelTransport, complexRoots]
