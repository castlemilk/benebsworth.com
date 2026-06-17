import { describe, it, expect } from 'vitest'
import {
  validateCircuit, findFloatingNodes, assertDC, assertTransient, circuit,
} from './validator'
import type { Circuit } from './types'

function makeCircuit(overrides?: Partial<Circuit>): Circuit {
  return { components: [], wires: [], nextNodeId: 1, nextCompId: 1, ...overrides }
}

describe('validateCircuit', () => {
  it('returns info for empty circuit', () => {
    const diags = validateCircuit(makeCircuit())
    expect(diags.some(d => d.code === 'EMPTY')).toBe(true)
  })

  it('reports NO_GROUND when no GND present', () => {
    const c = makeCircuit({
      components: [{ id: 'c1', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 100, y: 80, rotation: 0 }],
      nextNodeId: 3, nextCompId: 2,
    })
    const diags = validateCircuit(c)
    expect(diags.some(d => d.code === 'NO_GROUND')).toBe(true)
  })

  it('reports FLOATING_NODE for isolated nodes', () => {
    const c = makeCircuit({
      components: [
        { id: 'c1', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 100, y: 80, rotation: 0 },
        { id: 'c2', type: 'V', value: 5, nodeA: 3, nodeB: 0, x: 200, y: 80, rotation: 0 },
        { id: 'g1', type: 'GND', value: 0, nodeA: 0, nodeB: 0, x: 300, y: 80, rotation: 0 },
      ],
      nextNodeId: 4, nextCompId: 4,
    })
    const diags = validateCircuit(c)
    expect(diags.some(d => d.code === 'FLOATING_NODE' && d.nodes.includes(1))).toBe(true)
    expect(diags.some(d => d.code === 'FLOATING_NODE' && d.nodes.includes(2))).toBe(true)
  })

  it('reports INVALID_VALUE for zero/negative components', () => {
    const c = makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 100, y: 80, rotation: 0 },
        { id: 'c2', type: 'R', value: 0, nodeA: 1, nodeB: 0, x: 200, y: 80, rotation: 0 },
        { id: 'g1', type: 'GND', value: 0, nodeA: 0, nodeB: 0, x: 300, y: 80, rotation: 0 },
      ],
      nextNodeId: 2, nextCompId: 4,
    })
    const diags = validateCircuit(c)
    expect(diags.some(d => d.code === 'INVALID_VALUE')).toBe(true)
  })

  it('reports PARALLEL_VS warning', () => {
    const c = makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 100, y: 80, rotation: 0 },
        { id: 'c2', type: 'V', value: 3, nodeA: 1, nodeB: 0, x: 200, y: 80, rotation: 0 },
        { id: 'g1', type: 'GND', value: 0, nodeA: 0, nodeB: 0, x: 300, y: 80, rotation: 0 },
      ],
      nextNodeId: 2, nextCompId: 4,
    })
    const diags = validateCircuit(c)
    expect(diags.some(d => d.code === 'PARALLEL_VS')).toBe(true)
  })

  it('reports READY for valid circuit', () => {
    const c = makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 100, y: 80, rotation: 0 },
        { id: 'c2', type: 'R', value: 1000, nodeA: 1, nodeB: 0, x: 200, y: 80, rotation: 0 },
        { id: 'g1', type: 'GND', value: 0, nodeA: 0, nodeB: 0, x: 300, y: 80, rotation: 0 },
      ],
      nextNodeId: 2, nextCompId: 4,
    })
    const diags = validateCircuit(c)
    expect(diags.some(d => d.code === 'READY')).toBe(true)
    expect(diags.filter(d => d.severity === 'error')).toHaveLength(0)
  })

  it('reports OPEN_LOOP when V source has no return path', () => {
    // V between nodes 1 and 2, but no component connects 2 back to 0
    const c = makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 2, x: 100, y: 80, rotation: 0 },
        { id: 'c2', type: 'R', value: 1000, nodeA: 1, nodeB: 0, x: 200, y: 80, rotation: 0 },
        { id: 'g1', type: 'GND', value: 0, nodeA: 0, nodeB: 0, x: 300, y: 80, rotation: 0 },
      ],
      nextNodeId: 3, nextCompId: 4,
    })
    const diags = validateCircuit(c)
    expect(diags.some(d => d.code === 'OPEN_LOOP')).toBe(true)
  })

  it('reports DEAD_END for single-connection nodes', () => {
    // R between 1 and 2, but node 2 connects nowhere else
    const c = makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 100, y: 80, rotation: 0 },
        { id: 'c2', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 200, y: 80, rotation: 0 },
        { id: 'g1', type: 'GND', value: 0, nodeA: 0, nodeB: 0, x: 300, y: 80, rotation: 0 },
      ],
      nextNodeId: 3, nextCompId: 4,
    })
    const diags = validateCircuit(c)
    expect(diags.some(d => d.code === 'DEAD_END' && d.nodes.includes(2))).toBe(true)
  })

  it('no OPEN_LOOP when V source has complete return path', () => {
    // V(1→0), R1(1→2), R2(2→0) — complete loop
    const c = makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 100, y: 80, rotation: 0 },
        { id: 'c2', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 200, y: 80, rotation: 0 },
        { id: 'c3', type: 'R', value: 2000, nodeA: 2, nodeB: 0, x: 300, y: 80, rotation: 0 },
        { id: 'g1', type: 'GND', value: 0, nodeA: 0, nodeB: 0, x: 400, y: 80, rotation: 0 },
      ],
      nextNodeId: 3, nextCompId: 5,
    })
    const diags = validateCircuit(c)
    expect(diags.some(d => d.code === 'OPEN_LOOP')).toBe(false)
  })
})

