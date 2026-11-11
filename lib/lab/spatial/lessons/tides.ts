import { arrow, linspace, TAU } from '../geometry'
import type { SpatialFrame, SpatialLesson, SpatialParams, SpatialSurface, Vec3 } from '../types'

const ACCENT = '#38bdf8'
const VIOLET = '#b59aff'
const AMBER = '#ffc46b'
const FAINT = '#53617d'
const WHITE = '#eff8ff'
const radians = (degrees: number) => degrees * Math.PI / 180

/** Astronomical constants: distances in km, masses as ratios to Earth's mass. */
export const TIDE = {
  earthRadiusKm: 6371,
  earthMassKg: 5.972e24,
  gravitationalConstant: 6.674e-11,
  moonMassRatio: 0.0123,
  moonDistanceKm: 384400,
  sunMassRatio: 332946,
  sunDistanceKm: 1.496e8,
  lunarDayHours: 24.8412,
}

/** Equilibrium tide amplitude A = (M/M_E)(R/d)³ R, in metres. */
export function equilibriumAmplitude(massRatio: number, distanceKm: number): number {
  const R = TIDE.earthRadiusKm
  return massRatio * (R / distanceKm) ** 3 * R * 1000
}

/** Lunar amplitude at mean distance (0.357 m) and solar amplitude (0.164 m). */
export const LUNAR_AMPLITUDE = equilibriumAmplitude(TIDE.moonMassRatio, TIDE.moonDistanceKm)
export const SOLAR_AMPLITUDE = equilibriumAmplitude(TIDE.sunMassRatio, TIDE.sunDistanceKm)
/** Lunar amplitude for a Moon distance given in thousands of km (the slider's unit). */
export const lunarAmplitude = (moonDistance: number) => equilibriumAmplitude(TIDE.moonMassRatio, moonDistance * 1000)

/** Sun ÷ Moon: the direct pull falls as 1/d², the tide-raising amplitude as 1/d³. */
export function sunMoonRatios(moonDistanceKm = TIDE.moonDistanceKm) {
  const pull = (TIDE.sunMassRatio / TIDE.sunDistanceKm ** 2) / (TIDE.moonMassRatio / moonDistanceKm ** 2)
  const tide = SOLAR_AMPLITUDE / equilibriumAmplitude(TIDE.moonMassRatio, moonDistanceKm)
  return { pull, tide }
}

/** Differential acceleration 2GMR/d³ along the Earth–body line at Earth's surface, m/s². */
export function tidalAcceleration(massRatio = TIDE.moonMassRatio, distanceKm = TIDE.moonDistanceKm): number {
  const d = distanceKm * 1000
  return 2 * TIDE.gravitationalConstant * massRatio * TIDE.earthMassKg * TIDE.earthRadiusKm * 1000 / d ** 3
}

export const legendreP2 = (x: number) => (3 * x * x - 1) / 2

/** cos ψ between an observer at latitude φ and hour angle H and a body at declination δ (all degrees except H in radians). */
export function zenithCosine(latitude: number, declination: number, hourAngle: number): number {
  const phi = radians(latitude), delta = radians(declination)
  return Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(hourAngle)
}

/** Equilibrium height ζ in metres at latitude φ and hour angle H from the Moon's meridian. The Sun sits in the equatorial plane, α ahead of the Moon. */
export function tideHeightAt(p: SpatialParams, latitude: number, hourAngle: number, includeSun = true): number {
  const lunar = lunarAmplitude(p.moonDistance) * legendreP2(zenithCosine(latitude, p.declination, hourAngle))
  if (!includeSun) return lunar
  return lunar + SOLAR_AMPLITUDE * legendreP2(zenithCosine(latitude, 0, hourAngle - radians(p.sunMoonAngle)))
}

export const tideHeight = (p: SpatialParams, hourAngle: number, includeSun = true) => tideHeightAt(p, p.latitude, hourAngle, includeSun)

export const SAMPLES = 720

