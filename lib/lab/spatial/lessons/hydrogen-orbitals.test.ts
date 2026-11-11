import { describe, expect, it } from 'vitest'
import {
  BOHR_PM, effectiveNumbers, energyEv, lesson, meanRadius, mostProbableRadius, nodalCones, nodalPlanes,
  orbitalName, radialDensity, radialFunction, radialNodes, realHarmonic, rePeriodFs,
} from './hydrogen-orbitals'

const STATES: [number, number][] = [[1, 0], [2, 0], [2, 1], [3, 0], [3, 1], [3, 2], [4, 0], [4, 1], [4, 2], [4, 3]]
const HARMONICS: [number, number][] = [[0, 0], [1, 0], [1, 1], [2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2], [3, 3]]

describe('hydrogen radial functions', () => {
  it('are normalised so that ∫ r² R² dr = 1 for all ten states with n ≤ 4', () => {
    const h = 0.001
    for (const [n, l] of STATES) {
      let integral = 0
      for (let r = h / 2; r < 80; r += h) integral += radialDensity(n, l, r) * h
      expect(integral).toBeCloseTo(1, 4)
    }
  })
  it('places the radial nodes at the textbook radii', () => {
    expect(radialNodes(2, 0)).toHaveLength(1)
    expect(radialNodes(2, 0)[0]).toBeCloseTo(2, 6)
    const threeS = radialNodes(3, 0)
    expect(threeS[0]).toBeCloseTo((9 - 3 * Math.sqrt(3)) / 2, 6)
    expect(threeS[1]).toBeCloseTo((9 + 3 * Math.sqrt(3)) / 2, 6)
    expect(radialNodes(3, 1)[0]).toBeCloseTo(6, 6)
    const fourP = radialNodes(4, 1)
    expect(fourP[0]).toBeCloseTo(10 - 2 * Math.sqrt(5), 6)
    expect(fourP[1]).toBeCloseTo(10 + 2 * Math.sqrt(5), 6)
    expect(radialNodes(4, 2)[0]).toBeCloseTo(12, 6)
    const fourS = radialNodes(4, 0)
    expect(fourS[0]).toBeCloseTo(1.8716, 3)
    expect(fourS[1]).toBeCloseTo(6.6108, 3)
    expect(fourS[2]).toBeCloseTo(15.5175, 3)
    for (const [n, l] of STATES) {
      const nodes = radialNodes(n, l)
      expect(nodes).toHaveLength(n - l - 1)
      for (const r of nodes) expect(Math.abs(radialFunction(n, l, r))).toBeLessThan(1e-9)
    }
  })
  it('finds the most probable radii: a0 for 1s, 4 a0 for 2p, (3+√5) a0 for 2s, 12 a0 for 3p', () => {
    expect(mostProbableRadius(1, 0)).toBe(1)
    expect(mostProbableRadius(2, 1)).toBe(4)
    expect(mostProbableRadius(3, 2)).toBe(9)
    expect(mostProbableRadius(4, 3)).toBe(16)
    expect(mostProbableRadius(2, 0)).toBeCloseTo(3 + Math.sqrt(5), 6)
    expect(mostProbableRadius(3, 1)).toBeCloseTo(12, 6)
    expect(mostProbableRadius(3, 0)).toBeCloseTo(13.074, 3)
    expect(mostProbableRadius(4, 0)).toBeCloseTo(24.618, 3)
    expect(mostProbableRadius(4, 1)).toBeCloseTo(23.580, 3)
    expect(mostProbableRadius(4, 2)).toBeCloseTo(14 + 2 * Math.sqrt(13), 6)
    expect(mostProbableRadius(2, 1) * BOHR_PM).toBeCloseTo(211.7, 1)
    expect(mostProbableRadius(2, 0) * BOHR_PM).toBeCloseTo(277.1, 1)
    expect(mostProbableRadius(4, 1) * BOHR_PM).toBeCloseTo(1247.8, 1)
  })
  it('puts 1 − 5e⁻² of the 1s electron inside the Bohr radius', () => {
    const h = 1e-4
    let inside = 0
    for (let r = h / 2; r < 1; r += h) inside += radialDensity(1, 0, r) * h
    expect(inside).toBeCloseTo(1 - 5 * Math.exp(-2), 6)
    expect(inside).toBeCloseTo(0.32332, 5)
  })
  it('reports ⟨r⟩, E_n and the period of Re ψ', () => {
    expect(meanRadius(1, 0)).toBe(1.5)
    expect(meanRadius(2, 0)).toBe(6)
    expect(meanRadius(2, 1)).toBe(5)
    expect(meanRadius(3, 2)).toBe(10.5)
    expect(meanRadius(4, 3)).toBe(18)
    expect(meanRadius(2, 1) * BOHR_PM).toBeCloseTo(264.6, 1)
    expect(meanRadius(4, 3) * BOHR_PM).toBeCloseTo(952.5, 1)
    expect(energyEv(1)).toBeCloseTo(-13.6057, 4)
    expect(energyEv(2)).toBeCloseTo(-3.4014, 4)
    expect(energyEv(4)).toBeCloseTo(-0.8504, 4)
    expect(rePeriodFs(2)).toBeCloseTo(1.216, 3)
  })
})

