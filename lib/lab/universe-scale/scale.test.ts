import { describe, it, expect } from 'vitest'
import {
  apparentPx,
  alphaFor,
  schwarzschildRadius,
  metresToHuman,
  sizeLabel,
  log10,
  SIZE,
} from './scale'

describe('apparentPx', () => {
  it('returns refPx when the object size matches the zoom', () => {
    const viewLog = log10(1.7) // a human
    expect(apparentPx(1.7, viewLog, 200)).toBeCloseTo(200, 6)
  })
  it('scales by 10x per decade of real size', () => {
    const viewLog = 0 // 1 metre maps to refPx
    expect(apparentPx(10, viewLog, 100)).toBeCloseTo(1000, 6)
    expect(apparentPx(0.1, viewLog, 100)).toBeCloseTo(10, 6)
  })
})

describe('alphaFor', () => {
  it('is 0 for sub-pixel and frame-filling extremes', () => {
    expect(alphaFor(0.5, 600)).toBe(0)
    expect(alphaFor(600 * 7, 600)).toBe(0)
  })
  it('is 1 in the comfortable middle band', () => {
    expect(alphaFor(200, 600)).toBe(1)
  })
  it('ramps monotonically on the fade-in edge', () => {
    expect(alphaFor(4, 600)).toBeGreaterThan(0)
    expect(alphaFor(10, 600)).toBeGreaterThan(alphaFor(4, 600))
  })
})

describe('schwarzschildRadius', () => {
  it('gives ~2.95 km for the Sun (M = 1.989e30 kg)', () => {
    expect(schwarzschildRadius(1.989e30)).toBeCloseTo(2953, -1) // within ~10 m
  })
  it('gives ~8.87 mm for the Earth (M = 5.972e24 kg)', () => {
    expect(schwarzschildRadius(5.972e24) * 1000).toBeCloseTo(8.87, 1)
  })
})

describe('metresToHuman', () => {
  it('keeps metres for ~1 m', () => {
    expect(metresToHuman(1)).toEqual({ value: '1', unit: 'm' })
  })
  it('uses km, AU and light-years for large scales', () => {
    expect(metresToHuman(5000).unit).toBe('km')
    expect(metresToHuman(1.5e11).unit).toBe('AU')
    expect(metresToHuman(9.4607e16).unit).toBe('ly')
  })
  it('uses sub-metre SI units', () => {
    expect(metresToHuman(0.005).unit).toBe('mm')
    expect(metresToHuman(5e-6).unit).toBe('µm')
    expect(metresToHuman(1e-7).unit).toBe('nm') // 1e-7 m = 100 nm
    expect(metresToHuman(1.06e-10).unit).toBe('pm')
  })
  it('falls back to scientific notation below a femtometre', () => {
    const r = metresToHuman(SIZE.PLANCK)
    expect(r.unit).toBe('m')
    expect(r.value).toContain('×10')
  })
})

describe('sizeLabel', () => {
  it('formats the Earth diameter in thousands of km', () => {
    expect(sizeLabel(SIZE.EARTH)).toMatch(/km$/)
  })
})
