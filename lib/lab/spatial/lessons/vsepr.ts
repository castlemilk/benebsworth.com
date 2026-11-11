import { linspace, TAU } from '../geometry'
import type { SpatialFrame, SpatialLesson, SpatialLine, SpatialPoint, SpatialSurface, Vec3 } from '../types'

const PINK = '#f472b6'
const CYAN = '#55e6d0'
const AMBER = '#ffc46b'
const FAINT = '#53617d'
const WHITE = '#eff8ff'

/** World units per unit direction vector; the lobe tip at 1.9 scales to 2.09, inside the ±3 stage. */
const SCALE = 1.1
export const DESCENT_STEP = 0.4
export const DESCENT_STEPS = 200
const UP: Vec3 = [0, 1, 0]
/** Degrees. Symmetry-equivalent pairs differ only by floating noise (~1e-13°); ties go to the first pair in index order so the arcs never teleport. */
const TIE = 1e-6

const degrees = (radians: number) => radians * 180 / Math.PI
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const scaled = (v: Vec3, s: number): Vec3 => [v[0] * s, v[1] * s, v[2] * s]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const normalise = (v: Vec3): Vec3 => scaled(v, 1 / Math.hypot(...v))
const angleBetween = (a: Vec3, b: Vec3) => degrees(Math.acos(Math.max(-1, Math.min(1, dot(a, b)))))

/** Lone pairs beyond N − 2 are ignored so at least two bonds remain to measure an angle between. */
export const clampLonePairs = (domains: number, lonePairs: number) => Math.max(0, Math.min(Math.round(lonePairs), Math.round(domains) - 2))

/** Phase ramps the lone-pair weight: full weight at 0 and 2π (matching the readouts), ordinary bonds at π. */
export const effectiveWeight = (weight: number, phase: number) => 1 + (weight - 1) * (1 + Math.cos(phase)) / 2

const ROOT3 = Math.sqrt(3)
/** Ideal equal-weight arrangements. Lone pairs take the LAST slots: equatorial for five domains, trans for six. */
const IDEAL: Record<number, Vec3[]> = {
  2: [[0, 0, 1], [0, 0, -1]],
  3: [0, 1, 2].map(i => [Math.cos(i * TAU / 3), 0, Math.sin(i * TAU / 3)] as Vec3),
  4: [[1, -1, -1], [-1, -1, 1], [1, 1, 1], [-1, 1, -1]].map(v => scaled(v as Vec3, 1 / ROOT3)),
  5: [[0, 0, 1], [0, 0, -1], ...[0, 1, 2].map(i => [Math.cos(i * TAU / 3), Math.sin(i * TAU / 3), 0] as Vec3)],
  6: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
}

/** The ideal arrangement with a fixed ~1° nudge per vector so the descent never starts on a saddle. */
export function seedDomains(domains: number): Vec3[] {
  const ideal = IDEAL[Math.round(domains)]
  return ideal.map((v, i) => normalise(add(v, scaled([Math.sin(1.7 * i + 0.3), Math.cos(2.3 * i + 1.1), Math.sin(3.1 * i + 2)], 0.0175))))
}

export function domainWeights(domains: number, lonePairs: number, weight: number): number[] {
  const n = Math.round(domains), l = clampLonePairs(n, lonePairs)
  return Array.from({ length: n }, (_, i) => (i >= n - l ? weight : 1))
}

/** Weighted Thomson energy Σ wᵢwⱼ / |uᵢ − uⱼ| over unit vectors. */
export function repulsionEnergy(u: Vec3[], w: number[]): number {
  let energy = 0
  for (let i = 0; i < u.length; i++) for (let j = i + 1; j < u.length; j++) {
    energy += w[i] * w[j] / Math.hypot(u[i][0] - u[j][0], u[i][1] - u[j][1], u[i][2] - u[j][2])
  }
  return energy
}

