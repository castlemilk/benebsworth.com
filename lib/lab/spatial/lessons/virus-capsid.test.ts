import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CAMERA, EXPLODE, SHELL_CENTRE, SHELL_RADIUS, capsidHand, capsidRest, capsomerCount, capsomerPosition, disassembly, edgePoints,
  icosahedronEdge, icosahedronFaces, icosahedronVertices, lesson, loeschianNumbers, pickInterior, quasiEquivalentPositions,
  tracePath, triangulationNumber, walkTurnSign,
} from './virus-capsid'

const PAIRS: [number, number][] = []
for (let h = 1; h <= 5; h++) for (let k = 0; k <= 3; k++) PAIRS.push([h, k])

describe('Caspar–Klug arithmetic', () => {
  it('gives the famous triangulation numbers and only Löschian values', () => {
    expect(triangulationNumber(1, 0)).toBe(1)
    expect(triangulationNumber(1, 1)).toBe(3)
    expect(triangulationNumber(2, 1)).toBe(7)
    expect(triangulationNumber(3, 1)).toBe(13)
    expect(triangulationNumber(4, 0)).toBe(16)
    expect(triangulationNumber(5, 0)).toBe(25)
    expect(triangulationNumber(5, 3)).toBe(49)
    expect(loeschianNumbers(31)).toEqual([1, 3, 4, 7, 9, 12, 13, 16, 19, 21, 25, 27, 28, 31])
    for (const forbidden of [2, 5, 6, 8, 10, 11, 14, 15]) expect(loeschianNumbers(50)).not.toContain(forbidden)
  })
  it('counts 60T quasi-equivalent positions and 10T + 2 capsomers for the textbook viruses', () => {
    expect(quasiEquivalentPositions(3)).toBe(180)
    expect(quasiEquivalentPositions(7)).toBe(420)
    expect(quasiEquivalentPositions(16)).toBe(960)
    expect(quasiEquivalentPositions(25)).toBe(1500)
    expect(capsomerCount(3)).toBe(32)
    expect(capsomerCount(7)).toBe(72)
    expect(capsomerCount(13)).toBe(132)
    expect(capsomerCount(16)).toBe(162)
    expect(capsomerCount(25)).toBe(252)
    expect(capsomerCount(31)).toBe(312)
  })
  it('satisfies Pick identity 12 + 30(g − 1) + 20 I = 10T + 2 for every lattice in range', () => {
    expect(pickInterior(2, 1)).toBe(3)
    expect(pickInterior(2, 0)).toBe(0)
    expect(pickInterior(4, 0)).toBe(3)
    expect(pickInterior(5, 0)).toBe(6)
    expect(pickInterior(5, 3)).toBe(24)
    for (const [h, k] of PAIRS) expect(12 + 30 * edgePoints(h, k) + 20 * pickInterior(h, k)).toBe(capsomerCount(triangulationNumber(h, k)))
  })
  it('labels the hand by the stated convention and flips it under (h, k) → (k, h)', () => {
    expect(capsidHand(2, 1)).toBe('laevo')
    expect(capsidHand(1, 2)).toBe('dextro')
    expect(capsidHand(3, 1)).toBe('laevo')
    expect(capsidHand(1, 3)).toBe('dextro')
    expect(capsidHand(2, 0)).toBe('achiral')
    expect(capsidHand(2, 2)).toBe('achiral')
    for (const [h, k] of PAIRS) if (h !== k && k > 0) expect(capsidHand(h, k)).not.toBe(capsidHand(k, h))
  })
})

