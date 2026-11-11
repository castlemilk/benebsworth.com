import { linspace, TAU } from '../geometry'
import type { SpatialFrame, SpatialLesson, SpatialParams, SpatialSurface, Vec3 } from '../types'

const LIME = '#a3e635'
const CYAN = '#55e6d0'
const VIOLET = '#b59aff'
const AMBER = '#ffc46b'
const FAINT = '#53617d'
const degrees = (radians: number) => radians * 180 / Math.PI

/** Raup's model is drawn over four whorls; the aperture of the finished shell sits at θ = 0. */
export const WHORLS = 4
/** The finished aperture's outer edge sits this far from the coiling axis, in world units. */
export const OUTER_RADIUS = 1.8
/** Tall shells are shrunk until half their axial extent fits this budget (the grid sits at y = -2.35). */
const AXIAL_BUDGET = 2.2
const THETA_SAMPLES = 192
const RING_SAMPLES = 16

export const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2
/** A true golden spiral expands by φ per quarter turn, so by φ⁴ per revolution. */
export const GOLDEN_WHORL_EXPANSION = GOLDEN_RATIO ** 4

/** Linear growth factor per quarter turn for a spiral that expands W per revolution. */
export const quarterTurnGrowth = (expansion: number) => expansion ** 0.25

/** Constant angle, in degrees, between tangent and radius for r = r₀·W^(θ/2π). */
export const spiralAngle = (expansion: number) => degrees(Math.atan(TAU / Math.log(expansion)))

/** Inverse of spiralAngle: the whorl expansion implied by a measured equiangular angle in degrees. */
export const expansionFromAngle = (angle: number) => Math.exp(TAU / Math.tan(angle * Math.PI / 180))

/**
 * Raup (1966) conventions. D = (c − ρ)/(c + ρ) is the inner-edge distance over the outer-edge
 * distance, so fixing the finished outer edge c₀ + ρ₀ = R gives ρ₀ = R(1 − D)/2 and c₀ = R(1 + D)/2.
 */
export function generatingCurve(distance: number, outerRadius = OUTER_RADIUS) {
  return { rho: outerRadius * (1 - distance) / 2, centre: outerRadius * (1 + distance) / 2 }
}

/**
 * Meridional overlap margin between generating circles one revolution apart: positive means the
 * whorls overlap, zero touching, negative disjunct (open coiling). At T = 0 the sign is that of 1 − W·D.
 */
export function overlapMargin(expansion: number, distance: number, translation: number) {
  return (expansion + 1) * (1 - distance) - Math.sqrt(1 + translation * translation) * (expansion - 1) * (1 + distance)
}

export function overlapVerdict(margin: number) {
  if (Math.abs(margin) < 1e-9) return 'touching'
  return margin > 0 ? 'whorls overlap' : 'disjunct whorls'
}

/** Apical angle, in degrees, of the cone tangent to the outer edges of a translated shell (180° when planispiral). */
export function apicalAngle(translation: number, distance: number) {
  const k = (1 - distance) / (1 + distance)
  const half = Math.atan(1 / translation) + Math.asin(k / Math.sqrt(1 + translation * translation))
  return Math.min(180, degrees(2 * half))
}

/** Centring and scale of the FINISHED shell, so growth happens in place without the scene jumping. */
export function shellScaling(p: SpatialParams) {
  const { rho, centre } = generatingCurve(p.distance)
  const top = p.translation * centre + rho
  const floorAtAperture = p.translation * centre - rho
  const bottom = Math.min(floorAtAperture, floorAtAperture * p.expansion ** -WHORLS)
  const half = (top - bottom) / 2
  return { rho, centre, midline: (top + bottom) / 2, scale: Math.min(1, AXIAL_BUDGET / half), top, bottom }
}

/** Generating circle at revolution angle θ ≤ 0: tube radius, centre distance from the axis, axial position. */
export function whorlSection(p: SpatialParams, theta: number) {
  const { rho, centre } = generatingCurve(p.distance)
  const growth = p.expansion ** (theta / TAU)
  return { rho: rho * growth, centre: centre * growth, axial: p.translation * centre * growth }
}

/** Surface point P(θ, φ) in centred, scaled world coordinates; y is the coiling axis. */
export function shellPoint(p: SpatialParams, theta: number, phi: number): Vec3 {
  const { midline, scale } = shellScaling(p)
  const s = whorlSection(p, theta)
  const radial = s.centre + s.rho * Math.cos(phi)
  return [radial * Math.cos(theta) * scale, (s.axial + s.rho * Math.sin(phi) - midline) * scale, radial * Math.sin(theta) * scale]
}

/** Phase 0 and 2π show the finished four whorls; the last whorl is peeled back to three at phase π and regrown. */
export const apertureAngle = (phase: number) => -TAU * (1 - Math.cos(phase)) / 2