/** Gradient of the energy projected onto the tangent plane of each unit vector. */
export function tangentialGradient(u: Vec3[], w: number[]): Vec3[] {
  const g: Vec3[] = u.map(() => [0, 0, 0])
  for (let i = 0; i < u.length; i++) for (let j = i + 1; j < u.length; j++) {
    const d: Vec3 = [u[i][0] - u[j][0], u[i][1] - u[j][1], u[i][2] - u[j][2]]
    const r = Math.hypot(...d), f = w[i] * w[j] / (r * r * r)
    g[i] = add(g[i], scaled(d, -f))
    g[j] = add(g[j], scaled(d, f))
  }
  return g.map((v, i) => add(v, scaled(u[i], -dot(v, u[i]))))
}

export const gradientNorm = (u: Vec3[], w: number[]) => Math.sqrt(tangentialGradient(u, w).reduce((s, v) => s + dot(v, v), 0))

/** Fixed-budget projected gradient descent from the perturbed ideal seed; deterministic and the same every frame. */
export function relaxDomains(domains: number, lonePairs: number, weight: number, steps = DESCENT_STEPS, step = DESCENT_STEP): Vec3[] {
  const w = domainWeights(domains, lonePairs, weight)
  let u = seedDomains(domains)
  for (let s = 0; s < steps; s++) {
    const g = tangentialGradient(u, w)
    u = u.map((v, i) => normalise(add(v, scaled(g[i], -step))))
  }
  return u
}

export type DomainAngles = { bond: number; loneBond: number | null; loneLone: number | null }

/** Smallest angle in each class; lone pairs are the last `lonePairs` vectors. */
export function domainAngles(u: Vec3[], lonePairs: number): DomainAngles {
  const bonds = u.length - clampLonePairs(u.length, lonePairs)
  let bond = 180, loneBond: number | null = null, loneLone: number | null = null
  for (let i = 0; i < u.length; i++) for (let j = i + 1; j < u.length; j++) {
    const a = angleBetween(u[i], u[j])
    if (j < bonds) bond = Math.min(bond, a)
    else if (i < bonds) loneBond = loneBond === null ? a : Math.min(loneBond, a)
    else loneLone = loneLone === null ? a : Math.min(loneLone, a)
  }
  return { bond, loneBond, loneLone }
}

const SHAPES: Record<string, string> = {
  '2|0': 'linear AX2 (ideal 180°)',
  '3|0': 'trigonal planar AX3 (ideal 120°)', '3|1': 'bent AX2E (ideal 120°)',
  '4|0': 'tetrahedral AX4 (ideal 109.47°)', '4|1': 'trigonal pyramidal AX3E (ideal 109.47°)', '4|2': 'bent AX2E2 (ideal 109.47°)',
  '5|0': 'trigonal bipyramidal AX5 (ideal 90° axial to equatorial)', '5|1': 'seesaw AX4E (ideal 90° axial to equatorial)',
  '5|2': 'T-shaped AX3E2 (ideal 90°)', '5|3': 'linear AX2E3 (ideal 180°)',
  '6|0': 'octahedral AX6 (ideal 90°)', '6|1': 'square pyramidal AX5E (ideal 90°)', '6|2': 'square planar AX4E2 (ideal 90°)', '6|3': 'T-shaped AX3E3 (ideal 90°)',
}

/** AXnEm name for the clamped cell, flagging when the slider asked for more lone pairs than N − 2 allows. */
export function shapeName(domains: number, lonePairs: number): string {
  const n = Math.round(domains), l = clampLonePairs(n, lonePairs)
  const note = l < Math.round(lonePairs) ? ` (lone pairs clamped to N − 2 = ${l})` : ''
  return `${SHAPES[`${n}|${l}`]}${note}`
}

/** C2v closed form for two bonds at half-angle a and two lone pairs at half-angle b (radians). */
export const c2vEnergy = (a: number, b: number, weight: number) =>
  1 / (2 * Math.sin(a)) + weight * weight / (2 * Math.sin(b)) + 4 * weight / Math.sqrt(2 + 2 * Math.cos(a) * Math.cos(b))

