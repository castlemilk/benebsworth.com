import { describe, it, expect } from 'vitest'
import { transientStep } from './transient'
import type { Circuit, SimulationState } from './types'

function makeCircuit(overrides?: Partial<Circuit>): Circuit {
  return {
    components: [],
    wires: [],
    nextNodeId: 1,
    nextCompId: 1,
    ...overrides,
  }
}

function makeSimState(nodes: number): SimulationState {
  return {
    nodeVoltages: new Float64Array(nodes),
    vsCurrents: new Float64Array(0),
    capState: new Map(),
    indState: new Map(),
    time: 0,
    running: true,
  }
}

describe('transient analysis', () => {
  it('solves RC charging (step response)', () => {
    // V(5V) --- R(1k) --- N1 --- C(1µF) --- GND
    // τ = RC = 1ms. At t=1ms, Vc ≈ 5*(1-e^-1) ≈ 3.16V
    const c: Circuit = makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 100, y: 80, rotation: 0 },
        { id: 'c2', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 200, y: 80, rotation: 0 },
        { id: 'c3', type: 'C', value: 1e-6, nodeA: 2, nodeB: 0, x: 300, y: 80, rotation: 0 },
      ],
      nextNodeId: 3,
      nextCompId: 4,
    })

    const state = makeSimState(3)
    const dt = 1e-5 // 10µs timestep

    // Run 100 steps = 1ms
    let v: Float64Array | null = null
    for (let i = 0; i < 100; i++) {
      v = transientStep(c, state, dt)
      expect(v, `step ${i} should not be singular`).not.toBeNull()
      state.nodeVoltages = v!
      state.time += dt
    }

    expect(v![2]).toBeGreaterThan(2.5) // Should be charging
    expect(v![2]).toBeLessThan(4.5) // Not yet fully charged at 1ms
    expect(v![1]).toBeCloseTo(5, 1) // Source node at 5V
  })

  it('produces stable DC after many timesteps', () => {
    // Same RC circuit — after 10τ, Vc should ≈ 5V
    const c: Circuit = makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 100, y: 80, rotation: 0 },
        { id: 'c2', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 200, y: 80, rotation: 0 },
        { id: 'c3', type: 'C', value: 1e-6, nodeA: 2, nodeB: 0, x: 300, y: 80, rotation: 0 },
      ],
      nextNodeId: 3,
      nextCompId: 4,
    })

    const state = makeSimState(3)
    const dt = 1e-5
    const steps = Math.ceil(0.01 / dt) // 10ms = 10τ

    let v: Float64Array | null = null
    for (let i = 0; i < steps; i++) {
      const result = transientStep(c, state, dt)
      if (!result) break
      state.nodeVoltages = result
      state.time += dt
      v = result
    }

    expect(v).not.toBeNull()
    expect(v![2]).toBeCloseTo(5, 0) // Should be close to 5V after 10τ
  })

  it('tracks a sine voltage source across a resistor', () => {
    // sine V (5V, 1kHz) --- R(1k) --- GND, node 1 follows the source
    const c: Circuit = makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 0, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0,
          waveform: { kind: 'sine', amplitude: 5, offset: 0, freq: 1000, phase: 0, duty: 0.5 } },
        { id: 'c2', type: 'R', value: 1000, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 },
      ],
      nextNodeId: 2, nextCompId: 3,
    })
    const state = makeSimState(2)
    const dt = 2.5e-4 // quarter period of 1kHz
    // step 1 advances time to t=dt; the stamp reads state.time before each step
    state.time = dt // evaluate the source at the quarter-period peak
    const v = transientStep(c, state, dt)
    expect(v).not.toBeNull()
    expect(v![1]).toBeCloseTo(5, 3) // node tracks the source at its peak
  })

  it('handles RL circuit transient', () => {
    // V(5V) --- R(1k) --- N1 --- L(0.1H) --- GND (series RL)
    // τ = L/R = 0.0001s. At t=0.1ms, current ≈ 5/1000*(1-e^-1) ≈ 3.16mA
    const c: Circuit = makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 100, y: 80, rotation: 0 },
        { id: 'c2', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 200, y: 80, rotation: 0 },
        { id: 'c3', type: 'L', value: 0.1, nodeA: 2, nodeB: 0, x: 300, y: 80, rotation: 0 },
      ],
      nextNodeId: 3,
      nextCompId: 4,
    })

    const state = makeSimState(3)
    const dt = 1e-6

    let v: Float64Array | null = null
    for (let i = 0; i < 100; i++) {
      v = transientStep(c, state, dt)
      expect(v, `step ${i}`).not.toBeNull()
      state.nodeVoltages = v!
      state.time += dt
    }

    // After 100µs < τ=100µs: inductor voltage should still be nonzero
    expect(v![1]).toBeCloseTo(5, 1) // source node
    expect(v![2]).toBeGreaterThan(0) // inductor terminal voltage transitioning
  })
})
