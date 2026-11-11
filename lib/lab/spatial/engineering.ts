import { arrow, linspace, TAU } from './geometry'
import type { SpatialFrame, SpatialLesson, SpatialLine, Vec3 } from './types'

const AMBER = '#f5a623'
const CYAN = '#5ee7ef'
const PURPLE = '#b99aff'
const GREY = '#607089'
const WHITE = '#eff8ff'
const DEG = Math.PI / 180

/** Normalised field amplitude of isotropic elements along x; u is direction cosine. */
export function arrayFactor(count: number, spacing: number, steering: number, u: number): number {
  const phase = TAU * spacing * (u - Math.sin(steering * DEG))
  let real = 0, imaginary = 0
  for (let n = 0; n < count; n++) {
    real += Math.cos(n * phase)
    imaginary += Math.sin(n * phase)
  }
  return Math.hypot(real, imaginary) / count
}

export function gratingDirections(spacing: number, steering: number): number[] {
  const u0 = Math.sin(steering * DEG)
  return Array.from({ length: 9 }, (_, i) => u0 + (i - 4) / spacing)
    .filter(u => u >= -1 - 1e-10 && u <= 1 + 1e-10)
    .map(u => Math.asin(Math.max(-1, Math.min(1, u))) / DEG)
}

export function rotatingField(phase: number, amplitude: number, sequence: number): Vec3 {
  const result: Vec3 = [0, 0, 0]
  for (let k = 0; k < 3; k++) {
    const axis = k * TAU / 3
    const current = amplitude * Math.cos(phase - sequence * axis)
    result[0] += current * Math.cos(axis)
    result[1] += current * Math.sin(axis)
  }
  return result
}

/** Dimensionless βa or αa for an air-filled TE10 mode; a is the wide wall. */
export function waveguideNumbers(ratio: number, widthMm: number) {
  const propagating = ratio > 1
  const longitudinal = Math.PI * Math.sqrt(Math.abs(ratio * ratio - 1))
  const cutoffGHz = 299792458 / (2 * widthMm * 1e-3) / 1e9
  return {
    propagating, longitudinal, cutoffGHz,
    groupOverC: propagating ? Math.sqrt(1 - 1 / (ratio * ratio)) : 0,
    wavelengthOverA: propagating ? TAU / longitudinal : Infinity,
  }
}

export function coaxFields(voltage: number, current: number, innerMm: number, outerMm: number, radiusMm: number) {
  const r = radiusMm * 1e-3
  const electric = voltage / (r * Math.log(outerMm / innerMm))
  const magnetic = current / (TAU * r)
  return { electric, magnetic, poynting: electric * magnetic, power: voltage * current }
}

function circle(radius: number, z: number, color: string, opacity = 1): SpatialLine {
  return { points: linspace(81, u => [radius * Math.cos(TAU * u), radius * Math.sin(TAU * u), z]), color, opacity }
}

