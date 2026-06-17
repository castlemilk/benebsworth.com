import type { Circuit, CircuitComponent, SimulationState } from './types'
import { solveDC } from './solver'
import { transientStep } from './transient'

// ── Structured diagnostics ────────────────────────────────────────

export interface CircuitDiagnostic {
  severity: 'error' | 'warning' | 'info'
  code: string
  message: string
  nodes: number[]
  components: string[]
}

/** Run all validation checks. Returns diagnostics sorted by severity. */
export function validateCircuit(circuit: Circuit): CircuitDiagnostic[] {
  const diags: CircuitDiagnostic[] = []
  if (circuit.components.length === 0) {
    diags.push({ severity: 'info', code: 'EMPTY', message: 'Circuit is empty — add components to begin', nodes: [], components: [] })
    return diags
  }

  // ── Ground check ───────────────────────────────────────────────
  const hasGround = circuit.components.some(c => c.type === 'GND')
  const vsComponents = circuit.components.filter(c => c.type === 'V')

  if (!hasGround) {
    diags.push({
      severity: 'error', code: 'NO_GROUND',
      message: 'No ground connection — every circuit needs a reference node (GND)',
      nodes: [], components: [],
    })
  }

  // ── Zero or negative values ─────────────────────────────────────
  for (const c of circuit.components) {
    if (c.type !== 'GND' && c.value <= 0) {
      diags.push({
        severity: 'error', code: 'INVALID_VALUE',
        message: `${c.type} "${c.id}" has invalid value (${c.value}). Must be > 0.`,
        nodes: [c.nodeA, c.nodeB], components: [c.id],
      })
    }
    if (c.type === 'V' && c.value === 0) {
      diags.push({
        severity: 'warning', code: 'ZERO_VOLTAGE',
        message: `Voltage source "${c.id}" is set to 0V — effectively a wire`,
        nodes: [c.nodeA, c.nodeB], components: [c.id],
      })
    }
  }

  // ── DC path to ground for every non-ground node ─────────────────
  if (hasGround) {
    const floating = findFloatingNodes(circuit)
    for (const nodeId of floating) {
      diags.push({
        severity: 'error', code: 'FLOATING_NODE',
        message: `Node ${nodeId} has no DC path to ground — it's electrically floating`,
        nodes: [nodeId],
        components: circuit.components.filter(c => c.nodeA === nodeId || c.nodeB === nodeId).map(c => c.id),
      })
    }

    // ── Closed loop: every V source must have a current path ──────
    for (const vs of vsComponents) {
      if (!hasCircuitPath(circuit, vs.nodeA, vs.nodeB, vs.id)) {
        diags.push({
          severity: 'error', code: 'OPEN_LOOP',
          message: `Voltage source "${vs.id}" has no closed current path — nodes ${vs.nodeA} and ${vs.nodeB} are not connected through the circuit`,
          nodes: [vs.nodeA, vs.nodeB], components: [vs.id],
        })
      }
    }
  }

  // ── Dead-end nodes (single connection, current can't flow) ──────
  if (hasGround) {
    const nodeConnections = new Map<number, number>()
    for (const c of circuit.components) {
      nodeConnections.set(c.nodeA, (nodeConnections.get(c.nodeA) ?? 0) + 1)
      nodeConnections.set(c.nodeB, (nodeConnections.get(c.nodeB) ?? 0) + 1)
    }
    for (const [nodeId, count] of nodeConnections) {
      if (nodeId === 0) continue
      if (count === 1) {
        diags.push({
          severity: 'info', code: 'DEAD_END',
          message: `Node ${nodeId} is a dead end — only one component connects here (useful as a probe point)`,
          nodes: [nodeId],
          components: circuit.components.filter(c => c.nodeA === nodeId || c.nodeB === nodeId).map(c => c.id),
        })
      }
    }
  }

  // ── Parallel voltage sources ────────────────────────────────────
  for (let i = 0; i < vsComponents.length; i++) {
    for (let j = i + 1; j < vsComponents.length; j++) {
      const a = vsComponents[i], b = vsComponents[j]
      const sameNodes = (a.nodeA === b.nodeA && a.nodeB === b.nodeB) ||
        (a.nodeA === b.nodeB && a.nodeB === b.nodeA)
      if (sameNodes) {
        diags.push({
          severity: 'warning', code: 'PARALLEL_VS',
          message: `Voltage sources "${a.id}" and "${b.id}" are in parallel — this creates a short if voltages differ`,
          nodes: [a.nodeA, a.nodeB], components: [a.id, b.id],
        })
      }
    }
  }

  // ── Try DC solve, report if singular ────────────────────────────
  if (diags.filter(d => d.severity === 'error').length === 0) {
    const dc = solveDC(circuit)
    if (!dc) {
      diags.push({
        severity: 'error', code: 'SINGULAR',
        message: 'Circuit matrix is singular — check for floating nodes or shorted voltage sources',
        nodes: [], components: [],
      })
    }
  }

  // ── Runability summary ──────────────────────────────────────────
  const hasErrors = diags.some(d => d.severity === 'error')
  if (!hasErrors) {
    const nodeCount = collectNodes(circuit).size
    diags.push({
      severity: 'info', code: 'READY',
      message: `Circuit ready — ${circuit.components.length} components, ${nodeCount} nodes`,
      nodes: [], components: [],
    })
  }

  return diags.sort((a, b) => {
    const order = { error: 0, warning: 1, info: 2 }
    return order[a.severity] - order[b.severity]
  })
}

