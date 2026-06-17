import { describe, it, expect } from 'vitest'
import { measureTrace } from './measure'

describe('measureTrace', () => {
  it('measures a 100Hz sine (amp 1, offset 0)', () => {
    const freq = 100
    const dt = 1 / 10000 // 10kHz sample rate → 100 samples/period
    const periods = 5
    const n = Math.round(periods / freq / dt) // 500 samples
    const samples = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      samples[i] = Math.sin(2 * Math.PI * freq * (i * dt))
    }
    const stats = measureTrace(samples, n, 0, dt)
    expect(stats.vpp).toBeCloseTo(2, 1) // tol 0.05 → within 0.1 of digit-1 rounding; tighten below
    expect(stats.vpp).toBeGreaterThan(2 - 0.05)
    expect(stats.vpp).toBeLessThan(2 + 0.05)
    expect(stats.rms).toBeGreaterThan(0.707 - 0.05)
    expect(stats.rms).toBeLessThan(0.707 + 0.05)
    expect(Math.abs(stats.mean)).toBeLessThan(0.05)
    expect(stats.freq).toBeGreaterThan(100 - 2)
    expect(stats.freq).toBeLessThan(100 + 2)
    expect(stats.vmin).toBeLessThan(0)
    expect(stats.vmax).toBeGreaterThan(0)
  })

  it('handles a DC buffer: vpp 0, freq 0', () => {
    const n = 100
    const samples = new Float64Array(n)
    samples.fill(3.3)
    const stats = measureTrace(samples, n, 0, 1 / 10000)
    expect(stats.vpp).toBe(0)
    expect(stats.vmin).toBe(3.3)
    expect(stats.vmax).toBe(3.3)
    expect(stats.mean).toBeCloseTo(3.3, 10)
    expect(stats.rms).toBeCloseTo(3.3, 10)
    expect(stats.freq).toBe(0)
  })

  it('returns all zeros for an empty buffer', () => {
    const samples = new Float64Array(256)
    const stats = measureTrace(samples, 0, 0, 1 / 10000)
    expect(stats).toEqual({ vpp: 0, vmin: 0, vmax: 0, mean: 0, rms: 0, freq: 0 })
  })

  it('reads samples in chronological order from a wrapped ring buffer', () => {
    // Buffer of length 4, fully wrapped: writeIdx points to oldest sample.
    // Logical order (oldest→newest): 10, 20, 30, 40
    // Physical layout with writeIdx=2 means oldest at index 2:
    //   idx: 0=30, 1=40, 2=10, 3=20
    const samples = new Float64Array([30, 40, 10, 20])
    const stats = measureTrace(samples, 4, 2, 1 / 1000)
    expect(stats.vmin).toBe(10)
    expect(stats.vmax).toBe(40)
    expect(stats.vpp).toBe(30)
    expect(stats.mean).toBeCloseTo(25, 10)
  })

  it('does not wrap when count < buffer length (startIdx 0)', () => {
    const samples = new Float64Array(8)
    samples[0] = 1
    samples[1] = 2
    samples[2] = 3
    // remaining are stale zeros and must be ignored (count=3)
    const stats = measureTrace(samples, 3, 5, 1 / 1000)
    expect(stats.vmin).toBe(1)
    expect(stats.vmax).toBe(3)
    expect(stats.mean).toBeCloseTo(2, 10)
  })

  it('freq is 0 when dt <= 0', () => {
    const n = 200
    const samples = new Float64Array(n)
    for (let i = 0; i < n; i++) samples[i] = Math.sin(2 * Math.PI * 0.05 * i)
    expect(measureTrace(samples, n, 0, 0).freq).toBe(0)
    expect(measureTrace(samples, n, 0, -1).freq).toBe(0)
  })

  it('freq is 0 with fewer than 2 rising crossings', () => {
    // Less than one full period of a slow sine → at most one rising crossing.
    const dt = 1 / 10000
    const n = 40 // 4ms, period of 200Hz is 5ms
    const samples = new Float64Array(n)
    for (let i = 0; i < n; i++) samples[i] = Math.sin(2 * Math.PI * 200 * i * dt)
    expect(measureTrace(samples, n, 0, dt).freq).toBe(0)
  })

  it('estimates frequency of a square-ish wave via mean crossings', () => {
    const dt = 1 / 10000
    const freq = 250
    const n = 400
    const samples = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      samples[i] = Math.sin(2 * Math.PI * freq * i * dt) >= 0 ? 1 : -1
    }
    const stats = measureTrace(samples, n, 0, dt)
    expect(stats.freq).toBeGreaterThan(freq - 5)
    expect(stats.freq).toBeLessThan(freq + 5)
  })
})
