import { describe, it, expect } from 'vitest'
import { acSweep, acPointAtNode } from './ac'
import type { Circuit, Probe } from './types'

function makeCircuit(overrides?: Partial<Circuit>): Circuit {
  return { components: [], wires: [], nextNodeId: 1, nextCompId: 1, ...overrides }
}

// V(1) — R(1k) — node2 — C(1µF) — gnd. fc = 1/(2π·RC) ≈ 159.155 Hz
function rcLowPass(): Circuit {
  return makeCircuit({
    components: [
      { id: 'v1', type: 'V', value: 1, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0, acMag: 1 },
      { id: 'r1', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 0, y: 0, rotation: 0 },
      { id: 'c1', type: 'C', value: 1e-6, nodeA: 2, nodeB: 0, x: 0, y: 0, rotation: 0 },
    ],
    nextNodeId: 3, nextCompId: 4,
  })
}

describe('AC sweep — RC low-pass', () => {
  const fc = 1 / (2 * Math.PI * 1000 * 1e-6)

  it('is -3dB and -45° at the cutoff frequency', () => {
    const { db, deg } = acPointAtNode(rcLowPass(), fc, 2)
    expect(db).toBeCloseTo(-3.01, 1)
    expect(deg).toBeCloseTo(-45, 0)
  })

  it('passes DC-ish (0 dB) well below cutoff', () => {
    const { db } = acPointAtNode(rcLowPass(), fc / 100, 2)
    expect(db).toBeCloseTo(0, 1)
  })

  it('rolls off ~-20dB/decade well above cutoff', () => {
    const hi1 = acPointAtNode(rcLowPass(), fc * 100, 2).db
    const hi2 = acPointAtNode(rcLowPass(), fc * 1000, 2).db
    expect(hi2 - hi1).toBeCloseTo(-20, 0) // one decade → ~-20dB
  })

  it('produces a full sweep with per-probe channels', () => {
    const probes: Probe[] = [
      { id: 'nodeV:2', kind: 'nodeV', ref: 2, label: 'N2', color: '#fff', visible: true, unit: 'V', samples: new Float64Array(0), writeIdx: 0, count: 0 },
    ]
    const r = acSweep(rcLowPass(), { fStart: 1, fStop: 1e5, points: 50 }, probes)
    expect(r.freqs).toHaveLength(50)
    expect(r.channels[0].mag).toHaveLength(50)
    expect(r.stimulusId).toBe('v1')
    // monotonic-ish decreasing magnitude across the sweep
    expect(r.channels[0].mag[0]).toBeGreaterThan(r.channels[0].mag[49])
  })
})
