import { describe, expect, it } from 'vitest'
import {
  BELOW_REFERENCE_DEGREES, EXAGGERATION, LUNAR_AMPLITUDE, SOLAR_AMPLITUDE, TIDE,
  equilibriumAmplitude, highWaters, lesson, lunarAmplitude, observerRadius, oceanRadius,
  sunMoonRatios, tidalAcceleration, tideHeight, tideRange,
} from './tides'

const MEAN = 384.4
const at = (sunMoonAngle: number, declination: number, latitude: number, moonDistance = MEAN) => ({ sunMoonAngle, declination, latitude, moonDistance })

describe('equilibrium tide constants', () => {
  it('reproduces the lunar and solar amplitudes from Pugh & Woodworth', () => {
    expect(LUNAR_AMPLITUDE).toBeCloseTo(0.357, 3)
    expect(SOLAR_AMPLITUDE).toBeCloseTo(0.164, 3)
    expect(SOLAR_AMPLITUDE / LUNAR_AMPLITUDE).toBeCloseTo(0.459, 3)
    expect(LUNAR_AMPLITUDE / SOLAR_AMPLITUDE).toBeCloseTo(2.18, 2)
  })
  it('has the Sun pulling 178.7 times harder yet raising 0.459 of the tide', () => {
    const ratios = sunMoonRatios()
    expect(ratios.pull).toBeCloseTo(178.7, 1)
    expect(ratios.tide).toBeCloseTo(0.459, 3)
    expect(ratios.pull * TIDE.moonDistanceKm / TIDE.sunDistanceKm).toBeCloseTo(ratios.tide, 12)
  })
  it('gives a lunar tidal acceleration of 1.10e-6 m/s² at Earth’s surface', () => {
    expect(tidalAcceleration() * 1e6).toBeCloseTo(1.10, 2)
    expect(tidalAcceleration() / 9.81 * 1e7).toBeCloseTo(1.12, 2)
  })
  it('follows the inverse-cube law between perigee and apogee', () => {
    expect(equilibriumAmplitude(TIDE.moonMassRatio, 356500)).toBeCloseTo(0.447, 3)
    expect(equilibriumAmplitude(TIDE.moonMassRatio, 406700)).toBeCloseTo(0.301, 3)
    expect(lunarAmplitude(356.5) / lunarAmplitude(406.7)).toBeCloseTo((406.7 / 356.5) ** 3, 12)
  })
  it('prints the display exaggeration as 4.2 million', () => {
    expect(EXAGGERATION / 1e6).toBeCloseTo(4.17, 2)
    expect(lesson.legend[0].label).toContain('4.2 million')
    expect(BELOW_REFERENCE_DEGREES).toBeCloseTo(54.74, 2)
  })
})

describe('equilibrium ranges', () => {
  it('matches the analytic spring and neap ranges at the equator and at 45°', () => {
    expect(tideRange(at(0, 0, 0))).toBeCloseTo(1.5 * (LUNAR_AMPLITUDE + SOLAR_AMPLITUDE), 9)
    expect(tideRange(at(90, 0, 0))).toBeCloseTo(1.5 * (LUNAR_AMPLITUDE - SOLAR_AMPLITUDE), 9)
    expect(tideRange(at(0, 0, 45))).toBeCloseTo(0.75 * (LUNAR_AMPLITUDE + SOLAR_AMPLITUDE), 9)
    expect(tideRange(at(90, 0, 45))).toBeCloseTo(0.75 * (LUNAR_AMPLITUDE - SOLAR_AMPLITUDE), 9)
    expect(tideRange(at(0, 0, 0))).toBeCloseTo(0.781, 3)
    expect(tideRange(at(90, 0, 0))).toBeCloseTo(0.289, 3)
  })
  it('gives identical ranges at new and full Moon for every declination and latitude', () => {
    for (const declination of [0, 10, 18.3, 28.5]) for (const latitude of [0, 23, 45, 62, 80]) {
      expect(tideRange(at(0, declination, latitude))).toBeCloseTo(tideRange(at(180, declination, latitude)), 10)
    }
  })
})

