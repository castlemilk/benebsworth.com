import { describe, expect, it } from 'vitest'
import {
  EARTH_RADIUS, PREM_CMB, PREM_ICB, buildModel, coreRefraction, directTravelTime, fanTakeoffs, layeredModel, lesson,
  premVelocity, rayParameter, shadowScan, traceRay,
} from './seismic-shadow'

const premP = buildModel(1, PREM_CMB, 'p'), premS = buildModel(1, PREM_CMB, 's')
const scanP = shadowScan(premP), scanS = shadowScan(premS)

describe('PREM profile', () => {
  it('matches the Dziewonski & Anderson (1981) velocities at the core boundaries', () => {
    expect(premVelocity(PREM_CMB, 'p', 'above')).toBeCloseTo(13.7166, 3)
    expect(premVelocity(PREM_CMB, 'p', 'below')).toBeCloseTo(8.0648, 3)
    expect(premVelocity(PREM_CMB, 's', 'above')).toBeCloseTo(7.2646, 3)
    expect(premVelocity(PREM_CMB, 's', 'below')).toBe(0)
    expect(premVelocity(PREM_ICB, 'p', 'above')).toBeCloseTo(10.3557, 3)
    expect(premVelocity(PREM_ICB, 'p', 'below')).toBeCloseTo(11.0283, 3)
    expect(premVelocity(PREM_ICB, 's', 'below')).toBeCloseTo(3.5043, 3)
    expect(premVelocity(EARTH_RADIUS, 'p')).toBe(5.8)
    expect(premVelocity(0, 'p', 'below')).toBeCloseTo(11.2622, 4)
  })
  it('refracts a 30° mantle P ray to 17.1° in the slower core, 26.2° with the core sped up by half', () => {
    expect(coreRefraction(30, 1, 'p')).toBeCloseTo(17.1, 1)
    expect(coreRefraction(30, 1.5, 'p')).toBeCloseTo(26.2, 1)
    expect(coreRefraction(30, 1, 's')).toBeNull()
  })
})

describe('ray tracer', () => {
  const fixture = layeredModel('p', [
    { rTop: EARTH_RADIUS, rBottom: PREM_CMB, vTop: 13.72, vBottom: 13.72, region: 'mantle' },
    { rTop: PREM_CMB, rBottom: PREM_ICB, vTop: 8.06, vBottom: 8.06, region: 'outer' },
    { rTop: PREM_ICB, rBottom: 0, vTop: 11, vBottom: 11, region: 'inner' },
  ])
  it('reproduces the analytic single-shell shadow edge 2·acos(3480/6371) = 113.8°', () => {
    const graze = traceRay(fixture, (PREM_CMB / 13.72) * (1 + 1e-9))
    expect(graze.kind).toBe('direct')
    expect(graze.delta).toBeCloseTo(2 * Math.acos(PREM_CMB / EARTH_RADIUS) * 180 / Math.PI, 3)
    expect(graze.delta).toBeCloseTo(113.78, 2)
  })
  it('conserves the ray parameter p = r sin i / v across every boundary of a chord ray', () => {
    const p = rayParameter(fixture, 10)
    const ray = traceRay(fixture, p)
    expect(ray.p).toBeCloseTo(EARTH_RADIUS * Math.sin(Math.PI / 18) / 13.72, 12)
    expect(ray.kind).toBe('inner')
    for (let i = 1; i < ray.vertices.length; i++) {
      const a = ray.vertices[i - 1], b = ray.vertices[i]
      const A = [a.r * Math.sin(a.delta), a.r * Math.cos(a.delta)], B = [b.r * Math.sin(b.delta), b.r * Math.cos(b.delta)]
      const length = Math.hypot(B[0] - A[0], B[1] - A[1])
      if (length < 1e-6) continue
      const d = [(B[0] - A[0]) / length, (B[1] - A[1]) / length]
      const mid = (a.r + b.r) / 2
      const layer = fixture.layers.find(l => l.rBottom <= mid && mid <= l.rTop)!
      for (const [point, r] of [[A, a.r], [B, b.r]] as const) {
        if (r < 1e-6) continue
        const sinIncidence = Math.abs(d[0] * point[1] - d[1] * point[0]) / r
        expect(r * sinIncidence / layer.vTop).toBeCloseTo(p, 9)
      }
    }
  })
  it('converges: 120 and 600 PREM shells agree on the shadow edges to a few hundredths of a degree', () => {
    const fine = shadowScan(buildModel(1, PREM_CMB, 'p', 600))
    expect(Math.abs(fine.lastDirect - scanP.lastDirect)).toBeLessThan(0.05)
    expect(Math.abs(fine.minOuter! - scanP.minOuter!)).toBeLessThan(0.05)
    expect(Math.abs(fine.onsetInner! - scanP.onsetInner!)).toBeLessThan(0.05)
  })
})