/** Minimise the C2v energy by alternating golden-section line searches; returns full angles in degrees. */
export function c2vMinimum(weight: number): { bond: number; loneLone: number; energy: number } {
  const golden = (f: (x: number) => number, lo: number, hi: number) => {
    const phi = (Math.sqrt(5) - 1) / 2
    let a = lo, b = hi, c = b - phi * (b - a), d = a + phi * (b - a)
    for (let i = 0; i < 80; i++) {
      if (f(c) < f(d)) b = d; else a = c
      c = b - phi * (b - a); d = a + phi * (b - a)
    }
    return (a + b) / 2
  }
  let a = Math.PI / 3, b = Math.PI / 3
  for (let i = 0; i < 40; i++) {
    a = golden(x => c2vEnergy(x, b, weight), 0.3, 1.5)
    b = golden(x => c2vEnergy(a, x, weight), 0.3, 1.5)
  }
  return { bond: degrees(2 * a), loneLone: degrees(2 * b), energy: c2vEnergy(a, b, weight) }
}

/** Trans lone pairs in an octahedron are a D4h stationary point for every weight, so XeF4 has an exact energy. */
export const squarePlanarEnergy = (weight: number) => 4 / Math.SQRT2 + 1 + weight * weight / 2 + 8 * weight / Math.SQRT2

/** Rodrigues rotation carrying unit vector `from` onto unit vector `to`. */
export function rotationTo(from: Vec3, to: Vec3): (v: Vec3) => Vec3 {
  const axis = cross(from, to), s = Math.hypot(...axis), c = dot(from, to)
  if (s < 1e-9) {
    if (c > 0) return v => v
    const k = normalise(Math.abs(from[0]) < 0.9 ? cross(from, [1, 0, 0]) : cross(from, [0, 0, 1]))
    return v => add(scaled(v, -1), scaled(k, 2 * dot(k, v)))
  }
  const k = scaled(axis, 1 / s), angle = Math.atan2(s, c), cosA = Math.cos(angle), sinA = Math.sin(angle)
  return v => add(add(scaled(v, cosA), scaled(cross(k, v), sinA)), scaled(k, dot(k, v) * (1 - cosA)))
}

/** Rigidly turn the converged set so the lone pairs point up (or the first domain, when there are none). */
export function orientDomains(u: Vec3[], lonePairs: number): Vec3[] {
  const l = clampLonePairs(u.length, lonePairs)
  let target: Vec3 = u[0]
  if (l > 0) {
    const mean = u.slice(u.length - l).reduce((s, v) => add(s, v), [0, 0, 0] as Vec3)
    target = Math.hypot(...mean) > 0.05 ? normalise(mean) : u[u.length - l]
  }
  const rotate = rotationTo(target, UP)
  return u.map(rotate)
}

const rotateY = (v: Vec3, angle: number): Vec3 => [v[0] * Math.cos(angle) + v[2] * Math.sin(angle), v[1], -v[0] * Math.sin(angle) + v[2] * Math.cos(angle)]

function perpendicularBasis(u: Vec3): [Vec3, Vec3] {
  const ref: Vec3 = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  const e1 = normalise(cross(u, ref))
  return [e1, cross(u, e1)]
}

/** Great-circle arc from direction a to direction b at a fixed radius; antipodes take a deterministic route. */
function greatArc(a: Vec3, b: Vec3, radius: number, count = 33): Vec3[] {
  const c = Math.max(-1, Math.min(1, dot(a, b))), omega = Math.acos(c)
  if (Math.sin(omega) < 1e-6) {
    const [e1] = perpendicularBasis(a)
    return linspace(count, t => scaled(add(scaled(a, Math.cos(t * omega)), scaled(e1, Math.sin(t * omega))), radius))
  }
  return linspace(count, t => scaled(add(scaled(a, Math.sin((1 - t) * omega) / Math.sin(omega)), scaled(b, Math.sin(t * omega) / Math.sin(omega))), radius))
}

