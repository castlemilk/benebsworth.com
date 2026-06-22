import type { Circuit, CircuitComponent } from './types'
import { solveCircuit, getComponentCurrent, type MNAMatrix } from './solver'
import { makeDCEnv } from './mna'
import { sourceValue } from './sources'
import { SW_ON, SW_OFF, D_IS, D_N, D_VT, D_GMIN } from './devices'

/**
 * DC operating point of a circuit — the steady-state solution used to overlay
 * live node voltages and branch currents on the schematic *without* running a
 * transient. Pure / headless (no React/DOM): shares the exact MNA + Newton-Raphson
 * solve path as the transient engine via solveCircuit(makeDCEnv()).
 *
 * Sign conventions match results.ts / devices.ts:
 *   - component voltage = V[nodeA] − V[nodeB]
 *   - current flows from terminal A → B (positive = A→B)
 *   - power = V·I  (>0 dissipated by passives, <0 delivered by sources)
 */
export interface OperatingPoint {
  /** Node voltages indexed by node id (0 = ground), like solveDC(). */
  nodeVoltages: Float64Array
  /** Component voltage drop V[A]−V[B], keyed by component id. */
  voltages: Map<string, number>
  /** Component current A→B (amps), keyed by component id. */
  currents: Map<string, number>
  /** Component power V·I (watts), keyed by component id. */
  power: Map<string, number>
}

/** Diode current at junction voltage Vd (Shockley + Gmin), matching stampDiode. */
function diodeCurrent(vd: number): number {
  const evd = Math.exp(Math.min(vd / (D_N * D_VT), 80))
  return D_IS * (evd - 1) + D_GMIN * vd
}

/** Component current at the solved DC point, covering the cases solver.ts omits (D/SW/I). */
function opCurrent(
  circuit: Circuit,
  comp: CircuitComponent,
  v: number,
  nodeV: Float64Array,
  mna: MNAMatrix,
  x: Float64Array,
): number {
  switch (comp.type) {
    case 'D':
      return diodeCurrent(v)
    case 'SW':
      return v * (comp.closed ? SW_ON : SW_OFF)
    case 'I':
      return sourceValue(comp, 'dc', 0)
    case 'OP': {
      // Output branch current (into nodeC) lives in the op-amp's branch row.
      const vi = mna.vsIndex.get(comp.id)
      return vi !== undefined ? x[vi] : 0
    }
    default:
      // R → v/value, V/L → branch current x[vsRow], C → 0 (open at DC).
      return getComponentCurrent(circuit, comp, nodeV, mna, x)
  }
}

/**
 * Solve the DC operating point. Returns null for empty / singular circuits
 * (so the caller can simply skip the overlay), never throws.
 */
export function solveOperatingPoint(circuit: Circuit): OperatingPoint | null {
  if (circuit.components.length === 0) return null
  let res: ReturnType<typeof solveCircuit>
  try {
    res = solveCircuit(circuit, makeDCEnv())
  } catch {
    return null
  }
  if (!res) return null
  const { x, mna } = res
  const { n, nodeOrder } = mna

  const maxNode = nodeOrder.length ? nodeOrder[nodeOrder.length - 1] : 0
  const nodeVoltages = new Float64Array(maxNode + 1)
  for (let i = 0; i < n; i++) nodeVoltages[nodeOrder[i]] = x[i]
  nodeVoltages[0] = 0
  // Bail if the solve diverged (NaN/∞) — a degenerate matrix can slip past LU.
  for (const v of nodeVoltages) if (!isFinite(v)) return null

  const mmat: MNAMatrix = { size: mna.size, n: mna.n, m: mna.m, A: mna.A, z: mna.z, vsIndex: mna.vsIndex }
  const voltages = new Map<string, number>()
  const currents = new Map<string, number>()
  const power = new Map<string, number>()
  for (const c of circuit.components) {
    if (c.type === 'GND') continue
    const v = (nodeVoltages[c.nodeA] ?? 0) - (nodeVoltages[c.nodeB] ?? 0)
    const iRaw = opCurrent(circuit, c, v, nodeVoltages, mmat, x)
    // A degenerate value (e.g. a 0Ω resistor → V/0) must not leak Infinity/NaN into
    // the overlay maps — keep the "never returns garbage" contract.
    const i = isFinite(iRaw) ? iRaw : 0
    voltages.set(c.id, v)
    currents.set(c.id, i)
    power.set(c.id, isFinite(v * i) ? v * i : 0)
  }
  return { nodeVoltages, voltages, currents, power }
}
