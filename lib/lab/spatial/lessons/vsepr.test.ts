import { describe, expect, it } from 'vitest'
import {
  c2vMinimum, clampLonePairs, domainAngles, domainWeights, effectiveWeight, gradientNorm, lesson, orientDomains,
  relaxDomains, repulsionEnergy, shapeName, squarePlanarEnergy, tangentialGradient,
} from './vsepr'
import type { Vec3 } from '../types'

const converged = (domains: number, lonePairs: number, weight: number) => {
  const u = relaxDomains(domains, lonePairs, weight), w = domainWeights(domains, lonePairs, weight)
  return { u, w, angles: domainAngles(u, lonePairs), energy: repulsionEnergy(u, w), gradient: gradientNorm(u, w) }
}

describe('equal-weight Thomson configurations', () => {
  it('reproduces the Erber & Hockney minimal energies for two to six charges', () => {
    const literature = [0.5, 1.732051, 3.674234, 6.474691, 9.985281]
    literature.forEach((energy, i) => expect(converged(i + 2, 0, 1).energy).toBeCloseTo(energy, 5))
  })
  it('lands on the ideal angles: 180°, 120°, arccos(−1/3), 90° axial-equatorial, 90°', () => {
    expect(converged(2, 0, 1).angles.bond).toBeCloseTo(180, 2)
    expect(converged(3, 0, 1).angles.bond).toBeCloseTo(120, 2)
    expect(converged(4, 0, 1).angles.bond).toBeCloseTo(Math.acos(-1 / 3) * 180 / Math.PI, 2)
    expect(converged(4, 0, 1).angles.bond).toBeCloseTo(109.4712, 3)
    expect(converged(5, 0, 1).angles.bond).toBeCloseTo(90, 2)
    expect(converged(6, 0, 1).angles.bond).toBeCloseTo(90, 2)
  })
})

describe('lone-pair weight 1.25', () => {
  it('squeezes water to 104.40° with the lone pairs at 114.71°, matching the C2v closed form', () => {
    const water = converged(4, 2, 1.25), exact = c2vMinimum(1.25)
    expect(water.angles.bond).toBeCloseTo(104.4, 1)
    expect(water.angles.bond).toBeCloseTo(exact.bond, 2)
    expect(water.angles.loneLone).toBeCloseTo(114.71, 1)
    expect(water.angles.loneLone).toBeCloseTo(exact.loneLone, 2)
    expect(water.angles.loneBond).toBeCloseTo(109.31, 1)
    expect(water.energy).toBeCloseTo(4.6256, 3)
    expect(water.energy).toBeCloseTo(exact.energy, 5)
  })
  it('fits ammonia with the same weight: 106.69° and energy 4.130', () => {
    const ammonia = converged(4, 1, 1.25)
    expect(ammonia.angles.bond).toBeCloseTo(106.69, 1)
    expect(ammonia.angles.loneBond).toBeCloseTo(112.13, 1)
    expect(ammonia.energy).toBeCloseTo(4.1297, 3)
  })
  it('follows the C2v closed form across the weight range and needs w ≈ 1.245 for the measured 104.48°', () => {
    expect(c2vMinimum(1).bond).toBeCloseTo(109.47, 1)
    expect(c2vMinimum(1.2).bond).toBeCloseTo(105.31, 1)
    expect(c2vMinimum(1.3).bond).toBeCloseTo(103.53, 1)
    expect(c2vMinimum(1.245).bond).toBeCloseTo(104.48, 1)
    expect(converged(4, 2, 1.5).angles.bond).toBeCloseTo(100.41, 1)
  })
  it('puts XeF4 lone pairs trans at the exact D4h energy and SF4 lone pair equatorial', () => {
    const xef4 = converged(6, 2, 1.25)
    expect(xef4.angles.bond).toBeCloseTo(90, 2)
    expect(xef4.angles.loneLone).toBeCloseTo(180, 2)
    expect(xef4.energy).toBeCloseTo(squarePlanarEnergy(1.25), 5)
    expect(squarePlanarEnergy(1.25)).toBeCloseTo(11.680745, 5)
    const sf4 = converged(5, 1, 1.25)
    expect(sf4.angles.bond).toBeCloseTo(87.33, 1)
    expect(sf4.angles.loneBond).toBeCloseTo(95.66, 1)
    expect(sf4.energy).toBeCloseTo(7.1098, 3)
    expect(converged(5, 2, 1.25).angles.bond).toBeCloseTo(85.46, 1)
    expect(converged(5, 3, 1.25).angles.bond).toBeCloseTo(180, 2)
    expect(converged(3, 1, 1.25).angles.bond).toBeCloseTo(114.07, 1)
  })
  it('square-planar XeF4 is the local minimum the trans seed selects; cis lone pairs relax lower (11.679 against 11.681)', () => {
    const w = domainWeights(6, 2, 1.25)
    const unit = (v: Vec3): Vec3 => { const h = Math.hypot(...v); return [v[0] / h, v[1] / h, v[2] / h] }
    let u: Vec3[] = ([[0, 0, 1], [0, 0, -1], [-1, 0, 0], [0, -1, 0], [1, 0.01, 0.02], [0.01, 1, -0.02]] as Vec3[]).map(unit)
    for (let s = 0; s < 5000; s++) { const g = tangentialGradient(u, w); u = u.map((v, i) => unit([v[0] - 0.4 * g[i][0], v[1] - 0.4 * g[i][1], v[2] - 0.4 * g[i][2]])) }
    const cis = repulsionEnergy(u, w)
    expect(gradientNorm(u, w)).toBeLessThan(1e-6)
    expect(cis).toBeCloseTo(11.6786, 3)
    expect(cis).toBeLessThan(squarePlanarEnergy(1.25))
  })
  it('converges to |∇E| below 1e-4 at every reachable (N, L, w) cell', () => {
    for (let n = 2; n <= 6; n++) for (let l = 0; l <= 3; l++) for (const w of [1, 1.25, 1.5]) {
      expect(converged(n, clampLonePairs(n, l), w).gradient).toBeLessThan(1e-4)
    }
  })
})

