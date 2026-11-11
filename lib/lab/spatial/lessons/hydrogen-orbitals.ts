import { linspace, TAU } from '../geometry'
import type { SpatialFrame, SpatialLesson, SpatialParams, SpatialSurface, Vec3 } from '../types'

const PINK = '#f472b6'
const VIOLET = '#b59aff'
const AMBER = '#ffc46b'
const FAINT = '#53617d'
const WHITE = '#eff8ff'

/** Bohr radius in picometres (CODATA 2018). */
export const BOHR_PM = 52.9177
/** Rydberg energy for an infinitely heavy nucleus, in eV. */
export const RYDBERG_EV = 13.605693
/** Planck constant in eV·fs. */
const PLANCK_EV_FS = 4.135667696

const REAL_NAMES: string[][] = [
  ['s'],
  ['pz', 'px'],
  ['dz²', 'dxz', 'dx²−y²'],
  ['fz³', 'fxz²', 'fz(x²−y²)', 'fx(x²−3y²)'],
]

const factorial = (k: number): number => (k <= 1 ? 1 : k * factorial(k - 1))

/** Generalised Laguerre polynomial L_k^α(x) by the three-term recurrence. */
export function laguerre(k: number, alpha: number, x: number): number {
  if (k === 0) return 1
  let previous = 1, current = 1 + alpha - x
  for (let i = 1; i < k; i++) {
    const next = ((2 * i + 1 + alpha - x) * current - (i + alpha) * previous) / (i + 1)
    previous = current
    current = next
  }
  return current
}

/** Hydrogen radial function R_nl(r) with r in Bohr radii; normalised so ∫ r² R² dr = 1. */
export function radialFunction(n: number, l: number, r: number): number {
  const rho = 2 * r / n
  const norm = Math.sqrt((2 / n) ** 3 * factorial(n - l - 1) / (2 * n * factorial(n + l)))
  return norm * Math.exp(-rho / 2) * rho ** l * laguerre(n - l - 1, 2 * l + 1, rho)
}

/** Radial probability density P(r) = r² R_nl², r in Bohr radii. */
export const radialDensity = (n: number, l: number, r: number): number => r * r * radialFunction(n, l, r) ** 2

/** Associated Legendre P_l^m(x) for m ≥ 0 without the Condon–Shortley sign, so p_x is positive along +x. */
export function associatedLegendre(l: number, m: number, x: number): number {
  let pmm = 1
  const s = Math.sqrt(Math.max(0, 1 - x * x))
  for (let i = 1; i <= m; i++) pmm *= (2 * i - 1) * s
  if (l === m) return pmm
  let pLast = pmm, p = x * (2 * m + 1) * pmm
  for (let ll = m + 2; ll <= l; ll++) {
    const next = ((2 * ll - 1) * x * p - (ll + m - 1) * pLast) / (ll - m)
    pLast = p
    p = next
  }
  return p
}

/** Real spherical harmonic of the cos(mφ) family (s, p_z, p_x, d_z², d_xz, d_x²−y², f_z³, ...). */
export function realHarmonic(l: number, m: number, theta: number, phi: number): number {
  const norm = Math.sqrt((2 * l + 1) / (4 * Math.PI) * factorial(l - m) / factorial(l + m))
  const polar = associatedLegendre(l, m, Math.cos(theta))
  return m === 0 ? norm * polar : Math.SQRT2 * norm * polar * Math.cos(m * phi)
}

/** Slider aliasing resolves to a real orbital: n ≥ l + 1 and |m| ≤ l. */
export function effectiveNumbers(p: SpatialParams) {
  const l = Math.round(p.l), n = Math.max(Math.round(p.n), l + 1), m = Math.min(Math.round(p.m), l)
  return { n, l, m }
}

export const orbitalName = (n: number, l: number, m: number) => `${n}${REAL_NAMES[l][m]}`

