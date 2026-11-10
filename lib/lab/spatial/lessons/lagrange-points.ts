import { TAU } from '../geometry'
import type { SpatialFrame, SpatialLesson, SpatialLine, SpatialSurface, Vec3 } from '../types'

const SKY = '#38bdf8'
const CYAN = '#55e6d0'
const VIOLET = '#b59aff'
const AMBER = '#ffc46b'
const WHITE = '#eff8ff'

/** Plummer softening for the drawn sheet and the integrator; L-point positions move by < 1e-4. */
export const SOFTENING = 0.01
/** Fixed RK4 step count over the full simulated time, so a frame at any phase is a prefix of the same run. */
export const TRAJECTORY_STEPS = 960
const GRID = 61
const HALF_WIDTH = 1.5
const WORLD_SCALE = 1.6
const FLOOR = -1.9
const TOP = 0.9

/** Slider value is log10 μ; the top of the track maps to the equal-mass limit. */
export const massRatioFrom = (logMassRatio: number) => Math.min(0.5, 10 ** logMassRatio)

/** Circular restricted three-body problem: separation 1, angular rate 1, total mass 1, primaries at (−μ, 0) and (1 − μ, 0). */
export function effectivePotential(x: number, y: number, mu: number, softening = 0) {
  const r1 = Math.sqrt((x + mu) ** 2 + y * y + softening * softening)
  const r2 = Math.sqrt((x - 1 + mu) ** 2 + y * y + softening * softening)
  return -(1 - mu) / r1 - mu / r2 - 0.5 * (x * x + y * y)
}

/** Φ at L4 and L5 in closed form, from r1 = r2 = 1 and x² + y² = 1 − μ + μ². */
export const potentialAtL4 = (mu: number) => -0.5 * (3 - mu * (1 - mu))

/** Jacobi constant C = −2Φ − v², conserved along every rotating-frame trajectory. */
export const jacobiConstant = (x: number, y: number, vx: number, vy: number, mu: number, softening = 0) =>
  -2 * effectivePotential(x, y, mu, softening) - vx * vx - vy * vy

export const hillRadius = (mu: number) => Math.cbrt(mu / 3)

/** Gascheau (1843) and Routh (1875): L4 and L5 are linearly stable iff 27μ(1 − μ) < 1. */
export const ROUTH_CRITICAL_MASS_RATIO = (1 - Math.sqrt(23 / 27)) / 2

export const lagrangeL4 = (mu: number): [number, number] => [0.5 - mu, Math.sqrt(3) / 2]

/** Newton on the collinear force balance with its analytic derivative, each iterate clamped to its own interval. */
export function collinearPoints(mu: number) {
  const force = (x: number) => x - (1 - mu) * (x + mu) / Math.abs(x + mu) ** 3 - mu * (x - 1 + mu) / Math.abs(x - 1 + mu) ** 3
  const slope = (x: number) => 1 + 2 * (1 - mu) / Math.abs(x + mu) ** 3 + 2 * mu / Math.abs(x - 1 + mu) ** 3
  const solve = (seed: number, low: number, high: number) => {
    let x = seed
    for (let i = 0; i < 40; i++) x = Math.min(high - 1e-9, Math.max(low + 1e-9, x - force(x) / slope(x)))
    return x
  }
  const hill = hillRadius(mu)
  return {
    l1: solve(1 - mu - hill, -mu, 1 - mu),
    l2: solve(1 - mu + hill, 1 - mu, 2),
    l3: solve(-1 - 5 * mu / 12, -2, -mu),
    residual: (x: number) => force(x),
  }
}

/**
 * Linearised motion about L4: ω² = ½[1 ± √(1 − 27μ(1 − μ))]. Below Routh's limit both roots are real and give
 * two libration periods (in orbits); above it ω is complex and the imaginary part sets an e-folding time.
 */