// ── Helpers ───────────────────────────────────────────────────────

function collectNodes(circuit: Circuit): Set<number> {
  const nodes = new Set<number>()
  for (const c of circuit.components) {
    nodes.add(c.nodeA)
    nodes.add(c.nodeB)
  }
  return nodes
}

export function findFloatingNodes(circuit: Circuit): number[] {
  // Use FULL adjacency (including capacitors) for basic connectivity.
  // A node with only a capacitor to ground is NOT floating — it has an AC path.
  const adj = buildAdjacency(circuit, { includeCaps: true })

  const visited = new Set<number>([0])
  const queue = [0]
  while (queue.length > 0) {
    const node = queue.shift()!
    for (const neighbor of adj.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push(neighbor)
      }
    }
  }

  const allNodes = new Set<number>()
  for (const c of circuit.components) {
    if (c.nodeA > 0) allNodes.add(c.nodeA)
    if (c.nodeB > 0) allNodes.add(c.nodeB)
  }
  return [...allNodes].filter(n => !visited.has(n))
}

/** Check if there's any conductive path between two nodes (including capacitors),
 *  EXCLUDING the component being checked (its internal path doesn't count). */
function hasCircuitPath(circuit: Circuit, from: number, to: number, excludeCompId?: string): boolean {
  if (from === to) return true
  // Closed-loop check: include ALL components (even capacitors) because
  // a capacitor still provides a current path for transient analysis.
  const adj = buildAdjacency(circuit, { excludeCompId, includeCaps: true })
  const visited = new Set<number>([from])
  const queue = [from]
  while (queue.length > 0) {
    const node = queue.shift()!
    if (node === to) return true
    for (const neighbor of adj.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push(neighbor)
      }
    }
  }
  return false
}

interface AdjacencyOptions {
  excludeCompId?: string
  includeCaps?: boolean
}

/** Build bidirectional adjacency. When includeCaps is false, capacitors are skipped. */
function buildAdjacency(circuit: Circuit, opts: AdjacencyOptions = {}): Map<number, Set<number>> {
  const nodes = new Set<number>()
  for (const c of circuit.components) {
    nodes.add(c.nodeA)
    nodes.add(c.nodeB)
  }
  const adj = new Map<number, Set<number>>()
  for (const n of nodes) adj.set(n, new Set())

  for (const c of circuit.components) {
    if (c.id === opts.excludeCompId) continue
    if (!opts.includeCaps && c.type === 'C') continue
    adj.get(c.nodeA)?.add(c.nodeB)
    adj.get(c.nodeB)?.add(c.nodeA)
  }
  return adj
}

// ── Programmatic test framework ───────────────────────────────────

export interface DCAssertion {
  nodeVoltages: Record<number, number>
  tolerance?: number
}

export interface TransientAssertion {
  dt: number
  steps: number
  checkAt: number[]  // step indices to check
  expected: Record<number, Record<number, number>>  // stepIdx -> { nodeId: voltage }
  tolerance?: number
}