describe('PREM shadow zones and travel times', () => {
  it('casts the P shadow from the last direct ray near 98° to the PKP caustic near 145°, with PKIKP from 116°', () => {
    expect(scanP.lastDirect).toBeGreaterThan(97.5)
    expect(scanP.lastDirect).toBeLessThan(99)
    expect(scanP.minOuter!).toBeCloseTo(145.1, 0)
    expect(scanP.onsetInner!).toBeCloseTo(116.2, 0)
    expect(scanP.reflected![0]).toBeCloseTo(116.1, 0)
    expect(scanP.reflected![1]).toBeCloseTo(152.7, 0)
  })
  it('matches IASP91 travel times: P at 60° and 90°, PKIKP at the antipode', () => {
    expect(Math.abs(directTravelTime(scanP, 60)! - 606)).toBeLessThan(6)
    expect(Math.abs(directTravelTime(scanP, 90)! - 779)).toBeLessThan(6)
    expect(Math.abs(traceRay(premP, 0).time - 1212)).toBeLessThan(6)
    expect(traceRay(premP, 0).delta).toBeCloseTo(180, 6)
  })
  it('stops S waves at the liquid core: direct S ends near 102°, nothing is transmitted, ScS reflects', () => {
    expect(scanS.lastDirect).toBeCloseTo(102.7, 0)
    expect(scanS.minOuter).toBeNull()
    expect(scanS.onsetInner).toBeNull()
    expect(scanS.reflected![1]).toBeCloseTo(scanS.lastDirect, 0)
    expect(Math.abs(directTravelTime(scanS, 90)! - 1434)).toBeLessThan(15)
  })
  it('moves the PKP edge with the outer-core speed and keeps the direct edge fixed', () => {
    const fast = shadowScan(buildModel(1.5, PREM_CMB, 'p')), slow = shadowScan(buildModel(0.7, PREM_CMB, 'p'))
    expect(fast.lastDirect).toBeCloseTo(scanP.lastDirect, 6)
    expect(fast.minOuter!).toBeCloseTo(108.0, 0)
    expect(fast.onsetInner!).toBeGreaterThan(178)
    expect(slow.minOuter!).toBeCloseTo(165.4, 0)
    expect(Math.abs(traceRay(buildModel(1.5, PREM_CMB, 'p'), 0).time - 1050)).toBeLessThan(6)
  })
  it('includes the inner-core critical take-off near 5.8° in the fan', () => {
    const critical = fanTakeoffs().find(a => a > 5.7 && a < 5.9)
    expect(critical).toBeDefined()
    expect(traceRay(premP, rayParameter(premP, critical!)).kind).toBe('inner')
  })
  it('includes one PKiKP ray near 6.0° that totally reflects from the inner-core boundary and lands inside the shadow', () => {
    expect(fanTakeoffs()).toHaveLength(38)
    const pkikp = fanTakeoffs().find(a => a > 5.9 && a < 6.1)
    expect(pkikp).toBeDefined()
    const ray = traceRay(premP, rayParameter(premP, pkikp!))
    expect(ray.kind).toBe('reflected')
    expect(ray.deepest).toBeCloseTo(PREM_ICB, 6)
    expect(ray.delta).toBeGreaterThan(scanP.reflected![0])
    expect(ray.delta).toBeLessThan(scanP.reflected![1])
    const kinds = fanTakeoffs().map(a => traceRay(premP, rayParameter(premP, a)).kind)
    expect(kinds.filter(k => k === 'reflected')).toHaveLength(1)
  })
})

