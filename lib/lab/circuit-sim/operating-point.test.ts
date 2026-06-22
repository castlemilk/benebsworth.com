import { describe, it, expect } from 'vitest'
import { solveOperatingPoint } from './operating-point'
import type { Circuit } from './types'

function makeCircuit(overrides?: Partial<Circuit>): Circuit {
  return { components: [], wires: [], nextNodeId: 1, nextCompId: 1, ...overrides }
}

describe('solveOperatingPoint', () => {
  it('returns null for an empty circuit', () => {
    expect(solveOperatingPoint(makeCircuit())).toBeNull()
  })

  it('returns null for a singular (floating) circuit', () => {
    const c = makeCircuit({
      components: [{ id: 'c1', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 0, y: 0, rotation: 0 }],
      nextNodeId: 3, nextCompId: 2,
    })
    expect(solveOperatingPoint(c)).toBeNull()
  })

  it('solves a voltage divider: node voltages, branch currents, and power', () => {
    // V(6V) - R1(1k) - N2 - R2(2k) - GND  → N2 = 4V, I = 6/3k = 2mA
    const c = makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 6, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 },
        { id: 'c2', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 0, y: 0, rotation: 0 },
        { id: 'c3', type: 'R', value: 2000, nodeA: 2, nodeB: 0, x: 0, y: 0, rotation: 0 },
        { id: 'g', type: 'GND', value: 0, nodeA: 0, nodeB: 0, x: 0, y: 0, rotation: 0 },
      ],
      nextNodeId: 3, nextCompId: 5,
    })
    const op = solveOperatingPoint(c)
    expect(op).not.toBeNull()
    expect(op!.nodeVoltages[1]).toBeCloseTo(6, 3)
    expect(op!.nodeVoltages[2]).toBeCloseTo(4, 3)

    // R1 current A→B = (6−4)/1k = 2mA; R2 = (4−0)/2k = 2mA.
    expect(op!.currents.get('c2')!).toBeCloseTo(2e-3, 6)
    expect(op!.currents.get('c3')!).toBeCloseTo(2e-3, 6)

    // Voltage source delivers power (negative V·I with A→B convention through the branch).
    const pV = op!.power.get('c1')!
    expect(pV).toBeLessThan(0)
    // R1 dissipates I²R = (2mA)²·1k = 4mW.
    expect(op!.power.get('c2')!).toBeCloseTo(4e-6 * 1000, 6)
    expect(op!.voltages.get('c2')!).toBeCloseTo(2, 3)
  })

  it('forward-biased diode conducts; node sits near a diode drop below the supply', () => {
    // V(5V) - R(1k) - N2 - D(anode N2 → cathode GND)
    const c = makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 },
        { id: 'c2', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 0, y: 0, rotation: 0 },
        { id: 'd1', type: 'D', value: 0, nodeA: 2, nodeB: 0, x: 0, y: 0, rotation: 0 },
        { id: 'g', type: 'GND', value: 0, nodeA: 0, nodeB: 0, x: 0, y: 0, rotation: 0 },
      ],
      nextNodeId: 3, nextCompId: 5,
    })
    const op = solveOperatingPoint(c)
    expect(op).not.toBeNull()
    // A silicon diode clamps the node to roughly 0.6–0.8V.
    expect(op!.nodeVoltages[2]).toBeGreaterThan(0.4)
    expect(op!.nodeVoltages[2]).toBeLessThan(0.9)
    // Diode current ≈ resistor current (series), order ~mA, and positive (A→B).
    const iD = op!.currents.get('d1')!
    expect(iD).toBeGreaterThan(1e-4)
    expect(iD).toBeCloseTo(op!.currents.get('c2')!, 4)
  })

  it('switch state gates conduction', () => {
    const build = (closed: boolean): Circuit => makeCircuit({
      components: [
        { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 },
        { id: 'sw', type: 'SW', value: 0, closed, nodeA: 1, nodeB: 2, x: 0, y: 0, rotation: 0 },
        { id: 'r', type: 'R', value: 1000, nodeA: 2, nodeB: 0, x: 0, y: 0, rotation: 0 },
        { id: 'g', type: 'GND', value: 0, nodeA: 0, nodeB: 0, x: 0, y: 0, rotation: 0 },
      ],
      nextNodeId: 3, nextCompId: 5,
    })
    const closed = solveOperatingPoint(build(true))!
    const open = solveOperatingPoint(build(false))!
    // Closed: N2 ≈ 5V (switch ~1mΩ). Open: N2 ≈ 0V (switch ~1GΩ).
    expect(closed.nodeVoltages[2]).toBeGreaterThan(4.9)
    expect(open.nodeVoltages[2]).toBeLessThan(0.1)
  })
})
