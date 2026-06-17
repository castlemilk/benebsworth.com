import { describe, it, expect } from 'vitest'
import { serializeCircuit, deserializeCircuit } from './yaml'
import type { Circuit } from './types'

function makeCircuit(overrides?: Partial<Circuit>): Circuit {
  return {
    components: [],
    wires: [],
    nextNodeId: 1,
    nextCompId: 1,
    ...overrides,
  }
}

describe('YAML serialization', () => {
  it('serializes and deserializes an empty circuit', () => {
    const c = makeCircuit()
    const yaml = serializeCircuit(c)
    const parsed = deserializeCircuit(yaml)
    expect(parsed.components).toEqual([])
    expect(parsed.wires).toEqual([])
  })

  it('round-trips a sine source waveform + acMag', () => {
    const c: Circuit = makeCircuit({
      components: [
        { id: 'v1', type: 'V', value: 0, nodeA: 1, nodeB: 0, x: 100, y: 80, rotation: 90,
          waveform: { kind: 'sine', amplitude: 5, offset: 1, freq: 2000, phase: 0.5, duty: 0.5 }, acMag: 1 },
        { id: 'i1', type: 'I', value: 0.002, nodeA: 1, nodeB: 0, x: 200, y: 80, rotation: 0 },
      ],
      nextNodeId: 2, nextCompId: 3,
    })
    const parsed = deserializeCircuit(serializeCircuit(c))
    expect(parsed.components[0].waveform).toEqual({ kind: 'sine', amplitude: 5, offset: 1, freq: 2000, phase: 0.5, duty: 0.5 })
    expect(parsed.components[0].acMag).toBe(1)
    expect(parsed.components[1].type).toBe('I')
    expect(parsed.components[1].value).toBeCloseTo(0.002)
    // a plain component has no waveform key
    expect(parsed.components[1].waveform).toBeUndefined()
  })

  it('round-trips a voltage divider circuit', () => {
    const c: Circuit = {
      components: [
        { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 100, y: 80, rotation: 0 },
        { id: 'c2', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 200, y: 80, rotation: 0 },
        { id: 'c3', type: 'R', value: 2000, nodeA: 2, nodeB: 0, x: 300, y: 80, rotation: 0 },
        { id: 'g1', type: 'GND', value: 0, nodeA: 0, nodeB: 0, x: 400, y: 80, rotation: 0 },
      ],
      wires: [],
      nextNodeId: 3,
      nextCompId: 5,
    }

    const yaml = serializeCircuit(c)
    expect(yaml).toContain('version: 1')
    expect(yaml).toContain('type: R')
    expect(yaml).toContain('type: V')
    expect(yaml).toContain('value: 1000')

    const parsed = deserializeCircuit(yaml)
    expect(parsed.components).toHaveLength(4)
    expect(parsed.nextNodeId).toBe(c.nextNodeId)
    expect(parsed.nextCompId).toBe(c.nextCompId)

    // Verify each component
    const r1 = parsed.components.find(c => c.id === 'c2')!
    expect(r1.type).toBe('R')
    expect(r1.value).toBe(1000)
    expect(r1.nodeA).toBe(1)
    expect(r1.nodeB).toBe(2)
    expect(r1.x).toBe(200)
    expect(r1.y).toBe(80)
    expect(r1.rotation).toBe(0)
  })

  it('round-trips a circuit with L and C', () => {
    const c: Circuit = {
      components: [
        { id: 'c1', type: 'V', value: 10, nodeA: 1, nodeB: 0, x: 100, y: 80, rotation: 0 },
        { id: 'c2', type: 'L', value: 0.001, nodeA: 1, nodeB: 2, x: 200, y: 80, rotation: 0 },
        { id: 'c3', type: 'C', value: 1e-6, nodeA: 2, nodeB: 0, x: 300, y: 80, rotation: 0 },
        { id: 'g1', type: 'GND', value: 0, nodeA: 0, nodeB: 0, x: 400, y: 80, rotation: 0 },
      ],
      wires: [
        { id: 'w1', nodeA: 1, nodeB: 2, waypoints: [{ x: 150, y: 120 }] },
      ],
      nextNodeId: 3,
      nextCompId: 5,
    }

    const yaml = serializeCircuit(c)
    const parsed = deserializeCircuit(yaml)

    expect(parsed.components).toHaveLength(4)
    expect(parsed.wires).toHaveLength(1)
    expect(parsed.wires[0].waypoints).toEqual([{ x: 150, y: 120 }])
    expect(parsed.components.find(c => c.id === 'c2')!.type).toBe('L')
    expect(parsed.components.find(c => c.id === 'c3')!.type).toBe('C')
  })

  it('handles rotated components', () => {
    const c: Circuit = {
      components: [
        { id: 'c1', type: 'R', value: 500, nodeA: 1, nodeB: 2, x: 100, y: 100, rotation: 90 },
      ],
      wires: [],
      nextNodeId: 3,
      nextCompId: 2,
    }

    const yaml = serializeCircuit(c)
    const parsed = deserializeCircuit(yaml)
    expect(parsed.components[0].rotation).toBe(90)
  })

  it('includes a comment header', () => {
    const yaml = serializeCircuit(makeCircuit())
    expect(yaml.startsWith('# Circuit Simulator Design')).toBe(true)
  })
})
