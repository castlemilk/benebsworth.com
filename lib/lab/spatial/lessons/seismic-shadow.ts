import { linspace, TAU } from '../geometry'
import type { SpatialLesson, SpatialLine, SpatialParams, SpatialPoint, SpatialSurface, Vec3 } from '../types'

const SKY = '#38bdf8'
const CYAN = '#55e6d0'
const VIOLET = '#b59aff'
const AMBER = '#ffc46b'
const FAINT = '#53617d'
const WHITE = '#eff8ff'

export const EARTH_RADIUS = 6371
export const PREM_CMB = 3480
export const PREM_ICB = 1221.5
/** Reference radius of the 670 km discontinuity; the lower mantle below it is rescaled by the core-radius control. */
const LOWER_MANTLE_TOP = 5701
const SHELLS = 120
const WORLD_RADIUS = 2.3
const CENTRE_Y = 0.12
const degrees = (rad: number) => rad * 180 / Math.PI
const radians = (deg: number) => deg * Math.PI / 180

export type Wave = 'p' | 's'
type RegionName = 'mantle' | 'outer' | 'inner'
type Region = { top: number; bottom: number; name: RegionName; vp: number[]; vs: number[] }

/**
 * Isotropic PREM (Dziewonski & Anderson 1981), velocities in km/s as polynomials in x = r / 6371 km.
 * The 3 km ocean is replaced by upper crust so a surface source has a finite shear velocity.
 */
export const PREM_REGIONS: Region[] = [
  { top: 6371, bottom: 6356, name: 'mantle', vp: [5.8], vs: [3.2] },
  { top: 6356, bottom: 6346.6, name: 'mantle', vp: [6.8], vs: [3.9] },
  { top: 6346.6, bottom: 6151, name: 'mantle', vp: [4.1875, 3.9382], vs: [2.1519, 2.3481] },
  { top: 6151, bottom: 5971, name: 'mantle', vp: [20.3926, -12.2569], vs: [8.9496, -4.4597] },
  { top: 5971, bottom: 5771, name: 'mantle', vp: [39.7027, -32.6166], vs: [22.3512, -18.5856] },
  { top: 5771, bottom: 5701, name: 'mantle', vp: [19.0957, -9.8672], vs: [9.9839, -4.9324] },
  { top: 5701, bottom: 5600, name: 'mantle', vp: [29.2766, -23.6027, 5.5242, -2.5514], vs: [22.3459, -17.2473, -2.0834, 0.9783] },
  { top: 5600, bottom: 3630, name: 'mantle', vp: [24.9520, -40.4673, 51.4832, -26.6419], vs: [11.1671, -13.7818, 17.4575, -9.2777] },
  { top: 3630, bottom: 3480, name: 'mantle', vp: [15.3891, -5.3181, 5.5242, -2.5514], vs: [6.9254, 1.4672, -2.0834, 0.9783] },
  { top: 3480, bottom: 1221.5, name: 'outer', vp: [11.0487, -4.0362, 4.8023, -13.5732], vs: [0] },
  { top: 1221.5, bottom: 0, name: 'inner', vp: [11.2622, 0, -6.3640], vs: [3.6678, 0, -4.4475] },
]

const polynomial = (coefficients: number[], x: number) => coefficients.reduce((sum, c, i) => sum + c * x ** i, 0)
const regionVelocity = (region: Region, r: number, wave: Wave) => polynomial(wave === 'p' ? region.vp : region.vs, r / EARTH_RADIUS)

/** PREM velocity at radius r; `side` picks the region at a discontinuity (above = the shallower one). */
export function premVelocity(r: number, wave: Wave, side: 'above' | 'below' = 'above'): number {
  if (r >= EARTH_RADIUS) return regionVelocity(PREM_REGIONS[0], r, wave)
  const region = PREM_REGIONS.find(g => side === 'above' ? g.bottom <= r && r < g.top : g.bottom < r && r <= g.top) ?? PREM_REGIONS[PREM_REGIONS.length - 1]
  return regionVelocity(region, r, wave)
}

/** Snell's law across the core–mantle boundary for a mantle P ray at the given incidence; null when nothing is transmitted. */
export function coreRefraction(incidence: number, coreSpeed: number, wave: Wave): number | null {
  const above = premVelocity(PREM_CMB, wave, 'above'), below = premVelocity(PREM_CMB, wave, 'below') * coreSpeed
  if (below <= 0) return null
  const s = below / above * Math.sin(radians(incidence))
  return s >= 1 ? null : degrees(Math.asin(s))
}

