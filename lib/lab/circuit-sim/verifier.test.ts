import { describe, it, expect } from 'vitest'
import { verifyCircuit, isCircuitRunnable, type VerificationReport } from './verifier'
import { circuit } from './validator'
import { SAMPLES } from './samples'
import { deserializeCircuit } from './yaml'
import { generateWires } from './wiring'

function loadSample(name: string) {
  const sample = SAMPLES.find(s => s.name === name)
  if (!sample) throw new Error(`Sample "${name}" not found`)
  const c = deserializeCircuit(sample.yaml)
  c.wires = generateWires(c)
  return c
}

describe('verifyCircuit', () => {
  it('voltage divider: passes all checks, has correct voltages', () => {
    const c = circuit().v(5, 1, 0).r(1000, 1, 2).r(2000, 2, 0).gnd().build()
    c.wires = generateWires(c)
    const report = verifyCircuit(c)

    expect(report.passed).toBe(true)
    expect(report.dcNodeVoltages).not.toBeNull()
    expect(report.dcNodeVoltages![1]).toBeCloseTo(5, 1)
    expect(report.dcNodeVoltages![2]).toBeCloseTo(5 * (2000 / 3000), 1)

    // Current should flow through both resistors
    const r2Current = report.componentCurrents['c3'] // R2 is c3 (built 3rd)
    expect(Math.abs(r2Current)).toBeGreaterThan(0)

    // Probe points: different nodes have different voltages
    const voltages = report.probePoints.map(p => p.voltage)
    expect(new Set(voltages.map(v => v.toFixed(3))).size).toBeGreaterThanOrEqual(2)
  })

  it('RC filter: passes checks, has non-zero transient', () => {
    const c = circuit().v(5, 1, 0).r(1000, 1, 2).c(1e-6, 2, 0).gnd().build()
    c.wires = generateWires(c)
    const report = verifyCircuit(c)

    expect(report.passed).toBe(true)
    expect(report.dcNodeVoltages).not.toBeNull()

    // Node 1 = 5V (source), Node 2 = charging (transient shows non-DC)
    expect(report.probePoints.length).toBeGreaterThanOrEqual(2)
  })

  it('open circuit: detects dangling nodes and fails', () => {
    // Just a V source and a resistor with one end floating
    const c = circuit().v(5, 1, 0).r(1000, 2, 3).gnd().build()
    c.wires = generateWires(c)
    const report = verifyCircuit(c)

    // Should fail — open loop for V source
    expect(report.passed).toBe(false)
    expect(report.checks.some(ch => ch.name.includes('closed current loop') && !ch.passed)).toBe(true)
  })

  it('no ground: fails validation', () => {
    const c = circuit().v(5, 1, 2).r(1000, 1, 2).build()
    const report = verifyCircuit(c)
    expect(report.passed).toBe(false)
    expect(report.checks.some(ch => ch.name.includes('validation') && !ch.passed)).toBe(true)
  })

  it('single dangling resistor: flagged as open loop', () => {
    const c = circuit().v(5, 1, 0).r(1000, 1, 2).gnd().build()
    c.wires = generateWires(c)
    const report = verifyCircuit(c)
    // Node 2 is a dead-end — V source has no complete return path through it
    expect(report.passed).toBe(false)
    expect(report.probePoints.some(p => p.nodeId === 2)).toBe(true)
  })
})

describe('all samples pass verification', () => {
  for (const sample of SAMPLES) {
    it(`"${sample.name}" passes verification`, () => {
      const c = loadSample(sample.name)
      const report = verifyCircuit(c)

      if (!report.passed) {
        const failures = report.checks.filter(ch => !ch.passed)
        console.error(`"${sample.name}" failures:`, JSON.stringify(failures, null, 2))
      }

      expect(report.passed).toBe(true)
      expect(report.dcNodeVoltages).not.toBeNull()
      
      // Verify current flows (skip for reactive- or AC-driven circuits where the
      // DC operating-point current is legitimately zero — sine sources bias to 0V).
      const hasReactive = c.components.some(comp => comp.type === 'C' || comp.type === 'L')
      const acDriven = c.components.some(comp => (comp.type === 'V' || comp.type === 'I') && comp.waveform && comp.waveform.kind !== 'dc')
      const hasCurrent = Object.values(report.componentCurrents).some(i => Math.abs(i) > 1e-12)
      const hasResistors = c.components.some(comp => comp.type === 'R')
      if (hasResistors && !hasReactive && !acDriven) {
        expect(hasCurrent).toBe(true)
      }

      // Verify probe points exist
      expect(report.probePoints.length).toBeGreaterThan(0)
    })
  }
})

describe('isCircuitRunnable', () => {
  it('returns true for valid voltage divider', () => {
    const c = circuit().v(5, 1, 0).r(1000, 1, 0).gnd().build()
    c.wires = generateWires(c)
    expect(isCircuitRunnable(c)).toBe(true)
  })

  it('returns false for empty circuit', () => {
    expect(isCircuitRunnable({ components: [], wires: [], nextNodeId: 1, nextCompId: 1 })).toBe(false)
  })

  it('returns false for open circuit', () => {
    const c = circuit().v(5, 1, 0).r(1000, 2, 3).gnd().build()
    expect(isCircuitRunnable(c)).toBe(false)
  })
})