describe('findFloatingNodes', () => {
  it('returns empty for grounded circuit', () => {
    const c = makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 100, y: 80, rotation: 0 },
        { id: 'g1', type: 'GND', value: 0, nodeA: 0, nodeB: 0, x: 200, y: 80, rotation: 0 },
      ],
      nextNodeId: 2, nextCompId: 3,
    })
    expect(findFloatingNodes(c)).toEqual([])
  })

  it('finds nodes disconnected from ground', () => {
    const c = makeCircuit({
      components: [
        { id: 'c1', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 100, y: 80, rotation: 0 },
        { id: 'g1', type: 'GND', value: 0, nodeA: 0, nodeB: 0, x: 300, y: 80, rotation: 0 },
      ],
      nextNodeId: 3, nextCompId: 3,
    })
    const floating = findFloatingNodes(c)
    expect(floating).toContain(1)
    expect(floating).toContain(2)
  })
})

describe('assertDC', () => {
  it('passes for correct voltage divider', () => {
    const c = circuit().v(5, 1, 0).r(1000, 1, 2).r(2000, 2, 0).gnd().build()
    const failures = assertDC(c, { 0: 0, 1: 5, 2: 5 * (2000 / 3000) })
    expect(failures).toEqual([])
  })

  it('fails for wrong expected voltage', () => {
    const c = circuit().v(5, 1, 0).r(1000, 1, 0).gnd().build()
    const failures = assertDC(c, { 1: 3 })
    expect(failures.length).toBeGreaterThan(0)
    expect(failures[0]).toContain('expected 3')
  })
})

describe('assertTransient', () => {
  it('verifies RC charging at half tau', () => {
    // τ = 1ms, at t=1ms (half tau), Vc ≈ 5*(1-e^-1) ≈ 3.16V
    const c = circuit().v(5, 1, 0).r(1000, 1, 2).c(1e-6, 2, 0).gnd().build()
    const dt = 1e-5
    const steps = 100  // 1ms
    const failures = assertTransient(c, dt, steps, {
      [steps]: { 2: 3.0 },  // Vc close to 3.16V after 1ms
    }, 0.5)
    expect(failures).toEqual([])
  })
})

describe('CircuitBuilder', () => {
  it('builds a voltage divider', () => {
    const c = circuit().v(5, 1, 0).r(1000, 1, 2).r(2000, 2, 0).gnd().build()
    expect(c.components).toHaveLength(4)
    expect(c.components[0].type).toBe('V')
    expect(c.components[1].type).toBe('R')
    expect(c.components[2].type).toBe('R')
    expect(c.components[3].type).toBe('GND')
  })
})