export type Layer = {
  rTop: number; rBottom: number; vTop: number; vBottom: number
  etaTop: number; etaBottom: number
  /** v = a·r^(1−q); straight chords when q = 1. */
  q: number; a: number
  region: RegionName; liquid: boolean
  /** The layer's top is a region boundary (a velocity discontinuity). */
  boundary: boolean
}
export type EarthModel = { radius: number; wave: Wave; layers: Layer[] }

function makeLayer(rTop: number, rBottom: number, vTop: number, vBottom: number, region: RegionName, boundary: boolean): Layer {
  const liquid = vTop <= 0 || vBottom <= 0
  let q = 1, a = liquid ? 1 : vTop
  if (!liquid && rBottom > 0) {
    const b = Math.log(vTop / vBottom) / Math.log(rTop / rBottom)
    if (Math.abs(1 - b) > 1e-6) { q = 1 - b; a = vTop / rTop ** b }
  }
  return { rTop, rBottom, vTop, vBottom, etaTop: liquid ? Infinity : rTop / vTop, etaBottom: liquid ? Infinity : rBottom / vBottom, q, a, region, liquid, boundary }
}

/** Build a model from explicit shells; used for the analytic single-shell check and by `buildModel`. */
export function layeredModel(wave: Wave, shells: { rTop: number; rBottom: number; vTop: number; vBottom: number; region: RegionName }[]): EarthModel {
  const layers = shells.map((s, i) => makeLayer(s.rTop, s.rBottom, s.vTop, s.vBottom, s.region, i === 0 || shells[i - 1].region !== s.region || Math.abs(shells[i - 1].rBottom - s.rTop) > 1e-9))
  return { radius: layers[0].rTop, wave, layers }
}

/** Map a PREM reference radius onto the actual radius for a chosen core radius: the lower mantle and outer core are stretched. */
export function actualRadius(reference: number, coreRadius: number): number {
  if (reference >= LOWER_MANTLE_TOP) return reference
  if (reference >= PREM_CMB) return coreRadius + (reference - PREM_CMB) * (LOWER_MANTLE_TOP - coreRadius) / (LOWER_MANTLE_TOP - PREM_CMB)
  if (reference >= PREM_ICB) return PREM_ICB + (reference - PREM_ICB) * (coreRadius - PREM_ICB) / (PREM_CMB - PREM_ICB)
  return reference
}

/** PREM sliced into power-law shells, with every region boundary on a shell boundary. */
export function buildModel(coreSpeed: number, coreRadius: number, wave: Wave, shells = SHELLS): EarthModel {
  const list: { rTop: number; rBottom: number; vTop: number; vBottom: number; region: RegionName }[] = []
  for (const region of PREM_REGIONS) {
    const thickness = actualRadius(region.top, coreRadius) - actualRadius(region.bottom, coreRadius)
    const count = Math.max(1, Math.round(shells * thickness / EARTH_RADIUS))
    const scale = region.name === 'outer' && wave === 'p' ? coreSpeed : 1
    for (let i = 0; i < count; i++) {
      const refTop = region.top - (region.top - region.bottom) * i / count
      const refBottom = region.top - (region.top - region.bottom) * (i + 1) / count
      list.push({
        rTop: actualRadius(refTop, coreRadius), rBottom: actualRadius(refBottom, coreRadius),
        vTop: scale * regionVelocity(region, refTop, wave), vBottom: scale * regionVelocity(region, refBottom, wave), region: region.name,
      })
    }
  }
  return layeredModel(wave, list)
}

export type RayKind = 'direct' | 'outer' | 'inner' | 'reflected'
export type RayVertex = { r: number; delta: number; time: number; keep: boolean }
export type TracedRay = { p: number; kind: RayKind; vertices: RayVertex[]; delta: number; time: number; deepest: number }

