import { describe, it, expect } from 'vitest'
import { solveDC } from './solver'
import { transientStep } from './transient'
import type { Circuit, SimulationState } from './types'

function makeCircuit(overrides?: Partial<Circuit>): Circuit {
  return { components: [], wires: [], nextNodeId: 1, nextCompId: 1, ...overrides }
}
function simState(n: number): SimulationState {
  return { nodeVoltages: new Float64Array(n), vsCurrents: new Float64Array(0), capState: new Map(), indState: new Map(), time: 0, running: true }
}

describe('diode (Newton-Raphson)', () => {
  it('conducts forward with a ~0.6V drop', () => {
    // V(1V) — D(anode n1 → cathode n2) — R(1k) — gnd
    const c = makeCircuit({
      components: [
        { id: 'v', type: 'V', value: 1, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 },
        { id: 'd', type: 'D', value: 0, nodeA: 1, nodeB: 2, x: 0, y: 0, rotation: 0 },
        { id: 'r', type: 'R', value: 1000, nodeA: 2, nodeB: 0, x: 0, y: 0, rotation: 0 },
      ],
      nextNodeId: 3, nextCompId: 4,
    })
    const v = solveDC(c)
    expect(v).not.toBeNull()
    // forward conducting: output is source minus a forward drop (~0.5–0.7V)
    expect(v![2]).toBeGreaterThan(0.25)
    expect(v![2]).toBeLessThan(0.55)
    const vdrop = v![1] - v![2]
    expect(vdrop).toBeGreaterThan(0.45)
    expect(vdrop).toBeLessThan(0.75)
  })

  it('blocks when reverse-biased', () => {
    // V(1V) — D(anode n2 → cathode n1) reverse — R(1k) — gnd
    const c = makeCircuit({
      components: [
        { id: 'v', type: 'V', value: 1, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 },
        { id: 'd', type: 'D', value: 0, nodeA: 2, nodeB: 1, x: 0, y: 0, rotation: 0 },
        { id: 'r', type: 'R', value: 1000, nodeA: 2, nodeB: 0, x: 0, y: 0, rotation: 0 },
      ],
      nextNodeId: 3, nextCompId: 4,
    })
    const v = solveDC(c)
    expect(v).not.toBeNull()
    expect(Math.abs(v![2])).toBeLessThan(0.01) // essentially no conduction
  })

  it('half-wave rectifies a sine in transient (clips the negative half)', () => {
    // sine V(5V,1kHz) — D — R(1k) — gnd ; output node 2 stays >= ~-0.1V
    const c = makeCircuit({
      components: [
        { id: 'v', type: 'V', value: 0, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0, waveform: { kind: 'sine', amplitude: 5, offset: 0, freq: 1000, phase: 0, duty: 0.5 } },
        { id: 'd', type: 'D', value: 0, nodeA: 1, nodeB: 2, x: 0, y: 0, rotation: 0 },
        { id: 'r', type: 'R', value: 1000, nodeA: 2, nodeB: 0, x: 0, y: 0, rotation: 0 },
      ],
      nextNodeId: 3, nextCompId: 4,
    })
    const s = simState(3)
    const dt = 1e-5
    let min = Infinity, max = -Infinity
    for (let i = 0; i < 200; i++) { // 2ms = 2 periods
      const v = transientStep(c, s, dt)
      expect(v, `step ${i}`).not.toBeNull()
      s.nodeVoltages = v!; s.time += dt
      min = Math.min(min, v![2]); max = Math.max(max, v![2])
    }
    expect(max).toBeGreaterThan(3.5) // positive half passes (minus drop)
    expect(min).toBeGreaterThan(-0.2) // negative half blocked
  })
})

describe('switch', () => {
  it('closed conducts (~full voltage), open blocks', () => {
    const build = (closed: boolean): Circuit => makeCircuit({
      components: [
        { id: 'v', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 },
        { id: 'sw', type: 'SW', value: 0, nodeA: 1, nodeB: 2, x: 0, y: 0, rotation: 0, closed },
        { id: 'r', type: 'R', value: 1000, nodeA: 2, nodeB: 0, x: 0, y: 0, rotation: 0 },
      ],
      nextNodeId: 3, nextCompId: 4,
    })
    expect(solveDC(build(true))![2]).toBeGreaterThan(4.99)
    expect(solveDC(build(false))![2]).toBeLessThan(0.01)
  })
})
