// Pure helpers for the Universe-Scale simulator: the logarithmic size axis,
// human-friendly length formatting, and the physical scales the essay markers
// hang on. No DOM, no React — fully unit-testable.

export const C_LIGHT = 2.99792458e8 // m s^-1
export const G_NEWTON = 6.6743e-11 // m^3 kg^-1 s^-2

// The size axis runs in log10(metres) from the Planck length to the diameter
// of the observable universe.
export const MIN_LOG = -35
export const MAX_LOG = 27

export const SIZE = {
  PLANCK: 1.616255e-35,
  PROTON: 1.68e-15,
  HYDROGEN_ATOM: 1.06e-10,
  ANT: 8e-3,
  HUMAN: 1.7,
  BLUE_WHALE: 25,
  SKYSCRAPER: 450,
  EVEREST: 8.849e3,
  EARTH: 1.2742e7,
  SUN: 1.3927e9,
  SOLAR_SYSTEM: 2.9e13, // ~ heliopause diameter
  LIGHT_YEAR: 9.4607e15,
  MILKY_WAY: 9.5e20, // ~100,000 ly diameter
  OBS_UNIVERSE: 8.8e26, // diameter
} as const

export const AU = 1.495978707e11
export const LIGHT_YEAR = 9.4607e15
export const PARSEC = 3.0857e16

export function log10(x: number): number {
  return Math.log(x) / Math.LN10
}

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x
}

/**
 * The apparent on-screen diameter (px) of an object of `sizeMeters` when the
 * zoom is centred on `viewLog` (= log10 of the size that maps to `refPx`).
 * Each decade of real size is a factor of 10 in apparent size — the
 * "Powers of Ten" feel: objects fade in as dots and swell past the frame.
 */
export function apparentPx(sizeMeters: number, viewLog: number, refPx: number): number {
  return refPx * Math.pow(10, log10(sizeMeters) - viewLog)
}

/**
 * Cross-fade alpha for an object given its apparent diameter and the viewport's
 * smaller dimension. Fades in from a ~2px dot, holds, then fades out as it grows
 * past the frame — so only a few nested scales are ever visible at once.
 */
export function alphaFor(px: number, minDim: number): number {
  const inLo = 2, inHi = 14
  const outLo = 1.5 * minDim, outHi = 6 * minDim
  if (px <= inLo || px >= outHi) return 0
  if (px < inHi) return (px - inLo) / (inHi - inLo)
  if (px > outLo) return clamp(1 - (px - outLo) / (outHi - outLo), 0, 1)
  return 1
}

/** Schwarzschild radius r_s = 2GM/c^2 (metres) for a mass in kg. */
export function schwarzschildRadius(massKg: number): number {
  return (2 * G_NEWTON * massKg) / (C_LIGHT * C_LIGHT)
}

// Unit ladder for human-readable lengths, largest first.
const UNITS: ReadonlyArray<readonly [number, string]> = [
  [9.4607e24, 'Gly'],
  [9.4607e21, 'Mly'],
  [9.4607e18, 'kly'],
  [LIGHT_YEAR, 'ly'],
  [AU, 'AU'],
  [1e3, 'km'],
  [1, 'm'],
  [1e-3, 'mm'],
  [1e-6, 'µm'],
  [1e-9, 'nm'],
  [1e-12, 'pm'],
  [1e-15, 'fm'],
]

function trim(n: number): string {
  // 3 significant figures, no trailing zeros.
  return parseFloat(n.toPrecision(3)).toString()
}

/** Format a length in metres as `{ value, unit }` using SI + astronomical units. */
export function metresToHuman(metres: number): { value: string; unit: string } {
  if (!isFinite(metres) || metres <= 0) return { value: '0', unit: 'm' }
  for (const [scale, unit] of UNITS) {
    if (metres >= scale) return { value: trim(metres / scale), unit }
  }
  // Below a femtometre, fall back to scientific notation in metres.
  const exp = Math.floor(log10(metres))
  const mant = metres / Math.pow(10, exp)
  return { value: `${trim(mant)}×10${superscript(exp)}`, unit: 'm' }
}

const SUP: Record<string, string> = {
  '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
}
export function superscript(n: number): string {
  return String(n).split('').map((ch) => SUP[ch] ?? ch).join('')
}

/** A short readout string like "1.27×10⁷ m" for a size in metres. */
export function sizeLabel(metres: number): string {
  const { value, unit } = metresToHuman(metres)
  return `${value} ${unit}`
}