describe('lesson contract', () => {
  it('produces finite, bounded geometry for defaults, presets and control extremes', () => {
    const states = [lesson.defaults, ...lesson.presets.map(p => p.params)]
    for (const c of lesson.controls) for (const value of [c.min, c.max]) states.push({ ...lesson.defaults, [c.key]: value })
    for (const p of states) for (const phase of [0, 1.3, 4.7, Math.PI * 2]) {
      const frame = lesson.build(p, phase)
      const vertices = [...frame.lines.flatMap(l => l.points), ...(frame.points ?? []).map(v => v.position), ...(frame.surfaces ?? []).flatMap(s => s.vertices)]
      expect(vertices.length).toBeGreaterThan(50)
      expect(vertices.every(v => v.every(n => Number.isFinite(n) && Math.abs(n) <= 3))).toBe(true)
      expect(frame.lines.every(l => l.points.length >= 2)).toBe(true)
      for (const s of frame.surfaces ?? []) expect(s.indices.every(i => i >= 0 && i < s.vertices.length)).toBe(true)
    }
  })
  it('changes geometry and readouts when the first control is pushed to its maximum', () => {
    const first = lesson.controls[0]
    const altered = { ...lesson.defaults, [first.key]: first.max }
    expect(JSON.stringify(lesson.build(altered, 1))).not.toBe(JSON.stringify(lesson.build(lesson.defaults, 1)))
    expect(JSON.stringify(lesson.readouts(altered))).not.toBe(JSON.stringify(lesson.readouts(lesson.defaults)))
    expect(lesson.readouts(lesson.defaults).map(r => r.value)).toEqual(['98.4° → 145.1°', '13.0 min (IASP91 13.0) · 20.2 min (IASP91 20.2)', '17.1° · velocity ratio 0.59'])
    expect(lesson.readouts(altered)[0].value).toBe('98.4° → 108.0°')
  })
  it('keeps defaults and presets inside the control ranges and every legend and drawn colour in the other set', () => {
    for (const c of lesson.controls) {
      expect(lesson.defaults[c.key]).toBeGreaterThanOrEqual(c.min)
      expect(lesson.defaults[c.key]).toBeLessThanOrEqual(c.max)
      for (const preset of lesson.presets) {
        expect(preset.params[c.key]).toBeGreaterThanOrEqual(c.min)
        expect(preset.params[c.key]).toBeLessThanOrEqual(c.max)
      }
    }
    const sPreset = lesson.presets.find(p => p.params.wave === 1)!.params
    const frames = [lesson.build(lesson.defaults, Math.PI * 2), lesson.build(sPreset, Math.PI * 2)]
    const used = new Set(frames.flatMap(f => [...f.lines.map(l => l.color), ...(f.surfaces ?? []).map(s => s.color), ...(f.points ?? []).map(p => p.color)]))
    const legend = new Set(lesson.legend.map(e => e.color))
    for (const entry of lesson.legend) expect(used.has(entry.color)).toBe(true)
    for (const color of used) expect(legend.has(color)).toBe(true)
    const defaultsOnly = new Set([...frames[0].lines.map(l => l.color), ...(frames[0].points ?? []).map(p => p.color)])
    expect(defaultsOnly.has('#53617d')).toBe(true)
    expect(lesson.accent).toBe('#38bdf8')
    expect(lesson.title).toBe('Seismic shadow zones')
  })
})