function lobe(u: Vec3, halfWidth: number): { surface: SpatialSurface; lines: SpatialLine[] } {
  const [e1, e2] = perpendicularBasis(u)
  const centre = scaled(u, 1.1 * SCALE), along = 0.8 * SCALE, across = halfWidth * SCALE
  const at = (theta: number, phi: number): Vec3 =>
    add(centre, add(scaled(u, along * Math.cos(theta)), scaled(add(scaled(e1, Math.cos(phi)), scaled(e2, Math.sin(phi))), across * Math.sin(theta))))
  const surface: SpatialSurface = { vertices: [], indices: [], color: PINK, opacity: 0.16 }
  const rings = 12, segments = 16
  for (let i = 0; i <= rings; i++) {
    for (let j = 0; j <= segments; j++) surface.vertices.push(at(Math.PI * i / rings, TAU * j / segments))
    if (i < rings) for (let j = 0; j < segments; j++) { const a = i * (segments + 1) + j, b = a + segments + 1; surface.indices.push(a, b, a + 1, a + 1, b, b + 1) }
  }
  const lines: SpatialLine[] = [0, Math.PI / 2].map(phi => ({ points: linspace(49, t => at(TAU * t, phi)), color: PINK, opacity: 0.7 }))
  lines.push({ points: [[0, 0, 0], scaled(u, 0.3 * SCALE)], color: PINK, opacity: 0.6 })
  return { surface, lines }
}