/**
 * Assert DC operating point matches expected node voltages.
 * Returns array of failures (empty = pass).
 */
export function assertDC(
  circuit: Circuit,
  expected: Record<number, number>,
  tolerance = 0.01,
): string[] {
  const failures: string[] = []
  const dc = solveDC(circuit)
  if (!dc) {
    failures.push('DC solve returned null (singular matrix)')
    return failures
  }

  for (const [nodeStr, expectedV] of Object.entries(expected)) {
    const nodeId = parseInt(nodeStr, 10)
    const actual = dc[nodeId]
    if (actual === undefined || !isFinite(actual)) {
      failures.push(`Node ${nodeId}: no valid voltage (got ${actual})`)
    } else if (Math.abs(actual - expectedV) > tolerance) {
      failures.push(`Node ${nodeId}: expected ${expectedV}V, got ${actual.toFixed(4)}V (diff ${Math.abs(actual - expectedV).toFixed(4)})`)
    }
  }
  return failures
}

/**
 * Run transient simulation and check voltages at specified step indices.
 * Returns array of failures (empty = pass).
 */
export function assertTransient(
  circuit: Circuit,
  dt: number,
  steps: number,
  expected: Record<number, Record<number, number>>,
  tolerance = 0.05,
): string[] {
  const failures: string[] = []
  const state: SimulationState = {
    nodeVoltages: new Float64Array(circuit.nextNodeId),
    vsCurrents: new Float64Array(0),
    capState: new Map(),
    indState: new Map(),
    time: 0,
    running: true,
  }

  const checkSteps = new Set(Object.keys(expected).map(Number))

  for (let i = 0; i <= steps; i++) {
    if (checkSteps.has(i)) {
      const expectedVoltages = expected[i]
      for (const [nodeStr, expectedV] of Object.entries(expectedVoltages)) {
        const nodeId = parseInt(nodeStr, 10)
        const actual = state.nodeVoltages[nodeId]
        if (actual === undefined || !isFinite(actual)) {
          failures.push(`Step ${i}, node ${nodeId}: no valid voltage (got ${actual})`)
        } else if (Math.abs(actual - expectedV) > tolerance) {
          failures.push(`Step ${i}, node ${nodeId}: expected ${expectedV.toFixed(4)}V, got ${actual.toFixed(4)}V`)
        }
      }
    }

    if (i < steps) {
      const v = transientStep(circuit, state, dt)
      if (!v) {
        failures.push(`Step ${i}: transient solve returned null`)
        break
      }
      state.nodeVoltages = v
      state.time += dt
    }
  }

  return failures
}

// ── Fluent circuit builder ────────────────────────────────────────

export class CircuitBuilder {
  private circuit: Circuit = { components: [], wires: [], nextNodeId: 1, nextCompId: 1 }

  v(value: number, nodeA: number, nodeB: number, x = 80, y = 100): this {
    return this.add('V', value, nodeA, nodeB, x, y)
  }
  r(value: number, nodeA: number, nodeB: number, x = 200, y = 100): this {
    return this.add('R', value, nodeA, nodeB, x, y)
  }
  l(value: number, nodeA: number, nodeB: number, x = 200, y = 100): this {
    return this.add('L', value, nodeA, nodeB, x, y)
  }
  c(value: number, nodeA: number, nodeB: number, x = 200, y = 200): this {
    return this.add('C', value, nodeA, nodeB, x, y)
  }
  gnd(x = 80, y = 260): this {
    return this.add('GND', 0, 0, 0, x, y)
  }

  private add(type: CircuitComponent['type'], value: number, nodeA: number, nodeB: number, x: number, y: number): this {
    this.circuit.components.push({
      id: `c${this.circuit.nextCompId++}`,
      type, value, nodeA, nodeB, x, y, rotation: 0,
    })
    if (nodeA >= this.circuit.nextNodeId) this.circuit.nextNodeId = nodeA + 1
    if (nodeB >= this.circuit.nextNodeId) this.circuit.nextNodeId = nodeB + 1
    return this
  }

  build(): Circuit {
    return { ...this.circuit, components: [...this.circuit.components], wires: [] }
  }
}

export function circuit(): CircuitBuilder {
  return new CircuitBuilder()
}