export function librationAboutL4(mu: number) {
  const q = 27 * mu * (1 - mu)
  if (q < 1) {
    const root = Math.sqrt(1 - q)
    return { stable: true as const, periods: [1 / Math.sqrt(0.5 * (1 + root)), 1 / Math.sqrt(0.5 * (1 - root))] as [number, number], efold: Infinity }
  }
  const magnitude = Math.sqrt(0.5 * Math.sqrt(q))
  const growth = magnitude * Math.sin(Math.atan(Math.sqrt(q - 1)) / 2)
  return { stable: false as const, periods: null, efold: 1 / (TAU * growth) }
}

/** Rotating-frame equations of motion: ẍ = 2ẏ − ∂Φ/∂x, ÿ = −2ẋ − ∂Φ/∂y. */
export function acceleration(x: number, y: number, vx: number, vy: number, mu: number, softening = SOFTENING): [number, number] {
  const r1 = Math.sqrt((x + mu) ** 2 + y * y + softening * softening)
  const r2 = Math.sqrt((x - 1 + mu) ** 2 + y * y + softening * softening)
  const gx = (1 - mu) * (x + mu) / r1 ** 3 + mu * (x - 1 + mu) / r2 ** 3 - x
  const gy = (1 - mu) * y / r1 ** 3 + mu * y / r2 ** 3 - y
  return [2 * vy - gx, -2 * vx - gy]
}

export type TrajectoryEnd = 'runs' | 'left' | 'close' | 'drift'
export type Trajectory = { points: [number, number][]; end: TrajectoryEnd; endOrbits: number; jacobiDrift: number }

/**
 * Release a particle at rest (rotating frame) from L4, displaced toward the larger primary, and integrate with
 * fixed-step RK4. The polyline stops at the first step that comes within 0.05 of a primary, leaves the plotted
 * square, or drifts more than 1% in Jacobi constant; the trajectory always carries at least two points.
 */
export function integrateTrajectory(mu: number, displacement: number, periods: number, steps = TRAJECTORY_STEPS): Trajectory {
  const [l4x, l4y] = lagrangeL4(mu)
  let x = l4x - displacement / 2, y = l4y - displacement * Math.sqrt(3) / 2, vx = 0, vy = 0
  const h = periods * TAU / TRAJECTORY_STEPS
  const c0 = jacobiConstant(x, y, vx, vy, mu, SOFTENING)
  const points: [number, number][] = [[x, y]]
  let drift = 0
  const near = (px: number, py: number) => Math.hypot(px + mu, py) < 0.05 || Math.hypot(px - 1 + mu, py) < 0.05
  for (let i = 0; i < steps; i++) {
    const [ax1, ay1] = acceleration(x, y, vx, vy, mu)
    const [ax2, ay2] = acceleration(x + 0.5 * h * vx, y + 0.5 * h * vy, vx + 0.5 * h * ax1, vy + 0.5 * h * ay1, mu)
    const vx2 = vx + 0.5 * h * ax1, vy2 = vy + 0.5 * h * ay1
    const [ax3, ay3] = acceleration(x + 0.5 * h * vx2, y + 0.5 * h * vy2, vx + 0.5 * h * ax2, vy + 0.5 * h * ay2, mu)
    const vx3 = vx + 0.5 * h * ax2, vy3 = vy + 0.5 * h * ay2
    const [ax4, ay4] = acceleration(x + h * vx3, y + h * vy3, vx + h * ax3, vy + h * ay3, mu)
    const vx4 = vx + h * ax3, vy4 = vy + h * ay3
    const nx = x + h / 6 * (vx + 2 * vx2 + 2 * vx3 + vx4)
    const ny = y + h / 6 * (vy + 2 * vy2 + 2 * vy3 + vy4)
    const nvx = vx + h / 6 * (ax1 + 2 * ax2 + 2 * ax3 + ax4)
    const nvy = vy + h / 6 * (ay1 + 2 * ay2 + 2 * ay3 + ay4)
    const orbits = (i + 1) * periods / TRAJECTORY_STEPS
    if (near(nx, ny)) return { points: pad(points), end: 'close', endOrbits: orbits, jacobiDrift: drift }
    if (Math.abs(nx) > HALF_WIDTH || Math.abs(ny) > HALF_WIDTH) return { points: pad(points), end: 'left', endOrbits: orbits, jacobiDrift: drift }
    const stepDrift = Math.abs(jacobiConstant(nx, ny, nvx, nvy, mu, SOFTENING) - c0) / Math.abs(c0)
    if (stepDrift > 0.01) return { points: pad(points), end: 'drift', endOrbits: orbits, jacobiDrift: stepDrift }
    drift = Math.max(drift, stepDrift)
    x = nx; y = ny; vx = nvx; vy = nvy
    points.push([x, y])
  }
  return { points: pad(points), end: 'runs', endOrbits: steps * periods / TRAJECTORY_STEPS, jacobiDrift: drift }
}

