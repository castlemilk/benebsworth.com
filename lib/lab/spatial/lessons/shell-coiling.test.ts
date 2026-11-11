import { describe, expect, it } from 'vitest'
import {
  apertureAngle, apicalAngle, expansionFromAngle, generatingCurve, GOLDEN_WHORL_EXPANSION, lesson,
  overlapMargin, overlapVerdict, quarterTurnGrowth, shellPoint, shellScaling, spiralAngle, WHORLS,
} from './shell-coiling'
import { TAU } from '../geometry'
import type { SpatialParams } from '../types'

const radial = ([x, , z]: [number, number, number]) => Math.hypot(x, z)

describe('equiangular spiral numbers', () => {
  it('grows by φ per quarter turn only when W is φ⁴', () => {
    expect(GOLDEN_WHORL_EXPANSION).toBeCloseTo(6.854, 3)
    expect(quarterTurnGrowth(GOLDEN_WHORL_EXPANSION)).toBeCloseTo(1.618, 3)
    expect(quarterTurnGrowth(6.85)).toBeCloseTo(1.618, 3)
    expect(quarterTurnGrowth(3.4)).toBeCloseTo(1.358, 3)
    expect(quarterTurnGrowth(10)).toBeCloseTo(1.778, 3)
    expect(quarterTurnGrowth(2)).toBeCloseTo(1.189, 3)
  })
  it('matches the tabulated constant angles for W = 2, 3, 3.4, φ⁴ and 10', () => {
    expect(spiralAngle(2)).toBeCloseTo(83.70, 2)
    expect(spiralAngle(3)).toBeCloseTo(80.08, 2)
    expect(spiralAngle(3.4)).toBeCloseTo(78.98, 2)
    expect(spiralAngle(GOLDEN_WHORL_EXPANSION)).toBeCloseTo(72.97, 2)
    expect(spiralAngle(6.85)).toBeCloseTo(72.97, 2)
    expect(spiralAngle(10)).toBeCloseTo(69.87, 2)
  })
  it('recovers the measured Nautilus pompilius expansion from Moseley and from Falbo', () => {
    expect(expansionFromAngle(79 + 40 / 60)).toBeCloseTo(3.14, 2)
    expect(1.33 ** 4).toBeCloseTo(3.13, 2)
    expect(expansionFromAngle(spiralAngle(3.4))).toBeCloseTo(3.4, 9)
    expect(1.33 ** 2).toBeCloseTo(1.77, 2)
  })
})

describe('Raup coiling geometry', () => {
  it('reproduces D = (c − ρ)/(c + ρ) exactly and the W·D < 1 overlap boundary at T = 0', () => {
    for (const d of [0, 0.05, 0.4, 0.6]) {
      const { rho, centre } = generatingCurve(d)
      expect((centre - rho) / (centre + rho)).toBeCloseTo(d, 12)
      expect(centre + rho).toBeCloseTo(1.8, 12)
    }
    expect(overlapMargin(2, 0.4, 0)).toBeGreaterThan(0)
    expect(overlapMargin(2, 0.5, 0)).toBeCloseTo(0, 12)
    expect(overlapMargin(2, 0.6, 0)).toBeLessThan(0)
    expect(overlapVerdict(overlapMargin(3.4, 0.05, 0))).toBe('whorls overlap')
    expect(overlapVerdict(overlapMargin(2, 0.5, 0))).toBe('touching')
    expect(overlapVerdict(overlapMargin(2, 0.6, 0))).toBe('disjunct whorls')
  })
  it('separates translated whorls that W·D alone would call overlapping', () => {
    expect(overlapVerdict(overlapMargin(3.4, 0.05, 3))).toBe('disjunct whorls')
    expect(overlapVerdict(overlapMargin(1.6, 0, 3))).toBe('whorls overlap')
  })
  it('measures overlap from the drawn generating circles one revolution apart', () => {
    const cases: [number, number, number][] = [[2, 0.4, 0], [2, 0.5, 0], [2, 0.6, 0], [3.4, 0.05, 3], [1.6, 0, 3], [3.4, 0.05, 0]]
    for (const [expansion, distance, translation] of cases) {
      const p = { expansion, distance, translation }
      const circle = (theta: number) => {
        const outer = shellPoint(p, theta, 0), inner = shellPoint(p, theta, Math.PI)
        return { centre: [(outer[0] + inner[0]) / 2, (outer[1] + inner[1]) / 2], radius: Math.hypot(outer[0] - inner[0], outer[1] - inner[1]) / 2 }
      }
      const current = circle(0), previous = circle(-TAU)
      const gap = Math.hypot(current.centre[0] - previous.centre[0], current.centre[1] - previous.centre[1]) - current.radius - previous.radius
      const margin = overlapMargin(expansion, distance, translation)
      if (Math.abs(margin) < 1e-9) expect(gap).toBeCloseTo(0, 9)
      else expect(Math.sign(gap)).toBe(-Math.sign(margin))
      if (translation === 0) {
        const innerEdge = radial(shellPoint(p, 0, Math.PI)), previousOuter = radial(shellPoint(p, -TAU, 0))
        expect(innerEdge < previousOuter - 1e-9).toBe(expansion * distance < 1)
        expect(previousOuter).toBeCloseTo(1.8 / expansion, 12)
      }
    }
  })
  it('gives the tangent-cone apical angle of a turreted shell', () => {
    expect(apicalAngle(3.5, 0.1)).toBeCloseTo(57.9, 1)
    expect(apicalAngle(3, 0)).toBeCloseTo(73.74, 2)
    expect(apicalAngle(0, 0.05)).toBe(180)
  })
})

