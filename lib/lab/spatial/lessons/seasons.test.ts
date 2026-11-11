import { describe, expect, it } from 'vitest'
import {
  dailyInsolation, dayLength, distanceRatio, fluxRatio, lesson, noonElevation,
  refractionCorrectionMinutes, seasonSummary, solarDeclination, spinAxis, sunDirection, sunsetHourAngle,
} from './seasons'

const EPSILON = 23.44
const LONDON = 51.5

describe('day length and noon elevation', () => {
  it('reproduces the geometric solstice day lengths at London, 45°N and the equator', () => {
    expect(dayLength(LONDON, EPSILON)).toBeCloseTo(16.40, 2)
    expect(dayLength(LONDON, -EPSILON)).toBeCloseTo(7.60, 2)
    expect(sunsetHourAngle(LONDON, EPSILON) * 180 / Math.PI).toBeCloseTo(123.03, 1)
    expect(dayLength(45, EPSILON)).toBeCloseTo(15.43, 2)
    expect(dayLength(45, -EPSILON)).toBeCloseTo(8.57, 2)
    expect(dayLength(0, EPSILON)).toBeCloseTo(12, 10)
    expect(dayLength(LONDON, 0)).toBeCloseTo(12, 10)
  })
  it('clamps polar day and polar night without producing NaN', () => {
    expect(dayLength(66.56, EPSILON)).toBe(24)
    expect(dayLength(66.56, -EPSILON)).toBe(0)
    expect(dayLength(90, EPSILON)).toBe(24)
    expect(dayLength(-90, EPSILON)).toBe(0)
    expect(Number.isFinite(dayLength(90, 0))).toBe(true)
    expect(dayLength(LONDON, 45)).toBe(24)
    expect(dayLength(LONDON, -45)).toBe(0)
  })
  it('gives the solstice noon elevations', () => {
    expect(noonElevation(LONDON, EPSILON)).toBeCloseTo(61.94, 2)
    expect(noonElevation(LONDON, -EPSILON)).toBeCloseTo(15.06, 2)
    expect(noonElevation(45, EPSILON)).toBeCloseTo(68.44, 2)
    expect(noonElevation(45, -EPSILON)).toBeCloseTo(21.56, 2)
    expect(noonElevation(0, EPSILON)).toBeCloseTo(66.56, 2)
    expect(noonElevation(LONDON, -45)).toBeCloseTo(-6.5, 10)
  })
  it('adds 10 to 15 minutes for refraction and the solar disc at mid-latitudes', () => {
    expect(refractionCorrectionMinutes(LONDON, EPSILON)).toBeCloseTo(13.9, 1)
    expect(refractionCorrectionMinutes(LONDON, -EPSILON)).toBeCloseTo(13.9, 1)
    expect(refractionCorrectionMinutes(LONDON, 0)).toBeCloseTo(10.7, 1)
  })
})

describe('insolation and distance', () => {
  it('matches the daily-mean top-of-atmosphere insolation at mean distance for S0 = 1361 W/m²', () => {
    expect(dailyInsolation(LONDON, EPSILON)).toBeCloseTo(497.0, 0)
    expect(dailyInsolation(LONDON, -EPSILON)).toBeCloseTo(73.3, 0)
    expect(dailyInsolation(LONDON, EPSILON) / dailyInsolation(LONDON, -EPSILON)).toBeCloseTo(6.78, 2)
    expect(dailyInsolation(45, EPSILON)).toBeCloseTo(499.3, 0)
    expect(dailyInsolation(45, -EPSILON)).toBeCloseTo(116.5, 0)
    expect(dailyInsolation(0, EPSILON)).toBeCloseTo(397.5, 0)
    expect(dailyInsolation(0, -EPSILON)).toBeCloseTo(dailyInsolation(0, EPSILON), 10)
    expect(dailyInsolation(66.56, EPSILON)).toBeCloseTo(496.7, 0)
    expect(dailyInsolation(66.56, -EPSILON)).toBe(0)
  })
  it('softens the northern winter slightly when the actual solstice distances are included', () => {
    const june = dailyInsolation(LONDON, EPSILON, distanceRatio(Math.PI, 0.0167))
    const december = dailyInsolation(LONDON, -EPSILON, distanceRatio(0, 0.0167))
    expect(june).toBeCloseTo(481, 0)
    expect(december).toBeCloseTo(76, 0)
    expect(june / december).toBeCloseTo(6.35, 1)
  })
  it('reproduces the perihelion to aphelion irradiance ratio and the solstice distances', () => {
    expect(fluxRatio(0.0167)).toBeCloseTo(1.0691, 4)
    expect(fluxRatio(0.0167)).toBeCloseTo((152.1 / 147.1) ** 2, 3)
    expect(fluxRatio(0.0934)).toBeCloseTo(1.4545, 3)
    expect(fluxRatio(0.1)).toBeCloseTo(1.4938, 3)
    expect(distanceRatio(13 * Math.PI / 180, 0.0167)).toBeCloseTo(0.9833, 4)
    expect(distanceRatio(Math.PI + 13 * Math.PI / 180, 0.0167)).toBeCloseTo(1.0167, 4)
    expect(distanceRatio(0, 0.0167)).toBeCloseTo(0.9837, 4)
    expect(distanceRatio(Math.PI, 0.0167)).toBeCloseTo(1.0163, 4)
  })
})