const clampUnit = (v: number) => Math.min(1, Math.max(-1, v))
function crossing(layer: Layer, p: number) {
  const pp = Math.min(p, layer.etaBottom)
  return {
    delta: (Math.acos(clampUnit(pp / layer.etaTop)) - Math.acos(clampUnit(pp / layer.etaBottom))) / layer.q,
    time: (Math.sqrt(Math.max(0, layer.etaTop ** 2 - pp * pp)) - Math.sqrt(Math.max(0, layer.etaBottom ** 2 - pp * pp))) / layer.q,
  }
}
function halfTurn(layer: Layer, p: number) {
  const rTurn = Math.min(layer.rTop, Math.max(layer.rBottom, (layer.a * p) ** (1 / layer.q)))
  return { delta: Math.acos(clampUnit(p / layer.etaTop)) / layer.q, time: Math.sqrt(Math.max(0, layer.etaTop ** 2 - p * p)) / layer.q, rTurn }
}

/**
 * Trace one ray of ray parameter p (s/rad) from the surface in a spherically symmetric model. Within each
 * shell v = a·r^(1−q), for which Δ and T have closed forms; p is conserved at every boundary by construction.
 * Total internal reflection happens where p exceeds η = r/v just below a boundary, and a liquid reflects shear.
 */
export function traceRay(model: EarthModel, p: number): TracedRay {
  const L = model.layers
  const vertices: RayVertex[] = [{ r: model.radius, delta: 0, time: 0, keep: true }]
  let k = 0, down = true, delta = 0, time = 0, deepest = model.radius
  let kind: RayKind = 'direct'
  for (let guard = 0; guard < 4 * L.length + 8; guard++) {
    const layer = L[k]
    if (down) {
      if (layer.liquid || p > layer.etaTop * (1 + 1e-12)) {
        if (layer.region !== 'mantle') kind = 'reflected'
        vertices[vertices.length - 1].keep = true
        down = false; k -= 1
        continue
      }
      if (layer.region === 'outer' && kind === 'direct') kind = 'outer'
      if (layer.region === 'inner') kind = 'inner'
      if (p > layer.etaBottom || k === L.length - 1) {
        const half = halfTurn(layer, p)
        delta += half.delta; time += half.time
        vertices.push({ r: half.rTurn, delta, time, keep: true })
        delta += half.delta; time += half.time
        deepest = half.rTurn
        vertices.push({ r: layer.rTop, delta, time, keep: layer.boundary })
        if (k === 0) break
        down = false; k -= 1
        continue
      }
      const step = crossing(layer, p)
      delta += step.delta; time += step.time; deepest = layer.rBottom
      vertices.push({ r: layer.rBottom, delta, time, keep: k + 1 < L.length && L[k + 1].boundary })
      k += 1
    } else {
      const step = crossing(layer, p)
      delta += step.delta; time += step.time
      vertices.push({ r: layer.rTop, delta, time, keep: layer.boundary })
      if (k === 0) break
      k -= 1
    }
  }
  vertices[vertices.length - 1].keep = true
  return { p, kind, vertices, delta: degrees(delta), time, deepest }
}

/** Ray parameter of a surface take-off angle measured from the vertical. */
export const rayParameter = (model: EarthModel, takeoff: number) => model.radius * Math.sin(radians(takeoff)) / model.layers[0].vTop

export type ShadowScan = {
  lastDirect: number
  minOuter: number | null
  onsetInner: number | null
  reflected: [number, number] | null
  maxTime: number
  direct: { p: number; delta: number; time: number }[]
}

const etaAtBoundary = (model: EarthModel, region: RegionName, side: 'above' | 'below') => {
  const index = model.layers.findIndex(l => l.region === region)
  if (index < 0) return null
  return side === 'below' ? model.layers[index].etaTop : model.layers[index - 1].etaBottom
}