const phasedArray: SpatialLesson = {
  slug: 'phased-array', title: 'Phased array', category: 'engineering',
  blogSlug: 'steering-a-beam-without-moving-an-antenna', accent: AMBER,
  description: 'Steer a linear array and reveal the extra beams caused by spatial aliasing.',
  defaults: { elements: 8, spacing: 0.5, steering: 25 },
  controls: [
    { key: 'elements', label: 'Elements', min: 2, max: 12, step: 1 },
    { key: 'spacing', label: 'Element spacing', min: 0.25, max: 1.25, step: 0.05, unit: 'λ' },
    { key: 'steering', label: 'Steering angle', min: -60, max: 60, step: 1, unit: '°' },
  ],
  presets: [
    { label: 'Broadside', params: { elements: 8, spacing: 0.5, steering: 0 } },
    { label: 'Steer 30°', params: { elements: 8, spacing: 0.5, steering: 30 } },
    { label: 'Grating lobes', params: { elements: 8, spacing: 1, steering: 30 } },
  ],
  legend: [{ label: 'Field-amplitude envelope', color: CYAN }, { label: 'Array elements / drive phase', color: AMBER }, { label: 'Chosen steering direction', color: PURPLE }],
  explanation: 'The radius is normalised far-field amplitude, not a wavefront. A linear array selects a direction cosine: in three dimensions its maxima form cones. The highlighted slice shows the familiar steering angle. The peak-angle readout lists the forward (+z) half-plane only.',
  limitation: 'Uniform, isotropic, uncoupled point sources at one frequency. No element radiation pattern, mutual coupling, losses or beam squint. Element positions are rescaled to fit; spacing remains in the phase calculation.',
  readouts: p => [
    { label: 'Adjacent drive phase', value: `${(-360 * p.spacing * Math.sin(p.steering * DEG)).toFixed(1)}°` },
    { label: 'Aperture', value: `${((p.elements - 1) * p.spacing).toFixed(2)} λ` },
    { label: 'Forward-half-plane peaks', value: gratingDirections(p.spacing, p.steering).map(a => `${a.toFixed(1)}°`).join(', ') },
  ],
  build: (p, phase) => {
    const lines: SpatialLine[] = []
    const vertices: Vec3[] = [], indices: number[] = []
    const rows = 48, columns = 40
    for (let i = 0; i <= rows; i++) {
      const polar = Math.PI * i / rows
      const ux = Math.cos(polar)
      const radius = 2.3 * arrayFactor(p.elements, p.spacing, p.steering, ux)
      for (let j = 0; j <= columns; j++) {
        const az = TAU * j / columns
        vertices.push([radius * ux, radius * Math.sin(polar) * Math.sin(az), radius * Math.sin(polar) * Math.cos(az)])
        if (i < rows && j < columns) {
          const a = i * (columns + 1) + j, b = a + columns + 1
          indices.push(a, b, a + 1, a + 1, b, b + 1)
        }
      }
    }
    for (let slice = 0; slice < 8; slice++) {
      const az = slice * Math.PI / 8
      lines.push({ color: slice === 0 ? WHITE : CYAN, opacity: slice === 0 ? 1 : 0.3,
        points: linspace(193, u => {
          const theta = TAU * u, radius = 2.3 * arrayFactor(p.elements, p.spacing, p.steering, Math.sin(theta))
          return [radius * Math.sin(theta), radius * Math.cos(theta) * Math.sin(az), radius * Math.cos(theta) * Math.cos(az)]
        }) })
    }
    lines.push({ points: [[-1.65, 0, 0], [1.65, 0, 0]], color: GREY })
    const points = Array.from({ length: p.elements }, (_, n) => {
      const x = -1.5 + 3 * n / (p.elements - 1)
      const drive = phase - n * TAU * p.spacing * Math.sin(p.steering * DEG)
      lines.push(...arrow([x, 0, 0], [x, 0.32 * Math.cos(drive), 0.32 * Math.sin(drive)], AMBER))
      return { position: [x, 0, 0] as Vec3, color: AMBER, size: 0.055 }
    })
    lines.push(...arrow([0, 0, 0], [2.55 * Math.sin(p.steering * DEG), 0, 2.55 * Math.cos(p.steering * DEG)], PURPLE))
    return { lines, points, surfaces: [{ vertices, indices, color: CYAN, opacity: 0.16 }] }
  },
}

const rotating: SpatialLesson = {
  slug: 'rotating-field', title: 'Three-phase rotating field', category: 'engineering',
  blogSlug: 'three-phases-make-a-rotating-field', accent: AMBER,
  description: 'Add three pulsating fields and watch their sum rotate at constant strength.',
  defaults: { amplitude: 1, sequence: 1 },
  controls: [
    { key: 'amplitude', label: 'Phase field amplitude', min: 0.2, max: 1.3, step: 0.1, unit: 'B₀' },
    { key: 'sequence', label: 'Phase sequence', min: -1, max: 1, step: 2 },
  ],
  presets: [
    { label: 'Forward sequence', params: { amplitude: 1, sequence: 1 } },
    { label: 'Reverse sequence', params: { amplitude: 1, sequence: -1 } },
    { label: 'Half field', params: { amplitude: 0.5, sequence: 1 } },
  ],
  legend: [{ label: 'Phase A', color: AMBER }, { label: 'Phase B', color: CYAN }, { label: 'Phase C', color: PURPLE }, { label: 'Vector sum', color: WHITE }],
  explanation: 'Each coloured arrow oscillates on a fixed winding axis. The white arrow is their vector sum: its tip stays on the white circle. Sequence +1 and −1 exchange the order of phases B and C.',
  limitation: 'Ideal two-pole, sinusoidally distributed windings and balanced currents. Coil loops indicate axes; they are not a winding construction drawing. The white arrow is a field vector, not a rotor or a torque prediction.',
  readouts: p => [
    { label: 'Resultant field', value: `${(1.5 * p.amplitude).toFixed(2)} B₀` },
    { label: 'Winding separation', value: '120° electrical' },
    { label: 'Sequence', value: p.sequence > 0 ? 'A → B → C' : 'A → C → B' },
  ],
  build: (p, phase) => {
    const lines: SpatialLine[] = [circle(2.05, -0.42, GREY, 0.6), circle(2.05, 0.42, GREY, 0.6), circle(p.amplitude * 1.5, 0, WHITE, 0.4)]
    const colours = [AMBER, CYAN, PURPLE]
    for (let k = 0; k < 3; k++) {
      const angle = k * TAU / 3, c = Math.cos(angle), s = Math.sin(angle)
      const strength = p.amplitude * Math.cos(phase - p.sequence * angle)
      lines.push({ points: [[-2.1 * c, -2.1 * s, 0], [2.1 * c, 2.1 * s, 0]], color: colours[k], opacity: 0.2 })
      lines.push(...arrow([0, 0, 0.06 * (k + 1)], [strength * c, strength * s, 0.06 * (k + 1)], colours[k]))
      for (const sign of [-1, 1]) {
        for (let turn = 0; turn < 3; turn++) {
          const radius = sign * (1.65 + turn * 0.1)
          lines.push({ points: linspace(45, u => [radius * c - 0.28 * s * Math.cos(TAU * u), radius * s + 0.28 * c * Math.cos(TAU * u), 0.55 * Math.sin(TAU * u)]), color: colours[k], opacity: 0.8 })
        }
      }
    }
    const sum = rotatingField(phase, p.amplitude, p.sequence)
    lines.push(...arrow([0, 0, 0], sum, WHITE))
    return { lines, points: [{ position: sum, color: WHITE, size: 0.075 }] }
  },
}

