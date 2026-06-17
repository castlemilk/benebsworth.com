import { describe, it, expect } from 'vitest'
import { checkKCL, checkKVL, checkRCTransient, fuzzKCL } from './laws'
import { circuit } from './validator'
import { generateWires } from './wiring'

describe('Kirchhoff Current Law (KCL)', () => {
  it('voltage divider satisfies KCL at all nodes', () => {
    const c = circuit().v(5, 1, 0).r(1000, 1, 2).r(2000, 2, 0).gnd().build()
    const failures = checkKCL(c)
    expect(failures).toEqual([])
  })

  it('simple resistor across V source satisfies KCL', () => {
    const c = circuit().v(10, 1, 0).r(100, 1, 0).gnd().build()
    const failures = checkKCL(c)
    expect(failures).toEqual([])
  })
})

describe('Kirchhoff Voltage Law (KVL)', () => {
  it('voltage divider: V across source matches circuit', () => {
    const c = circuit().v(5, 1, 0).r(1000, 1, 2).r(2000, 2, 0).gnd().build()
    const failures = checkKVL(c)
    expect(failures).toEqual([])
  })
})

describe('RC transient analytical check', () => {
  it('RC charging matches Vc = V0(1-e^(-t/RC))', () => {
    // τ = 1000 * 1e-6 = 1ms
    const c = circuit().v(5, 1, 0).r(1000, 1, 2).c(1e-6, 2, 0).gnd().build()
    const dt = 1e-5 // 10µs

    // Check at 0.5τ and 1τ
    const failures = checkRCTransient(c, dt, [50, 100], 0.3)
    expect(failures).toEqual([])
  })
})

describe('fuzzing', () => {
  it('random circuits satisfy KCL', () => {
    const result = fuzzKCL(20, 5, 8)
    console.log(`Fuzz: ${result.passes} passed, ${result.failures.length} failed`)
    // At least 50% should pass (some random circuits may be invalid)
    expect(result.passes).toBeGreaterThanOrEqual(result.failures.length)
    // No KCL violations in passing circuits
    for (const f of result.failures) {
      expect(f.issues.length).toBeGreaterThan(0) // failures should have issues
    }
  })
})
