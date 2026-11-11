import { describe, expect, it } from 'vitest'
import { continuedRoot, mathsLessons, rotate, singularMap, singularMetrics, transportedArrow } from './maths'
import type { Vec3 } from './types'

describe('singular value geometry', () => {
  it('maps right singular vectors to orthogonal output axes of the specified lengths', () => {
    const p = { s1: 2, s2: 1, s3: 0.5, angle: 47 }
    const images = ([0, 1, 2] as const).map(i => {
      const unit: Vec3 = [0, 0, 0]; unit[i] = 1
      return singularMap(rotate(unit, [0, 0, 1], Math.PI / 6), p)
    })
    images.forEach((v, i) => expect(Math.hypot(...v)).toBeCloseTo([2, 1, 0.5][i], 12))
    expect(images[0].reduce((s, v, i) => s + v * images[1][i], 0)).toBeCloseTo(0, 12)
    expect(singularMetrics(p)).toEqual({ volume: 1, condition: 4, rank: 3 })
  })
  it('collapses a direction at rank two and reports an unbounded inverse', () => {
    const p = { s1: 2, s2: 1, s3: 0, angle: 30 }
    expect(singularMap([0, 0, 1], p)).toEqual([0, 0, 0])
    expect(singularMetrics(p)).toEqual({ volume: 0, condition: Infinity, rank: 2 })
  })
})

describe('exact parallel transport', () => {
  it('preserves tangency and vector length throughout every edge', () => {
    for (const gap of [15, 30, 90, 150]) for (let i = 0; i <= 100; i++) {
      const { position, vector } = transportedArrow(gap, i / 100)
      expect(Math.hypot(...position)).toBeCloseTo(1, 12)
      expect(Math.hypot(...vector)).toBeCloseTo(1, 12)
      expect(position.reduce((s, v, j) => s + v * vector[j], 0)).toBeCloseTo(0, 12)
    }
  })
  it('returns to the pole with holonomy equal to the spherical excess', () => {
    for (const gap of [15, 30, 90, 150]) {
      const end = transportedArrow(gap, 1)
      expect(end.position[1]).toBeCloseTo(1, 12)
      expect(end.vector[0]).toBeCloseTo(Math.cos(gap * Math.PI / 180), 12)
      expect(end.vector[2]).toBeCloseTo(Math.sin(gap * Math.PI / 180), 12)
    }
  })
})

describe('square-root continuation', () => {
  it('squares to the input everywhere along both circuits', () => {
    for (let i = 0; i <= 100; i++) {
      const angle = i / 100 * 4 * Math.PI, radius = 1.7
      const w = continuedRoot(radius, angle)
      expect(w.real ** 2 - w.imaginary ** 2).toBeCloseTo(radius * Math.cos(angle), 12)
      expect(2 * w.real * w.imaginary).toBeCloseTo(radius * Math.sin(angle), 12)
    }
  })
  it('changes sign after one circuit and returns after two', () => {
    expect(continuedRoot(4, 0).real).toBe(2)
    expect(continuedRoot(4, 2 * Math.PI).real).toBe(-2)
    expect(continuedRoot(4, 4 * Math.PI).real).toBe(2)
  })
})

it('produces finite bounded geometry at every control extreme', () => {
  for (const lesson of mathsLessons) for (const control of lesson.controls) for (const value of [control.min, control.max]) for (const phase of [0, Math.PI, 2 * Math.PI]) {
    const frame = lesson.build({ ...lesson.defaults, [control.key]: value }, phase)
    const positions = [...frame.lines.flatMap(line => line.points), ...(frame.surfaces ?? []).flatMap(surface => surface.vertices), ...(frame.points ?? []).map(point => point.position)]
    expect(positions.length).toBeGreaterThan(100)
    expect(positions.every(position => position.every(x => Number.isFinite(x) && Math.abs(x) <= 3))).toBe(true)
  }
})