describe('real spherical harmonics', () => {
  it('are orthonormal on the sphere for all sixteen functions with l ≤ 3', () => {
    const nTheta = 180, nPhi = 360
    for (const [l, m] of HARMONICS) {
      let integral = 0
      for (let i = 0; i < nTheta; i++) {
        const theta = Math.PI * (i + 0.5) / nTheta
        for (let j = 0; j < nPhi; j++) {
          const phi = 2 * Math.PI * (j + 0.5) / nPhi
          integral += realHarmonic(l, m, theta, phi) ** 2 * Math.sin(theta) * (Math.PI / nTheta) * (2 * Math.PI / nPhi)
        }
      }
      expect(integral).toBeCloseTo(1, 3)
    }
    expect(realHarmonic(0, 0, 0.3, 1.1)).toBeCloseTo(1 / Math.sqrt(4 * Math.PI), 10)
    expect(realHarmonic(0, 0, 0.3, 1.1)).toBeCloseTo(0.282095, 6)
    expect(realHarmonic(1, 1, Math.PI / 2, 0)).toBeGreaterThan(0)
    expect(realHarmonic(1, 0, 0.4, 0)).toBeCloseTo(Math.sqrt(3 / (4 * Math.PI)) * Math.cos(0.4), 10)
  })
  it('vanishes on the nodal cones and planes, which together number l', () => {
    expect(nodalCones(2, 0)[0]).toBeCloseTo(54.7356, 4)
    expect(nodalCones(2, 0)[1]).toBeCloseTo(125.2644, 4)
    expect(nodalCones(3, 0)[0]).toBeCloseTo(39.2315, 4)
    expect(nodalCones(3, 0)[1]).toBeCloseTo(90, 10)
    expect(nodalCones(3, 1)[0]).toBeCloseTo(63.4349, 4)
    expect(nodalCones(1, 0)[0]).toBeCloseTo(90, 10)
    for (const [l, m] of HARMONICS) {
      const cones = nodalCones(l, m), planes = nodalPlanes(m)
      expect(cones.length + planes.length).toBe(l)
      for (const cone of cones) for (const phi of [0.2, 1.7, 4]) expect(Math.abs(realHarmonic(l, m, cone * Math.PI / 180, phi))).toBeLessThan(1e-9)
      for (const phi of planes) for (const theta of [0.3, 1.2, 2.5]) expect(Math.abs(realHarmonic(l, m, theta, phi))).toBeLessThan(1e-9)
    }
    expect(nodalPlanes(2).map(a => a * 180 / Math.PI)).toEqual([45, 135])
  })
})

describe('slider aliasing', () => {
  it('rounds to the nearest real orbital and names it in the cos(mφ) convention', () => {
    expect(effectiveNumbers({ l: 1, n: 2, m: 0 })).toEqual({ n: 2, l: 1, m: 0 })
    expect(effectiveNumbers({ l: 3, n: 2, m: 0 })).toEqual({ n: 4, l: 3, m: 0 })
    expect(effectiveNumbers({ l: 1, n: 3, m: 3 })).toEqual({ n: 3, l: 1, m: 1 })
    expect(orbitalName(2, 1, 0)).toBe('2pz')
    expect(orbitalName(3, 2, 2)).toBe('3dx²−y²')
    expect(orbitalName(4, 3, 0)).toBe('4fz³')
    const readouts = lesson.readouts({ l: 1, n: 2, m: 0 })
    expect(readouts[0].value).toBe('2pz: 0 radial, 1 angular, -3.401 eV')
    expect(readouts[1].value).toBe('211.7 pm (4.000 a0)')
    expect(readouts[2].value).toBe('264.6 pm, 1.216 fs')
    expect(lesson.readouts({ l: 3, n: 2, m: 0 })[0].value).toContain('4fz³')
    expect(lesson.readouts({ l: 3, n: 2, m: 0 })[1].value).toBe('846.7 pm (16.000 a0)')
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

it('changes geometry and readouts when the first control hits its maximum, and keeps every value in range', () => {
  const first = lesson.controls[0]
  const pushed = { ...lesson.defaults, [first.key]: first.max }
  expect(JSON.stringify(lesson.build(pushed, 1))).not.toBe(JSON.stringify(lesson.build(lesson.defaults, 1)))
  expect(JSON.stringify(lesson.readouts(pushed))).not.toBe(JSON.stringify(lesson.readouts(lesson.defaults)))
  for (const control of lesson.controls) {
    expect(lesson.defaults[control.key]).toBeGreaterThanOrEqual(control.min)
    expect(lesson.defaults[control.key]).toBeLessThanOrEqual(control.max)
    for (const preset of lesson.presets) {
      expect(preset.params[control.key]).toBeGreaterThanOrEqual(control.min)
      expect(preset.params[control.key]).toBeLessThanOrEqual(control.max)
    }
  }
  const frame = lesson.build(lesson.presets[2].params, 0.4)
  const used = new Set([...frame.lines.map(l => l.color), ...(frame.surfaces ?? []).map(s => s.color), ...(frame.points ?? []).map(p => p.color)])
  for (const entry of lesson.legend) expect(used.has(entry.color)).toBe(true)
  expect(lesson.accent).toBe('#f472b6')
  expect(lesson.category).toBe('chemistry')
})
