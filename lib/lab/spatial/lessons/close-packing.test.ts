import { describe, expect, it } from 'vitest'
import {
  bodyCentredFraction, closePackedFraction, contactCount, explodeFactor, fccCell, fccLatticeConstant, hcpPrism, holeMarkers,
  idealAxialRatio, LAYER_SPACING, lesson, octahedralHoleRatio, patchSites, simpleCubicFraction, sitePosition, slabFraction,
  SPHERE_DIAMETER, sphereCentres, tetrahedralHoleRatio,
} from './close-packing'
import type { Vec3 } from '../types'

const near = (a: Vec3, b: Vec3, tolerance = 1e-6) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < tolerance

describe('packing fractions', () => {
  it('reproduces the Kepler bound and the lower cubic fractions', () => {
    expect(closePackedFraction()).toBeCloseTo(0.74048, 5)
    expect(bodyCentredFraction()).toBeCloseTo(0.68017, 5)
    expect(simpleCubicFraction()).toBeCloseTo(0.52360, 5)
  })
  it('gives the finite-slab fractions and approaches the limit from below', () => {
    const percent = [1, 2, 3, 4, 5].map(n => 100 * slabFraction(n))
    ;[60.46, 66.57, 68.89, 70.11, 70.86].forEach((v, i) => expect(percent[i]).toBeCloseTo(v, 2))
    expect(slabFraction(1e6)).toBeCloseTo(closePackedFraction(), 5)
    for (let n = 1; n < 40; n++) expect(slabFraction(n)).toBeLessThan(slabFraction(n + 1))
  })
})

describe('cell geometry and holes', () => {
  it('has the ideal hcp axial ratio and the fcc lattice constant of copper', () => {
    expect(idealAxialRatio()).toBeCloseTo(1.63299, 5)
    expect(LAYER_SPACING / SPHERE_DIAMETER).toBeCloseTo(0.81650, 5)
    expect(LAYER_SPACING).toBeCloseTo(0.48990, 5)
    expect(fccLatticeConstant(2.556)).toBeCloseTo(3.615, 2)
    expect(fccLatticeConstant(SPHERE_DIAMETER)).toBeCloseTo(0.84853, 5)
  })
  it('sizes the octahedral and tetrahedral holes by the radius-ratio rules', () => {
    expect(octahedralHoleRatio()).toBeCloseTo(0.41421, 5)
    expect(tetrahedralHoleRatio()).toBeCloseTo(0.22474, 5)
  })
  it('places hole markers equidistant from their surrounding spheres at every phase', () => {
    for (const phase of [0, 1.3]) {
      const holes = holeMarkers(2, phase)!, spheres = sphereCentres(2, 1, phase)
      const dist = (p: Vec3) => spheres.map(s => Math.hypot(...s.position.map((v, k) => v - p[k]) as Vec3)).sort((a, b) => a - b)
      const oct = dist(holes.octahedral), tet = dist(holes.tetrahedral)
      if (phase === 0) {
        for (let k = 0; k < 6; k++) expect(oct[k]).toBeCloseTo(SPHERE_DIAMETER / 2 * (1 + octahedralHoleRatio()), 9)
        for (let k = 0; k < 4; k++) expect(tet[k]).toBeCloseTo(SPHERE_DIAMETER / 2 * (1 + tetrahedralHoleRatio()), 9)
      }
      expect(oct[6]).toBeGreaterThan(oct[5] + 1e-6)
      expect(tet[4]).toBeGreaterThan(tet[3] + 1e-6)
    }
  })
})