describe('icosahedron', () => {
  it('has 12 vertices, 30 edges and 20 outward faces with edge 2R / √(φ + 2)', () => {
    const vertices = icosahedronVertices(2.2)
    const faces = icosahedronFaces(vertices)
    expect(vertices).toHaveLength(12)
    expect(faces).toHaveLength(20)
    expect(icosahedronEdge(2.2)).toBeCloseTo(2.3132, 4)
    for (const v of vertices) expect(Math.hypot(...v)).toBeCloseTo(2.2, 12)
    const edges = new Set<string>()
    for (const [a, b, c] of faces) for (const [p, q] of [[a, b], [b, c], [c, a]]) edges.add(p < q ? `${p},${q}` : `${q},${p}`)
    expect(edges.size).toBe(30)
    for (const [a, b, c] of faces) {
      const u = vertices[b].map((v, i) => v - vertices[a][i]), w = vertices[c].map((v, i) => v - vertices[a][i])
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
      const centroid = vertices[a].map((v, i) => v + vertices[b][i] + vertices[c][i])
      expect(n[0] * centroid[0] + n[1] * centroid[1] + n[2] * centroid[2]).toBeGreaterThan(0)
    }
  })
  it('traces a connected graph along every edge exactly twice', () => {
    const square = [[1, 3], [0, 2], [1, 3], [2, 0]]
    const path = tracePath(square)
    expect(path).toHaveLength(2 * 4 + 1)
    const walked = new Map<string, number>()
    for (let i = 1; i < path.length; i++) { const key = [path[i - 1], path[i]].sort().join(','); walked.set(key, (walked.get(key) ?? 0) + 1) }
    expect([...walked.values()]).toEqual([2, 2, 2, 2])
  })
})

