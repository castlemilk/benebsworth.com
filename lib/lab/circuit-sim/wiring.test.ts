import { describe, it, expect } from 'vitest'
import { generateWires } from './wiring'
import type { Circuit } from './types'

function makeCircuit(overrides?: Partial<Circuit>): Circuit {
  return {
    components: [],
    wires: [],
    nextNodeId: 1,
    nextCompId: 1,
    ...overrides,
  }
}

describe('generateWires', () => {
  it('generates no wires for single component', () => {
    const c: Circuit = makeCircuit({
      components: [
        { id: 'c1', type: 'R', value: 1000, nodeA: 1, nodeB: 0, x: 100, y: 100, rotation: 0 },
      ],
      nextNodeId: 2,
      nextCompId: 2,
    })
    const wires = generateWires(c)
    expect(wires).toHaveLength(0)
  })

  it('generates wires for shared node between two components', () => {
    const c: Circuit = makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 100, y: 100, rotation: 0 },
        { id: 'c2', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 300, y: 100, rotation: 0 },
      ],
      nextNodeId: 3,
      nextCompId: 3,
    })
    const wires = generateWires(c)
    // Node 1 is shared by c1 (terminal A) and c2 (terminal A) → 1 wire
    expect(wires.length).toBeGreaterThanOrEqual(1)
    expect(wires[0].nodeA).toBe(1)
    expect(wires[0].nodeB).toBe(1)
  })

  it('generates wires for voltage divider (3 components sharing nodes)', () => {
    const c: Circuit = makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 120, y: 100, rotation: 0 },
        { id: 'c2', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 260, y: 100, rotation: 0 },
        { id: 'c3', type: 'R', value: 2000, nodeA: 2, nodeB: 0, x: 400, y: 200, rotation: 0 },
      ],
      nextNodeId: 3,
      nextCompId: 4,
    })
    const wires = generateWires(c)
    // Node 0 (ground): shared by c1(B) + c3(B) → 1 wire
    // Node 1: shared by c1(A) + c2(A) → 1 wire
    // Node 2: shared by c2(B) + c3(A) → 1 wire
    // Total: 3 wires
    expect(wires.length).toBe(3)
  })

  it('handles empty circuit', () => {
    const wires = generateWires(makeCircuit())
    expect(wires).toEqual([])
  })
})