export const lesson: SpatialLesson = {
  slug: 'shell-coiling', title: "Raup's shell coiling space", category: 'biology',
  blogSlug: 'the-nautilus-is-not-a-golden-spiral', accent: LIME,
  cameraDistance: 7,
  description: 'Sweep a growing circle around an axis with three numbers and watch nautilus, ammonite and turret shell appear from the same rule.',
  defaults: { expansion: 3.4, distance: 0.05, translation: 0 },
  controls: [
    { key: 'expansion', label: 'Whorl expansion W (per revolution)', min: 1.2, max: 10, step: 0.05 },
    { key: 'distance', label: 'Distance from axis D', min: 0, max: 0.6, step: 0.01 },
    { key: 'translation', label: 'Translation T', min: 0, max: 3, step: 0.1 },
  ],
  presets: [
    { label: 'Golden spiral', params: { expansion: 6.85, distance: 0.05, translation: 0 } },
    { label: 'Evolute ammonite', params: { expansion: 2, distance: 0.4, translation: 0 } },
    { label: 'Turret shell', params: { expansion: 1.6, distance: 0, translation: 3 } },
  ],
  legend: [
    { label: 'Shell surface and generating circles', color: LIME },
    { label: 'Outer-edge spiral, the one a ruler measures', color: CYAN },
    { label: 'Spiral of generating-curve centres', color: VIOLET },
    { label: 'Aperture at the growing edge', color: AMBER },
  ],
  explanation: 'The lime surface is Raup\'s shell: a circle swept around the vertical axis while it grows by W each revolution, sits D of the way out from the axis, and drops by T times its distance along it. The cyan line follows the outer edge, which is the spiral a ruler measures on a sawn shell, and the violet line joins the circle centres. The amber ring is the aperture. The timeline peels the last whorl back to three and grows it again, so the loop is continuous.',
  limitation: 'The generating curve is a circle and W, D and T stay constant, so there are no ribs, septa, changing aperture shapes or growth that slows with age. The finished outer edge is fixed at 1.8 world units and tall shells are shrunk to fit, so sizes across presets are not comparable. The default W of 3.4 is above the measured Nautilus pompilius mean of about 3.1 (Moseley 3.14, Falbo 3.13), inside the 2.4 to 4.2 spread of individual shells. Overlapping whorls intersect in the model as they do in Raup\'s; a real shell reuses the earlier whorl as its inner wall.',
  readouts: p => [
    { label: 'Growth per quarter turn', value: `${quarterTurnGrowth(p.expansion).toFixed(3)}×` },
    { label: 'Equiangular spiral angle', value: `${spiralAngle(p.expansion).toFixed(2)}°` },
    { label: 'Whorl overlap W·D', value: `${(p.expansion * p.distance).toFixed(2)} · ${overlapVerdict(overlapMargin(p.expansion, p.distance, p.translation))}` },
  ],
  build: (p, phase) => {
    const { midline, scale, top, bottom } = shellScaling(p)
    const thetaStart = -WHORLS * TAU, thetaEnd = apertureAngle(phase)
    const at = (theta: number, phi: number) => shellPoint(p, theta, phi)
    const centreAt = (theta: number): Vec3 => {
      const s = whorlSection(p, theta)
      return [s.centre * Math.cos(theta) * scale, (s.axial - midline) * scale, s.centre * Math.sin(theta) * scale]
    }
    const surface: SpatialSurface = { vertices: [], indices: [], color: LIME, opacity: 0.24 }
    for (let i = 0; i < THETA_SAMPLES; i++) {
      const theta = thetaStart + (thetaEnd - thetaStart) * i / (THETA_SAMPLES - 1)
      for (let j = 0; j < RING_SAMPLES; j++) surface.vertices.push(at(theta, TAU * j / RING_SAMPLES))
      if (i < THETA_SAMPLES - 1) for (let j = 0; j < RING_SAMPLES; j++) {
        const a = i * RING_SAMPLES + j, a1 = i * RING_SAMPLES + (j + 1) % RING_SAMPLES
        surface.indices.push(a, a + RING_SAMPLES, a1, a1, a + RING_SAMPLES, a1 + RING_SAMPLES)
      }
    }
    const lines: SpatialFrame['lines'] = [
      { points: [[0, (bottom - midline) * scale - 0.15, 0], [0, (top - midline) * scale + 0.15, 0]], color: FAINT },
      { points: linspace(THETA_SAMPLES, u => centreAt(thetaStart + (thetaEnd - thetaStart) * u)), color: VIOLET, opacity: 0.9 },
      { points: linspace(THETA_SAMPLES, u => at(thetaStart + (thetaEnd - thetaStart) * u, 0)), color: CYAN },
    ]
    for (let k = 1; k <= 16; k++) {
      const theta = thetaEnd - k * TAU / 4
      if (theta < thetaStart - 1e-9) break
      lines.push({ points: linspace(33, u => at(theta, TAU * u)), color: LIME, opacity: 0.35 })
    }
    lines.push({ points: linspace(49, u => at(thetaEnd, TAU * u)), color: AMBER })
    return { lines, surfaces: [surface], points: [{ position: centreAt(thetaEnd), color: AMBER, size: 0.06 }] }
  },
}
