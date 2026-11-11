import { arrow, linspace, TAU } from '../geometry'
import type { SpatialLesson, SpatialLine, SpatialParams, SpatialPoint, SpatialSurface, Vec3 } from '../types'

const ACCENT = '#38bdf8'
const VIOLET = '#b59aff'
const AMBER = '#ffc46b'
const FAINT = '#53617d'
const WHITE = '#eff8ff'

/** Total solar irradiance at 1 au, Kopp & Lean (2011), W/m². */
export const SOLAR_CONSTANT = 1361
/** Perihelion sits at ecliptic longitude 283°; phase 0 is the December solstice (270°), so perihelion is phase 13°. */
export const PERIHELION_PHASE = 13 * Math.PI / 180
const EARTH_RADIUS = 1.6
const SUN_MEAN_RADIUS = 2.4

export const radians = (degrees: number) => degrees * Math.PI / 180
export const degrees = (angle: number) => angle * 180 / Math.PI
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const normalise = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(...a))

/** Spin axis, fixed in space, tilted ε from the orbit normal (world y) toward +x. */
export const spinAxis = (tilt: number): Vec3 => [Math.sin(radians(tilt)), Math.cos(radians(tilt)), 0]
/** Unit vector toward the Sun in the horizontal orbital plane. Phase 0 is the December solstice. */
export const sunDirection = (phase: number): Vec3 => [-Math.cos(phase), 0, Math.sin(phase)]
/** Solar declination in degrees: −ε at phase 0, +ε at phase π. */
export const solarDeclination = (tilt: number, phase: number) => degrees(Math.asin(clamp(dot(sunDirection(phase), spinAxis(tilt)), -1, 1)))
/** Sun–Earth distance over the semi-major axis, r/a = (1 − e²)/(1 + e cos(phase − 13°)). */
export const distanceRatio = (phase: number, eccentricity: number) => (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(phase - PERIHELION_PHASE))
/** Perihelion over aphelion irradiance, ((1 + e)/(1 − e))². */
export const fluxRatio = (eccentricity: number) => ((1 + eccentricity) / (1 - eccentricity)) ** 2

/** Sunset hour angle in radians: the geometric (h₀ = 0) case of Meeus eq. 15.1, clamped for polar day and night. */
export function sunsetHourAngle(latitude: number, declination: number) {
  const lat = radians(latitude), dec = radians(declination)
  const cosLat = Math.cos(lat)
  if (Math.abs(cosLat) < 1e-9) {
    const product = latitude * declination
    return product > 0 ? Math.PI : product < 0 ? 0 : Math.PI / 2
  }
  return Math.acos(clamp(-Math.sin(lat) * Math.sin(dec) / (cosLat * Math.cos(dec)), -1, 1))
}
/** Geometric day length in hours, 2·H₀ at 15° per hour. */
export const dayLength = (latitude: number, declination: number) => 2 * sunsetHourAngle(latitude, declination) * 12 / Math.PI
/** Noon Sun elevation in degrees; negative means the Sun never rises that day. */
export const noonElevation = (latitude: number, declination: number) => 90 - Math.abs(latitude - declination)
/** Daily-mean top-of-atmosphere insolation on a horizontal surface, Hartmann eq. 2.16, W/m². */
export function dailyInsolation(latitude: number, declination: number, distanceFactor = 1) {
  const lat = radians(latitude), dec = radians(declination), h0 = sunsetHourAngle(latitude, declination)
  const value = SOLAR_CONSTANT / Math.PI / (distanceFactor * distanceFactor) * (h0 * Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.sin(h0))
  return Math.max(0, value)
}
/** Minutes added to a geometric day by refraction and the solar semidiameter (standard altitude −0.8333°). */
export function refractionCorrectionMinutes(latitude: number, declination: number) {
  const lat = radians(latitude), dec = radians(declination), h0 = sunsetHourAngle(latitude, declination)
  const slope = Math.cos(lat) * Math.cos(dec) * Math.sin(h0)
  return slope < 1e-9 ? 0 : 2 * 0.8333 / (15 * slope) * 60
}