const pad = (points: [number, number][]) => points.length > 1 ? points : [points[0], points[0]]

/** World height from the drop d = Φ(L4) − Φ ≥ 0: linear near the hilltops, asinh-compressed in the wells, floored. */
export function surfaceHeight(drop: number) {
  const s = 0.4
  return Math.max(FLOOR, TOP - 3 * s * Math.asinh(drop / s))
}

export const uniformAxis = () => Array.from({ length: GRID }, (_, i) => -HALF_WIDTH + 2 * HALF_WIDTH * i / (GRID - 1))

/** Grid columns snap to the primaries so each body sits at the lowest vertex of its own well. */
export function gridAxis(mu: number): number[] {
  const xs = uniformAxis()
  for (const target of [-mu, 1 - mu]) {
    let best = 0
    for (let i = 1; i < GRID; i++) if (Math.abs(xs[i] - target) < Math.abs(xs[best] - target)) best = i
    xs[best] = target
  }
  return xs
}

/** Marching squares for Φ = level on the sheet's grid, chained through shared edges into a few polylines. */
export function contourPolylines(xs: number[], ys: number[], values: number[][], level: number): [number, number][][] {
  const nx = xs.length, ny = ys.length
  const edgePoint = (ax: number, ay: number, bx: number, by: number, va: number, vb: number): [number, number] => {
    const t = Math.min(1, Math.max(0, (level - va) / (vb - va)))
    return [ax + t * (bx - ax), ay + t * (by - ay)]
  }
  const points = new Map<string, [number, number]>()
  const adjacency = new Map<string, string[]>()
  const link = (a: string, b: string) => {
    adjacency.set(a, [...(adjacency.get(a) ?? []), b])
    adjacency.set(b, [...(adjacency.get(b) ?? []), a])
  }
  for (let i = 0; i < nx - 1; i++) for (let j = 0; j < ny - 1; j++) {
    const v00 = values[i][j], v10 = values[i + 1][j], v11 = values[i + 1][j + 1], v01 = values[i][j + 1]
    const code = (v00 > level ? 1 : 0) | (v10 > level ? 2 : 0) | (v11 > level ? 4 : 0) | (v01 > level ? 8 : 0)
    if (code === 0 || code === 15) continue
    const bottom = `h${i},${j}`, top = `h${i},${j + 1}`, left = `v${i},${j}`, right = `v${i + 1},${j}`
    const place = (key: string, point: [number, number]) => { if (!points.has(key)) points.set(key, point) }
    place(bottom, edgePoint(xs[i], ys[j], xs[i + 1], ys[j], v00, v10))
    place(top, edgePoint(xs[i], ys[j + 1], xs[i + 1], ys[j + 1], v01, v11))
    place(left, edgePoint(xs[i], ys[j], xs[i], ys[j + 1], v00, v01))
    place(right, edgePoint(xs[i + 1], ys[j], xs[i + 1], ys[j + 1], v10, v11))
    const segments: Record<number, [string, string][]> = {
      1: [[left, bottom]], 2: [[bottom, right]], 3: [[left, right]], 4: [[right, top]], 5: [[left, top], [bottom, right]],
      6: [[bottom, top]], 7: [[left, top]], 8: [[left, top]], 9: [[bottom, top]], 10: [[left, bottom], [right, top]],
      11: [[right, top]], 12: [[left, right]], 13: [[bottom, right]], 14: [[left, bottom]],
    }
    for (const [a, b] of segments[code]) link(a, b)
  }
  const visited = new Set<string>()
  const polylines: [number, number][][] = []
  const walk = (start: string) => {
    const chain = [start]
    visited.add(start)
    let current = start
    for (;;) {
      const next = (adjacency.get(current) ?? []).find(key => !visited.has(key))
      if (!next) break
      visited.add(next)
      chain.push(next)
      current = next
    }
    return chain
  }
  for (const key of adjacency.keys()) {
    if (visited.has(key) || (adjacency.get(key)?.length ?? 0) !== 1) continue
    polylines.push(walk(key).map(k => points.get(k) as [number, number]))
  }
  for (const key of adjacency.keys()) {
    if (visited.has(key)) continue
    const chain = walk(key)
    chain.push(chain[0])
    polylines.push(chain.map(k => points.get(k) as [number, number]))
  }
  return polylines
}

