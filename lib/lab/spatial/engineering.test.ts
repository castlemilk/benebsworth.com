import { describe, expect, it } from 'vitest'
import { arrayFactor, coaxFields, engineeringLessons, gratingDirections, rotatingField, waveguideNumbers } from './engineering'

describe('phased-array interference', () => {
  it('has unit field amplitude at its steering direction', () => {
    for (const steering of [-60, 0, 30, 60]) {
      expect(arrayFactor(8, 0.5, steering, Math.sin(steering * Math.PI / 180))).toBeCloseTo(1, 12)
    }
  })
  it('cancels exactly at the first broadside null', () => {
    expect(arrayFactor(8, 0.5, 0, 1 / (8 * 0.5))).toBeLessThan(1e-12)
  })
  it('produces the predicted equally strong grating lobe', () => {
    expect(gratingDirections(0.5, 30)).toHaveLength(1)
    expect(gratingDirections(1, 30)).toHaveLength(2)
    expect(arrayFactor(8, 1, 30, -0.5)).toBeCloseTo(1, 12)
  })
})

describe('balanced three-phase field', () => {
  it('keeps the vector magnitude at three halves of the phase peak', () => {
    for (let phase = 0; phase < 2 * Math.PI; phase += 0.11) {
      const vector = rotatingField(phase, 0.8, 1)
      expect(Math.hypot(...vector)).toBeCloseTo(1.2, 12)
      expect(vector[0]).toBeCloseTo(1.2 * Math.cos(phase), 12)
      expect(vector[1]).toBeCloseTo(1.2 * Math.sin(phase), 12)
    }
  })
  it('reverses its rotation when two phase connections are exchanged', () => {
    const forward = rotatingField(Math.PI / 2, 1, 1)
    const reverse = rotatingField(Math.PI / 2, 1, -1)
    expect(forward[1]).toBeCloseTo(1.5, 12)
    expect(reverse[1]).toBeCloseTo(-1.5, 12)
  })
})

describe('TE10 dispersion', () => {
  it('gives the air-filled WR-90 cutoff and the expected group velocity', () => {
    const mode = waveguideNumbers(1.5, 22.86)
    expect(mode.cutoffGHz).toBeCloseTo(6.55714, 4)
    expect(mode.groupOverC).toBeCloseTo(Math.sqrt(5) / 3, 12)
    expect(mode.wavelengthOverA).toBeCloseTo(2 / Math.sqrt(1.25), 12)
  })
  it('has a real decay constant below cutoff, and none exactly at cutoff', () => {
    expect(waveguideNumbers(0.75, 22.86).propagating).toBe(false)
    expect(waveguideNumbers(0.75, 22.86).longitudinal).toBeCloseTo(Math.PI * Math.sqrt(7) / 4, 12)
    expect(waveguideNumbers(1, 22.86).longitudinal).toBe(0)
  })
})

describe('coaxial field power', () => {
  it('integrates the actual field cross product to VI across the annulus', () => {
    for (const current of [-2, 0, 2]) {
      const count = 10000, dr = (3 - 1) / count
      let integral = 0
      for (let i = 0; i < count; i++) {
        const r = 1 + (i + 0.5) * dr
        integral += coaxFields(12, current, 1, 3, r).poynting * 2 * Math.PI * r * 1e-3 * dr * 1e-3
      }
      expect(integral).toBeCloseTo(12 * current, 6)
    }
  })
  it('obeys inverse radius for each field and inverse square for the flux density', () => {
    const first = coaxFields(12, 2, 1, 5, 2)
    const second = coaxFields(12, 2, 1, 5, 4)
    expect(first.electric / second.electric).toBeCloseTo(2)
    expect(first.magnetic / second.magnetic).toBeCloseTo(2)
    expect(first.poynting / second.poynting).toBeCloseTo(4)
  })
})

describe('engineering scene geometry', () => {
  for (const lesson of engineeringLessons) {
    it(`${lesson.slug} remains finite and bounded at presets and slider endpoints`, () => {
      const params = [lesson.defaults, ...lesson.presets.map(p => p.params), ...lesson.controls.flatMap(c => [
        { ...lesson.defaults, [c.key]: c.min }, { ...lesson.defaults, [c.key]: c.max },
      ])]
      for (const p of params) for (const phase of [0, Math.PI / 2, Math.PI, Math.PI * 2]) {
        const frame = lesson.build(p, phase)
        const vertices = [...frame.lines.flatMap(line => line.points), ...(frame.surfaces ?? []).flatMap(s => s.vertices), ...(frame.points ?? []).map(point => point.position)]
        expect(vertices.length).toBeGreaterThan(20)
        expect(vertices.every(vertex => vertex.every(v => Number.isFinite(v) && Math.abs(v) <= 3))).toBe(true)
      }
    })
  }
})