export function seasonSummary(p: SpatialParams) {
  const june = p.tilt, december = -p.tilt
  const insolation = { june: dailyInsolation(p.latitude, june), december: dailyInsolation(p.latitude, december) }
  const high = Math.max(insolation.june, insolation.december), low = Math.min(insolation.june, insolation.december)
  return {
    dayLength: { june: dayLength(p.latitude, june), december: dayLength(p.latitude, december) },
    elevation: { june: noonElevation(p.latitude, june), december: noonElevation(p.latitude, december) },
    insolation,
    tiltRatio: low > 1e-9 ? high / low : high > 1e-9 ? Infinity : 1,
    distanceRatio: fluxRatio(p.eccentricity),
    distanceAtSolstice: { june: distanceRatio(Math.PI, p.eccentricity), december: distanceRatio(0, p.eccentricity) },
  }
}

const elevationText = (value: number) => value < 0 ? 'below horizon' : `${value.toFixed(1)}°`

function circle(centreDirection: Vec3, offset: number, u: Vec3, v: Vec3, radius: number, count: number, from = 0, to = TAU): Vec3[] {
  return linspace(count, t => {
    const angle = from + (to - from) * t
    return add(scale(centreDirection, offset), add(scale(u, radius * Math.cos(angle)), scale(v, radius * Math.sin(angle))))
  })
}

function cap(direction: Vec3, u: Vec3, v: Vec3, radius: number, color: string, opacity: number): SpatialSurface {
  const surface: SpatialSurface = { vertices: [], indices: [], color, opacity }
  const rings = 20, slices = 40
  for (let i = 0; i <= rings; i++) {
    const polar = Math.PI / 2 * i / rings
    for (let j = 0; j <= slices; j++) {
      const azimuth = TAU * j / slices
      surface.vertices.push(scale(add(scale(direction, Math.cos(polar)), add(scale(u, Math.sin(polar) * Math.cos(azimuth)), scale(v, Math.sin(polar) * Math.sin(azimuth)))), radius))
    }
    if (i < rings) for (let j = 0; j < slices; j++) { const a = i * (slices + 1) + j, b = a + slices + 1; surface.indices.push(a, b, a + 1, a + 1, b, b + 1) }
  }
  return surface
}