describe('shell-coiling lesson', () => {
  const corners = (): SpatialParams[] => {
    const [w, d, t] = lesson.controls
    const result: SpatialParams[] = []
    for (const expansion of [w.min, w.max]) for (const distance of [d.min, d.max]) for (const translation of [t.min, t.max]) result.push({ expansion, distance, translation })
    return result
  }
  const states = () => {
    const list = [lesson.defaults, ...lesson.presets.map(p => p.params), ...corners()]
    for (const c of lesson.controls) for (const value of [c.min, c.max]) list.push({ ...lesson.defaults, [c.key]: value })
    return list
  }
  it('produces finite, bounded geometry at defaults, presets, slider extremes and all eight corners', () => {
    for (const p of states()) for (const phase of [0, 1.3, 4.7, TAU]) {
      const frame = lesson.build(p, phase)
      const vertices = [...frame.lines.flatMap(l => l.points), ...(frame.points ?? []).map(v => v.position), ...(frame.surfaces ?? []).flatMap(s => s.vertices)]
      expect(vertices.length).toBeGreaterThan(50)
      expect(vertices.every(v => v.every(n => Number.isFinite(n) && Math.abs(n) <= 3))).toBe(true)
      expect(vertices.every(v => v[1] >= -2.4)).toBe(true)
      for (const s of frame.surfaces ?? []) {
        expect(s.indices.length % 3).toBe(0)
        expect(s.indices.every(i => Number.isInteger(i) && i >= 0 && i < s.vertices.length)).toBe(true)
      }
    }
  })
  it('keeps the finished aperture outer edge at 1.8 units and shrinks only the tallest shells', () => {
    expect(radial(shellPoint(lesson.defaults, 0, 0))).toBeCloseTo(1.8, 12)
    expect(shellScaling(lesson.defaults).scale).toBe(1)
    expect(shellScaling({ expansion: 1.6, distance: 0, translation: 3 }).scale).toBe(1)
    expect(shellScaling({ expansion: 10, distance: 0.6, translation: 3 }).scale).toBeLessThan(1)
    const tallest = (3 * 1.44 + 0.36 - (3 * 1.44 - 0.36) * 10 ** -WHORLS) / 2
    expect(shellScaling({ expansion: 10, distance: 0.6, translation: 3 }).scale).toBeCloseTo(2.2 / tallest, 9)
  })
  it('grows in place: the apex does not move while the aperture advances with phase', () => {
    const early = lesson.build(lesson.defaults, Math.PI), late = lesson.build(lesson.defaults, 0)
    const apexEarly = early.surfaces![0].vertices[0], apexLate = late.surfaces![0].vertices[0]
    apexEarly.forEach((v, i) => expect(v).toBeCloseTo(apexLate[i], 12))
    expect(apertureAngle(Math.PI)).toBeCloseTo(-TAU, 12)
    expect(apertureAngle(0)).toBeCloseTo(0, 12)
    expect(apertureAngle(TAU)).toBeCloseTo(0, 12)
    expect(radial(late.points![0].position)).toBeGreaterThan(radial(early.points![0].position) * 3)
    expect(late.surfaces![0].vertices.length).toBe(192 * 16)
    expect(late.surfaces![0].indices.length / 3).toBe(191 * 16 * 2)
    expect(JSON.stringify(lesson.build(lesson.defaults, 1.3))).toBe(JSON.stringify(lesson.build(lesson.defaults, 1.3)))
  })
  it('honours the workbench contract: first slider changes geometry and readouts, ranges hold, legend colours are drawn', () => {
    const first = lesson.controls[0]
    const pushed = { ...lesson.defaults, [first.key]: first.max }
    expect(JSON.stringify(lesson.build(pushed, 1))).not.toBe(JSON.stringify(lesson.build(lesson.defaults, 1)))
    const text = (p: SpatialParams) => lesson.readouts(p).map(r => `${r.label}: ${r.value}`).join('\n')
    expect(text(pushed)).not.toBe(text(lesson.defaults))
    expect(text(lesson.defaults)).toContain('1.358×')
    expect(text(lesson.defaults)).toContain('78.98°')
    expect(text(lesson.defaults)).toContain('0.17 · whorls overlap')
    expect(text(pushed)).toContain('1.778×')
    expect(text(pushed)).toContain('69.87°')
    expect(text(pushed)).toContain('0.50 · whorls overlap')
    expect(text(lesson.presets[0].params)).toContain('1.618×')
    expect(text(lesson.presets[0].params)).toContain('72.97°')
    expect(text(lesson.presets[1].params)).toContain('0.80 · whorls overlap')
    expect(text(lesson.presets[2].params)).toContain('0.00 · whorls overlap')
    for (const c of lesson.controls) {
      expect(lesson.defaults[c.key]).toBeGreaterThanOrEqual(c.min)
      expect(lesson.defaults[c.key]).toBeLessThanOrEqual(c.max)
      for (const preset of lesson.presets) {
        expect(preset.params[c.key]).toBeGreaterThanOrEqual(c.min)
        expect(preset.params[c.key]).toBeLessThanOrEqual(c.max)
      }
    }
    const frame = lesson.build(lesson.defaults, TAU)
    const used = new Set([...frame.lines.map(l => l.color), ...(frame.surfaces ?? []).map(s => s.color), ...(frame.points ?? []).map(p => p.color)])
    for (const entry of lesson.legend) expect(used.has(entry.color)).toBe(true)
    expect(lesson.accent).toBe('#a3e635')
    expect(lesson.category).toBe('biology')
    expect(WHORLS).toBe(4)
  })
})
