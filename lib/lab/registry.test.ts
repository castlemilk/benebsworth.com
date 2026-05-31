import { describe, it, expect } from 'vitest'
import { LAB_EFFECTS, HOME_EMBED_EFFECTS, getEffect } from './registry'

describe('lab registry', () => {
  it('has unique slugs', () => {
    const s = LAB_EFFECTS.map((e) => e.slug)
    expect(new Set(s).size).toBe(s.length)
  })
  it('every default key has a matching in-range control', () => {
    for (const e of LAB_EFFECTS) {
      const byKey = Object.fromEntries(e.controls.map((c) => [c.key, c]))
      for (const [k, v] of Object.entries(e.defaults)) {
        const spec = byKey[k]
        expect(spec, `${e.slug}.${k} has a control`).toBeTruthy()
        if (spec.type === 'range') { expect(v).toBeGreaterThanOrEqual(spec.min); expect(v).toBeLessThanOrEqual(spec.max) }
        if (spec.type === 'select') expect(spec.options.some((o) => o.value === v)).toBe(true)
      }
    }
  })
  it('home embed subset is non-empty', () => { expect(HOME_EMBED_EFFECTS.length).toBeGreaterThan(0) })
  it('getEffect resolves a known slug and rejects unknown', () => {
    expect(getEffect('orbits')?.title).toBe('Orbits')
    expect(getEffect('nope')).toBeUndefined()
  })
})