export const lesson: SpatialLesson = {
  slug: 'seasons', title: 'Seasons from a tilted axis', category: 'earth',
  blogSlug: 'earth-is-closest-to-the-sun-in-winter', accent: ACCENT,
  cameraDistance: 7.5,
  description: 'Keep the spin axis pointed at one star for a year and watch a fixed tilt, not a changing distance, lengthen and shorten the day.',
  defaults: { tilt: 23.44, latitude: 51.5, eccentricity: 0.0167 },
  controls: [
    { key: 'tilt', label: 'Axial tilt ε', min: 0, max: 45, step: 0.01, unit: '°' },
    { key: 'latitude', label: 'Observer latitude φ', min: -90, max: 90, step: 0.01, unit: '°' },
    { key: 'eccentricity', label: 'Orbital eccentricity e', min: 0, max: 0.1, step: 0.0001 },
  ],
  presets: [
    { label: 'Equator', params: { tilt: 23.44, latitude: 0, eccentricity: 0.0167 } },
    { label: 'Arctic Circle', params: { tilt: 23.44, latitude: 66.56, eccentricity: 0.0167 } },
    { label: 'No tilt', params: { tilt: 0, latitude: 51.5, eccentricity: 0.0167 } },
    { label: 'Mars-like orbit', params: { tilt: 25.19, latitude: 51.5, eccentricity: 0.0934 } },
  ],
  legend: [
    { label: 'Earth, spin axis, equator, tropics and polar circles', color: ACCENT },
    { label: 'Sunlight, Sun marker and the lit arc of the observer\'s parallel', color: AMBER },
    { label: 'Terminator, night hemisphere and the dark arc', color: VIOLET },
    { label: 'Observer at local noon', color: WHITE },
  ],
  explanation: 'The blue sphere is Earth. Its spin axis, equator, tropics and polar circles stay pointed at the same star all year, tilted ε from the faint vertical orbit normal. Phase is one year from the December solstice: the amber Sun marker rides its relative orbit (sized by irradiance, nearest at phase 13°, about 3 January), the violet terminator and night cap stay perpendicular to the sunlight, and the parallel at latitude φ splits into a lit amber arc and a violet night arc whose length is the day. The white dot is the observer at local noon. Readouts are solstice values and do not change with phase.',
  limitation: 'Day lengths are geometric: no refraction and no solar disc, which together add about 14 min at London\'s solstices. The Sun\'s ecliptic longitude is uniform in phase (no equation of time), daily rotation is not animated, and the Sun marker only tracks distance direction and relative irradiance, not scale. Insolation is the daily mean at the top of the atmosphere on a horizontal surface at mean Sun distance with S₀ = 1361 W/m², so the tilt and distance effects stay separate in the third readout.',
  readouts: p => {
    const s = seasonSummary(p)
    return [
      { label: 'Day length at φ, June / December solstice', value: `${s.dayLength.june.toFixed(2)} h / ${s.dayLength.december.toFixed(2)} h` },
      { label: 'Noon Sun elevation, June / December', value: `${elevationText(s.elevation.june)} / ${elevationText(s.elevation.december)}` },
      { label: 'Daily TOA sunlight: tilt effect vs distance effect', value: `${Number.isFinite(s.tiltRatio) ? `${s.tiltRatio.toFixed(1)}×` : '∞ (polar night)'} tilt vs ${s.distanceRatio.toFixed(3)}× distance` },
    ]
  },
  build: (p, phase) => {
    const axis = spinAxis(p.tilt)
    const body1: Vec3 = [Math.cos(radians(p.tilt)), -Math.sin(radians(p.tilt)), 0]
    const body2: Vec3 = [0, 0, 1]
    const sun = sunDirection(phase)
    const sunV: Vec3 = [0, 1, 0]
    const sunW = cross(sun, sunV)
    const declination = solarDeclination(p.tilt, phase)
    const noon = normalise(add(sun, scale(axis, -dot(sun, axis))))
    const east = cross(axis, noon)
    const lines: SpatialLine[] = []
    const points: SpatialPoint[] = []
    const surfaces: SpatialSurface[] = []

    // Earth: orbit normal, spin axis and a 30° wireframe in the body frame so it swings with tilt.
    lines.push({ points: [[0, 0, 0], [0, 1.95, 0]], color: FAINT, opacity: 0.6 })
    lines.push(...arrow(scale(axis, -1.95), scale(axis, 1.95), ACCENT))
    for (let k = 0; k < 6; k++) {
      const longitude = radians(30 * k)
      const meridian = normalise(add(scale(body1, Math.cos(longitude)), scale(body2, Math.sin(longitude))))
      lines.push({ points: circle([0, 0, 0], 0, axis, meridian, EARTH_RADIUS, 73), color: FAINT, opacity: 0.3 })
    }
    for (const latitude of [-60, -30, 30, 60]) {
      lines.push({ points: circle(axis, EARTH_RADIUS * Math.sin(radians(latitude)), body1, body2, EARTH_RADIUS * Math.cos(radians(latitude)), 73), color: FAINT, opacity: 0.3 })
    }
    lines.push({ points: circle(axis, 0, body1, body2, EARTH_RADIUS, 97), color: ACCENT, opacity: 0.9 })
    for (const latitude of [p.tilt, -p.tilt, 90 - p.tilt, p.tilt - 90]) {
      lines.push({ points: circle(axis, EARTH_RADIUS * Math.sin(radians(latitude)), body1, body2, EARTH_RADIUS * Math.cos(radians(latitude)), 73), color: ACCENT, opacity: 0.55 })
    }

    // Sunlight: day and night caps, terminator, sub-solar point and its declination circle.
    surfaces.push(cap(sun, sunV, sunW, EARTH_RADIUS - 0.01, ACCENT, 0.06))
    surfaces.push(cap(scale(sun, -1), sunV, sunW, EARTH_RADIUS - 0.01, VIOLET, 0.18))
    lines.push({ points: circle([0, 0, 0], 0, sunV, sunW, EARTH_RADIUS + 0.01, 97), color: VIOLET })
    points.push({ position: scale(sun, EARTH_RADIUS), color: AMBER, size: 0.06 })
    lines.push({ points: circle(axis, (EARTH_RADIUS + 0.01) * Math.sin(radians(declination)), noon, east, (EARTH_RADIUS + 0.01) * Math.cos(radians(declination)), 97), color: AMBER, opacity: 0.5 })

    // The Sun: a marker riding its relative orbit (Earth at one focus), arrow and parallel rays.
    const ratio = distanceRatio(phase, p.eccentricity)
    const sunRadius = SUN_MEAN_RADIUS * ratio
    lines.push({ points: linspace(73, t => scale(sunDirection(t * TAU), SUN_MEAN_RADIUS * distanceRatio(t * TAU, p.eccentricity))), color: AMBER, opacity: 0.3 })
    points.push({ position: scale(sunDirection(PERIHELION_PHASE), SUN_MEAN_RADIUS * distanceRatio(PERIHELION_PHASE, p.eccentricity)), color: AMBER, size: 0.035 })
    points.push({ position: scale(sun, sunRadius), color: AMBER, size: 0.1 / (ratio * ratio) })
    lines.push(...arrow(scale(sun, sunRadius), scale(sun, 1.72), AMBER))
    for (const [a, b] of [[0.35, 0], [-0.35, 0], [0, 0.35], [0, -0.35]]) {
      const offset = add(scale(sunV, a), scale(sunW, b))
      lines.push({ points: [add(scale(sun, 2.15), offset), add(scale(sun, 1.58), offset)], color: AMBER, opacity: 0.35 })
    }

    // The observer's parallel: lit ribbon and arc for |H| < H₀, dark arc for the rest.
    const h0 = sunsetHourAngle(p.latitude, declination)
    const lat = radians(p.latitude)
    const onParallel = (hourAngle: number, radius: number): Vec3 => scale(add(scale(axis, Math.sin(lat)), scale(add(scale(noon, Math.cos(hourAngle)), scale(east, Math.sin(hourAngle))), Math.cos(lat))), radius)
    if (h0 > 0.02) {
      const segments = Math.max(2, Math.ceil(2 * h0 / 0.05))
      const ribbon: SpatialSurface = { vertices: [], indices: [], color: AMBER, opacity: 0.25 }
      for (let i = 0; i <= segments; i++) {
        const hourAngle = -h0 + 2 * h0 * i / segments
        ribbon.vertices.push(onParallel(hourAngle, EARTH_RADIUS), onParallel(hourAngle, EARTH_RADIUS + 0.06))
        if (i < segments) { const a = 2 * i; ribbon.indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
      }
      surfaces.push(ribbon)
      lines.push({ points: linspace(segments + 1, t => onParallel(-h0 + 2 * h0 * t, EARTH_RADIUS + 0.03)), color: AMBER })
    }
    if (h0 < Math.PI - 0.02) {
      const segments = Math.max(2, Math.ceil(2 * (Math.PI - h0) / 0.05))
      lines.push({ points: linspace(segments + 1, t => onParallel(h0 + 2 * (Math.PI - h0) * t, EARTH_RADIUS + 0.02)), color: VIOLET, opacity: 0.6 })
    }
    points.push({ position: onParallel(0, EARTH_RADIUS + 0.03), color: WHITE, size: 0.06 })

    return { lines, surfaces, points }
  },
}

export default lesson
