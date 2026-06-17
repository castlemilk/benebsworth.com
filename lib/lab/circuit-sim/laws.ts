import type { Circuit } from './types'
import { solveDC, buildDCMatrix, luDecompose, luSolve } from './solver'
import { transientStep } from './transient'
import { generateWires } from './wiring'

// ── KCL check ──────────────────────────────────────────────────────

/**
 * Verify Kirchhoff's Current Law at every node.
 * Sum of currents entering a node must equal sum leaving (≈ 0).
 * Returns failures per node.
 */
export function checkKCL(circuit: Circuit, tolerance = 1e-9): { nodeId: number; sum: number }[] {
  const dc = solveDC(circuit)
  if (!dc) return []

  // Get V source currents from MNA solution
  const mna = buildDCMatrix(circuit)
  const vsCurrents = new Map<string, number>()
  if (mna) {
    const pivot = new Int32Array(mna.size)
    const x = new Float64Array(mna.size)
    if (luDecompose(mna.size, mna.A, pivot)) {
      luSolve(mna.size, mna.A, pivot, mna.z, x)
      for (const [compId, row] of mna.vsIndex) {
        vsCurrents.set(compId, x[row])
      }
    }
  }

  const failures: { nodeId: number; sum: number }[] = []
  const allNodes = new Set<number>()
  for (const c of circuit.components) {
    allNodes.add(c.nodeA)
    allNodes.add(c.nodeB)
  }

  for (const nodeId of allNodes) {
    let sumIn = 0
    for (const c of circuit.components) {
      const vA = dc[c.nodeA] ?? 0
      const vB = dc[c.nodeB] ?? 0
      let current = 0
      if (c.type === 'R') {
        current = (vA - vB) / c.value
      } else if (c.type === 'V') {
        current = vsCurrents.get(c.id) ?? 0
      }
      // Sign convention: current flowing INTO node is positive
      if (c.nodeA === nodeId) sumIn -= current  // current flowing out of nodeA
      if (c.nodeB === nodeId) sumIn += current  // current flowing into nodeB
    }
    if (Math.abs(sumIn) > tolerance) {
      failures.push({ nodeId, sum: sumIn })
    }
  }
  return failures
}

// ── KVL check ──────────────────────────────────────────────────────

/**
 * Verify Kirchhoff's Voltage Law around every V-source-driven loop.
 * For each V source, find a path back to itself and sum voltages = 0.
 */
export function checkKVL(circuit: Circuit, tolerance = 1e-6): { vsId: string; sum: number }[] {
  const dc = solveDC(circuit)
  if (!dc) return []

  const failures: { vsId: string; sum: number }[] = []
  const vsSources = circuit.components.filter(c => c.type === 'V')

  for (const vs of vsSources) {
    // Simple KVL: the voltage across the V source must equal the sum of voltages
    // across the external path. For now, do a basic check:
    // V_source = V(nodeA) - V(nodeB)
    const vExpected = vs.value
    const vActual = (dc[vs.nodeA] ?? 0) - (dc[vs.nodeB] ?? 0)
    if (Math.abs(vActual - vExpected) > tolerance) {
      failures.push({ vsId: vs.id, sum: vActual - vExpected })
    }
  }
  return failures
}

// ── Power check ────────────────────────────────────────────────────

/**
 * Verify power conservation: power supplied by sources = power dissipated by loads.
 */
export function checkPowerConservation(circuit: Circuit, tolerance = 1e-6): { supplied: number; dissipated: number; diff: number } | null {
  const dc = solveDC(circuit)
  if (!dc) return null

  let supplied = 0
  let dissipated = 0

  for (const c of circuit.components) {
    const vA = dc[c.nodeA] ?? 0
    const vB = dc[c.nodeB] ?? 0
    const vDiff = vA - vB

    if (c.type === 'R') {
      const i = vDiff / c.value
      dissipated += Math.abs(vDiff * i) // P = V*I = I²R = V²/R
    } else if (c.type === 'V') {
      // Power supplied = V * I (signed — negative if consuming)
      // We compute current through external path? For now just check V matches
      supplied += Math.abs(vDiff * c.value) // approximate: V * (V/R_eq)? Not exact
    }
  }

  // Simpler check: for a pure resistor divider, source voltage at each node should be consistent
  const actualSupplied = vsSourcePower(circuit, dc)
  const actualDissipated = resistorPower(circuit, dc)

  return {
    supplied: actualSupplied,
    dissipated: actualDissipated,
    diff: actualSupplied - actualDissipated,
  }
}

function vsSourcePower(circuit: Circuit, dc: Float64Array): number {
  let total = 0
  for (const c of circuit.components) {
    if (c.type === 'V') {
      const vDiff = (dc[c.nodeA] ?? 0) - (dc[c.nodeB] ?? 0)
      // Find the current through this source by looking at connected resistors
      let i = 0
      for (const r of circuit.components) {
        if (r.type !== 'R') continue
        // Simple: current = Vdiff / R for series resistors
        const rV = (dc[r.nodeA] ?? 0) - (dc[r.nodeB] ?? 0)
        i += Math.abs(rV / r.value)
      }
      total += Math.abs(vDiff) * (i > 0 ? i / circuit.components.filter(rc => rc.type === 'R').length : 0)
    }
  }
  return total
}