/** Polar angles (degrees) of the nodal cones of the real harmonic (l, m): there are l − m of them. */
export function nodalCones(l: number, m: number): number[] {
  const degrees = (c: number) => Math.acos(c) * 180 / Math.PI
  const table: Record<string, number[]> = {
    '1,0': [0], '2,0': [1 / Math.sqrt(3), -1 / Math.sqrt(3)], '2,1': [0],
    '3,0': [Math.sqrt(3 / 5), 0, -Math.sqrt(3 / 5)], '3,1': [1 / Math.sqrt(5), -1 / Math.sqrt(5)], '3,2': [0],
  }
  return (table[`${l},${m}`] ?? []).map(degrees)
}

/** Azimuths (radians) of the m vertical nodal planes of cos(mφ). */
export const nodalPlanes = (m: number): number[] => Array.from({ length: m }, (_, k) => (Math.PI / 2 + k * Math.PI) / m)

/** Radial plot window in Bohr radii: P(r) has fallen below 1% of its peak by (3n² + 2) a0. */
export const radialWindow = (n: number) => 3 * n * n + 2

/** Zeros of R_nl for r > 0, in Bohr radii (n − l − 1 of them), by scan and bisection. */
export function radialNodes(n: number, l: number): number[] {
  const poly = (r: number) => laguerre(n - l - 1, 2 * l + 1, 2 * r / n)
  const nodes: number[] = []
  const rMax = radialWindow(n), steps = 4000
  let previous = poly(1e-9)
  for (let i = 1; i <= steps; i++) {
    const r = rMax * i / steps, value = poly(r)
    if (value === 0) nodes.push(r)
    else if (previous * value < 0) {
      let a = rMax * (i - 1) / steps, b = r
      for (let k = 0; k < 60; k++) { const mid = (a + b) / 2; if (poly(a) * poly(mid) <= 0) b = mid; else a = mid }
      nodes.push((a + b) / 2)
    }
    previous = value
  }
  return nodes
}

/** Most probable radius, the global maximum of P(r), in Bohr radii. Exactly n² a0 when l = n − 1. */
export function mostProbableRadius(n: number, l: number): number {
  if (l === n - 1) return n * n
  const rMax = radialWindow(n), samples = 400
  let best = 0, bestValue = -1
  for (let i = 1; i <= samples; i++) { const r = rMax * i / samples, v = radialDensity(n, l, r); if (v > bestValue) { bestValue = v; best = i } }
  let a = rMax * (best - 1) / samples, b = rMax * (best + 1) / samples
  const golden = (Math.sqrt(5) - 1) / 2
  let c = b - golden * (b - a), d = a + golden * (b - a)
  for (let k = 0; k < 60; k++) {
    if (radialDensity(n, l, c) > radialDensity(n, l, d)) { b = d } else { a = c }
    c = b - golden * (b - a); d = a + golden * (b - a)
  }
  return (a + b) / 2
}

/** ⟨r⟩ = (a0/2)[3n² − l(l+1)], in Bohr radii. */
export const meanRadius = (n: number, l: number) => (3 * n * n - l * (l + 1)) / 2
/** E_n = −R∞ / n² in eV (infinite nuclear mass). */
export const energyEv = (n: number) => -RYDBERG_EV / (n * n)
/** Period of Re ψ, T = h / |E_n|, in femtoseconds. */
export const rePeriodFs = (n: number) => PLANCK_EV_FS / Math.abs(energyEv(n))

const CENTRE_Y = 0.65, LOBE_RADIUS = 1.5, NODE_RADIUS = 1.65
const FLOOR_Y = -2.2, FLOOR_HALF = 2.4, CURVE_HEIGHT = 0.7
const THETA_STEPS = 32, PHI_STEPS = 48

/** Orbital frame (x, y, z with z polar) into the stage frame, which has y up. */
const toStage = (theta: number, phi: number, radius: number): Vec3 => [
  radius * Math.sin(theta) * Math.cos(phi), CENTRE_Y + radius * Math.cos(theta), -radius * Math.sin(theta) * Math.sin(phi),
]

