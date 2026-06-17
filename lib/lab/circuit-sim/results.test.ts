import { describe, it, expect } from 'vitest'
import { nodeVoltage, componentVoltage, componentCurrent } from './results'
import { transientStep } from './transient'
import type { Circuit, CircuitComponent, SimulationState } from './types'

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

describe('results', () => {
  describe('nodeVoltage', () => {
    it('returns the voltage at a node index', () => {
      const sim = makeSimState(3)
      sim.nodeVoltages[0] = 0
      sim.nodeVoltages[1] = 5
      sim.nodeVoltages[2] = 2.5
      expect(nodeVoltage(sim, 0)).toBe(0)
      expect(nodeVoltage(sim, 1)).toBe(5)
      expect(nodeVoltage(sim, 2)).toBe(2.5)
    })

    it('guards out-of-range indices with 0', () => {
      const sim = makeSimState(2)
      sim.nodeVoltages[1] = 3
      expect(nodeVoltage(sim, 5)).toBe(0)
      expect(nodeVoltage(sim, -1)).toBe(0)
    })
  })

  describe('componentVoltage', () => {
    it('returns V[nodeA] - V[nodeB]', () => {
      const sim = makeSimState(3)
      sim.nodeVoltages[0] = 0
      sim.nodeVoltages[1] = 5
      sim.nodeVoltages[2] = 1.5
      const comp: CircuitComponent = { id: 'r1', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 0, y: 0, rotation: 0 }
      expect(componentVoltage(sim, comp)).toBeCloseTo(3.5, 12)
    })

    it('guards out-of-range nodes with 0', () => {
      const sim = makeSimState(2)
      sim.nodeVoltages[1] = 4
      const comp: CircuitComponent = { id: 'r1', type: 'R', value: 1000, nodeA: 1, nodeB: 9, x: 0, y: 0, rotation: 0 }
      // nodeB out of range → treated as 0
      expect(componentVoltage(sim, comp)).toBe(4)
    })
  })

  describe('componentCurrent', () => {
    it('computes RC probe values after a transient run', () => {
      // V(5V) n1-0 --- R(1k) n1-n2 --- C(1µF) n2-0
      const circuit: Circuit = makeCircuit({
        components: [
          { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 100, y: 80, rotation: 0 },
          { id: 'c2', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 200, y: 80, rotation: 0 },
          { id: 'c3', type: 'C', value: 1e-6, nodeA: 2, nodeB: 0, x: 300, y: 80, rotation: 0 },
        ],
        nextNodeId: 3,
        nextCompId: 4,
      })
      const sim = makeSimState(3)
      const dt = 1e-5

      for (let i = 0; i < 50; i++) {
        const v = transientStep(circuit, sim, dt)
        expect(v, `step ${i}`).not.toBeNull()
        sim.nodeVoltages = v!
        sim.time += dt
      }

      const r = circuit.components[1]
      const c = circuit.components[2]
      const v = circuit.components[0]

      // R current = (V[1] - V[2]) / 1000
      expect(componentCurrent(circuit, r, sim)).toBeCloseTo(
        (sim.nodeVoltages[1] - sim.nodeVoltages[2]) / 1000,
        12,
      )

      // C voltage = V[2] - V[0]
      expect(componentVoltage(sim, c)).toBeCloseTo(sim.nodeVoltages[2] - sim.nodeVoltages[0], 12)

      // C current pulled from companion state
      expect(componentCurrent(circuit, c, sim)).toBeCloseTo(sim.capState.get('c3')!.iPrev, 12)

      // In a series RC, the cap current and resistor current must match closely
      expect(componentCurrent(circuit, c, sim)).toBeCloseTo(componentCurrent(circuit, r, sim), 6)

      // V-source current validated against physics (not tautology): in this
      // series RC the loop current is the resistor current (positive, n1→n2 while
      // charging). The source delivers it, so its A→B branch current is the
      // negative of the resistor current. Catches sign-flip / wrong-index bugs.
      const iR = componentCurrent(circuit, r, sim)
      expect(iR).toBeGreaterThan(0)
      expect(componentCurrent(circuit, v, sim)).toBeCloseTo(-iR, 9)
    })

    it('returns the present source current for a current source', () => {
      const i: CircuitComponent = { id: 'i1', type: 'I', value: 0.002, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 }
      const circuit: Circuit = makeCircuit({ components: [i], nextNodeId: 2, nextCompId: 2 })
      const sim = makeSimState(2)
      sim.time = 0
      expect(componentCurrent(circuit, i, sim)).toBeCloseTo(0.002, 12)
    })

    it('returns inductor companion current', () => {
      const l: CircuitComponent = { id: 'l1', type: 'L', value: 0.1, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 }
      const circuit: Circuit = makeCircuit({ components: [l], nextNodeId: 2, nextCompId: 2 })
      const sim = makeSimState(2)
      sim.indState.set('l1', { vPrev: 1, iPrev: 0.05 })
      expect(componentCurrent(circuit, l, sim)).toBe(0.05)
    })

    it('returns 0 for GND and missing companion/branch state', () => {
      const gnd: CircuitComponent = { id: 'g1', type: 'GND', value: 0, nodeA: 0, nodeB: 0, x: 0, y: 0, rotation: 0 }
      const cap: CircuitComponent = { id: 'cx', type: 'C', value: 1e-6, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 }
      const ind: CircuitComponent = { id: 'lx', type: 'L', value: 1e-3, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 }
      const vsrc: CircuitComponent = { id: 'vx', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 }
      const circuit: Circuit = makeCircuit({ components: [gnd, cap, ind, vsrc] })
      const sim = makeSimState(2)
      expect(componentCurrent(circuit, gnd, sim)).toBe(0)
      expect(componentCurrent(circuit, cap, sim)).toBe(0) // no capState entry
      expect(componentCurrent(circuit, ind, sim)).toBe(0) // no indState entry
      expect(componentCurrent(circuit, vsrc, sim)).toBe(0) // vsCurrents empty → out of range
    })

    it('indexes V sources by order among V-type components', () => {
      const v0: CircuitComponent = { id: 'v0', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 }
      const r: CircuitComponent = { id: 'r0', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 0, y: 0, rotation: 0 }
      const v1: CircuitComponent = { id: 'v1', type: 'V', value: 3, nodeA: 2, nodeB: 0, x: 0, y: 0, rotation: 0 }
      const circuit: Circuit = makeCircuit({ components: [v0, r, v1], nextNodeId: 3, nextCompId: 4 })
      const sim = makeSimState(3)
      sim.vsCurrents = new Float64Array([0.11, 0.22])
      // v0 is the 0th V source, v1 is the 1st V source (R does not count)
      expect(componentCurrent(circuit, v0, sim)).toBe(0.11)
      expect(componentCurrent(circuit, v1, sim)).toBe(0.22)
    })
  })
})