/** ζ over one lunar day at the observer, sampled at SAMPLES hour angles starting from H = 0. */
export function tideSeries(p: SpatialParams, includeSun = true): number[] {
  return Array.from({ length: SAMPLES }, (_, i) => tideHeight(p, TAU * i / SAMPLES, includeSun))
}

export function tideRange(p: SpatialParams, includeSun = true): number {
  const series = tideSeries(p, includeSun)
  return Math.max(...series) - Math.min(...series)
}

/** Local maxima of ζ(H) over a lunar day with wrap-around; a sum of two P2 terms has at most two. */
export function highWaters(p: SpatialParams, includeSun = true): { heights: number[]; hours: number[] } {
  const z = tideSeries(p, includeSun)
  const heights: number[] = [], hours: number[] = []
  for (let i = 0; i < SAMPLES; i++) {
    const previous = z[(i + SAMPLES - 1) % SAMPLES], next = z[(i + 1) % SAMPLES]
    if (z[i] > previous && z[i] >= next) { heights.push(z[i]); hours.push(TIDE.lunarDayHours * i / SAMPLES) }
  }
  return { heights, hours }
}

/** Second lunar high sits below the undisturbed sphere once φ + δ exceeds this angle (cos² = 1/3). */
export const BELOW_REFERENCE_DEGREES = Math.acos(Math.sqrt(1 / 3)) * 180 / Math.PI

/** Scene scalings: undisturbed ocean at 1.5 world units; 0.35 units per mean lunar amplitude. */
export const OCEAN_RADIUS = 1.5
export const BULGE_SCALE = 0.35
export const SOLID_RADIUS = 1.15
export const EXAGGERATION = (BULGE_SCALE / OCEAN_RADIUS) / (LUNAR_AMPLITUDE / (TIDE.earthRadiusKm * 1000))

const moonDirection = (p: SpatialParams): Vec3 => [Math.cos(radians(p.declination)), Math.sin(radians(p.declination)), 0]
const sunDirection = (p: SpatialParams): Vec3 => [Math.cos(radians(p.sunMoonAngle)), 0, Math.sin(radians(p.sunMoonAngle))]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const scale = (v: Vec3, s: number): Vec3 => [v[0] * s, v[1] * s, v[2] * s]

/** Ocean radius along a unit direction, evaluated with dot products rather than spherical trigonometry. */
export function oceanRadius(p: SpatialParams, n: Vec3): number {
  const zeta = lunarAmplitude(p.moonDistance) * legendreP2(dot(n, moonDirection(p))) + SOLAR_AMPLITUDE * legendreP2(dot(n, sunDirection(p)))
  return OCEAN_RADIUS + BULGE_SCALE * zeta / LUNAR_AMPLITUDE
}

/** The observer's drawn radius, from the hour-angle formula the strip chart uses. */
export const observerRadius = (p: SpatialParams, phase: number) => OCEAN_RADIUS + BULGE_SCALE * tideHeight(p, phase) / LUNAR_AMPLITUDE

const direction = (latitude: number, longitude: number): Vec3 => [Math.cos(latitude) * Math.cos(longitude), Math.sin(latitude), Math.cos(latitude) * Math.sin(longitude)]
const oceanPoint = (p: SpatialParams, n: Vec3): Vec3 => scale(n, oceanRadius(p, n))
const metres = (value: number) => `${value.toFixed(3).replace('-', '−')} m`

const CHART_BASE = 2.25, CHART_HALF = 1.8, CHART_SCALE = 0.3 / (LUNAR_AMPLITUDE + SOLAR_AMPLITUDE)
const chartPoint = (p: SpatialParams, hourAngle: number): Vec3 => [-CHART_HALF + 2 * CHART_HALF * hourAngle / TAU, CHART_BASE + CHART_SCALE * tideHeight(p, hourAngle), 0]

export function describeHighWaters(p: SpatialParams): string {
  const { heights, hours } = highWaters(p)
  if (heights.length === 0) return 'no local maximum'
  if (heights.length === 1) return `one high of ${metres(heights[0])} per lunar day (diurnal)`
  return `${metres(heights[0])} and ${metres(heights[1])}, ${(hours[1] - hours[0]).toFixed(1)} h apart`
}

