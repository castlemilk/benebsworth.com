import type { Circuit, SimulationState } from './types'
import { solveCircuit } from './solver'
import { makeTransientEnv } from './mna'

/**
 * Build and solve one transient timestep using trapezoidal integration.
 * Updates companion state in-place.
 * Returns node voltages or null if singular.
 */
export function transientStep(
  circuit: Circuit,
  state: SimulationState,
  dt: number,
): Float64Array | null {
  const res = solveCircuit(circuit, makeTransientEnv(dt, state, state.time))
  if (!res) return null

  const { x, mna } = res
  const { n, m, nodeOrder, vsIndex } = mna

  // Extract node voltages (row i ↔ nodeOrder[i])
  const maxNode = nodeOrder.length ? nodeOrder[nodeOrder.length - 1] : 0
  const voltages = new Float64Array(maxNode + 1)
  voltages[0] = 0
  for (let i = 0; i < n; i++) {
    voltages[nodeOrder[i]] = x[i]
  }

  // Update companion state for next timestep
  for (const c of circuit.components) {
    if (c.type === 'C') {
      const cs = state.capState.get(c.id)
      if (!cs) continue
      const vNow = voltages[c.nodeA] - voltages[c.nodeB]
      const gEq = 2 * c.value / dt
      const iNow = gEq * vNow - (gEq * cs.vPrev + cs.iPrev)
      cs.vPrev = vNow
      cs.iPrev = iNow
    } else if (c.type === 'L') {
      const cs = state.indState.get(c.id)
      if (!cs) continue
      const vNow = voltages[c.nodeA] - voltages[c.nodeB]
      const gEq = dt / (2 * c.value)
      const iNow = gEq * vNow + (cs.iPrev + gEq * cs.vPrev)
      cs.vPrev = vNow
      cs.iPrev = iNow
    }
  }

  // Store voltage source currents in state
  state.vsCurrents = new Float64Array(m)
  for (const [, row] of vsIndex) {
    state.vsCurrents[row - n] = x[row]
  }

  return voltages
}