function lobeMeshes(l: number, m: number, phase: number): SpatialSurface[] {
  const thetas = Array.from({ length: THETA_STEPS + 1 }, (_, i) => Math.PI * i / THETA_STEPS)
  const peak = Math.max(...thetas.map(t => Math.abs(realHarmonic(l, m, t, 0))))
  const scale = LOBE_RADIUS * Math.cos(phase) / peak
  const positive: SpatialSurface = { vertices: [], indices: [], color: PINK, opacity: 0.2 }
  const negative: SpatialSurface = { vertices: [], indices: [], color: AMBER, opacity: 0.2 }
  for (let i = 0; i <= THETA_STEPS; i++) {
    for (let j = 0; j <= PHI_STEPS; j++) {
      const phi = TAU * j / PHI_STEPS, value = realHarmonic(l, m, thetas[i], phi) * scale
      positive.vertices.push(toStage(thetas[i], phi, Math.max(0, value)))
      negative.vertices.push(toStage(thetas[i], phi, Math.max(0, -value)))
      if (i < THETA_STEPS && j < PHI_STEPS) {
        const a = i * (PHI_STEPS + 1) + j, b = a + PHI_STEPS + 1
        for (const mesh of [positive, negative]) mesh.indices.push(a, b, a + 1, a + 1, b, b + 1)
      }
    }
  }
  return [positive, negative]
}

function densityCage(l: number, m: number): SpatialFrame['lines'] {
  const thetas = Array.from({ length: 65 }, (_, i) => Math.PI * i / 64)
  const peak = Math.max(...thetas.map(t => realHarmonic(l, m, t, 0) ** 2))
  const radius = (theta: number, phi: number) => LOBE_RADIUS * realHarmonic(l, m, theta, phi) ** 2 / peak
  const lines: SpatialFrame['lines'] = []
  for (let k = 0; k < 8; k++) {
    const phi = TAU * k / 8
    lines.push({ points: linspace(65, u => toStage(Math.PI * u, phi, radius(Math.PI * u, phi))), color: WHITE, opacity: 0.3 })
  }
  for (let k = 1; k < 8; k++) {
    const theta = Math.PI * k / 8
    lines.push({ points: linspace(65, u => toStage(theta, TAU * u, radius(theta, TAU * u))), color: WHITE, opacity: 0.3 })
  }
  return lines
}

