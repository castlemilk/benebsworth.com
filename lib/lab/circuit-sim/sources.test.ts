import { describe, it, expect } from 'vitest'
import { evalSource, sourceDCValue, sourceValue } from './sources'
import type { CircuitComponent, Waveform } from './types'

const sine: Waveform = { kind: 'sine', amplitude: 5, offset: 0, freq: 1000, phase: 0, duty: 0.5 }

describe('evalSource', () => {
  it('sine peaks at a quarter period', () => {
    expect(evalSource(sine, 0.00025)).toBeCloseTo(5, 6) // T=1ms, t=T/4 → sin=1
    expect(evalSource(sine, 0)).toBeCloseTo(0, 6)
    expect(evalSource(sine, 0.0005)).toBeCloseTo(0, 6) // half period
  })

  it('dc is constant amplitude + offset', () => {
    expect(evalSource({ ...sine, kind: 'dc', amplitude: 3, offset: 0 }, 123)).toBe(3)
    expect(evalSource({ ...sine, kind: 'dc', amplitude: 3, offset: 1 }, 0)).toBe(4)
  })

  it('pulse is high for the first duty fraction of each period', () => {
    const w: Waveform = { kind: 'pulse', amplitude: 5, offset: 0, freq: 1000, phase: 0, duty: 0.5 }
    expect(evalSource(w, 0.0001)).toBe(5)  // first 0.5ms → high
    expect(evalSource(w, 0.0007)).toBe(0)  // after 0.5ms → low
  })

  it('square swings symmetrically about the offset', () => {
    const w: Waveform = { kind: 'square', amplitude: 5, offset: 0, freq: 1000, phase: 0, duty: 0.5 }
    expect(evalSource(w, 0.0001)).toBe(5)
    expect(evalSource(w, 0.0007)).toBe(-5)
  })
})

describe('sourceDCValue', () => {
  it('uses bias (offset) for AC waveforms and amplitude for dc', () => {
    expect(sourceDCValue(sine)).toBe(0)
    expect(sourceDCValue({ ...sine, offset: 2 })).toBe(2)
    expect(sourceDCValue({ ...sine, kind: 'dc', amplitude: 9, offset: 0 })).toBe(9)
  })
})

describe('sourceValue (back-compat)', () => {
  it('falls back to comp.value when no waveform is set', () => {
    const c: CircuitComponent = { id: 'v', type: 'V', value: 12, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 }
    expect(sourceValue(c, 'dc', 0)).toBe(12)
    expect(sourceValue(c, 'transient', 99)).toBe(12)
  })

  it('uses the waveform when present', () => {
    const c: CircuitComponent = { id: 'v', type: 'V', value: 0, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0, waveform: sine }
    expect(sourceValue(c, 'transient', 0.00025)).toBeCloseTo(5, 6)
    expect(sourceValue(c, 'dc', 0.00025)).toBe(0) // bias
  })
})
