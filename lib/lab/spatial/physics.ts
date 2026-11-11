import { arrow, linspace, TAU } from './geometry'
import type { SpatialFrame, SpatialLesson, SpatialParams, SpatialSurface, Vec3 } from './types'

const CYAN = '#55e6d0'
const VIOLET = '#b59aff'
const AMBER = '#ffc46b'
const FAINT = '#53617d'
const radians = (degrees: number) => degrees * Math.PI / 180

/** Normalisation keeps time-averaged incident intensity fixed as the ratio changes. */
export function polarisationField(ratio: number, delay: number, phase: number): [number, number] {
  const scale = 1 / Math.sqrt(1 + ratio * ratio)
  return [scale * Math.cos(phase), scale * ratio * Math.cos(phase + radians(delay))]
}

export function polarisationMetrics(ratio: number, delay: number, analyser: number) {
  const delta = radians(delay), a = radians(analyser)
  const trace = 1 + ratio * ratio
  const discriminant = Math.sqrt((1 - ratio * ratio) ** 2 + 4 * ratio * ratio * Math.cos(delta) ** 2)
  const majorSquared = (trace + discriminant) / 2
  const minorSquared = Math.max(0, (trace - discriminant) / 2)
  return {
    ellipticity: Math.sqrt(minorSquared / majorSquared),
    transmission: (Math.cos(a) ** 2 + ratio * ratio * Math.sin(a) ** 2 + 2 * ratio * Math.cos(delta) * Math.sin(a) * Math.cos(a)) / trace,
  }
}

const polarisation: SpatialLesson = {
  slug: 'polarisation', title: 'Polarisation in 3D', category: 'physics',
  blogSlug: 'light-draws-an-ellipse', accent: VIOLET,
  description: 'Two transverse oscillations trace a line, an ellipse, or a circle. Inspect the field and project it through an analyser.',
  defaults: { ratio: 1, delay: 90, analyser: 0 },
  controls: [
    { key: 'ratio', label: 'Amplitude ratio', min: 0, max: 1.5, step: 0.05 },
    { key: 'delay', label: 'Phase delay', min: -180, max: 180, step: 5, unit: '°' },
    { key: 'analyser', label: 'Analyser angle', min: 0, max: 180, step: 5, unit: '°' },
  ],
  presets: [
    { label: 'Linear', params: { ratio: 1, delay: 0, analyser: 0 } },
    { label: 'Circular', params: { ratio: 1, delay: 90, analyser: 0 } },
    { label: 'Elliptical', params: { ratio: 0.4, delay: 90, analyser: 30 } },
  ],
  legend: [{ label: 'Electric field', color: CYAN }, { label: 'Fixed-point ellipse', color: VIOLET }, { label: 'Analyser and transmitted field', color: AMBER }],
  explanation: 'The cyan curve samples the electric field along the propagation axis at one instant. The violet ellipse records all field directions at the left cross-section. The amber arrow is the instantaneous projection onto the analyser at the right cross-section. Circular light transmits half its mean intensity through every analyser angle.',
  limitation: 'An ideal monochromatic plane wave and ideal linear analyser. Field lengths are normalised, and optical oscillations are slowed. The helix is a field snapshot, not a photon trajectory. Handedness depends on your viewing direction.',
  readouts: p => {
    const m = polarisationMetrics(p.ratio, p.delay, p.analyser)
    return [{ label: 'Minor / major axis', value: m.ellipticity.toFixed(3) }, { label: 'Mean transmission', value: `${(100 * m.transmission).toFixed(1)}%` }, { label: 'Incident mean |E|²', value: '0.500 (normalised)' }]
  },
  build: (p, phase) => {
    const at = (x: number): Vec3 => { const [y, z] = polarisationField(p.ratio, p.delay, 3 * x - phase); return [x, y, z] }
    const lines: SpatialFrame['lines'] = [
      { points: [[-2.6, 0, 0], [2.6, 0, 0]], color: FAINT },
      { points: linspace(181, u => at(-2.4 + 4.8 * u)), color: CYAN },
      { points: linspace(97, u => { const [y, z] = polarisationField(p.ratio, p.delay, u * TAU); return [-2.4, y, z] }), color: VIOLET },
    ]
    for (let i = 0; i <= 12; i++) {
      const x = -2.4 + i * 0.4
      lines.push(...arrow([x, 0, 0], at(x), CYAN))
    }
    const a = radians(p.analyser), y = Math.cos(a), z = Math.sin(a)
    const field = at(2.4), projection = field[1] * y + field[2] * z
    lines.push({ points: [[2.4, -1.15 * y, -1.15 * z], [2.4, 1.15 * y, 1.15 * z]], color: AMBER })
    lines.push(...arrow([2.4, 0, 0], [2.4, projection * y, projection * z], AMBER))
    lines.push({ points: [field, [2.4, projection * y, projection * z]], color: AMBER, opacity: 0.45 })
    return { lines, points: [{ position: at(-2.4), color: VIOLET, size: 0.07 }, { position: [2.4, projection * y, projection * z], color: AMBER, size: 0.07 }] }
  },
}