export const lesson: SpatialLesson = {
  slug: 'tides', title: 'Equilibrium tides', category: 'earth',
  blogSlug: 'the-sun-pulls-harder-but-the-moon-makes-the-tides', accent: ACCENT,
  cameraDistance: 8,
  description: 'Raise the equilibrium ocean with real lunar and solar constants, then spin an observer under two bulges through one lunar day.',
  defaults: { sunMoonAngle: 90, declination: 0, latitude: 45, moonDistance: 384.4 },
  controls: [
    { key: 'sunMoonAngle', label: 'Sun–Moon angle α (0 new, 90 quarter, 180 full)', min: 0, max: 180, step: 5, unit: '°' },
    { key: 'declination', label: 'Moon declination δ', min: 0, max: 28.5, step: 0.5, unit: '°' },
    { key: 'latitude', label: 'Observer latitude φ', min: 0, max: 80, step: 1, unit: '°' },
    { key: 'moonDistance', label: 'Moon distance', min: 356.5, max: 406.7, step: 0.1, unit: '×10³ km' },
  ],
  presets: [
    { label: 'Spring tide, new Moon', params: { sunMoonAngle: 0, declination: 0, latitude: 45, moonDistance: 384.4 } },
    { label: 'Lunar standstill', params: { sunMoonAngle: 0, declination: 28.5, latitude: 45, moonDistance: 384.4 } },
    { label: 'Equatorial neap', params: { sunMoonAngle: 90, declination: 0, latitude: 0, moonDistance: 384.4 } },
  ],
  legend: [
    { label: `Equilibrium ocean, bulge ×${(EXAGGERATION / 1e6).toFixed(1)} million`, color: ACCENT },
    { label: 'Moon direction and lunar bulge axis', color: WHITE },
    { label: 'Sun direction and solar bulge axis (shorter arrow: weaker tide)', color: AMBER },
    { label: 'Observer on the surface; its lunar-day tide charted above', color: VIOLET },
  ],
  explanation: 'The blue mesh is the equilibrium ocean: a sphere of radius 1.5 raised and lowered by the Moon (white arrow) and the Sun (amber arrow), with the bulge exaggerated about 4.2 million times so the near-side and far-side bulges both show. The faint rings and polar axis are the solid Earth, which rotates eastward beneath the fixed bulges as phase advances through one lunar day of 24 h 50 min; the faint ring at the ocean radius marks the undisturbed sphere. The violet sphere is an observer riding the ocean surface at latitude φ, and the violet strip above the globe plots the height under that observer over the whole lunar day, with the marker at the current instant and the faint line at the undisturbed level ζ = 0.',
  limitation: 'This is the static equilibrium tide: the ranges are what a frictionless, instantly responding global ocean would show, not harbour predictions (real coastal ranges run from near zero to about 16 m and lag the Moon by hours). The Sun is held in the equatorial plane and the Sun–Moon angle is frozen through the lunar day, although it really drifts about 12° per lunar day. Solid-Earth yielding and the ocean\'s self-attraction, which bring the observed geocentric ocean tide down to roughly 0.69 of this figure, are omitted. The solid Earth is drawn at radius 1.15 so the ocean never dips through it; only the readouts carry metres.',
  readouts: p => {
    const ratios = sunMoonRatios(p.moonDistance * 1000)
    return [
      { label: 'Sun ÷ Moon: direct pull / tide amplitude', value: `${ratios.pull.toFixed(1)} / ${ratios.tide.toFixed(3)} (A_m ${lunarAmplitude(p.moonDistance).toFixed(3)} m)` },
      { label: 'Equilibrium range: equator / observer', value: `${tideRange({ ...p, latitude: 0 }).toFixed(3)} m / ${tideRange(p).toFixed(3)} m` },
      { label: 'High waters at observer (Moon + Sun, above ζ = 0)', value: describeHighWaters(p) },
    ]
  },
  build: (p, phase) => {
    const moon = moonDirection(p), sun = sunDirection(p), latitude = radians(p.latitude)
    const lines: SpatialFrame['lines'] = [
      // Solid Earth at SOLID_RADIUS, rotating with phase: equator, two great circles through the poles, polar axis.
      { points: linspace(97, u => scale(direction(0, u * TAU), SOLID_RADIUS)), color: FAINT },
      { points: linspace(97, u => scale(direction(u * TAU, phase), SOLID_RADIUS)), color: FAINT },
      { points: linspace(97, u => scale(direction(u * TAU, phase + Math.PI / 2), SOLID_RADIUS)), color: FAINT },
      { points: [[0, -1.75, 0], [0, 1.75, 0]], color: FAINT },
      // Undisturbed sphere ζ = 0 at radius 1.5, fixed in space.
      { points: linspace(97, u => scale(direction(0, u * TAU), OCEAN_RADIUS)), color: FAINT, opacity: 0.5 },
      { points: linspace(97, u => scale(direction(u * TAU, 0), OCEAN_RADIUS)), color: FAINT, opacity: 0.5 },
      // Ocean sections: the equatorial plane and the Moon's meridian plane.
      { points: linspace(145, u => oceanPoint(p, direction(0, u * TAU))), color: ACCENT },
      { points: linspace(145, u => oceanPoint(p, direction(u * TAU, 0))), color: ACCENT },
      // Bulge axes continue through the far side.
      { points: [[0, 0, 0], scale(moon, -2.3)], color: WHITE, opacity: 0.35 },
      { points: [[0, 0, 0], scale(sun, -2.3)], color: AMBER, opacity: 0.35 },
      ...arrow([0, 0, 0], scale(moon, 2.6), WHITE),
      ...arrow([0, 0, 0], scale(sun, 2.3), AMBER),
      // Strip chart of ζ(H) at the observer, floating above the globe.
      { points: [[-CHART_HALF, CHART_BASE, 0], [CHART_HALF, CHART_BASE, 0]], color: FAINT, opacity: 0.6 },
      { points: linspace(145, u => chartPoint(p, u * TAU)), color: VIOLET },
    ]
    for (const x of [-CHART_HALF, 0, CHART_HALF]) lines.push({ points: [[x, CHART_BASE - 0.06, 0], [x, CHART_BASE + 0.06, 0]], color: FAINT, opacity: 0.6 })
    const marker = chartPoint(p, phase)
    lines.push({ points: [[marker[0], CHART_BASE, 0], marker], color: VIOLET, opacity: 0.5 })

    const surface: SpatialSurface = { vertices: [], indices: [], color: ACCENT, opacity: 0.2 }
    const rows = 24, columns = 48
    for (let j = 1; j < rows; j++) {
      const lat = -Math.PI / 2 + Math.PI * j / rows
      for (let k = 0; k <= columns; k++) surface.vertices.push(oceanPoint(p, direction(lat, TAU * k / columns)))
    }
    const index = (j: number, k: number) => (j - 1) * (columns + 1) + k
    for (let j = 1; j < rows - 1; j++) for (let k = 0; k < columns; k++) {
      const a = index(j, k), b = index(j + 1, k)
      surface.indices.push(a, b, a + 1, a + 1, b, b + 1)
    }
    const south = surface.vertices.push(oceanPoint(p, [0, -1, 0])) - 1
    const north = surface.vertices.push(oceanPoint(p, [0, 1, 0])) - 1
    for (let k = 0; k < columns; k++) surface.indices.push(south, index(1, k), index(1, k + 1), north, index(rows - 1, k + 1), index(rows - 1, k))

    const observerDirection = direction(latitude, phase)
    const observer = scale(observerDirection, observerRadius(p, phase))
    lines.push({ points: [scale(observerDirection, SOLID_RADIUS), observer], color: VIOLET, opacity: 0.8 })
    return {
      lines,
      surfaces: [surface],
      points: [
        { position: scale(moon, 2.6), color: WHITE, size: 0.1 },
        { position: scale(sun, 2.3), color: AMBER, size: 0.12 },
        { position: observer, color: VIOLET, size: 0.07 },
        { position: marker, color: VIOLET, size: 0.06 },
      ],
    }
  },
}