describe('the stack of layers', () => {
  it('draws 37 sites per layer, all within 2.1 units of the axis, with B and C in the hollows', () => {
    expect(patchSites()).toHaveLength(37)
    const extent = Math.max(...patchSites().flatMap(([i, j]) => [0, 1, 2].flatMap(cls => sitePosition(i, j, cls).map(Math.abs))))
    expect(extent).toBeCloseTo(2.1, 9)
    for (const cls of [1, 2]) expect(Math.hypot(...sitePosition(0, 0, cls))).toBeCloseTo(SPHERE_DIAMETER / Math.sqrt(3), 12)
    expect(sphereCentres(5, 1, 0)).toHaveLength(185)
  })
  it('touches 6, 9 and 12 neighbours as layers are added, for both stackings', () => {
    for (const stacking of [0, 1]) {
      expect(contactCount(1, stacking)).toBe(6)
      expect(contactCount(2, stacking)).toBe(9)
      for (const n of [3, 4, 5]) expect(contactCount(n, stacking)).toBe(12)
    }
    expect(explodeFactor(0)).toBeCloseTo(1, 12)
    expect(explodeFactor(Math.PI)).toBeCloseTo(1.9, 12)
    expect(explodeFactor(2 * Math.PI)).toBeCloseTo(1, 12)
  })
  it('keeps the inter-layer contact sticks while the layers are pulled apart', () => {
    const sticks = (p: typeof lesson.defaults, phase: number) => lesson.build(p, phase).lines.filter(l => l.color === '#ffc46b' && l.opacity === 0.85)
    for (const phase of [0, 1, Math.PI]) expect(sticks(lesson.defaults, phase)).toHaveLength(12)
    expect(sticks({ ...lesson.defaults, layers: 2 }, Math.PI)).toHaveLength(9)
    expect(sticks({ ...lesson.defaults, layers: 1, stacking: 1 }, Math.PI)).toHaveLength(6)
    expect(sticks(lesson.presets[2].params, Math.PI)).toHaveLength(12)
  })
  it('hides a true cube of edge √2·d in the ABC stack with all 14 cell sites on sphere centres', () => {
    expect(fccCell(3, 1, 0)).toBeNull()
    expect(fccCell(4, 0, 0)).toBeNull()
    const cell = fccCell(4, 1, 0)!
    cell.edge.forEach(e => expect(Math.hypot(...e)).toBeCloseTo(fccLatticeConstant(SPHERE_DIAMETER), 9))
    expect(cell.edge[0].reduce((s, v, k) => s + v * cell.edge[1][k], 0)).toBeCloseTo(0, 9)
    expect(cell.edge[1].reduce((s, v, k) => s + v * cell.edge[2][k], 0)).toBeCloseTo(0, 9)
    expect(cell.corners[7][1] - cell.corners[0][1]).toBeCloseTo(Math.sqrt(6) * SPHERE_DIAMETER, 9)
    expect(cell.corners[7][1] - cell.corners[0][1]).toBeCloseTo(3 * LAYER_SPACING, 9)
    for (const phase of [0, 1.3]) {
      const sites = fccCell(4, 1, phase)!, centres = sphereCentres(4, 1, phase).map(s => s.position)
      expect([...sites.corners, ...sites.faces]).toHaveLength(14)
      for (const site of [...sites.corners, ...sites.faces]) expect(centres.some(c => near(c, site))).toBe(true)
    }
  })
  it('draws the hcp prism through A sites two layers apart with c/a ideal', () => {
    expect(hcpPrism(3, 1, 0)).toBeNull()
    expect(hcpPrism(2, 0, 0)).toBeNull()
    const prism = hcpPrism(3, 0, 0)!, centres = sphereCentres(3, 0, 0).map(s => s.position)
    for (const v of [...prism.bottom, ...prism.top]) expect(centres.some(c => near(c, v))).toBe(true)
    expect((prism.top[0][1] - prism.bottom[0][1]) / Math.hypot(prism.bottom[0][0], prism.bottom[0][2])).toBeCloseTo(idealAxialRatio(), 9)
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
    for (const s of frame.surfaces ?? []) expect(s.indices.every(i => Number.isInteger(i) && i >= 0 && i < s.vertices.length)).toBe(true)
  }
})

it('honours the workbench contract: first control changes geometry and readouts, params in range, legend colours drawn', () => {
  const first = lesson.controls[0]
  const pushed = { ...lesson.defaults, [first.key]: first.max }
  expect(JSON.stringify(lesson.build(pushed, 1))).not.toBe(JSON.stringify(lesson.build(lesson.defaults, 1)))
  const text = (p: typeof lesson.defaults) => lesson.readouts(p).map(r => `${r.label}: ${r.value}`).join('\n')
  expect(text(pushed)).not.toBe(text(lesson.defaults))
  expect(text(lesson.defaults)).toContain('111 spheres, 68.89% → 74.05%')
  expect(text(pushed)).toContain('185 spheres, 70.86% → 74.05%')
  expect(text(lesson.defaults)).toContain('12: coordination number 12')
  expect(text({ ...lesson.defaults, layers: 1 })).toContain('6: 6 in the plane only')
  expect(text(lesson.presets[0].params)).toContain('a = 3.615 Å')
  expect(text(lesson.presets[1].params)).toContain('c/a = 1.633')
  for (const c of lesson.controls) {
    expect(lesson.defaults[c.key]).toBeGreaterThanOrEqual(c.min)
    expect(lesson.defaults[c.key]).toBeLessThanOrEqual(c.max)
    for (const preset of lesson.presets) {
      expect(preset.params[c.key]).toBeGreaterThanOrEqual(c.min)
      expect(preset.params[c.key]).toBeLessThanOrEqual(c.max)
    }
  }
  const used = new Set<string>()
  for (const p of [lesson.defaults, ...lesson.presets.map(preset => preset.params)]) {
    const frame = lesson.build(p, 1)
    frame.lines.forEach(l => used.add(l.color)); frame.surfaces?.forEach(s => used.add(s.color)); frame.points?.forEach(v => used.add(v.color))
  }
  for (const entry of lesson.legend) expect(used.has(entry.color), `${entry.label} colour ${entry.color} is drawn`).toBe(true)
  expect(lesson.accent).toBe('#f472b6')
  expect(lesson.category).toBe('chemistry')
})
