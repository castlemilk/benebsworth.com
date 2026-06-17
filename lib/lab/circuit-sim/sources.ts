import type { CircuitComponent, Waveform } from './types'

/**
 * Waveform evaluation for time-varying sources (V / I).
 *
 * Convention: `amplitude` is the primary signal level, `offset` the DC bias.
 *   dc     → amplitude + offset (a constant)
 *   sine   → offset + amplitude·sin(2π·f·t + φ)
 *   pulse  → offset + (high ? amplitude : 0)        unipolar
 *   square → offset + (high ? amplitude : −amplitude) bipolar
 */
export function evalSource(w: Waveform, t: number): number {
  switch (w.kind) {
    case 'dc':
      return w.amplitude + w.offset
    case 'sine':
      return w.offset + w.amplitude * Math.sin(2 * Math.PI * w.freq * t + w.phase)
    case 'pulse':
    case 'square': {
      if (w.freq <= 0) return w.offset + w.amplitude
      const T = 1 / w.freq
      const shift = (w.phase / (2 * Math.PI)) * T
      const tt = (((t + shift) % T) + T) % T
      const high = tt < w.duty * T
      if (w.kind === 'square') return w.offset + (high ? w.amplitude : -w.amplitude)
      return w.offset + (high ? w.amplitude : 0)
    }
  }
}

/** DC operating-point value for a waveform (bias level for AC types). */
export function sourceDCValue(w: Waveform): number {
  return w.kind === 'dc' ? w.amplitude + w.offset : w.offset
}

/** Resolve a V/I source's value for the current solve mode (back-compat: no waveform → comp.value). */
export function sourceValue(comp: CircuitComponent, mode: 'dc' | 'transient', time: number): number {
  if (!comp.waveform) return comp.value
  return mode === 'transient' ? evalSource(comp.waveform, time) : sourceDCValue(comp.waveform)
}