describe('bookkeeping', () => {
  it('clamps lone pairs to N − 2 and names every one of the 14 cells', () => {
    expect(clampLonePairs(2, 3)).toBe(0)
    expect(clampLonePairs(4, 3)).toBe(2)
    expect(shapeName(4, 3)).toBe('bent AX2E2 (ideal 109.47°) (lone pairs clamped to N − 2 = 2)')
    expect(shapeName(6, 2)).toBe('square planar AX4E2 (ideal 90°)')
    for (let n = 2; n <= 6; n++) for (let l = 0; l <= n - 2 && l <= 3; l++) expect(shapeName(n, l)).not.toContain('undefined')
  })
  it('ramps the weight from full at the ends to one at the midpoint and keeps orientation rigid', () => {
    expect(effectiveWeight(1.25, 0)).toBeCloseTo(1.25, 12)
    expect(effectiveWeight(1.25, Math.PI)).toBeCloseTo(1, 12)
    expect(effectiveWeight(1.25, 2 * Math.PI)).toBeCloseTo(1.25, 12)
    const u = relaxDomains(4, 2, 1.25), v = orientDomains(u, 2)
    const before = domainAngles(u, 2), after = domainAngles(v, 2)
    expect(after.bond).toBeCloseTo(before.bond, 9)
    expect(after.loneLone).toBeCloseTo(before.loneLone ?? NaN, 9)
    expect(v[2][1]).toBeCloseTo(v[3][1], 6)
    expect(v[2][1]).toBeGreaterThan(0)
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

it('changes geometry and readouts at the first control maximum, keeps params in range, and legends only drawn colours', () => {
  const first = lesson.controls[0]
  const pushed = { ...lesson.defaults, [first.key]: first.max }
  expect(JSON.stringify(lesson.build(pushed, 1))).not.toBe(JSON.stringify(lesson.build(lesson.defaults, 1)))
  expect(JSON.stringify(lesson.readouts(pushed))).not.toBe(JSON.stringify(lesson.readouts(lesson.defaults)))
  expect(lesson.readouts(lesson.defaults)[0].value).toBe('104.40° (lone pairs 114.71°)')
  expect(lesson.readouts(pushed)[0].value).toBe('90.00° (lone pairs 180.00°)')
  expect(lesson.readouts(pushed)[2].value).toBe('11.681')
  for (const c of lesson.controls) {
    expect(lesson.defaults[c.key]).toBeGreaterThanOrEqual(c.min)
    expect(lesson.defaults[c.key]).toBeLessThanOrEqual(c.max)
    for (const preset of lesson.presets) {
      expect(preset.params[c.key]).toBeGreaterThanOrEqual(c.min)
      expect(preset.params[c.key]).toBeLessThanOrEqual(c.max)
    }
  }
  const frame = lesson.build(lesson.defaults, 0.5)
  const used = new Set([...frame.lines.map(l => l.color), ...(frame.points ?? []).map(p => p.color), ...(frame.surfaces ?? []).map(s => s.color)])
  for (const entry of lesson.legend) expect(used.has(entry.color)).toBe(true)
})

it('keeps the bright bond arc on the same two bond tips across the whole phase sweep at the SF4 preset', () => {
  const unit = (v: Vec3): Vec3 => { const h = Math.hypot(...v); return [v[0] / h, v[1] / h, v[2] / h] }
  const same = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-6
  const pairFor = (phase: number) => {
    const frame = lesson.build(lesson.presets[2].params, phase)
    const arc = frame.lines.find(l => l.color === '#ffc46b' && l.opacity === undefined)!
    const tips = (frame.points ?? []).filter(p => p.color === '#55e6d0').map(p => unit(p.position))
    const ends = [arc.points[0], arc.points[arc.points.length - 1]].map(unit)
    return ends.map(e => tips.findIndex(t => same(t, e))).sort().join(',')
  }
  const first = pairFor(0)
  expect(first).not.toContain('-1')
  for (let phase = 0; phase <= 2 * Math.PI; phase += 0.05) expect(pairFor(phase)).toBe(first)
})
