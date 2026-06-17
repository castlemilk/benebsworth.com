import type { Circuit, SimulationState } from './types'
import { DC_STAMPS, TRANSIENT_STAMPS, type StampContext, type SolveEnv } from './devices'

/**
 * Shared Modified Nodal Analysis assembler. Collects non-ground nodes, allocates
 * branch rows (voltage sources always; inductors only at DC), and dispatches the
 * per-device stamp for the requested solve mode. Both solveDC (solver.ts) and
 * transientStep (transient.ts) build their systems through this single routine.
 */

export interface AssembledMNA {
  size: number
  /** Number of non-ground nodes. */
  n: number
  /** Number of branch (voltage-source / inductor-DC) rows. */
  m: number
  A: Float64Array
  z: Float64Array
  /** Sorted non-ground node ids; matrix row i ↔ nodeOrder[i]. */
  nodeOrder: number[]
  /** Node id → matrix row. */
  nodeIndex: Map<number, number>
  /** Component id → branch row. */
  vsIndex: Map<string, number>
}

function emptyState(): SimulationState {
  return {
    nodeVoltages: new Float64Array(0),
    vsCurrents: new Float64Array(0),
    capState: new Map(),
    indState: new Map(),
    time: 0,
    running: false,
  }
}

export function makeDCEnv(): SolveEnv {
  return { mode: 'dc', dt: 0, time: 0, state: emptyState() }
}

export function makeTransientEnv(dt: number, state?: SimulationState, time = 0): SolveEnv {
  return { mode: 'transient', dt, time, state: state ?? emptyState() }
}

export function assembleMNA(circuit: Circuit, env: SolveEnv): AssembledMNA | null {
  // ── Collect non-ground nodes ──────────────────────────────────────
  const nodeSet = new Set<number>()
  for (const c of circuit.components) {
    if (c.nodeA > 0) nodeSet.add(c.nodeA)
    if (c.nodeB > 0) nodeSet.add(c.nodeB)
  }
  const n = nodeSet.size
  if (n === 0) return null

  const nodeOrder = [...nodeSet].sort((a, b) => a - b)
  const nodeIndex = new Map<number, number>()
  nodeOrder.forEach((nid, i) => nodeIndex.set(nid, i))

  // ── Count branch rows ─────────────────────────────────────────────
  // Voltage sources always need a branch row. Inductors need one only at DC
  // (in transient they use the trapezoidal companion model — no extra row).
  let m = 0
  for (const c of circuit.components) {
    if (c.type === 'V') m++
    else if (c.type === 'L' && env.mode === 'dc') m++
  }

  const size = n + m
  const A = new Float64Array(size * size)
  const z = new Float64Array(size)
  const vsIndex = new Map<string, number>()
  let vsCounter = n

  const stamps = env.mode === 'dc' ? DC_STAMPS : TRANSIENT_STAMPS
  const ctx: StampContext = {
    size,
    row: (node) => (node === 0 ? null : (nodeIndex.get(node) ?? null)),
    vsRow: () => vsCounter++,
    addG: (r, c, v) => { A[r * size + c] += v },
    addZ: (r, v) => { z[r] += v },
    branchRows: vsIndex,
  }

  for (const c of circuit.components) {
    const stamp = stamps[c.type]
    if (stamp) stamp(c, ctx, env)
  }

  return { size, n, m, A, z, nodeOrder, nodeIndex, vsIndex }
}