describe('capsid lattice', () => {
  it('places exactly 10T + 2 capsomers with 12 vertex keys and 30(g − 1) edge keys for every (h, k)', () => {
    for (const [h, k] of PAIRS) {
      const rest = capsidRest(h, k)
      expect(rest.positions).toHaveLength(capsomerCount(rest.T))
      expect(rest.keys.filter(key => key.startsWith('v'))).toHaveLength(12)
      expect(rest.keys.filter(key => key.startsWith('e'))).toHaveLength(30 * edgePoints(h, k))
      expect(new Set(rest.keys).size).toBe(rest.keys.length)
      for (const v of rest.positions) expect(Math.hypot(...v)).toBeLessThanOrEqual(SHELL_RADIUS + 1e-9)
    }
  })
  it('closes the shell: V − E + F = 2 with E = 30T, F = 20T, and exactly twelve 5-fold vertices', () => {
    for (const [h, k] of PAIRS) {
      const rest = capsidRest(h, k)
      expect(rest.edges).toHaveLength(30 * rest.T)
      expect(rest.triangles).toHaveLength(20 * rest.T)
      expect(rest.positions.length - rest.edges.length + rest.triangles.length).toBe(2)
      const degree = rest.positions.map(() => 0)
      for (const [a, b] of rest.edges) { degree[a]++; degree[b]++ }
      expect(degree.filter(d => d === 5)).toHaveLength(12)
      expect(degree.filter(d => d === 6)).toHaveLength(10 * rest.T - 10)
      expect(degree.slice(0, 12).every(d => d === 5)).toBe(true)
      expect(degree.reduce((sum, d) => sum + (6 - d), 0)).toBe(12)
      const spacing = icosahedronEdge(SHELL_RADIUS) / Math.sqrt(rest.T)
      // Edges inside a face have the lattice spacing; edges crossing an icosahedron fold are chords, shortest at cos(20.9°) ≈ 0.934.
      for (const [a, b] of rest.edges) {
        const length = Math.hypot(...rest.positions[a].map((v, i) => v - rest.positions[b][i]))
        expect(length).toBeLessThanOrEqual(spacing + 1e-9)
        expect(length).toBeGreaterThanOrEqual(0.93 * spacing)
      }
      expect(rest.dualPath).toHaveLength(2 * rest.edges.length + 1)
      expect(rest.icoPath).toHaveLength(61)
    }
    expect(capsidRest(5, 3).positions).toHaveLength(492)
    expect(capsidRest(5, 1).positions).toHaveLength(312)
  })
  it('walks h steps, turns left as seen from outside, then k steps between two pentamers', () => {
    for (const [h, k] of PAIRS) {
      const rest = capsidRest(h, k)
      expect(rest.walk).toHaveLength(h + k + 1)
      expect(rest.walk[0]).toBeLessThan(12)
      expect(rest.walk[rest.walk.length - 1]).toBeLessThan(12)
      expect(walkTurnSign(h, k)).toBe(k === 0 ? 0 : 1)
      const hand = lesson.readouts({ h, k, sphericity: 1 })[2].value
      expect(hand.endsWith(capsidHand(h, k))).toBe(true)
      // The walk sits on the face that looks at the default camera, so its chirality is visible before the user orbits.
      const centroid = rest.walk.reduce((acc, i) => acc.map((v, d) => v + rest.positions[i][d] / rest.walk.length), [0, 0, 0])
      const outward = Math.hypot(...centroid)
      expect(centroid.reduce((sum, v, d) => sum + (v / outward) * DEFAULT_CAMERA[d], 0)).toBeGreaterThan(0.9)
    }
    expect(lesson.readouts({ h: 2, k: 1, sphericity: 1 })[2].value).toContain('laevo')
    expect(lesson.readouts({ h: 1, k: 2, sphericity: 1 })[2].value).toContain('dextro')
  })
  it('loops the assembly envelope and keeps every capsomer under the 1.25 R radial limit', () => {
    for (let i = 0; i < 500; i += 7) {
      expect(disassembly(i, 0)).toBe(0)
      expect(disassembly(i, 2 * Math.PI)).toBe(0)
      expect(disassembly(i, Math.PI)).toBe(1)
      for (let phase = 0; phase <= 2 * Math.PI; phase += 0.1) { const d = disassembly(i, phase); expect(d).toBeGreaterThanOrEqual(0); expect(d).toBeLessThanOrEqual(1) }
    }
    const rest = capsidRest(2, 1)
    const flat = capsomerPosition(rest.positions[20], 0, 0).map((v, i) => v - SHELL_CENTRE[i])
    const round = capsomerPosition(rest.positions[20], 1, 0).map((v, i) => v - SHELL_CENTRE[i])
    expect(Math.hypot(...flat)).toBeLessThan(SHELL_RADIUS)
    expect(Math.hypot(...round)).toBeCloseTo(SHELL_RADIUS, 12)
    expect(Math.hypot(...capsomerPosition(rest.positions[0], 1, 1).map((v, i) => v - SHELL_CENTRE[i]))).toBeCloseTo(SHELL_RADIUS * (1 + EXPLODE), 12)
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
      for (const s of frame.surfaces ?? []) expect(s.indices.every(i => i >= 0 && i < s.vertices.length)).toBe(true)
    }
  })
  it('changes geometry and readouts at the first control maximum, keeps params in range and legend colours drawn', () => {
    const first = lesson.controls[0]
    const pushed = { ...lesson.defaults, [first.key]: first.max }
    expect(JSON.stringify(lesson.build(pushed, 1))).not.toBe(JSON.stringify(lesson.build(lesson.defaults, 1)))
    expect(JSON.stringify(lesson.readouts(pushed))).not.toBe(JSON.stringify(lesson.readouts(lesson.defaults)))
    expect(lesson.build(pushed, 1).points).toHaveLength(312)
    expect(lesson.build(lesson.defaults, 1).points).toHaveLength(72)
    for (const c of lesson.controls) {
      expect(lesson.defaults[c.key]).toBeGreaterThanOrEqual(c.min)
      expect(lesson.defaults[c.key]).toBeLessThanOrEqual(c.max)
      for (const preset of lesson.presets) {
        expect(preset.params[c.key]).toBeGreaterThanOrEqual(c.min)
        expect(preset.params[c.key]).toBeLessThanOrEqual(c.max)
      }
    }
    const frame = lesson.build(lesson.defaults, 1)
    const used = new Set([...frame.lines.map(l => l.color), ...(frame.points ?? []).map(p => p.color)])
    for (const entry of lesson.legend) expect(used.has(entry.color)).toBe(true)
    expect(lesson.readouts(lesson.defaults).map(r => r.value)).toEqual(['7 (h 2, k 1)', '420', '72 (12 + 60), laevo'])
    expect(lesson.readouts({ h: 5, k: 0, sphericity: 0.3 }).map(r => r.value)).toEqual(['25 (h 5, k 0)', '1500', '252 (12 + 240), achiral'])
    expect(lesson.readouts({ h: 4, k: 0, sphericity: 1 }).map(r => r.value)).toEqual(['16 (h 4, k 0)', '960', '162 (12 + 150), achiral'])
    expect(lesson.build(lesson.defaults, 0).lines).toHaveLength(3)
  })
})
