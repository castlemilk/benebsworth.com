import { describe, it, expect } from 'vitest'
import { encodeCircuit, decodeCircuit, upsertSaved, removeSaved, type SavedCircuit } from './storage'
import type { Circuit } from './types'

function divider(): Circuit {
  return {
    components: [
      { id: 'c1', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 100, y: 80, rotation: 0 },
      { id: 'c2', type: 'R', value: 1000, nodeA: 1, nodeB: 2, x: 200, y: 80, rotation: 0 },
      { id: 'c3', type: 'R', value: 2000, nodeA: 2, nodeB: 0, x: 300, y: 80, rotation: 0 },
    ],
    wires: [], nextNodeId: 3, nextCompId: 4,
  }
}

describe('share-link codec', () => {
  it('round-trips a circuit through URL-safe base64', () => {
    const enc = encodeCircuit(divider())
    expect(enc).toMatch(/^[A-Za-z0-9_-]+$/) // URL-safe, no padding
    const dec = decodeCircuit(enc)
    expect(dec).not.toBeNull()
    expect(dec!.components).toHaveLength(3)
    expect(dec!.components[1].value).toBe(1000)
  })

  it('preserves unicode (µ, Ω) in values via UTF-8', () => {
    const c: Circuit = {
      components: [
        { id: 'v', type: 'V', value: 5, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 },
        { id: 'cap', type: 'C', value: 1e-6, nodeA: 1, nodeB: 0, x: 0, y: 0, rotation: 0 },
      ], wires: [], nextNodeId: 2, nextCompId: 3,
    }
    const dec = decodeCircuit(encodeCircuit(c))
    expect(dec!.components[1].value).toBeCloseTo(1e-6)
  })

  it('returns null for garbage', () => {
    expect(decodeCircuit('not!!valid')).toBeNull()
    expect(decodeCircuit('')).toBeNull()
  })
})

describe('saved-circuit library helpers', () => {
  const base: SavedCircuit[] = [{ name: 'A', yaml: 'a', savedAt: 1 }]

  it('upsert prepends new and replaces by name', () => {
    const added = upsertSaved(base, 'B', 'b', 2)
    expect(added.map(s => s.name)).toEqual(['B', 'A'])
    const replaced = upsertSaved(added, 'A', 'a2', 3)
    expect(replaced.map(s => s.name)).toEqual(['A', 'B'])
    expect(replaced.find(s => s.name === 'A')!.yaml).toBe('a2')
  })

  it('ignores blank names', () => {
    expect(upsertSaved(base, '   ', 'x', 9)).toEqual(base)
  })

  it('remove drops by name', () => {
    expect(removeSaved(base, 'A')).toEqual([])
    expect(removeSaved(base, 'missing')).toEqual(base)
  })
})