const waveguide: SpatialLesson = {
  slug: 'waveguide', title: 'Waveguide cutoff', category: 'engineering',
  blogSlug: 'a-waveguide-is-a-high-pass-filter', accent: AMBER,
  description: 'Move the TE₁₀ mode through cutoff and see a travelling field become evanescent.',
  defaults: { ratio: 1.5, width: 22.86 },
  controls: [
    { key: 'ratio', label: 'Frequency / cutoff', min: 0.5, max: 1.9, step: 0.05 },
    { key: 'width', label: 'Wide wall', min: 10, max: 40, step: 0.01, unit: 'mm' },
  ],
  presets: [
    { label: 'Below cutoff', params: { ratio: 0.75, width: 22.86 } },
    { label: 'Near cutoff', params: { ratio: 1.05, width: 22.86 } },
    { label: 'Propagating', params: { ratio: 1.5, width: 22.86 } },
  ],
  legend: [{ label: 'Electric field Eᵧ', color: CYAN }, { label: 'Field envelope', color: AMBER }, { label: 'Perfect-conductor walls', color: GREY }],
  explanation: 'Across the wide wall the field makes one half-sine. Above cutoff that pattern advances along the guide; below cutoff it oscillates in place and decays with distance from the driven entrance.',
  limitation: 'Air-filled, perfectly conducting guide, b = a/2, single TE₁₀ mode. Length is two wide-wall widths. Only Eᵧ is drawn; the magnetic field has both transverse and longitudinal components. Below cutoff shows a single decaying solution, not a finite tunnelling section.',
  readouts: p => {
    const n = waveguideNumbers(p.ratio, p.width)
    return [
      { label: 'Cutoff frequency', value: `${n.cutoffGHz.toFixed(3)} GHz` },
      { label: 'Drive frequency', value: `${(n.cutoffGHz * p.ratio).toFixed(3)} GHz` },
      { label: n.propagating ? 'Group velocity / c' : 'Decay αa', value: n.propagating ? n.groupOverC.toFixed(3) : n.longitudinal.toFixed(3) },
    ]
  },
  build: (p, phase) => {
    const n = waveguideNumbers(p.ratio, p.width)
    const lines: SpatialLine[] = []
    const field = (x: number, z: number) => Math.sin(Math.PI * (x + 1.2) / 2.4) * (n.propagating
      ? Math.cos(n.longitudinal * (z + 2.4) / 2.4 - phase)
      : Math.exp(-n.longitudinal * (z + 2.4) / 2.4) * Math.cos(phase))
    for (const x of [-1.2, 1.2]) for (const y of [-0.6, 0.6]) lines.push({ points: [[x, y, -2.4], [x, y, 2.4]], color: GREY })
    for (const z of [-2.4, 0, 2.4]) lines.push({ points: [[-1.2, -0.6, z], [1.2, -0.6, z], [1.2, 0.6, z], [-1.2, 0.6, z], [-1.2, -0.6, z]], color: GREY, opacity: 0.65 })
    for (let j = 0; j <= 12; j++) {
      const z = -2.4 + 4.8 * j / 12
      for (let i = 1; i < 7; i++) {
        const x = -1.2 + 2.4 * i / 7
        lines.push(...arrow([x, 0, z], [x, 0.54 * field(x, z), z], CYAN))
      }
    }
    for (let i = 1; i < 7; i++) {
      const x = -1.2 + 2.4 * i / 7
      lines.push({ points: linspace(100, u => { const z = -2.4 + u * 4.8; return [x, 0.54 * field(x, z), z] }), color: CYAN, opacity: 0.35 })
    }
    for (const sign of [-1, 1]) lines.push({ points: linspace(100, u => [0, sign * 0.54 * (n.propagating ? 1 : Math.exp(-2 * n.longitudinal * u)), -2.4 + u * 4.8]), color: AMBER, opacity: 0.8 })
    return { lines }
  },
}