/** Exact Gaussian integral for ω(k)=ω₀+v_g(k−k₀)+β₂(k−k₀)²/2. */
export function gaussianPacket(x: number, time: number, width: number, groupSpeed: number, dispersion: number) {
  const centre = -1.6 + groupSpeed * time
  const a = width * width, b = dispersion * time, denominator = a * a + b * b
  const dx = x - centre
  const envelope = Math.sqrt(a / Math.sqrt(denominator)) * Math.exp(-dx * dx * a / (2 * denominator))
  const angle = 10 * (x + 1.6) - 10 * time + dx * dx * b / (2 * denominator) - Math.atan2(b, a) / 2
  return { real: envelope * Math.cos(angle), imaginary: envelope * Math.sin(angle), envelope, centre, width: Math.sqrt(denominator / a) }
}

const groupVelocity: SpatialLesson = {
  slug: 'group-velocity', title: 'Wave Packet Laboratory', category: 'physics',
  blogSlug: 'a-wave-packet-has-two-speeds', accent: VIOLET,
  description: 'Follow an envelope while carrier crests slip through it, then let dispersion spread the packet.',
  defaults: { groupSpeed: 0.5, dispersion: 0, width: 0.65 },
  controls: [
    { key: 'groupSpeed', label: 'Group / phase speed', min: 0.3, max: 1.4, step: 0.1 },
    { key: 'dispersion', label: 'Dispersion curvature', min: 0, max: 0.4, step: 0.02 },
    { key: 'width', label: 'Initial packet width', min: 0.4, max: 1, step: 0.05 },
  ],
  presets: [
    { label: 'Together', params: { groupSpeed: 1, dispersion: 0, width: 0.65 } },
    { label: 'Crests overtake', params: { groupSpeed: 0.5, dispersion: 0, width: 0.65 } },
    { label: 'Spreading', params: { groupSpeed: 0.5, dispersion: 0.3, width: 0.65 } },
  ],
  legend: [{ label: 'Complex wave: real height, imaginary depth', color: CYAN }, { label: 'Envelope magnitude', color: VIOLET }, { label: 'Envelope centre', color: AMBER }],
  explanation: 'The cyan helix uses height for the real field and depth for its imaginary quadrature. Its radius is the violet Gaussian envelope. The amber marker follows the envelope centre. Phase speed is fixed at 1; group speed sets translation, while curvature alone causes spreading. One timeline pass represents 3 model time units.',
  limitation: 'An exact solution for a quadratic dispersion law, used as a narrowband approximation to a real medium. The depth axis is a mathematical quadrature, not a second physical displacement. The viewing window crops the tails and the timeline restarts. Group speed is not a universal information speed.',
  readouts: p => [
    { label: 'Carrier phase speed', value: '1.00 (model units)' },
    { label: 'Envelope group speed', value: p.groupSpeed.toFixed(2) },
    { label: 'Width after 3 time units', value: gaussianPacket(0, 3, p.width, p.groupSpeed, p.dispersion).width.toFixed(3) },
  ],
  build: (p, phase) => {
    const time = phase / TAU * 3
    const sample = (x: number) => gaussianPacket(x, time, p.width, p.groupSpeed, p.dispersion)
    const lines: SpatialFrame['lines'] = [
      { points: [[-2.6, 0, 0], [2.6, 0, 0]], color: FAINT },
      { points: linspace(241, u => { const x = -2.6 + 5.2 * u, s = sample(x); return [x, s.real, s.imaginary] }), color: CYAN },
    ]
    for (const sign of [-1, 1]) lines.push({ points: linspace(121, u => { const x = -2.6 + 5.2 * u; return [x, sign * sample(x).envelope, 0] }), color: VIOLET })
    const surface: SpatialSurface = { vertices: [], indices: [], color: VIOLET, opacity: 0.07 }
    const nx = 64, nr = 20
    for (let i = 0; i <= nx; i++) {
      const x = -2.6 + 5.2 * i / nx, radius = sample(x).envelope
      for (let j = 0; j <= nr; j++) surface.vertices.push([x, radius * Math.cos(TAU * j / nr), radius * Math.sin(TAU * j / nr)])
      if (i < nx) for (let j = 0; j < nr; j++) { const a = i * (nr + 1) + j, b = a + nr + 1; surface.indices.push(a, b, a + 1, a + 1, b, b + 1) }
    }
    const centre = sample(0).centre
    if (centre >= -2.6 && centre <= 2.6) lines.push({ points: linspace(65, u => [centre, sample(centre).envelope * Math.cos(TAU * u), sample(centre).envelope * Math.sin(TAU * u)]), color: AMBER })
    return { lines, surfaces: [surface], points: centre <= 2.6 ? [{ position: [centre, 0, 0], color: AMBER, size: 0.06 }] : [] }
  },
}

