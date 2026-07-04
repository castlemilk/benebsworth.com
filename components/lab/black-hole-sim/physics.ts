// CPU-side physics for the black-hole ray tracer. The SHADER works in
// geometric units (G = c = 1, M = 1 → Schwarzschild radius rs = 2 sim units,
// ISCO = 6, photon sphere = 3): the ray GEOMETRY is scale-free, so the mass
// slider never touches it. This module carries the SI side — the mass +
// accretion-rate sliders drive the disk temperature (Shakura–Sunyaev) and the
// live readout panel (rs, shadow angular size vs EHT, ISCO period, L_edd).
// No DOM, no React — fully unit-testable.

// ── Physical constants (SI) ─────────────────────────────────────────────
export const G = 6.674e-11 // m^3 kg^-1 s^-2
export const C = 2.998e8 // m s^-1
export const M_SUN = 1.989e30 // kg
export const SIGMA_SB = 5.670e-8 // W m^-2 K^-4
export const K_B = 1.380649e-23 // J K^-1
export const L_SUN = 3.828e26 // W
export const WIEN_B = 2.898e-3 // m·K

export const AU = 1.495978707e11 // m
export const LIGHT_HOUR = 1.0792528488e12 // m
export const KPC = 3.0857e19 // m
export const MPC = 3.0857e22 // m
export const GPC = 3.0857e25 // m
export const GLY = 9.4607e24 // m

// The physical peak disk temperature is usually deep in the UV/X-ray — you
// cannot literally display 10^5 K as a colour. The shader keeps the FULL
// physical temperature structure T_obs = g · T_peak · Trel(r) and compresses
// it chromatically onto the visible Planckian locus by the constant factor
// min(1, DISPLAY_TPEAK_K / T_peak) — an honest spectrum→RGB tonemap that
// preserves the radial falloff and the Doppler colour asymmetry.
export const DISPLAY_TPEAK_K = 5800

// ── Presets ─────────────────────────────────────────────────────────────
export type Preset = {
  id: string
  label: string
  massMsun: number
  /** Eddington-scaled accretion rate ṁ */
  mdot: number
  /** Reference distance for the angular-size readout */
  distanceM: number
  distanceLabel: string
  /** Doppler-beaming slider position (Gargantua suppresses it, like the film) */
  beaming: number
  /** Hardcoded EHT comparison string, when the EHT actually measured it */
  eht?: string
}

export const PRESETS: Preset[] = [
  { id: 'cygx1', label: 'Cygnus X-1', massMsun: 21, mdot: 0.02, distanceM: 2.2 * KPC, distanceLabel: '2.2 kpc', beaming: 1 },
  { id: 'sgra', label: 'Sgr A*', massMsun: 4.15e6, mdot: 1e-4, distanceM: 8.28 * KPC, distanceLabel: '8.28 kpc', beaming: 1, eht: 'EHT measured: 52 ± 2 μas' },
  { id: 'm87', label: 'M87*', massMsun: 6.5e9, mdot: 1e-3, distanceM: 16.8 * MPC, distanceLabel: '16.8 Mpc', beaming: 1, eht: 'EHT measured: 42 ± 3 μas' },
  { id: 'gargantua', label: 'Gargantua', massMsun: 1e8, mdot: 0.2, distanceM: 10 * GLY, distanceLabel: '10 Gly (fictional)', beaming: 0.05 },
  { id: 'ton618', label: 'TON 618', massMsun: 6.6e10, mdot: 0.4, distanceM: 3.1 * GPC, distanceLabel: '3.1 Gpc', beaming: 1 },
]

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id)
}

// ── Derived quantities ──────────────────────────────────────────────────

/** Schwarzschild radius rs = 2GM/c² (m) */
export function schwarzschildRadius(massMsun: number): number {
  return (2 * G * massMsun * M_SUN) / (C * C)
}