describe('frame geometry', () => {
  it('puts the December solstice at phase 0, June at π and the equinoxes at π/2 and 3π/2', () => {
    expect(solarDeclination(EPSILON, 0)).toBeCloseTo(-EPSILON, 10)
    expect(solarDeclination(EPSILON, 2 * Math.PI)).toBeCloseTo(-EPSILON, 10)
    expect(solarDeclination(EPSILON, Math.PI)).toBeCloseTo(EPSILON, 10)
    expect(Math.abs(solarDeclination(EPSILON, Math.PI / 2))).toBeLessThan(1e-12)
    expect(Math.abs(solarDeclination(EPSILON, 3 * Math.PI / 2))).toBeLessThan(1e-12)
    expect(solarDeclination(0, 1.3)).toBeCloseTo(0, 12)
  })
  it('keeps the spin axis and Sun direction as unit vectors with the axis tilted from the orbit normal', () => {
    for (const tilt of [0, 23.44, 45]) {
      const axis = spinAxis(tilt)
      expect(Math.hypot(...axis)).toBeCloseTo(1, 12)
      expect(Math.acos(axis[1]) * 180 / Math.PI).toBeCloseTo(tilt, 10)
    }
    for (const phase of [0, 1.3, 4.7]) {
      const sun = sunDirection(phase)
      expect(Math.hypot(...sun)).toBeCloseTo(1, 12)
      expect(sun[1]).toBe(0)
    }
  })
})

it('produces finite, bounded geometry for defaults, presets and control extremes', () => {
  const states = [lesson.defaults, ...lesson.presets.map(p => p.params)]
  for (const c of lesson.controls) for (const value of [c.min, c.max]) states.push({ ...lesson.defaults, [c.key]: value })
  for (const p of states) for (const phase of [0, 1.3, 4.7, Math.PI * 2]) {
    const frame = lesson.build(p, phase)
    const vertices = [...frame.lines.flatMap(l => l.points), ...(frame.points ?? []).map(v => v.position), ...(frame.surfaces ?? []).flatMap(s => s.vertices)]
    expect(vertices.length).toBeGreaterThan(50)
    expect(vertices.every(v => v.every(n => Number.isFinite(n) && Math.abs(n) <= 3))).toBe(true)
    for (const s of frame.surfaces ?? []) expect(s.indices.every(i => i >= 0 && i < s.vertices.length)).toBe(true)
  }
})

it('honours the workbench contract: first control changes geometry and readouts, params lie in range, legend colours are drawn', () => {
  const first = lesson.controls[0]
  const base = lesson.build(lesson.defaults, 1), pushed = lesson.build({ ...lesson.defaults, [first.key]: first.max }, 1)
  expect(JSON.stringify(base)).not.toBe(JSON.stringify(pushed))
  expect(JSON.stringify(lesson.readouts(lesson.defaults))).not.toBe(JSON.stringify(lesson.readouts({ ...lesson.defaults, [first.key]: first.max })))
  for (const c of lesson.controls) {
    expect(lesson.defaults[c.key]).toBeGreaterThanOrEqual(c.min)
    expect(lesson.defaults[c.key]).toBeLessThanOrEqual(c.max)
    for (const preset of lesson.presets) {
      expect(preset.params[c.key]).toBeGreaterThanOrEqual(c.min)
      expect(preset.params[c.key]).toBeLessThanOrEqual(c.max)
    }
  }
  const used = new Set([...base.lines.map(l => l.color), ...(base.points ?? []).map(p => p.color), ...(base.surfaces ?? []).map(s => s.color)])
  for (const entry of lesson.legend) expect(used.has(entry.color)).toBe(true)
  expect(lesson.readouts(lesson.defaults).map(r => r.value)).toEqual(['16.40 h / 7.60 h', '61.9° / 15.1°', '6.8× tilt vs 1.069× distance'])
  expect(lesson.readouts({ ...lesson.defaults, tilt: 45 }).map(r => r.value)).toEqual(['24.00 h / 0.00 h', '83.5° / below horizon', '∞ (polar night) tilt vs 1.069× distance'])
  expect(lesson.readouts(lesson.presets[1].params)[0].value).toBe('24.00 h / 0.00 h')
  expect(lesson.readouts({ tilt: 0, latitude: 90, eccentricity: 0 })[2].value).toBe('1.0× tilt vs 1.000× distance')
  expect(seasonSummary(lesson.presets[3].params).distanceRatio).toBeCloseTo(1.4545, 3)
})