export function gyroscopeMetrics(spinRpm: number, lever: number, tilt: number) {
  const mass = 0.4, radius = 0.08, gravity = 9.81
  const inertia = mass * radius * radius / 2
  const spin = spinRpm * TAU / 60
  const momentum = inertia * spin
  const precession = mass * gravity * lever / momentum
  return { inertia, spin, momentum, precession, period: TAU / precession, torque: mass * gravity * lever * Math.sin(radians(tilt)) }
}

export function gyroscopeAxis(p: SpatialParams, phase: number): Vec3 {
  const angle = gyroscopeMetrics(p.spin, p.lever, p.tilt).precession * phase / 2
  const tilt = radians(p.tilt)
  return [Math.sin(tilt) * Math.cos(angle), Math.cos(tilt), -Math.sin(tilt) * Math.sin(angle)]
}

const gyroscope: SpatialLesson = {
  slug: 'gyroscope', title: 'Gyroscopic Precession', category: 'physics',
  blogSlug: 'a-gyroscope-falls-sideways', accent: VIOLET,
  cameraDistance: 7.5,
  description: 'Gravity turns angular momentum sideways. Change the spin and measure how quickly the axle precesses.',
  defaults: { spin: 1200, tilt: 45, lever: 0.06 },
  controls: [
    { key: 'spin', label: 'Rotor spin', min: 600, max: 2400, step: 100, unit: 'rpm' },
    { key: 'tilt', label: 'Tilt from vertical', min: 20, max: 65, step: 5, unit: '°' },
    { key: 'lever', label: 'Centre-of-mass lever', min: 0.03, max: 0.12, step: 0.01, unit: 'm' },
  ],
  presets: [
    { label: 'Baseline', params: { spin: 1200, tilt: 45, lever: 0.06 } },
    { label: 'Double the spin', params: { spin: 2400, tilt: 45, lever: 0.06 } },
    { label: 'Double the lever', params: { spin: 1200, tilt: 45, lever: 0.12 } },
  ],
  legend: [{ label: 'Axle and spin angular momentum', color: CYAN }, { label: 'Rotor and precession circle', color: VIOLET }, { label: 'Gravity and torque direction', color: AMBER }],
  explanation: 'The violet disc spins about the cyan axle. Gravity points down from its centre; the horizontal amber arrow at the pivot shows torque. Torque is tangent to the cone of angular momentum. Doubling spin halves the precession rate. One timeline pass is π seconds; rotor spokes are slowed tenfold for legibility.',
  limitation: 'Steady slow-precession approximation for a symmetric 0.4 kg solid disc of radius 0.08 m. It omits nutation, bearing friction and angular momentum due to precession. Geometry and arrow lengths are illustrative; the readouts carry physical units. The timeline restarts after π seconds.',
  readouts: p => { const m = gyroscopeMetrics(p.spin, p.lever, p.tilt); return [
    { label: 'Precession rate', value: `${m.precession.toFixed(3)} rad/s` },
    { label: 'Precession period', value: `${m.period.toFixed(2)} s` },
    { label: 'Spin angular momentum', value: `${m.momentum.toFixed(4)} kg m²/s` },
  ] },
  build: (p, phase) => {
    const metrics = gyroscopeMetrics(p.spin, p.lever, p.tilt), n = gyroscopeAxis(p, phase)
    const azimuth = metrics.precession * phase / 2, tilt = radians(p.tilt)
    const e: Vec3 = [Math.cos(tilt) * Math.cos(azimuth), -Math.sin(tilt), -Math.cos(tilt) * Math.sin(azimuth)]
    const f: Vec3 = [-Math.sin(azimuth), 0, -Math.cos(azimuth)]
    const pivot: Vec3 = [0, -1.3, 0]
    const centre = pivot.map((v, i) => v + n[i] * 1.65) as Vec3
    const onDisc = (a: number, radius = 0.8, offset = 0): Vec3 => centre.map((v, i) => v + radius * (Math.cos(a) * e[i] + Math.sin(a) * f[i]) + offset * n[i]) as Vec3
    const top = pivot.map((v, i) => v + n[i] * (1.2 + p.spin * 0.0005)) as Vec3
    const lines: SpatialFrame['lines'] = [
      { points: [[0, -1.3, 0], [0, 1.5, 0]], color: FAINT },
      ...arrow(pivot, top, CYAN),
      ...arrow(centre, [centre[0], centre[1] - 0.7, centre[2]], AMBER),
      ...arrow(pivot, [pivot[0] + n[2] * 0.9, pivot[1], pivot[2] - n[0] * 0.9], AMBER),
      { points: linspace(97, u => [1.65 * Math.sin(tilt) * Math.cos(u * TAU), centre[1], -1.65 * Math.sin(tilt) * Math.sin(u * TAU)]), color: VIOLET, opacity: 0.4 },
    ]
    for (const offset of [-0.08, 0.08]) lines.push({ points: linspace(97, u => onDisc(u * TAU, 0.8, offset)), color: VIOLET })
    const spinAngle = metrics.spin * phase / 20
    for (let i = 0; i < 8; i++) lines.push({ points: [centre, onDisc(spinAngle + i * TAU / 8)], color: i === 0 ? AMBER : VIOLET, opacity: i === 0 ? 1 : 0.55 })
    const surface: SpatialSurface = { vertices: [centre], indices: [], color: VIOLET, opacity: 0.22 }
    for (let i = 0; i <= 64; i++) { surface.vertices.push(onDisc(TAU * i / 64)); if (i < 64) surface.indices.push(0, i + 1, i + 2) }
    return { lines, surfaces: [surface], points: [{ position: pivot, color: AMBER, size: 0.09 }, { position: centre, color: CYAN, size: 0.06 }] }
  },
}

export const physicsLessons: SpatialLesson[] = [polarisation, groupVelocity, gyroscope]