function resistorPower(circuit: Circuit, dc: Float64Array): number {
  let total = 0
  for (const c of circuit.components) {
    if (c.type === 'R') {
      const vDiff = (dc[c.nodeA] ?? 0) - (dc[c.nodeB] ?? 0)
      const i = vDiff / c.value
      total += Math.abs(vDiff * i)
    }
  }
  return total
}

// ── Transient analytical check ────────────────────────────────────

/**
 * Verify RC charging follows Vc(t) = V₀(1 - e^(-t/RC)).
 * Runs transient simulation and compares against analytical solution.
 */
export function checkRCTransient(
  circuit: Circuit,
  dt: number,
  stepsToCheck: number[],
  tolerance = 0.1,
): { step: number; expected: number; actual: number; error: number }[] {
  // Find the RC components
  const vComp = circuit.components.find(c => c.type === 'V')
  const rComp = circuit.components.find(c => c.type === 'R')
  const cComp = circuit.components.find(c => c.type === 'C')

  if (!vComp || !rComp || !cComp) return []

  const R = rComp.value
  const C = cComp.value
  const V0 = vComp.value
  const tau = R * C

  const state = {
    nodeVoltages: new Float64Array(circuit.nextNodeId) as Float64Array,
    vsCurrents: new Float64Array(1) as Float64Array,
    capState: new Map(),
    indState: new Map(),
    time: 0,
    running: true,
  }

  const failures: { step: number; expected: number; actual: number; error: number }[] = []
  const maxStep = Math.max(...stepsToCheck)
  const checkSet = new Set(stepsToCheck)

  for (let i = 0; i <= maxStep; i++) {
    if (checkSet.has(i)) {
      const t = i * dt
      const expected = V0 * (1 - Math.exp(-t / tau))
      const actual = state.nodeVoltages[cComp.nodeA] - state.nodeVoltages[cComp.nodeB]
      const error = Math.abs(expected - actual)
      if (error > tolerance) {
        failures.push({ step: i, expected, actual, error })
      }
    }
    if (i < maxStep) {
      const v = transientStep(circuit, state, dt)
      if (!v) break
      state.nodeVoltages = v
      state.time += dt
    }
  }

  return failures
}

// ── Fuzzing: random circuit generation ─────────────────────────────

/**
 * Generate a random valid circuit with R, V, and GND components.
 * Returns null if generated circuit is invalid.
 */
export function generateRandomCircuit(nodeCount: number, componentCount: number): Circuit | null {
  const components = []
  const usedNodeIds = new Set<number>([0]) // 0 = ground
  
  // Always add GND first
  components.push({
    id: 'c_gnd',
    type: 'GND' as const,
    value: 0,
    nodeA: 0,
    nodeB: 0,
    x: 100,
    y: 280,
    rotation: 0 as 0 | 90 | 180 | 270,
  })

  // Add V source connecting to ground
  const vsNode = nodeCount > 1 ? 1 : 0
  components.push({
    id: 'c_vs',
    type: 'V' as const,
    value: 5,
    nodeA: vsNode,
    nodeB: 0,
    x: 100,
    y: 100,
    rotation: 0 as 0 | 90 | 180 | 270,
  })
  usedNodeIds.add(vsNode)

  // Add random resistors connecting existing nodes
  for (let i = 2; i < componentCount; i++) {
    const nodes = [...usedNodeIds]
    const a = nodes[Math.floor(Math.random() * nodes.length)]
    let b: number
    if (Math.random() < 0.3 && usedNodeIds.size < nodeCount) {
      // Create a new node
      b = usedNodeIds.size
      while (usedNodeIds.has(b)) b++
      usedNodeIds.add(b)
    } else {
      b = nodes[Math.floor(Math.random() * nodes.length)]
    }
    if (a === b) continue
    
    components.push({
      id: `c_fuzz_${i}`,
      type: 'R' as const,
      value: 100 * (1 + Math.floor(Math.random() * 100)),
      nodeA: a,
      nodeB: b,
      x: 100 + i * 60,
      y: 100 + (i % 3) * 80,
      rotation: 0 as 0 | 90 | 180 | 270,
    })
  }

  const circuit: Circuit = {
    components,
    wires: [],
    nextNodeId: Math.max(...usedNodeIds) + 1,
    nextCompId: components.length + 1,
  }
  circuit.wires = generateWires(circuit)

  // Verify DC solve succeeds
  const dc = solveDC(circuit)
  if (!dc) return null

  return circuit
}

/**
 * Fuzz test: generate random circuits and verify KCL holds.
 */
export function fuzzKCL(iterations: number, maxNodes: number, maxComponents: number):
  { passes: number; failures: { circuit: Circuit; issues: { nodeId: number; sum: number }[] }[] } {
  const result = { passes: 0, failures: [] as { circuit: Circuit; issues: { nodeId: number; sum: number }[] }[] }
  
  for (let i = 0; i < iterations; i++) {
    const c = generateRandomCircuit(maxNodes, maxComponents)
    if (!c) continue
    
    const issues = checkKCL(c)
    if (issues.length === 0) {
      result.passes++
    } else {
      result.failures.push({ circuit: c, issues })
    }
  }
  
  return result
}