/** Classify a dense fan of ray parameters: last direct arrival, first outer-core arrival, first inner-core arrival. */
export function shadowScan(model: EarthModel): ShadowScan {
  const pMax = model.layers[0].etaTop * (1 - 1e-9)
  const cmbAbove = etaAtBoundary(model, 'outer', 'above')!, icbAbove = etaAtBoundary(model, 'inner', 'above'), icbBelow = etaAtBoundary(model, 'inner', 'below')
  const ps: number[] = []
  for (let k = 0; k < 200; k++) ps.push(pMax * (k + 0.5) / 200)
  for (let k = 0; k < 120; k++) ps.push(cmbAbove * (k + 0.5) / 120)
  for (const special of [cmbAbove, icbAbove, icbBelow]) if (special && Number.isFinite(special)) ps.push(special * (1 - 1e-7), special * (1 + 1e-7))
  ps.sort((a, b) => a - b)
  const rays = ps.filter(p => p <= pMax).map(p => traceRay(model, p))
  const direct = rays.filter(r => r.kind === 'direct').map(r => ({ p: r.p, delta: r.delta, time: r.time }))
  const outer = rays.filter(r => r.kind === 'outer'), inner = rays.filter(r => r.kind === 'inner'), reflected = rays.filter(r => r.kind === 'reflected')
  let minOuter: number | null = null
  if (outer.length) {
    let best = 0
    outer.forEach((r, i) => { if (r.delta < outer[best].delta) best = i })
    let lo = outer[Math.max(0, best - 1)].p, hi = outer[Math.min(outer.length - 1, best + 1)].p
    for (let i = 0; i < 40; i++) {
      const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3
      if (traceRay(model, m1).delta < traceRay(model, m2).delta) hi = m2; else lo = m1
    }
    minOuter = Math.min(outer[best].delta, traceRay(model, (lo + hi) / 2).delta)
  }
  return {
    lastDirect: Math.max(...direct.map(r => r.delta)),
    minOuter,
    onsetInner: inner.length ? Math.min(...inner.map(r => r.delta)) : null,
    reflected: reflected.length ? [Math.min(...reflected.map(r => r.delta)), Math.max(...reflected.map(r => r.delta))] : null,
    maxTime: Math.max(...rays.map(r => r.time)),
    direct,
  }
}

/** First-arrival travel time at an epicentral distance, interpolated along the direct branch of the scan. */
export function directTravelTime(scan: ShadowScan, delta: number): number | null {
  let best: number | null = null
  for (let i = 1; i < scan.direct.length; i++) {
    const a = scan.direct[i - 1], b = scan.direct[i]
    if ((a.delta - delta) * (b.delta - delta) > 0 || a.delta === b.delta) continue
    const t = a.time + (b.time - a.time) * (delta - a.delta) / (b.delta - a.delta)
    if (best === null || t < best) best = t
  }
  return best
}

/**
 * The drawn fan, 1.5°–44° from the vertical: dense near the vertical so the core branches have rays, plus the inner-core
 * critical ray and one ray in the narrow window (p between η just below and just above the ICB) that totally reflects
 * from the inner-core boundary as PKiKP. Steeper take-offs reflect inside the crust.
 */
export function fanTakeoffs(): number[] {
  const list = Array.from({ length: 36 }, (_, j) => 1.5 + 42.5 * (j / 35) ** 1.7)
  const surface = premVelocity(EARTH_RADIUS, 'p') / EARTH_RADIUS
  const etaBelow = PREM_ICB / premVelocity(PREM_ICB, 'p', 'below'), etaAbove = PREM_ICB / premVelocity(PREM_ICB, 'p', 'above')
  const critical = degrees(Math.asin(0.9999 * etaBelow * surface))
  const pkikp = degrees(Math.asin(0.5 * (etaBelow + etaAbove) * surface))
  return [...list, critical, pkikp].sort((a, b) => a - b)
}

type Solution = { model: EarthModel; scan: ShadowScan; rays: TracedRay[]; clock: number }
const paramsKey = (p: SpatialParams) => `${p.coreSpeed}|${p.coreRadius}|${p.wave}`
let memo: { key: string; value: Solution } | null = null

/** A pure function of the parameters; the single-entry memo only avoids re-tracing while the timeline plays. */
export function solve(p: SpatialParams): Solution {
  const key = paramsKey(p)
  if (memo && memo.key === key) return memo.value
  const wave: Wave = p.wave >= 0.5 ? 's' : 'p'
  const model = buildModel(p.coreSpeed, p.coreRadius, wave)
  const scan = shadowScan(model)
  const rays = fanTakeoffs().map(angle => traceRay(model, rayParameter(model, angle)))
  const clock = Math.max(...rays.map(r => r.time))
  memo = { key, value: { model, scan, rays, clock } }
  return memo.value
}

export const KIND_COLOUR: Record<RayKind, string> = { direct: CYAN, outer: VIOLET, inner: AMBER, reflected: FAINT }

/** World position of (radius in km, polar angle from the source in rad) in the vertical plane at the given azimuth. */
export function place(r: number, delta: number, azimuth: number): Vec3 {
  const s = r / EARTH_RADIUS * WORLD_RADIUS
  return [s * Math.sin(delta) * Math.cos(azimuth), CENTRE_Y + s * Math.cos(delta), s * Math.sin(delta) * Math.sin(azimuth)]
}

