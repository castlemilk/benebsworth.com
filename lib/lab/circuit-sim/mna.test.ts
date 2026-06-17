import { describe, it, expect } from 'vitest'
import { assembleMNA, makeDCEnv, makeTransientEnv } from './mna'
import { luDecompose, luSolve } from './solver'
import type { Circuit } from './types'

function makeCircuit(overrides?: Partial<Circuit>): Circuit {
  return { components: [], wires: [], nextNodeId: 1, nextCompId: 1, ...overrides }
}

describe('assembleMNA', () => {
  it('assembles a DC voltage divider (5V, 1k/2k → 3.333V)', () => {
    const c = makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 },
        { id: 'c2', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 0, y: 0, rotation: 0 },
        { id: 'c3', type: 'R', value: 2000, nodeA: 2, nodeB: 0, x: 0, y: 0, rotation: 0 },
      ],
      nextNodeId: 3, nextCompId: 4,
    })
    const mna = assembleMNA(c, makeDCEnv())
    expect(mna).not.toBeNull()
    const { size, A, z, nodeOrder, vsIndex } = mna!
    const pivot = new Int32Array(size), x = new Float64Array(size)
    expect(luDecompose(size, A, pivot)).toBe(true)
    luSolve(size, A, pivot, z, x)
    expect(x[nodeOrder.indexOf(2)]).toBeCloseTo(3.333, 2)
    expect(x[nodeOrder.indexOf(1)]).toBeCloseTo(5, 3)
    expect(vsIndex.get('c1')).toBe(2) // branch row after 2 nodes
  })

  it('returns null for an empty circuit', () => {
    expect(assembleMNA(makeCircuit(), makeDCEnv())).toBeNull()
  })

  it('counts inductor as a branch row at DC but not in transient', () => {
    const c = makeCircuit({
      components: [
        { id: 'v', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 },
        { id: 'r', type: 'R', value: 100, nodeA: 1, nodeB: 2, x: 0, y: 0, rotation: 0 },
        { id: 'l', type: 'L', value: 0.01, nodeA: 2, nodeB: 0, x: 0, y: 0, rotation: 0 },
      ],
      nextNodeId: 3, nextCompId: 4,
    })
    expect(assembleMNA(c, makeDCEnv())!.m).toBe(2) // V + L
    expect(assembleMNA(c, makeTransientEnv(1e-5))!.m).toBe(1) // V only
  })
})