export const lesson: SpatialLesson = {
  slug: 'hydrogen-orbitals', title: 'Hydrogen orbitals', category: 'chemistry',
  blogSlug: 'a-p-electron-is-never-between-its-lobes', accent: PINK,
  cameraDistance: 8.5,
  description: 'Watch the real part of a hydrogen orbital swap sign while its probability density never moves, and read the nodes and radii against the Bohr radius.',
  defaults: { l: 1, n: 2, m: 0 },
  controls: [
    { key: 'l', label: 'Angular momentum l', min: 0, max: 3, step: 1 },
    { key: 'n', label: 'Principal number n', min: 1, max: 4, step: 1 },
    { key: 'm', label: 'Magnetic number |m|', min: 0, max: 3, step: 1 },
  ],
  presets: [
    { label: '1s ground state', params: { l: 0, n: 1, m: 0 } },
    { label: '2s radial node', params: { l: 0, n: 2, m: 0 } },
    { label: '3d z² magic angle', params: { l: 2, n: 3, m: 0 } },
    { label: '3d x²−y² planes', params: { l: 2, n: 3, m: 2 } },
  ],
  legend: [
    { label: 'Re ψ > 0 lobes (angular factor)', color: PINK },
    { label: 'Re ψ < 0 lobes', color: AMBER },
    { label: 'Stationary |ψ|²: angular cage and radial curve', color: WHITE },
    { label: 'Nodal cones, planes and radial zeros', color: VIOLET },
  ],
  explanation: 'The pink and amber lobes are the angular factor of the real wavefunction, scaled by cos(phase): one timeline pass is one period h/|E| of Re ψ, so the lobes shrink to nothing at a quarter turn and return with their signs swapped. The white cage is the angular probability density |Y|², which never moves. Violet circles mark the nodal cones and planes where the density is exactly zero. The white floor curve is the radial density r²R² in physical units from 0 to (3n² + 2) a0, with violet dots at the radial nodes, a white dot at the most probable radius and a grey tick at the mean radius.',
  limitation: 'The lobes plot |Y| normalised to a fixed size, not the 90% isosurface of textbooks; radial information lives only in the floor plot, and the two scenes share no scale. The orbitals are the real cos(mφ) standing waves (p_x rather than p_x ± i p_y), so slider values with n ≤ l or |m| > l alias to the nearest real orbital and the readout names it. Energies use the infinite-nuclear-mass Rydberg (13.6057 eV); real hydrogen is 0.05% shallower. Spin, fine structure and the Lamb shift are omitted.',
  readouts: p => {
    const { n, l, m } = effectiveNumbers(p)
    const alias = n !== p.n || m !== p.m ? ` (slider n ${p.n}, |m| ${p.m} aliased)` : ''
    const radial = radialNodes(n, l).length
    return [
      { label: 'Orbital, nodes and energy', value: `${orbitalName(n, l, m)}${alias}: ${radial} radial, ${l} angular, ${energyEv(n).toFixed(3)} eV` },
      { label: 'Most probable radius', value: `${(mostProbableRadius(n, l) * BOHR_PM).toFixed(1)} pm (${mostProbableRadius(n, l).toFixed(3)} a0)` },
      { label: 'Mean radius and Re ψ period', value: `${(meanRadius(n, l) * BOHR_PM).toFixed(1)} pm, ${rePeriodFs(n).toFixed(3)} fs` },
    ]
  },
  build: (p, phase) => {
    const { n, l, m } = effectiveNumbers(p)
    const lines: SpatialFrame['lines'] = [
      { points: [[0, CENTRE_Y - NODE_RADIUS, 0], [0, CENTRE_Y + NODE_RADIUS, 0]], color: FAINT, opacity: 0.6 },
      { points: [[-FLOOR_HALF, FLOOR_Y, 0], [FLOOR_HALF, FLOOR_Y, 0]], color: FAINT },
      ...densityCage(l, m),
    ]
    for (const cone of nodalCones(l, m)) {
      const theta = cone * Math.PI / 180
      lines.push({ points: linspace(97, u => toStage(theta, TAU * u, NODE_RADIUS)), color: VIOLET, opacity: 0.75 })
    }
    for (const plane of nodalPlanes(m)) {
      lines.push({ points: linspace(97, u => toStage(TAU * u, plane, NODE_RADIUS)), color: VIOLET, opacity: 0.75 })
    }
    const rMax = radialWindow(n), xOf = (r: number) => -FLOOR_HALF + 2 * FLOOR_HALF * r / rMax
    const rMp = mostProbableRadius(n, l), peak = radialDensity(n, l, rMp)
    lines.push({ points: linspace(161, u => [xOf(rMax * u), FLOOR_Y + CURVE_HEIGHT * radialDensity(n, l, rMax * u) / peak, 0]), color: WHITE })
    lines.push({ points: [[xOf(meanRadius(n, l)), FLOOR_Y, 0], [xOf(meanRadius(n, l)), FLOOR_Y + 0.25, 0]], color: FAINT })
    const points: SpatialFrame['points'] = [
      { position: [0, CENTRE_Y, 0], color: WHITE, size: 0.04 },
      { position: [xOf(rMp), FLOOR_Y + CURVE_HEIGHT, 0], color: WHITE, size: 0.07 },
      ...radialNodes(n, l).map((r): { position: Vec3; color: string; size: number } => ({ position: [xOf(r), FLOOR_Y, 0], color: VIOLET, size: 0.06 })),
    ]
    return { lines, surfaces: lobeMeshes(l, m, phase), points }
  },
}

export default lesson