describe('high waters', () => {
  const inLunarUnits = (p: ReturnType<typeof at>, includeSun: boolean) => highWaters(p, includeSun).heights.map(h => h / lunarAmplitude(p.moonDistance))
  it('finds two equal lunar highs of 0.25 A_m at 45° with the Moon on the equator', () => {
    const lunar = inLunarUnits(at(90, 0, 45), false)
    expect(lunar).toHaveLength(2)
    lunar.forEach(h => expect(h).toBeCloseTo(0.25, 9))
    expect(highWaters(at(90, 0, 45), false).hours[1]).toBeCloseTo(TIDE.lunarDayHours / 2, 6)
  })
  it('shows the diurnal inequality at a major standstill: 0.879 and −0.379 A_m lunar-only', () => {
    const lunar = inLunarUnits(at(0, 28.5, 45), false)
    expect(lunar).toHaveLength(2)
    expect(lunar[0]).toBeCloseTo(0.879, 3)
    expect(lunar[1]).toBeCloseTo(-0.379, 3)
    const combined = inLunarUnits(at(0, 28.5, 45), true)
    expect(combined[0]).toBeCloseTo(0.994, 3)
    expect(combined[1]).toBeCloseTo(-0.264, 3)
    expect(combined[0]).not.toBeCloseTo(combined[1], 1)
  })
  it('collapses to a single high when the quarter-Moon Sun swallows the second lunar maximum', () => {
    const combined = inLunarUnits(at(90, 28.5, 45), true)
    expect(combined).toHaveLength(1)
    expect(combined[0]).toBeCloseTo(0.649, 3)
    expect(lesson.readouts(at(90, 28.5, 45))[2].value).toContain('one high')
  })
  it('handles the purely diurnal lunar regime at 80° without throwing', () => {
    const lunar = inLunarUnits(at(0, 28.5, 80), false)
    expect(lunar).toHaveLength(1)
    expect(lunar[0]).toBeCloseTo(0.081, 3)
    expect(() => lesson.readouts(at(0, 28.5, 80))).not.toThrow()
  })
  it('carries the Sun into the combined highs at the three presets and the default', () => {
    expect(inLunarUnits(at(0, 0, 45), true).map(h => h.toFixed(3))).toEqual(['0.365', '0.365'])
    expect(inLunarUnits(at(90, 0, 45), true).map(h => h.toFixed(3))).toEqual(['0.020', '0.020'])
    expect(inLunarUnits(at(90, 0, 0), true).map(h => h.toFixed(3))).toEqual(['0.770', '0.770'])
    expect(lesson.readouts(at(0, 28.5, 45))[2].value).toBe('0.355 m and −0.094 m, 12.4 h apart')
  })
})