/** Polyline of a ray truncated at travel time t; always at least two points. */
export function rayPolyline(ray: TracedRay, t: number, azimuth: number): Vec3[] {
  const kept = ray.vertices.filter((v, i) => v.keep || i % 3 === 0)
  const points: Vec3[] = [place(kept[0].r, kept[0].delta, azimuth)]
  for (let i = 1; i < kept.length; i++) {
    const a = kept[i - 1], b = kept[i]
    if (b.time <= t) { points.push(place(b.r, b.delta, azimuth)); continue }
    const f = b.time > a.time ? Math.max(0, (t - a.time) / (b.time - a.time)) : 0
    points.push(place(a.r + (b.r - a.r) * f, a.delta + (b.delta - a.delta) * f, azimuth))
    break
  }
  if (points.length < 2) points.push(points[0])
  return points
}

function sphereSurface(rKm: number, color: string, opacity: number): SpatialSurface {
  const nu = 32, nv = 16, vertices: Vec3[] = [], indices: number[] = []
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) vertices.push(place(rKm, Math.PI * j / nv, TAU * i / nu))
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + nu + 1
    indices.push(a, b, a + 1, a + 1, b, b + 1)
  }
  return { vertices, indices, color, opacity }
}

/** Surface of revolution about the source–antipode axis between two polar angles, just outside the globe. */
export function shadowBand(fromDegrees: number, toDegrees: number, color: string, opacity: number): SpatialSurface {
  const nu = 48, nv = 6, vertices: Vec3[] = [], indices: number[] = []
  const r = EARTH_RADIUS * 1.004
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) vertices.push(place(r, radians(fromDegrees + (toDegrees - fromDegrees) * j / nv), TAU * i / nu))
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + nu + 1
    indices.push(a, b, a + 1, a + 1, b, b + 1)
  }
  return { vertices, indices, color, opacity }
}

const minutes = (seconds: number) => `${(seconds / 60).toFixed(1)} min`