export const lesson: SpatialLesson = {
  slug: 'vsepr', title: 'Electron domains on a sphere', category: 'chemistry',
  blogSlug: 'a-lone-pair-takes-more-room-than-an-atom', accent: PINK,
  cameraDistance: 7,
  description: 'Relax repelling electron domains on a sphere and watch heavier lone pairs squeeze the bond angle below the tetrahedral 109.47°.',
  defaults: { domains: 4, lonePairs: 2, lonePairWeight: 1.25 },
  controls: [
    { key: 'domains', label: 'Electron domains N', min: 2, max: 6, step: 1 },
    { key: 'lonePairs', label: 'Lone pairs', min: 0, max: 3, step: 1 },
    { key: 'lonePairWeight', label: 'Lone-pair repulsion weight', min: 1, max: 1.5, step: 0.01 },
  ],
  presets: [
    { label: 'Methane CH4', params: { domains: 4, lonePairs: 0, lonePairWeight: 1 } },
    { label: 'Ammonia NH3', params: { domains: 4, lonePairs: 1, lonePairWeight: 1.25 } },
    { label: 'Sulfur tetrafluoride SF4', params: { domains: 5, lonePairs: 1, lonePairWeight: 1.25 } },
  ],
  legend: [
    { label: 'Lone-pair domains (wider as their weight grows)', color: PINK },
    { label: 'Bonds and ligand atoms', color: CYAN },
    { label: 'Smallest bond angle (bright) and lone-pair angle (faint)', color: AMBER },
    { label: 'Direction sphere', color: FAINT },
  ],
  explanation: 'Cyan bonds run from the central atom to ligand atoms on the direction sphere; pink lobes are lone-pair domains, drawn wider as their repulsion weight grows. The bright amber arc spans the closest pair of bonds and the faint arc the lone-pair angle (lone pair to lone pair, or to the nearest bond when there is only one). Scrubbing the timeline ramps the lone-pair weight from its full value at the ends down to 1 at the midpoint, so the middle of the sweep shows the shape the molecule would have if lone pairs repelled like bonds; with no lone pairs the frame only turns. Readouts always use the full weight.',
  limitation: 'Electron domains are points on a sphere repelling as 1/r with no physical length scale, so bond lengths, atom sizes and lobe shapes are illustrative. The lone-pair weight is a fitted parameter, not a prediction, and the model ignores electronegativity, multiple bonds and d-orbital effects; it gets the SF4 equatorial angle wrong (123.6° against 101.6° measured), and for six domains with two lone pairs the cis arrangement is slightly lower in energy (11.679 against 11.681 at w 1.25) than the square-planar one the trans seed selects. The weight ramp is pedagogy, not dynamics: domains have no inertia. Every frame is a fresh 200-step descent from an ideal seed, and the lone-pair slider is clamped to N − 2 (the shape readout says when).',
  readouts: p => {
    const n = Math.round(p.domains), l = clampLonePairs(n, p.lonePairs)
    const u = relaxDomains(n, l, p.lonePairWeight), angles = domainAngles(u, l)
    const lone = angles.loneLone !== null ? ` (lone pairs ${angles.loneLone.toFixed(2)}°)` : angles.loneBond !== null ? ` (lone pair to bond ${angles.loneBond.toFixed(2)}°)` : ''
    return [
      { label: 'Smallest bond angle', value: `${angles.bond.toFixed(2)}°${lone}` },
      { label: 'Shape and ideal angle', value: shapeName(n, p.lonePairs) },
      { label: 'Repulsion energy Σ wᵢwⱼ / rᵢⱼ', value: repulsionEnergy(u, domainWeights(n, l, p.lonePairWeight)).toFixed(3) },
    ]
  },
  build: (p, phase) => {
    const n = Math.round(p.domains), l = clampLonePairs(n, p.lonePairs), weight = effectiveWeight(p.lonePairWeight, phase)
    const u = orientDomains(relaxDomains(n, l, weight), l).map(v => rotateY(v, phase))
    const bonds = n - l
    const lines: SpatialLine[] = []
    const surfaces: SpatialSurface[] = []
    const points: SpatialPoint[] = [{ position: [0, 0, 0], color: WHITE, size: 0.2 }]
    for (const plane of [0, 1, 2]) {
      lines.push({ points: linspace(97, t => { const c = Math.cos(TAU * t) * 1.7 * SCALE, s = Math.sin(TAU * t) * 1.7 * SCALE; const v: Vec3 = plane === 0 ? [c, 0, s] : plane === 1 ? [c, s, 0] : [0, c, s]; return rotateY(v, phase) }), color: FAINT, opacity: 0.35 })
    }
    for (let i = 0; i < n; i++) {
      if (i < bonds) {
        lines.push({ points: [[0, 0, 0], scaled(u[i], 1.7 * SCALE)], color: CYAN })
        points.push({ position: scaled(u[i], 1.7 * SCALE), color: CYAN, size: 0.13 })
      } else {
        const shape = lobe(u[i], 0.42 * weight)
        surfaces.push(shape.surface)
        lines.push(...shape.lines)
      }
    }
    let closest: [number, number] = [0, 1], smallest = Infinity
    for (let i = 0; i < bonds; i++) for (let j = i + 1; j < bonds; j++) {
      const a = angleBetween(u[i], u[j])
      if (a < smallest - TIE) { smallest = a; closest = [i, j] }
    }
    lines.push({ points: greatArc(u[closest[0]], u[closest[1]], 1.2 * SCALE), color: AMBER })
    if (l >= 2) {
      let pair: [number, number] = [bonds, bonds + 1], best = Infinity
      for (let i = bonds; i < n; i++) for (let j = i + 1; j < n; j++) { const a = angleBetween(u[i], u[j]); if (a < best - TIE) { best = a; pair = [i, j] } }
      lines.push({ points: greatArc(u[pair[0]], u[pair[1]], 1.45 * SCALE), color: AMBER, opacity: 0.45 })
    } else if (l === 1) {
      let nearest = 0, best = Infinity
      for (let i = 0; i < bonds; i++) { const a = angleBetween(u[bonds], u[i]); if (a < best - TIE) { best = a; nearest = i } }
      lines.push({ points: greatArc(u[bonds], u[nearest], 1.45 * SCALE), color: AMBER, opacity: 0.45 })
    }
    const frame: SpatialFrame = { lines, surfaces, points }
    return frame
  },
}

export default lesson