describe('scene consistency', () => {
  it('draws the observer at the same radius the strip chart reports, through both code paths', () => {
    for (const p of [lesson.defaults, ...lesson.presets.map(preset => preset.params)]) for (const phase of [0, 1.3, 4.7]) {
      const frame = lesson.build(p, phase)
      const observer = frame.points!.find(point => point.color === '#b59aff' && point.size === 0.07)!
      const latitude = p.latitude * Math.PI / 180
      const n: [number, number, number] = [Math.cos(latitude) * Math.cos(phase), Math.sin(latitude), Math.cos(latitude) * Math.sin(phase)]
      expect(Math.hypot(...observer.position)).toBeCloseTo(observerRadius(p, phase), 9)
      expect(oceanRadius(p, n)).toBeCloseTo(observerRadius(p, phase), 9)
      expect(observerRadius(p, phase)).toBeCloseTo(1.5 + 0.35 * tideHeight(p, phase) / LUNAR_AMPLITUDE, 12)
    }
  })
  it('keeps the Sun marker short of the Moon marker so both show on a shared ray at new Moon', () => {
    const frame = lesson.build(at(0, 0, 45), 0.4)
    const moonTip = frame.points!.find(point => point.color === '#eff8ff')!
    const sunTip = frame.points!.find(point => point.color === '#ffc46b')!
    expect(Math.hypot(...moonTip.position)).toBeCloseTo(2.6, 9)
    expect(Math.hypot(...sunTip.position)).toBeCloseTo(2.3, 9)
    expect(2.3 - 0.16).toBeGreaterThan(1.5 + 0.35 * (lunarAmplitude(356.5) + SOLAR_AMPLITUDE) / LUNAR_AMPLITUDE)
  })
  it('keeps the ocean mesh within its analytic radius bounds', () => {
    for (const p of [at(0, 0, 45, 356.5), at(0, 28.5, 45, 356.5), at(90, 0, 0, 406.7)]) {
      const radii = lesson.build(p, 0.4).surfaces![0].vertices.map(v => Math.hypot(...v))
      const peak = lunarAmplitude(p.moonDistance) + SOLAR_AMPLITUDE
      expect(Math.min(...radii)).toBeGreaterThanOrEqual(1.5 - 0.35 * 0.5 * peak / LUNAR_AMPLITUDE - 1e-9)
      expect(Math.max(...radii)).toBeLessThanOrEqual(1.5 + 0.35 * peak / LUNAR_AMPLITUDE + 1e-9)
      expect(Math.min(...radii)).toBeGreaterThan(1.15)
    }
  })
})

describe('spatial workbench contract', () => {
  const states = () => {
    const list = [lesson.defaults, ...lesson.presets.map(p => p.params)]
    for (const c of lesson.controls) for (const value of [c.min, c.max]) list.push({ ...lesson.defaults, [c.key]: value })
    return list
  }
  it('produces finite, bounded geometry for defaults, presets and control extremes', () => {
    for (const p of states()) for (const phase of [0, 1.3, 4.7, Math.PI * 2]) {
      const frame = lesson.build(p, phase)
      const vertices = [...frame.lines.flatMap(l => l.points), ...(frame.points ?? []).map(v => v.position), ...(frame.surfaces ?? []).flatMap(s => s.vertices)]
      expect(vertices.length).toBeGreaterThan(50)
      expect(vertices.every(v => v.every(n => Number.isFinite(n) && Math.abs(n) <= 3))).toBe(true)
      for (const s of frame.surfaces ?? []) expect(s.indices.every(i => i >= 0 && i < s.vertices.length)).toBe(true)
    }
  })
  it('changes geometry and readouts when the first control is pushed to its maximum', () => {
    const first = lesson.controls[0]
    const pushed = { ...lesson.defaults, [first.key]: first.max }
    expect(JSON.stringify(lesson.build(pushed, 1))).not.toBe(JSON.stringify(lesson.build(lesson.defaults, 1)))
    expect(JSON.stringify(lesson.readouts(pushed))).not.toBe(JSON.stringify(lesson.readouts(lesson.defaults)))
    expect(lesson.readouts(lesson.defaults)[1].value).toBe('0.289 m / 0.145 m')
    expect(lesson.readouts(pushed)[1].value).toBe('0.781 m / 0.390 m')
  })
  it('keeps defaults and presets inside every control range and legend colours in the scene', () => {
    for (const control of lesson.controls) {
      expect(lesson.defaults[control.key]).toBeGreaterThanOrEqual(control.min)
      expect(lesson.defaults[control.key]).toBeLessThanOrEqual(control.max)
      for (const preset of lesson.presets) {
        expect(preset.params[control.key]).toBeGreaterThanOrEqual(control.min)
        expect(preset.params[control.key]).toBeLessThanOrEqual(control.max)
      }
    }
    const frame = lesson.build(lesson.defaults, 1)
    const used = new Set([...frame.lines.map(l => l.color), ...(frame.surfaces ?? []).map(s => s.color), ...(frame.points ?? []).map(p => p.color)])
    for (const entry of lesson.legend) expect(used.has(entry.color)).toBe(true)
    expect(lesson.accent).toBe('#38bdf8')
    expect(lesson.readouts(lesson.defaults)).toHaveLength(3)
  })
})
