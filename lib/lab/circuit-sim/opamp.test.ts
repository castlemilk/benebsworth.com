import { describe, it, expect } from 'vitest'
import { solveDC } from './solver'
import type { Circuit } from './types'

function makeCircuit(overrides?: Partial<Circuit>): Circuit {
  return { components: [], wires: [], nextNodeId: 1, nextCompId: 1, ...overrides }
}

describe('ideal op-amp (nullor)', () => {
  it('non-inverting amplifier: gain = 1 + Rf/Rg', () => {
    // Vin → in+ (n3); in− (n1) = Rg to gnd + Rf to out (n2)
    const c = makeCircuit({
      components: [
        { id: 'v', type: 'V', value: 1, nodeA: 3, nodeB: 0, x: 0, y: 0, rotation: 0 },
        { id: 'rg', type: 'R', value: 1000, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 },
        { id: 'rf', type: 'R', value: 2000, nodeA: 2, nodeB: 1, x: 0, y: 0, rotation: 0 },
        { id: 'op', type: 'OP', value: 0, nodeA: 3, nodeB: 1, nodeC: 2, x: 0, y: 0, rotation: 0 },
      ],
      nextNodeId: 4, nextCompId: 5,
    })
    const v = solveDC(c)
    expect(v).not.toBeNull()
    expect(v![1]).toBeCloseTo(1, 4) // virtual short → in− tracks in+
    expect(v![2]).toBeCloseTo(3, 4) // Vout = 1·(1 + 2k/1k) = 3V
  })

  it('inverting amplifier: gain = −Rf/Rin', () => {
    // Vin → Rin → in− (n2); in+ = gnd; Rf from out (n3) to in−
    const c = makeCircuit({
      components: [
        { id: 'v', type: 'V', value: 1, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 },
        { id: 'rin', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 0, y: 0, rotation: 0 },
        { id: 'rf', type: 'R', value: 2000, nodeA: 3, nodeB: 2, x: 0, y: 0, rotation: 0 },
        { id: 'op', type: 'OP', value: 0, nodeA: 0, nodeB: 2, nodeC: 3, x: 0, y: 0, rotation: 0 },
      ],
      nextNodeId: 4, nextCompId: 5,
    })
    const v = solveDC(c)
    expect(v).not.toBeNull()
    expect(v![2]).toBeCloseTo(0, 4)  // virtual ground at in−
    expect(v![3]).toBeCloseTo(-2, 4) // Vout = −(2k/1k)·1 = −2V
  })

  it('voltage follower: Vout = Vin', () => {
    // in+ = Vin (n1); out = in− = n2; load R to gnd
    const c = makeCircuit({
      components: [
        { id: 'v', type: 'V', value: 2, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 },
        { id: 'rl', type: 'R', value: 1000, nodeA: 2, nodeB: 0, x: 0, y: 0, rotation: 0 },
        { id: 'op', type: 'OP', value: 0, nodeA: 1, nodeB: 2, nodeC: 2, x: 0, y: 0, rotation: 0 },
      ],
      nextNodeId: 3, nextCompId: 4,
    })
    const v = solveDC(c)
    expect(v).not.toBeNull()
    expect(v![2]).toBeCloseTo(2, 4)
  })
})