const poynting: SpatialLesson = {
  slug: 'poynting-flow', title: 'Power in a coaxial cable', category: 'engineering',
  blogSlug: 'power-flows-around-the-wire', accent: AMBER,
  description: 'Cross radial electric and circular magnetic fields to recover the circuit power VI.',
  defaults: { voltage: 12, current: 2, radius: 3 },
  controls: [
    { key: 'voltage', label: 'Voltage', min: 0, max: 24, step: 1, unit: 'V' },
    { key: 'current', label: 'Current', min: -4, max: 4, step: 0.25, unit: 'A' },
    { key: 'radius', label: 'Outer / inner radius', min: 2, max: 5, step: 0.1 },
  ],
  presets: [
    { label: '24 W forward', params: { voltage: 12, current: 2, radius: 3 } },
    { label: 'Reverse power', params: { voltage: 12, current: -2, radius: 3 } },
    { label: 'Charged, no flow', params: { voltage: 12, current: 0, radius: 3 } },
  ],
  legend: [{ label: 'Radial electric field E', color: AMBER }, { label: 'Azimuthal magnetic field H', color: PURPLE }, { label: 'Axial power flow E × H', color: CYAN }],
  explanation: 'The coax is shown as a transparent cutaway. Amber arrows point radially out; purple arrows circle the centre conductor. Their cross product points along the dielectric. Reverse current to reverse the power flow.',
  limitation: 'Ideal lossless coax carrying steady DC with inner radius a = 1 mm. Independent V and I describe a driven steady circuit, not an imposed travelling-wave impedance. Arrow lengths are separately normalised; moving dots show direction only, not electron or energy velocity.',
  readouts: p => {
    const f = coaxFields(p.voltage, p.current, 1, p.radius, Math.sqrt(p.radius))
    return [
      { label: 'Integrated power', value: `${f.power.toFixed(1)} W` },
      { label: 'E at r = √(ab)', value: `${f.electric.toFixed(0)} V/m` },
      { label: 'H at r = √(ab)', value: `${f.magnetic.toFixed(1)} A/m` },
    ]
  },
  build: (p, phase) => {
    const inner = 0.4, outer = inner * p.radius
    const lines: SpatialLine[] = []
    const points: NonNullable<SpatialFrame['points']> = []
    for (const z of [-2.2, -1.1, 0, 1.1, 2.2]) {
      lines.push(circle(inner, z, AMBER, 0.35), circle(outer, z, GREY, 0.45))
    }
    for (let j = 0; j < 12; j++) {
      const a = j * TAU / 12, c = Math.cos(a), s = Math.sin(a)
      lines.push({ points: [[outer * c, outer * s, -2.2], [outer * c, outer * s, 2.2]], color: GREY, opacity: 0.2 })
      lines.push({ points: [[inner * c, inner * s, -2.2], [inner * c, inner * s, 2.2]], color: AMBER, opacity: 0.2 })
      const r = Math.sqrt(inner * outer)
      const electricLength = Math.min(0.5, (outer - r) * 0.9) * p.voltage / 24
      const magneticLength = 0.34 * p.current / 4
      const powerLength = 0.65 * p.voltage * p.current / 96
      const from: Vec3 = [r * c, r * s, 0]
      lines.push(...arrow(from, [(r + electricLength) * c, (r + electricLength) * s, 0], AMBER))
      lines.push(...arrow(from, [r * c - magneticLength * s, r * s + magneticLength * c, 0], PURPLE))
      lines.push(...arrow([r * c, r * s, 0.9], [r * c, r * s, 0.9 + powerLength], CYAN))
      if (p.current !== 0 && p.voltage !== 0) {
        const progress = ((phase / TAU * Math.sign(p.current) + j / 12) % 1 + 1) % 1
        points.push({ position: [r * c, r * s, -2.1 + 4.2 * progress], color: CYAN, size: 0.04 })
      }
    }
    if (p.current !== 0) lines.push(circle(Math.sqrt(inner * outer), 0, PURPLE, 0.55))
    return { lines, points }
  },
}

export const engineeringLessons: SpatialLesson[] = [phasedArray, rotating, waveguide, poynting]
