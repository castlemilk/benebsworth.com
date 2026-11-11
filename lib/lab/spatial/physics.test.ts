import { describe, expect, it } from 'vitest'
import { gaussianPacket, gyroscopeAxis, gyroscopeMetrics, physicsLessons, polarisationField, polarisationMetrics } from './physics'

describe('polarisation', () => {
  it('keeps circular field magnitude constant and analyser transmission at one half', () => {
    for (let angle = 0; angle < 360; angle += 11) {
      const [y, z] = polarisationField(1, 90, angle * Math.PI / 180)
      expect(y * y + z * z).toBeCloseTo(0.5, 12)
      expect(polarisationMetrics(1, 90, angle).transmission).toBeCloseTo(0.5, 12)
    }
    expect(polarisationMetrics(1, 90, 0).ellipticity).toBeCloseTo(1, 12)
  })
  it('obeys Malus law for linear light and finds a 0.4 ellipse axis ratio', () => {
    expect(polarisationMetrics(0, 0, 30).transmission).toBeCloseTo(0.75, 12)
    expect(polarisationMetrics(1, 0, 135).transmission).toBeCloseTo(0, 12)
    expect(polarisationMetrics(0.4, 90, 0).ellipticity).toBeCloseTo(0.4, 12)
  })
})

describe('Gaussian packet', () => {
  it('translates without spreading when dispersion curvature is zero', () => {
    const initial = gaussianPacket(-1.6, 0, 0.65, 0.5, 0)
    const later = gaussianPacket(-0.1, 3, 0.65, 0.5, 0)
    expect(later.envelope).toBeCloseTo(initial.envelope, 12)
    expect(later.centre).toBeCloseTo(-0.1, 12)
    expect(later.width).toBeCloseTo(0.65, 12)
    expect(Math.hypot(later.real, later.imaginary)).toBeCloseTo(later.envelope, 12)
  })
  it('preserves integrated intensity while quadratic dispersion broadens the pulse', () => {
    function integral(t: number) {
      let result = 0
      for (let x = -16; x <= 16; x += 0.005) result += gaussianPacket(x, t, 0.65, 0.5, 0.3).envelope ** 2 * 0.005
      return result
    }
    expect(integral(3)).toBeCloseTo(integral(0), 8)
    expect(gaussianPacket(0, 3, 0.65, 0.5, 0.3).width).toBeCloseTo(1.52959, 5)
  })
})

describe('gyroscope', () => {
  it('has the expected precession rate and inverse spin relationship', () => {
    const a = gyroscopeMetrics(1200, 0.06, 45), b = gyroscopeMetrics(2400, 0.06, 45)
    expect(a.inertia).toBeCloseTo(0.00128, 12)
    expect(a.precession).toBeCloseTo(1.46373, 5)
    expect(b.precession).toBeCloseTo(a.precession / 2, 12)
    expect(gyroscopeMetrics(1200, 0.12, 45).precession).toBeCloseTo(2 * a.precession, 12)
  })
  it('preserves tilt and gives dL/dt in the gravitational torque direction', () => {
    const p = { spin: 1200, lever: 0.06, tilt: 45 }, phase = 0.8, h = 1e-5
    const n = gyroscopeAxis(p, phase), n2 = gyroscopeAxis(p, phase + 2 * h)
    const m = gyroscopeMetrics(p.spin, p.lever, p.tilt)
    const derivative = n2.map((v, i) => (v - n[i]) * m.momentum / h)
    const torque = [0.4 * 9.81 * p.lever * n[2], 0, -0.4 * 9.81 * p.lever * n[0]]
    expect(Math.hypot(...n)).toBeCloseTo(1, 12)
    expect(n[1]).toBeCloseTo(Math.SQRT1_2, 12)
    derivative.forEach((v, i) => expect(v).toBeCloseTo(torque[i], 5))
  })
})

it('produces finite, bounded geometry for presets and control extremes', () => {
  for (const lesson of physicsLessons) {
    const states = [lesson.defaults, ...lesson.presets.map(p => p.params)]
    for (const c of lesson.controls) for (const value of [c.min, c.max]) states.push({ ...lesson.defaults, [c.key]: value })
    for (const p of states) for (const phase of [0, 1.3, 4.7, Math.PI * 2]) {
      const frame = lesson.build(p, phase)
      const vertices = [...frame.lines.flatMap(l => l.points), ...(frame.points ?? []).map(v => v.position), ...(frame.surfaces ?? []).flatMap(s => s.vertices)]
      expect(vertices.length).toBeGreaterThan(50)
      expect(vertices.every(v => v.every(n => Number.isFinite(n) && Math.abs(n) <= 3))).toBe(true)
      for (const s of frame.surfaces ?? []) expect(s.indices.every(i => i >= 0 && i < s.vertices.length)).toBe(true)
    }
  }
})
