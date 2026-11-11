import { linspace, TAU } from '../geometry'
import type { SpatialFrame, SpatialLesson, SpatialParams, SpatialSurface, Vec3 } from '../types'

const LIME = '#a3e635'
const CYAN = '#55e6d0'
const VIOLET = '#b59aff'
const AMBER = '#ffc46b'
const FAINT = '#53617d'
const radians = (degrees: number) => degrees * Math.PI / 180
const degrees = (angle: number) => angle * 180 / Math.PI

/** B-DNA rise per base pair in ångström (Watson & Crick 1953). */
export const RISE = 3.4
/** Backbone radius in ångström: the nominal 20 Å van der Waals envelope. */
export const RADIUS = 10
/** Base pairs drawn; odd so that one chord sits at y = 0. */
export const BASE_PAIRS = 25
/** World units per ångström: 25 bp × 3.4 Å = 85 Å mapped onto y ∈ [−2.2, 2.2]. */
export const SCALE = 4.4 / (BASE_PAIRS * RISE)
const HALF_HEIGHT = 2.2
const RADIUS_W = RADIUS * SCALE
const RIBBON_HALF_WIDTH = 0.04
const ARC_RADIUS = 0.56
const BAR_RADIUS = 0.6
const SAMPLES_PER_BP = 8

/** Pitch in ångström and twist per base pair in degrees for a given helical repeat. */
export function helixParameters(bpPerTurn: number) {
  return { pitch: RISE * bpPerTurn, twist: 360 / bpPerTurn, rise: RISE }
}

/** Axial groove widths between backbone centre-lines: pitch split in the ratio Δ : (360° − Δ). */
export function grooveWidths(offsetDeg: number, bpPerTurn: number) {
  const { pitch } = helixParameters(bpPerTurn)
  const minor = pitch * offsetDeg / 360
  return { pitch, minor, major: pitch - minor }
}

/** The strand offset implied by an axial groove partition, e.g. 12 : 22 Å → 127°. */
export function offsetFromGrooves(minor: number, major: number) {
  return 360 * minor / (minor + major)
}

/** The angle subtended at the axis by a chord of given length at a given radius. */
export function offsetFromChord(chord: number, radius: number) {
  return degrees(2 * Math.asin(chord / (2 * radius)))
}

/** Chord length between two points on a circle of given radius separated by Δ. */
export function chordLength(radius: number, offsetDeg: number) {
  return 2 * radius * Math.sin(radians(offsetDeg) / 2)
}

/** Closest approach of that chord to the helix axis; zero only when Δ = 180°. */
export function chordClosestApproach(radius: number, offsetDeg: number) {
  return radius * Math.cos(radians(offsetDeg) / 2)
}

/** Contour length of double-stranded DNA in metres from a base-pair count. */
export function genomeLength(basePairs: number) {
  return basePairs * RISE * 1e-10
}

/** World pitch of the drawn helix. */
export function worldPitch(bpPerTurn: number) {
  return helixParameters(bpPerTurn).pitch * SCALE
}

/**
 * Backbone azimuth at height y. Positive handedness gives a right-handed helix about +y
 * under the (R sin θ, y, R cos θ) parametrisation; phase rotates the whole helix rigidly.
 */
export function backboneAzimuth(y: number, bpPerTurn: number, handedness: number, phase: number, offsetDeg = 0) {
  return handedness * TAU * y / worldPitch(bpPerTurn) + phase + radians(offsetDeg)
}

export function backbonePoint(y: number, bpPerTurn: number, handedness: number, phase: number, offsetDeg = 0, radius = RADIUS_W): Vec3 {
  const theta = backboneAzimuth(y, bpPerTurn, handedness, phase, offsetDeg)
  return [radius * Math.sin(theta), y, radius * Math.cos(theta)]
}

