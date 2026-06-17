import { describe, it, expect } from 'vitest'
import { solveDC, luDecompose, luSolve } from './solver'
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

describe('LU decomposition', () => {
  it('solves a 2x2 system', () => {
    // System: 2x + y = 5, x + 3y = 10  → x=1, y=3
    const n = 2
    const A = new Float64Array([2, 1, 1, 3])
    const b = new Float64Array([5, 10])
    const pivot = new Int32Array(n)
    const x = new Float64Array(n)

    expect(luDecompose(n, A, pivot)).toBe(true)
    luSolve(n, A, pivot, b, x)
    expect(x[0]).toBeCloseTo(1)
    expect(x[1]).toBeCloseTo(3)
  })

  it('detects singular matrix', () => {
    const n = 2
    const A = new Float64Array([1, 2, 2, 4])
    const pivot = new Int32Array(n)
    expect(luDecompose(n, A, pivot)).toBe(false)
  })

  it('solves a 3x3 system', () => {
    // 3x + y - z = 1, x + 2y + z = 8, -x + y + 2z = 7 → x=0, y=3, z=2
    const n = 3
    const A = new Float64Array([3, 1, -1, 1, 2, 1, -1, 1, 2])
    const b = new Float64Array([1, 8, 7])
    const pivot = new Int32Array(n)
    const x = new Float64Array(n)

    expect(luDecompose(n, A, pivot)).toBe(true)
    luSolve(n, A, pivot, b, x)
    expect(x[0]).toBeCloseTo(0)
    expect(x[1]).toBeCloseTo(3)
    expect(x[2]).toBeCloseTo(2)
  })
})

describe('DC solver', () => {
  it('solves a simple voltage divider', () => {
    // V(5V) --- R1(1k) --- N1 --- R2(1k) --- GND
    // Expect N1 = 2.5V
    const c: Circuit = makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 100, y: 80, rotation: 0 },
        { id: 'c2', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 200, y: 80, rotation: 0 },
        { id: 'c3', type: 'R', value: 1000, nodeA: 2, nodeB: 0, x: 300, y: 80, rotation: 0 },
      ],
      nextNodeId: 3,
      nextCompId: 4,
    })

    const v = solveDC(c)
    expect(v).not.toBeNull()
    expect(v![1]).toBeCloseTo(5, 1) // node connected to 5V source
    expect(v![2]).toBeCloseTo(2.5, 1) // voltage divider midpoint
    expect(v![0]).toBe(0) // ground
  })

  it('solves parallel resistors', () => {
    // V(10V)-N1, two 100Ω resistors: N1-R1-GND, N1-R2-GND
    // Req = 50Ω, I = 10/50 = 0.2A, but both resistors see 10V
    const c: Circuit = makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 10, nodeA: 1, nodeB: 0, x: 100, y: 80, rotation: 0 },
        { id: 'c2', type: 'R', value: 100, nodeA: 1, nodeB: 0, x: 200, y: 80, rotation: 0 },
        { id: 'c3', type: 'R', value: 100, nodeA: 1, nodeB: 0, x: 300, y: 80, rotation: 0 },
      ],
      nextNodeId: 2,
      nextCompId: 4,
    })

    const v = solveDC(c)
    expect(v).not.toBeNull()
    expect(v![1]).toBeCloseTo(10, 1)
  })

  it('returns null for empty circuit', () => {
    const v = solveDC(makeCircuit())
    expect(v).toBeNull()
  })

  it('handles floating nodes gracefully', () => {
    // A resistor with both ends not connected to anything — singular matrix
    const c: Circuit = makeCircuit({
      components: [
        { id: 'c1', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 100, y: 80, rotation: 0 },
      ],
      nextNodeId: 3,
      nextCompId: 2,
    })
    const v = solveDC(c)
    // Floating nodes create a singular system; should return null gracefully
    expect(v).toBeNull()
  })
})