export const lesson: SpatialLesson = {
  slug: 'seismic-shadow', title: 'Seismic shadow zones', category: 'earth',
  blogSlug: 'a-ring-of-silence-proves-the-core-is-liquid', accent: SKY,
  cameraDistance: 7,
  description: 'Fire a fan of earthquake rays through a PREM Earth and watch the liquid core cast a ring-shaped shadow on the far side of the globe.',
  defaults: { coreSpeed: 1, coreRadius: 3480, wave: 0 },
  controls: [
    { key: 'coreSpeed', label: 'Outer-core P speed × PREM', min: 0.6, max: 1.5, step: 0.05 },
    { key: 'coreRadius', label: 'Core radius', min: 2500, max: 4500, step: 10, unit: 'km' },
    { key: 'wave', label: 'Wave type (0 = P, 1 = S)', min: 0, max: 1, step: 1 },
  ],
  presets: [
    { label: 'S waves: no arrivals beyond ≈103°', params: { coreSpeed: 1, coreRadius: 3480, wave: 1 } },
    { label: 'Fast core ×1.5: shadow shrinks to 98°–108°', params: { coreSpeed: 1.5, coreRadius: 3480, wave: 0 } },
    { label: 'Small core 2800 km: a narrower, farther shadow', params: { coreSpeed: 1, coreRadius: 2800, wave: 0 } },
  ],
  legend: [
    { label: 'Earth, core boundaries and the shadow zone', color: SKY },
    { label: 'Direct rays through the mantle', color: CYAN },
    { label: 'PKP: turned in the liquid outer core', color: VIOLET },
    { label: 'PKIKP: through the solid inner core', color: AMBER },
    { label: 'Reflected at a core boundary (PKiKP, ScS)', color: FAINT },
    { label: 'Earthquake source', color: WHITE },
  ],
  explanation: 'Cyan rays stay in the mantle, violet rays turn in the liquid outer core (PKP), amber rays cross the solid inner core (PKIKP) and the dim grey rays reflect from a core boundary (PKiKP, or ScS for shear waves). The sky-blue belt on the globe is the shadow zone the model predicts, the gap between the last direct ray and the first PKP ray swept around the source–antipode axis; the fainter fan at right angles shows the same rays in a second plane. The timeline is travel time from the quake at the top of the globe to the last arrival of the fan (about 20 min for PREM P, 26 min for S), so ray tips sweep the planet like wavefronts and a dot marks where each ray lands.',
  limitation: 'Geometric rays in a spherically symmetric PREM cut into 120 power-law shells: no amplitudes, diffraction, conversions (SKS, PcP) or partial reflections, so the model edges (98° and 145° for PREM P) differ from the observed 103°–143° by diffracted P along the core and the PKP caustic. Only totally reflected inner-core rays are drawn as PKiKP, and ray tips are not true wavefronts. The core-radius control stretches the lower mantle and outer core onto the chosen boundary, the source sits at the surface rather than at depth, and 1 world unit is about 2770 km.',
  readouts: p => {
    const { model, scan } = solve(p)
    const t90 = directTravelTime(scan, 90)
    if (model.wave === 's') return [
      { label: 'S shadow (model) · observed beyond ≈103°', value: `beyond ${scan.lastDirect.toFixed(1)}°` },
      { label: 'S at 90° · S at the antipode', value: `${t90 === null ? '—' : minutes(t90)} · none through the liquid core` },
      { label: 'Refraction into the core at 30° incidence', value: 'none: Vs = 0.0 km/s in the outer core' },
    ]
    const antipode = traceRay(model, 0).time
    const refracted = coreRefraction(30, p.coreSpeed, 'p')
    const ratio = premVelocity(PREM_CMB, 'p', 'below') * p.coreSpeed / premVelocity(PREM_CMB, 'p', 'above')
    return [
      { label: 'P shadow (model) · observed 103°–143°', value: scan.minOuter === null ? 'no PKP rays' : scan.minOuter <= scan.lastDirect ? `closed: PKP lands inside ${scan.lastDirect.toFixed(1)}°` : `${scan.lastDirect.toFixed(1)}° → ${scan.minOuter.toFixed(1)}°` },
      { label: 'P at 90° · PKIKP at the antipode', value: `${t90 === null ? '—' : minutes(t90)} (IASP91 13.0) · ${minutes(antipode)} (IASP91 20.2)` },
      { label: 'Refraction into the core at 30° incidence', value: `${refracted === null ? 'total reflection' : `${refracted.toFixed(1)}°`} · velocity ratio ${ratio.toFixed(2)}` },
    ]
  },
  build: (p, phase) => {
    const { model, scan, rays, clock } = solve(p)
    const t = clock * phase / TAU
    const lines: SpatialLine[] = []
    const points: SpatialPoint[] = [{ position: place(EARTH_RADIUS, 0, 0), color: WHITE, size: 0.08 }]
    for (const azimuth of [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4]) lines.push({ points: linspace(129, u => place(EARTH_RADIUS, TAU * u, azimuth)), color: SKY, opacity: 0.35 })
    for (const parallel of [30, 60, 90, 120, 150]) lines.push({ points: linspace(65, u => place(EARTH_RADIUS, radians(parallel), TAU * u)), color: SKY, opacity: 0.25 })
    const cmb = model.layers.find(l => l.region === 'outer')!.rTop, icb = model.layers.find(l => l.region === 'inner')!.rTop
    for (const azimuth of [0, Math.PI / 2]) for (const r of [cmb, icb]) lines.push({ points: linspace(97, u => place(r, TAU * u, azimuth)), color: SKY, opacity: 0.7 })
    rays.forEach((ray, i) => {
      const color = KIND_COLOUR[ray.kind]
      lines.push({ points: rayPolyline(ray, t, 0), color, opacity: ray.kind === 'reflected' ? 0.7 : 0.9 })
      if (i % 2 === 0) lines.push({ points: rayPolyline(ray, t, Math.PI / 2), color, opacity: 0.35 })
      if (ray.time <= t) {
        points.push({ position: place(EARTH_RADIUS, radians(ray.delta), 0), color, size: 0.045 })
        if (i % 2 === 0) points.push({ position: place(EARTH_RADIUS, radians(ray.delta), Math.PI / 2), color, size: 0.035 })
      }
    })
    const surfaces: SpatialSurface[] = [sphereSurface(cmb, SKY, 0.1), sphereSurface(icb, SKY, 0.14)]
    if (model.wave === 's') surfaces.push(shadowBand(scan.lastDirect, 180, SKY, 0.25))
    else if (scan.minOuter !== null && scan.minOuter > scan.lastDirect) surfaces.push(shadowBand(scan.lastDirect, scan.minOuter, SKY, 0.3))
    return { lines, surfaces, points }
  },
}

export default lesson
