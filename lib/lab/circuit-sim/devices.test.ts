import { describe, it, expect } from 'vitest'
import type { CircuitComponent } from './types'
import { DC_STAMPS, TRANSIENT_STAMPS, type StampContext, type SolveEnv } from './devices'

/** Capturing fake StampContext for unit-testing individual stamps. */
function fakeCtx(size: number, rowMap: Record<number, number | null>) {
  const A = new Float64Array(size * size)
  const z = new Float64Array(size)
  let nextRow = Object.values(rowMap).filter((v): v is number => v !== null).length
  const ctx: StampContext = {
    size,
    row: (node: number) => (node in rowMap ? rowMap[node] : node === 0 ? null : null),
    vsRow: () => nextRow++,
    addG: (r, c, v) => { A[r * size + c] += v },
    addZ: (r, v) => { z[r] += v },
  }
  return { ctx, A, z }
}

const baseEnv: SolveEnv = {
  mode: 'dc',
  dt: 1e-5,
  time: 0,
  // state filled per-test where needed
  state: { nodeVoltages: new Float64Array(0), vsCurrents: new Float64Array(0), capState: new Map(), indState: new Map(), time: 0, running: false },
}

function comp(partial: Partial<CircuitComponent> & Pick<CircuitComponent, 'type'>): CircuitComponent {
  return { id: 'x', value: 0, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0, ...partial }
}

describe('device stamps — DC', () => {
  it('resistor to ground stamps conductance on its node diagonal', () => {
    const { ctx, A } = fakeCtx(1, { 1: 0, 0: null })
    DC_STAMPS.R(comp({ type: 'R', value: 1000, nodeA: 1, nodeB: 0 }), ctx, baseEnv)
    expect(A[0]).toBeCloseTo(1 / 1000) // A[row1,row1] = G
  })

  it('resistor between two nodes stamps the 2x2 conductance block', () => {
    const { ctx, A } = fakeCtx(2, { 1: 0, 2: 1, 0: null })
    DC_STAMPS.R(comp({ type: 'R', value: 500, nodeA: 1, nodeB: 2 }), ctx, baseEnv)
    const g = 1 / 500
    expect(A[0 * 2 + 0]).toBeCloseTo(g)
    expect(A[1 * 2 + 1]).toBeCloseTo(g)
    expect(A[0 * 2 + 1]).toBeCloseTo(-g)
    expect(A[1 * 2 + 0]).toBeCloseTo(-g)
  })

  it('capacitor is open at DC (no stamp)', () => {
    const { ctx, A, z } = fakeCtx(1, { 1: 0, 0: null })
    DC_STAMPS.C(comp({ type: 'C', value: 1e-6, nodeA: 1, nodeB: 0 }), ctx, baseEnv)
    expect(A[0]).toBe(0)
    expect(z[0]).toBe(0)
  })

  it('voltage source adds a branch row with z = value', () => {
    // size 2: node row 0, branch row 1
    const { ctx, A, z } = fakeCtx(2, { 1: 0, 0: null })
    DC_STAMPS.V(comp({ type: 'V', value: 5, nodeA: 1, nodeB: 0 }), ctx, baseEnv)
    expect(A[0 * 2 + 1]).toBeCloseTo(1) // node row, branch col
    expect(A[1 * 2 + 0]).toBeCloseTo(1) // branch row, node col
    expect(z[1]).toBeCloseTo(5)
  })

  it('inductor at DC is a 0V voltage source (branch row, z = 0)', () => {
    const { ctx, A, z } = fakeCtx(2, { 1: 0, 0: null })
    DC_STAMPS.L(comp({ type: 'L', value: 0.01, nodeA: 1, nodeB: 0 }), ctx, baseEnv)
    expect(A[0 * 2 + 1]).toBeCloseTo(1)
    expect(A[1 * 2 + 0]).toBeCloseTo(1)
    expect(z[1]).toBe(0)
  })
})

describe('device stamps — transient', () => {
  it('capacitor companion stamps conductance 2C/dt and current source', () => {
    const env: SolveEnv = { ...baseEnv, mode: 'transient', dt: 1e-5 }
    env.state.capState.set('x', { vPrev: 2, iPrev: 0 })
    const { ctx, A, z } = fakeCtx(1, { 1: 0, 0: null })
    TRANSIENT_STAMPS.C(comp({ type: 'C', value: 1e-6, nodeA: 1, nodeB: 0 }), ctx, env)
    const gEq = (2 * 1e-6) / 1e-5
    expect(A[0]).toBeCloseTo(gEq)
    expect(z[0]).toBeCloseTo(gEq * 2 + 0) // iEq = gEq*vPrev + iPrev
  })

  it('inductor companion stamps conductance dt/(2L)', () => {
    const env: SolveEnv = { ...baseEnv, mode: 'transient', dt: 1e-5 }
    env.state.indState.set('x', { vPrev: 0, iPrev: 0.001 })
    const { ctx, A, z } = fakeCtx(1, { 1: 0, 0: null })
    TRANSIENT_STAMPS.L(comp({ type: 'L', value: 0.01, nodeA: 1, nodeB: 0 }), ctx, env)
    const gEq = 1e-5 / (2 * 0.01)
    expect(A[0]).toBeCloseTo(gEq)
    expect(z[0]).toBeCloseTo(0.001) // iEq = iPrev + gEq*vPrev = 0.001
  })
})
