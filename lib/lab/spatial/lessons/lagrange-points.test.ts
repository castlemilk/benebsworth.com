import { describe, expect, it } from 'vitest'
import {
  ROUTH_CRITICAL_MASS_RATIO, SOFTENING, collinearPoints, contourPolylines, effectivePotential, gridAxis, hillRadius,
  integrateTrajectory, jacobiConstant, lagrangeL4, lesson, librationAboutL4, massRatioFrom, potentialAtL4, surfaceHeight, uniformAxis,
} from './lagrange-points'

const EARTH_MOON = 0.01215
const SUN_JUPITER = 1 / 1048.35
const PLUTO_CHARON = 0.109

describe('collinear Lagrange points', () => {
  it('places Earth–Moon L1, L2 and L3 where the literature does', () => {
    const { l1, l2, l3, residual } = collinearPoints(EARTH_MOON)
    expect(l1).toBeCloseTo(0.8369, 4)
    expect(l2).toBeCloseTo(1.1557, 4)
    expect(l3).toBeCloseTo(-1.0051, 4)
    expect(1 - EARTH_MOON - l1).toBeCloseTo(0.1509, 4)
    expect(l2 - 1 + EARTH_MOON).toBeCloseTo(0.1678, 4)
    expect(hillRadius(EARTH_MOON)).toBeCloseTo(0.1594, 4)
    for (const x of [l1, l2, l3]) expect(Math.abs(residual(x))).toBeLessThan(1e-10)
  })
  it('matches Sun–Jupiter, Sun–Earth and the equal-mass limit', () => {
    const jupiter = collinearPoints(SUN_JUPITER)
    expect(1 - SUN_JUPITER - jupiter.l1).toBeCloseTo(0.0667, 4)
    expect(jupiter.l2 - 1 + SUN_JUPITER).toBeCloseTo(0.0698, 4)
    const earth = collinearPoints(3e-6)
    expect(1 - 3e-6 - earth.l1).toBeCloseTo(0.0100, 4)
    expect(earth.l2 - 1 + 3e-6).toBeCloseTo(0.0100, 4)
    const equal = collinearPoints(0.5)
    expect(equal.l1).toBeCloseTo(0, 6)
    expect(equal.l2).toBeCloseTo(1.1984, 4)
    expect(equal.l3).toBeCloseTo(-1.1984, 4)
  })
  it('converges to |f| < 1e-10 across the whole slider range', () => {
    for (let value = -3.3; value <= -0.301; value += 0.0499) {
      const mu = massRatioFrom(value)
      const { l1, l2, l3, residual } = collinearPoints(mu)
      for (const x of [l1, l2, l3]) expect(Math.abs(residual(x))).toBeLessThan(1e-10)
      expect(l1).toBeGreaterThan(-mu)
      expect(l1).toBeLessThan(1 - mu)
      expect(l2).toBeGreaterThan(1 - mu)
      expect(l3).toBeLessThan(-mu)
    }
  })
})

describe('L4 and L5', () => {
  it('reproduces Routh’s critical mass ratio and the stability criterion', () => {
    expect(ROUTH_CRITICAL_MASS_RATIO).toBeCloseTo(0.03852, 5)
    for (const mu of [0.001, EARTH_MOON, 0.03, 0.0385, 0.0386, 0.05, PLUTO_CHARON, 0.5]) {
      expect(librationAboutL4(mu).stable).toBe(27 * mu * (1 - mu) < 1)
      expect(librationAboutL4(mu).stable).toBe(mu < ROUTH_CRITICAL_MASS_RATIO)
    }
  })
  it('gives the Earth–Moon and Sun–Jupiter libration periods in orbits', () => {
    const earthMoon = librationAboutL4(EARTH_MOON)
    expect(earthMoon.stable).toBe(true)
    expect(earthMoon.periods?.[0]).toBeCloseTo(1.0477, 3)
    expect(earthMoon.periods?.[1]).toBeCloseTo(3.3535, 3)
    const jupiter = librationAboutL4(SUN_JUPITER)
    expect(jupiter.periods?.[0]).toBeCloseTo(1.003, 3)
    expect(jupiter.periods?.[1]).toBeCloseTo(12.43, 2)
  })
  it('gives e-folding times above Routh’s limit', () => {
    expect(librationAboutL4(PLUTO_CHARON).efold).toBeCloseTo(0.40, 2)
    expect(librationAboutL4(0.5).efold).toBeCloseTo(0.25, 2)
    expect(librationAboutL4(0.05).efold).toBeCloseTo(0.875, 2)
  })
  it('sits at the global maximum of Φ with Jacobi constant 3 − μ(1 − μ)', () => {
    expect(potentialAtL4(EARTH_MOON)).toBeCloseTo(-1.4940, 4)
    expect(-2 * potentialAtL4(EARTH_MOON)).toBeCloseTo(2.9880, 4)
    const [x, y] = lagrangeL4(EARTH_MOON)
    expect(effectivePotential(x, y, EARTH_MOON)).toBeCloseTo(potentialAtL4(EARTH_MOON), 12)
    expect(jacobiConstant(x, y, 0, 0, EARTH_MOON)).toBeCloseTo(3 - EARTH_MOON * (1 - EARTH_MOON), 12)
    const { l1, l2 } = collinearPoints(EARTH_MOON)
    expect(effectivePotential(l1, 0, EARTH_MOON) - potentialAtL4(EARTH_MOON)).toBeCloseTo(-0.1002, 4)
    expect(effectivePotential(l2, 0, EARTH_MOON) - potentialAtL4(EARTH_MOON)).toBeCloseTo(-0.0921, 4)
    for (let gx = -1.5; gx <= 1.5; gx += 0.1) for (let gy = -1.5; gy <= 1.5; gy += 0.1) {
      expect(effectivePotential(gx, gy, EARTH_MOON)).toBeLessThanOrEqual(potentialAtL4(EARTH_MOON) + 1e-12)
    }
  })
})