/** Shadow diameter = 2·√27·GM/c² ≈ 5.196 rs (m) */
export function shadowDiameter(massMsun: number): number {
  return 2 * Math.sqrt(27) * ((G * massMsun * M_SUN) / (C * C))
}

/** Apparent angular diameter of the shadow at `distanceM`, in μas */
export function shadowAngularMicroArcsec(massMsun: number, distanceM: number): number {
  const rad = shadowDiameter(massMsun) / distanceM
  return rad * 206264.806 * 1e6 // rad → arcsec → μas
}

/**
 * SS73 thin-disk peak temperature: T_peak ≈ 6.3×10⁷ K · ṁ^(1/4) · (M/M☉)^(-1/4)
 * (Shakura & Sunyaev 1973, Eddington-scaled accretion rate ṁ).
 */
export function diskPeakTemp(massMsun: number, mdot: number): number {
  return 6.3e7 * Math.pow(mdot, 0.25) * Math.pow(massMsun, -0.25)
}

/** Wien displacement peak λ = b/T (m) */
export function wienPeak(tempK: number): number {
  return WIEN_B / tempK
}

/** ISCO orbital period T = 2π·√(r³/GM) with r = 6GM/c² (s) */
export function iscoPeriodSeconds(massMsun: number): number {
  const M = massMsun * M_SUN
  const r = (6 * G * M) / (C * C)
  return 2 * Math.PI * Math.sqrt((r * r * r) / (G * M))
}

/** Eddington luminosity L_edd ≈ 1.26×10³¹ W · (M/M☉) */
export function eddingtonLuminosity(massMsun: number): number {
  return 1.26e31 * massMsun
}

export function spectralBand(lambdaM: number): string {
  if (lambdaM < 1e-8) return 'X-ray'
  if (lambdaM < 3.8e-7) return 'UV'
  if (lambdaM <= 7.5e-7) return 'visible'
  if (lambdaM < 1e-3) return 'IR'
  return 'radio'
}

// ── Formatting ──────────────────────────────────────────────────────────

const SUP: Record<string, string> = {
  '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
}
function sup(n: number): string {
  return String(n).split('').map((c) => SUP[c] ?? c).join('')
}
function trimZeros(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

/** "SI-ish" number: plain for 0.01–99999, else mantissa×10ⁿ with superscripts */
export function fmtSci(x: number, sig = 3): string {
  if (!isFinite(x)) return '—'
  if (x === 0) return '0'
  const exp = Math.floor(Math.log10(Math.abs(x)))
  if (exp >= -2 && exp < 5) return trimZeros(x.toPrecision(sig))
  const mant = x / Math.pow(10, exp)
  return `${trimZeros(mant.toPrecision(sig))}×10${sup(exp)}`
}

/** Adaptive length: m → km → AU → light-hours */
export function formatLength(m: number): string {
  if (m < 1e3) return `${fmtSci(m)} m`
  if (m < 1e8) return `${fmtSci(m / 1e3)} km`
  if (m < 4.5e13) return `${fmtSci(m / AU)} AU`
  return `${fmtSci(m / LIGHT_HOUR)} light-hours`
}

/** Adaptive time: s → min → hr → days */
export function formatTime(s: number): string {
  if (s < 120) return `${fmtSci(s)} s`
  if (s < 7200) return `${fmtSci(s / 60)} min`
  if (s < 2 * 86400) return `${fmtSci(s / 3600)} hr`
  return `${fmtSci(s / 86400)} days`
}

export function formatMassMsun(massMsun: number): string {
  return `${fmtSci(massMsun)} M☉`
}

export function formatPower(w: number): string {
  return `${fmtSci(w)} W · ${fmtSci(w / L_SUN)} L☉`
}

export function formatWavelength(m: number): string {
  if (m < 1e-9) return `${fmtSci(m * 1e12)} pm`
  if (m < 1e-6) return `${fmtSci(m * 1e9)} nm`
  if (m < 1e-3) return `${fmtSci(m * 1e6)} μm`
  return `${fmtSci(m * 1e3)} mm`
}
