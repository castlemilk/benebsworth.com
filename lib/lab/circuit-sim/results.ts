import type { Circuit, CircuitComponent, SimulationState } from './types'
import { sourceValue } from './sources'

/**
 * Probe readouts derived from a solved Circuit + SimulationState.
 *
 * Pure / headless: no React, DOM, canvas, or browser APIs. Every array and Map
 * access is range-guarded so partial/empty sim state never throws — out-of-range
 * reads return 0, matching the rest of the engine's "ground / unknown = 0V/0A".
 *
 * Sign conventions match transient.ts / devices.ts:
 *   - voltage across a component = V[nodeA] − V[nodeB]
 *   - current flows from terminal A to terminal B (positive = A→B)
 */

/** Voltage at a node index. Out-of-range (including ground beyond the array) → 0. */
export function nodeVoltage(sim: SimulationState, nodeId: number): number {
  if (nodeId < 0 || nodeId >= sim.nodeVoltages.length) return 0
  return sim.nodeVoltages[nodeId]
}

/** Voltage across a component: V[nodeA] − V[nodeB]. Out-of-range terminals read 0. */
export function componentVoltage(sim: SimulationState, comp: CircuitComponent): number {
  return nodeVoltage(sim, comp.nodeA) - nodeVoltage(sim, comp.nodeB)
}

/**
 * Current through a component, flowing from terminal A to terminal B (amps).
 *
 *   R   → (V[nodeA] − V[nodeB]) / value
 *   C   → companion iPrev (the last solved capacitor current), 0 if not tracked
 *   L   → companion iPrev (the last solved inductor current), 0 if not tracked
 *   V   → vsCurrents[k], k = index among V-type components in circuit order
 *   I   → present source current sourceValue(comp, 'transient', sim.time)
 *   GND / unknown → 0
 */
export function componentCurrent(
  circuit: Circuit,
  comp: CircuitComponent,
  sim: SimulationState,
): number {
  switch (comp.type) {
    case 'R': {
      // value <= 0 is treated as an open circuit (matches devices.ts stampResistor).
      if (comp.value <= 0) return 0
      return componentVoltage(sim, comp) / comp.value
    }
    case 'C':
      return sim.capState.get(comp.id)?.iPrev ?? 0
    case 'L':
      return sim.indState.get(comp.id)?.iPrev ?? 0
    case 'V': {
      // Index of this V source among V-type components in circuit.components order.
      // Mirrors how transient.ts fills vsCurrents (vsRow allocated per V source in order).
      let k = -1
      for (const c of circuit.components) {
        if (c.type === 'V') {
          k++
          if (c.id === comp.id) break
        }
      }
      if (k < 0 || k >= sim.vsCurrents.length) return 0
      return sim.vsCurrents[k]
    }
    case 'I':
      return sourceValue(comp, 'transient', sim.time)
    default:
      return 0
  }
}