describe('trajectory and sheet', () => {
  it('conserves the Jacobi constant to better than 1% along the Earth–Moon default run', () => {
    const run = integrateTrajectory(massRatioFrom(-1.9154), 0.02, 2)
    expect(run.end).toBe('runs')
    expect(run.points.length).toBe(961)
    expect(run.jacobiDrift).toBeLessThan(1e-6)
    const [x, y] = run.points[run.points.length - 1]
    expect(Math.hypot(x - lagrangeL4(EARTH_MOON)[0], y - lagrangeL4(EARTH_MOON)[1])).toBeLessThan(0.7)
  })
  it('terminates deterministically and always returns at least two points', () => {
    expect(integrateTrajectory(EARTH_MOON, 0.02, 2, 0).points.length).toBe(2)
    expect(integrateTrajectory(EARTH_MOON, 0.1, 6).end).toBe('left')
    const pluto = integrateTrajectory(massRatioFrom(-0.963), 0.02, 1.5)
    expect(pluto.end).toBe('close')
    expect(pluto.endOrbits).toBeLessThan(1.5)
    for (const [x, y] of pluto.points) expect(Math.max(Math.abs(x), Math.abs(y))).toBeLessThanOrEqual(1.5)
  })
  it('keeps every sheet vertex at or below the L4 hilltop height', () => {
    for (const value of [-3.3, -1.9154, -0.963, -0.301]) {
      const mu = massRatioFrom(value)
      const anchor = effectivePotential(...lagrangeL4(mu), mu, SOFTENING)
      for (const x of gridAxis(mu)) for (const y of uniformAxis()) {
        expect(surfaceHeight(anchor - effectivePotential(x, y, mu, SOFTENING))).toBeLessThanOrEqual(0.9 + 1e-6)
      }
    }
    expect(surfaceHeight(0)).toBeCloseTo(0.9, 12)
    expect(surfaceHeight(0.1002)).toBeCloseTo(0.60, 2)
    expect(surfaceHeight(100)).toBe(-1.9)
  })
  it('chains marching-squares segments into a handful of polylines', () => {
    const xs = gridAxis(EARTH_MOON), ys = uniformAxis()
    const values = xs.map(x => ys.map(y => effectivePotential(x, y, EARTH_MOON, SOFTENING)))
    const level = effectivePotential(collinearPoints(EARTH_MOON).l1, 0, EARTH_MOON, SOFTENING)
    const polylines = contourPolylines(xs, ys, values, level)
    expect(polylines.length).toBeGreaterThan(0)
    expect(polylines.length).toBeLessThan(8)
    expect(polylines.reduce((n, line) => n + line.length, 0)).toBeGreaterThan(100)
  })
})

describe('lesson contract', () => {
  const firstControl = lesson.controls[0]
  it('changes geometry and readouts when the first control is pushed to its maximum', () => {
    const base = lesson.build(lesson.defaults, 1), pushed = lesson.build({ ...lesson.defaults, [firstControl.key]: firstControl.max }, 1)
    expect(JSON.stringify(base)).not.toBe(JSON.stringify(pushed))
    const text = (p: typeof lesson.defaults) => lesson.readouts(p).map(r => `${r.label}: ${r.value}`).join('\n')
    expect(text(lesson.defaults)).not.toBe(text({ ...lesson.defaults, [firstControl.key]: firstControl.max }))
    expect(text(lesson.defaults)).toContain('0.1509 / 0.1678')
    expect(text(lesson.defaults)).toContain('1.048 and 3.353 orbits')
  })
  it('keeps defaults and presets inside every control range and legend colours on screen', () => {
    for (const control of lesson.controls) {
      expect(lesson.defaults[control.key]).toBeGreaterThanOrEqual(control.min)
      expect(lesson.defaults[control.key]).toBeLessThanOrEqual(control.max)
      for (const preset of lesson.presets) {
        expect(preset.params[control.key]).toBeGreaterThanOrEqual(control.min)
        expect(preset.params[control.key]).toBeLessThanOrEqual(control.max)
      }
    }
    const frame = lesson.build(lesson.defaults, 1)
    const used = new Set([...frame.lines.map(l => l.color), ...(frame.points ?? []).map(p => p.color), ...(frame.surfaces ?? []).map(s => s.color)])
    for (const entry of lesson.legend) expect(used.has(entry.color)).toBe(true)
  })
  it('produces finite, bounded geometry for presets and control extremes', () => {
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
})