/** Sign of ((p1 − p0) × (p2 − p1)) · ŷ for three consecutive helix samples: +1 is right-handed. */
export function handednessSign(p0: Vec3, p1: Vec3, p2: Vec3) {
  const a = p1.map((v, i) => v - p0[i]) as Vec3
  const b = p2.map((v, i) => v - p1[i]) as Vec3
  return Math.sign(a[2] * b[0] - a[0] * b[2])
}

function ribbon(bpPerTurn: number, handedness: number, phase: number, offsetDeg: number, color: string): SpatialSurface {
  const surface: SpatialSurface = { vertices: [], indices: [], color, opacity: 0.18 }
  const n = BASE_PAIRS * SAMPLES_PER_BP
  for (let i = 0; i <= n; i++) {
    const y = -HALF_HEIGHT + 2 * HALF_HEIGHT * i / n
    surface.vertices.push(backbonePoint(y, bpPerTurn, handedness, phase, offsetDeg, RADIUS_W - RIBBON_HALF_WIDTH))
    surface.vertices.push(backbonePoint(y, bpPerTurn, handedness, phase, offsetDeg, RADIUS_W + RIBBON_HALF_WIDTH))
    if (i < n) { const a = 2 * i; surface.indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  }
  return surface
}

function envelope(): SpatialSurface {
  const surface: SpatialSurface = { vertices: [], indices: [], color: FAINT, opacity: 0.06 }
  const segments = 48
  for (const y of [-HALF_HEIGHT, HALF_HEIGHT]) for (let j = 0; j <= segments; j++) {
    const theta = TAU * j / segments
    surface.vertices.push([RADIUS_W * Math.sin(theta), y, RADIUS_W * Math.cos(theta)])
  }
  for (let j = 0; j < segments; j++) { const b = j + segments + 1; surface.indices.push(j, b, j + 1, j + 1, b, b + 1) }
  return surface
}

export const lesson: SpatialLesson = {
  slug: 'dna-grooves', title: 'Double-helix grooves', category: 'biology',
  blogSlug: 'dna-strands-are-not-opposite', accent: LIME,
  cameraDistance: 7,
  description: 'Set the angle between the two backbones of a double helix and watch one groove widen while the other narrows.',
  defaults: { offset: 127, bpPerTurn: 10.5, handedness: 1 },
  controls: [
    { key: 'offset', label: 'Strand offset angle Δ', min: 90, max: 180, step: 1, unit: '°' },
    { key: 'bpPerTurn', label: 'Base pairs per turn', min: 8, max: 12, step: 0.1 },
    { key: 'handedness', label: 'Handedness (−1 left, +1 right)', min: -1, max: 1, step: 2 },
  ],
  presets: [
    { label: 'Classic B-DNA fibre model', params: { offset: 127, bpPerTurn: 10, handedness: 1 } },
    { label: 'Equal grooves', params: { offset: 180, bpPerTurn: 10.5, handedness: 1 } },
    { label: 'Mirror-image stock art', params: { offset: 127, bpPerTurn: 10.5, handedness: -1 } },
  ],
  legend: [
    { label: 'Strand 1 backbone', color: LIME },
    { label: 'Strand 2 backbone', color: VIOLET },
    { label: 'Base-pair-level chords and minor groove', color: AMBER },
    { label: 'Major groove', color: CYAN },
  ],
  explanation: 'The lime and violet traces are the two sugar-phosphate backbones, drawn at the 10 Å radius of the 20 Å B-DNA envelope. Amber chords join them at each of 25 base-pair levels, and the central chord misses the axis whenever the offset angle is not 180°. At mid-height the amber arc and axial bar span the minor groove while the cyan arc and bar span the major groove, and the two bars add up to one pitch. Phase rotates the helix rigidly about its axis: for an infinite helix that is the same motion as sliding it one pitch per turn, which is the screw symmetry that makes handedness visible.',
  limitation: 'A rigid geometric helix with no bases, sugars or atoms: the chords are inter-backbone chords sharing the subtended angle of the real C1′ to C1′ line, not base pairs. Groove widths are axial fractions of the pitch between backbone centre-lines, the textbook 12 and 22 Å convention; crystallographic widths between phosphate van der Waals surfaces (Dickerson 1982) are 5.7 and 11.7 Å. The backbone sits at the nominal 10 Å envelope radius rather than the 8.9 to 9.4 Å of the phosphorus atoms, and 85 Å of DNA is scaled to 4.4 world units. Sequence-dependent twist, bending and the A and Z forms are left out.',
  readouts: p => {
    const h = helixParameters(p.bpPerTurn), g = grooveWidths(p.offset, p.bpPerTurn)
    return [
      { label: 'Pitch and twist per base pair', value: `${h.pitch.toFixed(1)} Å, ${h.twist.toFixed(1)}°` },
      { label: 'Minor groove, axial width', value: `${g.minor.toFixed(2)} Å` },
      { label: 'Major groove, axial width', value: `${g.major.toFixed(2)} Å` },
      { label: 'Chord closest approach to axis', value: `${chordClosestApproach(RADIUS, p.offset).toFixed(2)} Å` },
    ]
  },
  build: (p: SpatialParams, phase: number): SpatialFrame => {
    const s = p.handedness >= 0 ? 1 : -1, n = BASE_PAIRS * SAMPLES_PER_BP
    const strand = (offsetDeg: number) => linspace(n + 1, u => backbonePoint(-HALF_HEIGHT + 2 * HALF_HEIGHT * u, p.bpPerTurn, s, phase, offsetDeg))
    const lines: SpatialFrame['lines'] = [
      { points: [[0, -HALF_HEIGHT, 0], [0, HALF_HEIGHT, 0]], color: FAINT },
      { points: strand(0), color: LIME },
      { points: strand(p.offset), color: VIOLET },
    ]
    const centre = (BASE_PAIRS - 1) / 2
    for (let k = 0; k < BASE_PAIRS; k++) {
      const y = (k - centre) * RISE * SCALE
      lines.push({ points: [backbonePoint(y, p.bpPerTurn, s, phase), backbonePoint(y, p.bpPerTurn, s, phase, p.offset)], color: AMBER, opacity: k === centre ? 1 : 0.5 })
    }
    const theta0 = backboneAzimuth(0, p.bpPerTurn, s, phase), delta = radians(p.offset)
    const onArc = (theta: number): Vec3 => [ARC_RADIUS * Math.sin(theta), 0, ARC_RADIUS * Math.cos(theta)]
    lines.push({ points: linspace(33, u => onArc(theta0 + delta * u)), color: AMBER })
    lines.push({ points: linspace(97, u => onArc(theta0 + delta + (TAU - delta) * u)), color: CYAN })
    const pitch = worldPitch(p.bpPerTurn)
    const bar = (y: number): Vec3 => [BAR_RADIUS * Math.sin(theta0), y, BAR_RADIUS * Math.cos(theta0)]
    const minorEnd = -s * pitch * p.offset / 360, majorEnd = s * pitch * (1 - p.offset / 360)
    lines.push({ points: [bar(0), bar(minorEnd)], color: AMBER })
    lines.push({ points: [bar(0), bar(majorEnd)], color: CYAN })
    return {
      lines,
      surfaces: [envelope(), ribbon(p.bpPerTurn, s, phase, 0, LIME), ribbon(p.bpPerTurn, s, phase, p.offset, VIOLET)],
      points: [
        { position: backbonePoint(0, p.bpPerTurn, s, phase), color: LIME, size: 0.06 },
        { position: backbonePoint(0, p.bpPerTurn, s, phase, p.offset), color: VIOLET, size: 0.06 },
        { position: bar(minorEnd), color: AMBER, size: 0.045 },
        { position: bar(majorEnd), color: CYAN, size: 0.045 },
      ],
    }
  },
}

export default lesson