const toWorld = (x: number, y: number, height: number): Vec3 => [WORLD_SCALE * x, height, WORLD_SCALE * y]

const formatMu = (mu: number) => mu >= 0.005 ? mu.toPrecision(4) : mu.toExponential(2)

export const lesson: SpatialLesson = {
  slug: 'lagrange-points', title: 'Lagrange points on the effective potential', category: 'earth',
  blogSlug: 'stable-lagrange-points-sit-on-hilltops', accent: SKY,
  cameraDistance: 8.5,
  description: 'Draw the rotating-frame effective potential of two orbiting bodies, find its five equilibria, and release a particle from the hilltop at L4.',
  defaults: { logMassRatio: -1.9154, displacement: 0.02, periods: 2 },
  controls: [
    { key: 'logMassRatio', label: 'log₁₀ mass ratio μ', min: -3.3, max: -0.301, step: 0.0001 },
    { key: 'displacement', label: 'Release offset from L4', min: 0.005, max: 0.1, step: 0.005 },
    { key: 'periods', label: 'Simulated time', min: 0.5, max: 6, step: 0.5, unit: 'orbits' },
  ],
  presets: [
    { label: 'Sun-Jupiter Trojans', params: { logMassRatio: -3.02, displacement: 0.01, periods: 6 } },
    { label: 'Pluto-Charon: L4 unstable', params: { logMassRatio: -0.963, displacement: 0.02, periods: 1.5 } },
    { label: 'Equal masses', params: { logMassRatio: -0.301, displacement: 0.02, periods: 2 } },
  ],
  legend: [
    { label: 'Effective potential Φ in the rotating frame', color: SKY },
    { label: 'Zero-velocity curve through L1', color: AMBER },
    { label: 'Lagrange points L1 to L5', color: VIOLET },
    { label: 'Particle released beside L4', color: CYAN },
  ],
  explanation: 'The blue sheet is the effective potential Φ of the rotating frame: gravity of both bodies plus the centrifugal term, with the two white spheres sitting in their wells and L4 and L5 (violet) on the two hilltops at a fixed height. The amber curve is the zero-velocity contour at the level of L1, the neck a particle must cross to pass between the wells. The cyan line is a particle released at rest beside L4, integrated forward as the timeline runs; it stops where it would leave the plotted square or graze a body, and the timeline restarts at the end.',
  limitation: 'This is the rotating-frame effective potential of the circular restricted three-body problem, not the spacetime rubber sheet drawn elsewhere on this site. Heights are anchored to Φ(L4) and compressed with an asinh below the saddles, so wells look shallower than they are, and a Plummer softening of 0.01 removes the singularities at the bodies. The Coriolis force, which is what keeps a particle near the L4 hilltop, has no height on the sheet: it shows up only in the cyan path looping instead of rolling off. The particle is massless, the orbits circular and coplanar, and the 960-step integrator is trustworthy only away from the bodies, which is why a path ends at a close approach.',
  readouts: p => {
    const mu = massRatioFrom(p.logMassRatio)
    const { l1, l2 } = collinearPoints(mu)
    const libration = librationAboutL4(mu)
    const trajectory = integrateTrajectory(mu, p.displacement, p.periods)
    const ending = trajectory.end === 'runs' ? `runs the full ${trajectory.endOrbits.toFixed(1)} orbits`
      : trajectory.end === 'left' ? `leaves the plotted square at ${trajectory.endOrbits.toFixed(2)} orbits`
      : trajectory.end === 'close' ? `close approach to a body at ${trajectory.endOrbits.toFixed(2)} orbits`
      : `integrator drift exceeds 1% at ${trajectory.endOrbits.toFixed(2)} orbits`
    return [
      { label: 'L1 and L2 distance from the secondary', value: `${(1 - mu - l1).toFixed(4)} / ${(l2 - 1 + mu).toFixed(4)} (Hill ${hillRadius(mu).toFixed(4)})` },
      { label: 'L4 and L5 against Routh’s limit μ < 0.0385', value: libration.stable ? `stable at μ = ${formatMu(mu)}` : `unstable at μ = ${formatMu(mu)}` },
      { label: 'Libration about L4', value: libration.stable ? `${libration.periods[0].toFixed(3)} and ${libration.periods[1].toFixed(3)} orbits` : `e-folds in ${libration.efold.toFixed(2)} orbits` },
      { label: 'Released particle', value: ending },
    ]
  },
  build: (p, phase) => {
    const mu = massRatioFrom(p.logMassRatio)
    const anchor = effectivePotential(...lagrangeL4(mu), mu, SOFTENING)
    const height = (x: number, y: number) => surfaceHeight(anchor - effectivePotential(x, y, mu, SOFTENING))
    const xs = gridAxis(mu), ys = uniformAxis()
    const values = xs.map(x => ys.map(y => effectivePotential(x, y, mu, SOFTENING)))
    const surface: SpatialSurface = { vertices: [], indices: [], color: SKY, opacity: 0.14 }
    for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
      surface.vertices.push(toWorld(xs[i], ys[j], surfaceHeight(anchor - values[i][j])))
      if (i < GRID - 1 && j < GRID - 1) {
        const a = i * GRID + j, b = a + GRID
        surface.indices.push(a, b, a + 1, a + 1, b, b + 1)
      }
    }
    const lines: SpatialLine[] = []
    for (let k = 0; k < GRID; k += 5) {
      lines.push({ points: ys.map((y, j) => toWorld(xs[k], y, surfaceHeight(anchor - values[k][j]) + 0.01)), color: SKY, opacity: 0.3 })
      lines.push({ points: xs.map((x, i) => toWorld(x, ys[k], surfaceHeight(anchor - values[i][k]) + 0.01)), color: SKY, opacity: 0.3 })
    }
    const { l1, l2, l3 } = collinearPoints(mu)
    for (const polyline of contourPolylines(xs, ys, values, effectivePotential(l1, 0, mu, SOFTENING))) {
      if (polyline.length > 1) lines.push({ points: polyline.map(([x, y]) => toWorld(x, y, height(x, y) + 0.02)), color: AMBER, opacity: 0.85 })
    }
    const steps = Math.round(TRAJECTORY_STEPS * Math.min(1, Math.max(0, phase / TAU)))
    const trajectory = integrateTrajectory(mu, p.displacement, p.periods, steps)
    const path = trajectory.points.map(([x, y]) => toWorld(x, y, height(x, y) + 0.02))
    lines.push({ points: path, color: CYAN })
    const [l4x, l4y] = lagrangeL4(mu)
    const points: SpatialFrame['points'] = [
      { position: toWorld(-mu, 0, height(-mu, 0)), color: WHITE, size: 0.05 + 0.18 * Math.cbrt(1 - mu) },
      { position: toWorld(1 - mu, 0, height(1 - mu, 0)), color: WHITE, size: 0.05 + 0.18 * Math.cbrt(mu) },
      ...[[l1, 0], [l2, 0], [l3, 0], [l4x, l4y], [l4x, -l4y]].map(([x, y]) => ({ position: toWorld(x, y, height(x, y) + 0.02), color: VIOLET, size: 0.055 })),
      { position: path[path.length - 1], color: CYAN, size: 0.07 },
    ]
    return { lines, surfaces: [surface], points }
  },
}
