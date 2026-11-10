import { describe, expect, it } from 'vitest'
import {
  BASE_PAIRS, RADIUS, RISE, SCALE, backboneAzimuth, backbonePoint, chordClosestApproach, chordLength,
  genomeLength, grooveWidths, handednessSign, helixParameters, lesson, offsetFromChord, offsetFromGrooves, worldPitch,
} from './dna-grooves'

describe('B-DNA helix parameters', () => {
  it('reproduces the Watson and Crick 1953 fibre numbers and the solution repeat', () => {
    expect(helixParameters(10).pitch).toBeCloseTo(34, 12)
    expect(helixParameters(10).twist).toBeCloseTo(36, 12)
    expect(helixParameters(10.5).pitch).toBeCloseTo(35.7, 12)
    expect(helixParameters(10.5).twist).toBeCloseTo(34.29, 2)
    expect(helixParameters(10.4).twist).toBeCloseTo(34.6, 1)
    expect(RISE).toBe(3.4)
  })
  it('splits the pitch into the textbook 12 and 22 Å grooves at a 127° offset', () => {
    const fibre = grooveWidths(127, 10)
    expect(fibre.minor).toBeCloseTo(11.99, 2)
    expect(fibre.major).toBeCloseTo(22.01, 2)
    const solution = grooveWidths(127, 10.5)
    expect(solution.minor).toBeCloseTo(12.59, 2)
    expect(solution.major).toBeCloseTo(23.11, 2)
    expect(solution.minor + solution.major).toBeCloseTo(solution.pitch, 12)
    const equal = grooveWidths(180, 10.5)
    expect(equal.minor).toBeCloseTo(17.85, 12)
    expect(equal.major).toBeCloseTo(17.85, 12)
    expect(grooveWidths(90, 10.5).minor).toBeCloseTo(8.925, 12)
    expect(grooveWidths(180, 12).major).toBeCloseTo(20.4, 12)
  })
  it('derives the offset two ways: the groove partition and the C1′ chord', () => {
    expect(offsetFromGrooves(12, 22)).toBeCloseTo(127.06, 2)
    expect(offsetFromChord(10.5, 5.9)).toBeCloseTo(125.7, 1)
    expect(chordLength(10, 127)).toBeCloseTo(17.9, 1)
    expect(chordLength(5.9, offsetFromChord(10.5, 5.9))).toBeCloseTo(10.5, 10)
    expect(chordClosestApproach(RADIUS, 90)).toBeCloseTo(7.07, 2)
    expect(chordClosestApproach(RADIUS, 127)).toBeCloseTo(4.46, 2)
    expect(chordClosestApproach(RADIUS, 180)).toBeCloseTo(0, 10)
  })
  it('gives about a metre of DNA for a haploid human genome', () => {
    expect(genomeLength(3.1e9)).toBeCloseTo(1.054, 3)
  })
})

describe('handedness', () => {
  it('fits 25 base pairs into the 4.4-unit viewport at the true 20 : 34 aspect', () => {
    expect(SCALE).toBeCloseTo(0.05176, 5)
    expect(BASE_PAIRS * RISE * SCALE).toBeCloseTo(4.4, 12)
    expect(worldPitch(10)).toBeCloseTo(34 * SCALE, 12)
    expect(RADIUS * SCALE / worldPitch(10)).toBeCloseTo(10 / 34, 12)
  })
  it('satisfies the right-hand rule for +1 and the left-hand rule for −1', () => {
    for (const s of [1, -1]) for (const y of [-1.7, -0.4, 0.3, 1.9]) for (const phase of [0, 2.1]) {
      const h = 1e-4
      const p0 = backbonePoint(y - h, 10.5, s, phase), p1 = backbonePoint(y, 10.5, s, phase), p2 = backbonePoint(y + h, 10.5, s, phase)
      const tangent = p2.map((v, i) => (v - p0[i]) / (2 * h))
      const radial = [p1[0], 0, p1[2]]
      const vertical = radial[2] * tangent[0] - radial[0] * tangent[2]
      expect(Math.sign(vertical)).toBe(s)
      expect(handednessSign(p0, p1, p2)).toBe(s)
    }
  })
  it('rotates rigidly with phase and loops at 2π', () => {
    const a = backbonePoint(0.7, 10.5, 1, 0), b = backbonePoint(0.7, 10.5, 1, Math.PI * 2)
    a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 10))
    expect(backboneAzimuth(0, 10.5, 1, 1.3, 127) - backboneAzimuth(0, 10.5, 1, 1.3)).toBeCloseTo(127 * Math.PI / 180, 12)
    expect(Math.hypot(a[0], a[2])).toBeCloseTo(RADIUS * SCALE, 12)
  })
})

describe('lesson contract', () => {
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
  it('changes geometry and readouts when the first control is pushed to its maximum', () => {
    const first = lesson.controls[0]
    const pushed = { ...lesson.defaults, [first.key]: first.max }
    expect(JSON.stringify(lesson.build(pushed, 1))).not.toEqual(JSON.stringify(lesson.build(lesson.defaults, 1)))
    expect(JSON.stringify(lesson.readouts(pushed))).not.toEqual(JSON.stringify(lesson.readouts(lesson.defaults)))
    expect(lesson.readouts(lesson.defaults).map(r => r.value)).toEqual(['35.7 Å, 34.3°', '12.59 Å', '23.11 Å', '4.46 Å'])
    expect(lesson.readouts(pushed).map(r => r.value)).toEqual(['35.7 Å, 34.3°', '17.85 Å', '17.85 Å', '0.00 Å'])
    expect(lesson.readouts(lesson.presets[0].params).map(r => r.value)).toEqual(['34.0 Å, 36.0°', '11.99 Å', '22.01 Å', '4.46 Å'])
    expect(lesson.readouts({ ...lesson.presets[0].params, offset: 180 }).map(r => r.value)).toEqual(['34.0 Å, 36.0°', '17.00 Å', '17.00 Å', '0.00 Å'])
  })
  it('keeps defaults and presets inside control ranges and legend colours on screen', () => {
    for (const c of lesson.controls) {
      expect(lesson.defaults[c.key]).toBeGreaterThanOrEqual(c.min)
      expect(lesson.defaults[c.key]).toBeLessThanOrEqual(c.max)
      for (const preset of lesson.presets) {
        expect(preset.params[c.key]).toBeGreaterThanOrEqual(c.min)
        expect(preset.params[c.key]).toBeLessThanOrEqual(c.max)
      }
    }
    const frame = lesson.build(lesson.defaults, 1)
    const used = new Set([...frame.lines.map(l => l.color), ...(frame.surfaces ?? []).map(s => s.color), ...(frame.points ?? []).map(p => p.color)])
    for (const entry of lesson.legend) expect(used.has(entry.color)).toBe(true)
    expect(lesson.accent).toBe('#a3e635')
    expect(lesson.category).toBe('biology')
  })
  it('draws the mirror-image preset as a left-handed helix', () => {
    const mirror = lesson.build(lesson.presets[2].params, 0.4)
    const strand = mirror.lines[1].points
    expect(handednessSign(strand[10], strand[11], strand[12])).toBe(-1)
    const normal = lesson.build(lesson.defaults, 0.4).lines[1].points
    expect(handednessSign(normal[10], normal[11], normal[12])).toBe(1)
  })
})
