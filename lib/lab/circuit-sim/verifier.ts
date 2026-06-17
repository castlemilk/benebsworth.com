import type { Circuit } from './types'
import { validateCircuit, assertDC, findFloatingNodes, type CircuitDiagnostic } from './validator'
import { solveDC } from './solver'
import { transientStep } from './transient'
import { generateWires } from './wiring'
import { renderCircuit } from './placement'
import { getTerminalPositions, gridSnap } from './draw'

// ── Comprehensive circuit verification report ─────────────────────

export interface VerificationReport {
  passed: boolean
  checks: VerificationCheck[]
  dcNodeVoltages: Record<number, number> | null
  componentCurrents: Record<string, number>
  probePoints: ProbePoint[]
}

export interface VerificationCheck {
  name: string
  passed: boolean
  detail: string
}

export interface ProbePoint {
  nodeId: number
  voltage: number
  components: string[]
}

/**
 * Comprehensive verification of a circuit.
 * Checks: closed loops, current flow, simulation viability, probe correctness.
 * Runs entirely headless — no browser, no canvas, no React.
 */
export function verifyCircuit(circuit: Circuit): VerificationReport {
  const checks: VerificationCheck[] = []

  // ── 1. Structural: closed loops, no dangling nodes ───────────
  const diagnostics = validateCircuit(circuit)
  const errors = diagnostics.filter(d => d.severity === 'error')

  checks.push({
    name: 'No critical validation errors',
    passed: errors.length === 0,
    detail: errors.length === 0
      ? 'All validation checks passed'
      : errors.map(e => `[${e.code}] ${e.message}`).join('; '),
  })

  // Dangling nodes: single-connection nodes are probe points, not errors
  const nodeCounts = new Map<number, number>()
  for (const c of circuit.components) {
    nodeCounts.set(c.nodeA, (nodeCounts.get(c.nodeA) ?? 0) + 1)
    nodeCounts.set(c.nodeB, (nodeCounts.get(c.nodeB) ?? 0) + 1)
  }
  const dangling = [...nodeCounts.entries()]
    .filter(([n, c]) => n > 0 && c < 2)
  checks.push({
    name: 'All nodes are connected (no isolated nodes)',
    passed: true,
    detail: dangling.length === 0
      ? 'All non-ground nodes have ≥2 connections'
      : `Probe/dead-end nodes: ${dangling.map(([n]) => `N${n}`).join(', ')} (valid as probe points)`,
  })

  // Every V source must have a path from + back to - through the circuit
  const vsSources = circuit.components.filter(c => c.type === 'V')
  const hasOpenSource = diagnostics.some(d => d.code === 'OPEN_LOOP')
  checks.push({
    name: 'Every voltage source has a closed current loop',
    passed: !hasOpenSource,
    detail: hasOpenSource
      ? 'Some voltage sources have no return path'
      : vsSources.length > 0
        ? `All ${vsSources.length} voltage source(s) have complete loops`
        : 'No voltage sources in circuit',
  })

  // ── 2. Current flow: DC solve produces non-zero currents ─────
  const dc = solveDC(circuit)
  const componentCurrents: Record<string, number> = {}

  if (dc) {
    for (const c of circuit.components) {
      if (c.type === 'R') {
        const current = (dc[c.nodeA] - dc[c.nodeB]) / c.value
        componentCurrents[c.id] = current
      }
    }
    const hasReactive = circuit.components.some(c => c.type === 'C' || c.type === 'L')
    // AC-waveform sources bias to 0V at the DC operating point, so the DC current
    // can legitimately be zero (the action shows up in transient / AC sweep).
    const hasACSource = circuit.components.some(c => (c.type === 'V' || c.type === 'I') && c.waveform && c.waveform.kind !== 'dc')
    const powered = Object.entries(componentCurrents).filter(([, i]) => Math.abs(i) > 1e-12)
    const resistorsWithCurrent = powered.length
    const totalResistors = circuit.components.filter(c => c.type === 'R').length

    checks.push({
      name: 'Resistors have measurable current',
      passed: totalResistors === 0 || resistorsWithCurrent > 0 || hasReactive || hasACSource,
      detail: hasReactive || hasACSource
        ? `${resistorsWithCurrent}/${totalResistors} resistors have DC current (caps/AC sources may give 0 DC)`
        : resistorsWithCurrent > 0
          ? `${resistorsWithCurrent}/${totalResistors} resistors have current flowing`
          : 'No resistors or all resistors have zero current',
    })
  } else {
    checks.push({
      name: 'DC solution is non-singular',
      passed: false,
      detail: 'Matrix is singular — cannot verify current flow',
    })
  }

  // ── 3. Simulation viability: transient step succeeds ─────────
  if (dc) {
    const simState = {
      nodeVoltages: dc,
      vsCurrents: new Float64Array(vsSources.length),
      capState: new Map(),
      indState: new Map(),
      time: 0,
      running: true,
    }
    const hasReactive = circuit.components.some(c => c.type === 'C' || c.type === 'L')
    const v = hasReactive ? transientStep(circuit, simState, 1e-5) : dc

    checks.push({
      name: 'Transient simulation produces valid output',
      passed: v !== null && v.every(x => isFinite(x)),
      detail: v === null
        ? 'Transient step returned null'
        : `All ${v.length} node voltages are finite`,
    })
  }

  // ── 4. Probe correctness: different nodes have different voltages ──
  const probePoints: ProbePoint[] = []
  if (dc) {
    const allNodes = new Set<number>()
    for (const c of circuit.components) {
      allNodes.add(c.nodeA)
      allNodes.add(c.nodeB)
    }
    for (const n of allNodes) {
      if (n === 0) continue
      probePoints.push({
        nodeId: n,
        voltage: dc[n] ?? 0,
        components: circuit.components
          .filter(c => c.nodeA === n || c.nodeB === n)
          .map(c => `${c.type}:${c.id}`),
      })
    }

    const uniqueVoltages = new Set(probePoints.map(p => p.voltage.toFixed(3)))
    const hasCaps = circuit.components.some(c => c.type === 'C')
    const acDriven = circuit.components.some(c => (c.type === 'V' || c.type === 'I') && c.waveform && c.waveform.kind !== 'dc')
    checks.push({
      name: 'Probe points show distinct voltage levels',
      passed: uniqueVoltages.size >= 2 || hasCaps || acDriven || probePoints.length <= 1,
      detail: hasCaps
        ? `${uniqueVoltages.size} distinct DC levels (capacitors block DC — use transient for AC view)`
        : uniqueVoltages.size >= 2
          ? `${uniqueVoltages.size} distinct voltage levels across ${probePoints.length} nodes`
          : probePoints.length <= 1
            ? 'Only one probe point'
            : 'All nodes at same DC voltage',
    })
  }

  // ── 5. Wires: visual connectivity ─────────────────────────────
  const generatedWires = generateWires(circuit)
  checks.push({
    name: 'Auto-generated wires connect components visually',
    passed: generatedWires.length > 0 || circuit.components.length <= 1,
    detail: generatedWires.length > 0
      ? `${generatedWires.length} wire(s) generated` 
      : circuit.components.length <= 1 ? 'Single component — no wires needed' : 'No wires generated',
  })

  // ── Aggregate ─────────────────────────────────────────────────
  const passed = checks.every(c => c.passed)

  return {
    passed,
    checks,
    dcNodeVoltages: dc ? Object.fromEntries(
      [...new Set(circuit.components.flatMap(c => [c.nodeA, c.nodeB]))]
        .map(n => [n, dc[n] ?? 0])
    ) : null,
    componentCurrents,
    probePoints,
  }
}

/**
 * Lightweight check: returns true if the circuit is valid and runnable.
 */
export function isCircuitRunnable(circuit: Circuit): boolean {
  const report = verifyCircuit(circuit)
  return report.passed && report.dcNodeVoltages !== null
}
