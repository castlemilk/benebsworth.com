import { describe, it, expect, beforeAll } from 'vitest'
import { LAB_EFFECTS, HOME_EMBED_EFFECTS, getEffect, EFFECT_LOADERS } from './registry'

describe('lab registry', () => {
  // Loading ~45 effect modules serially inside the it() blows the default 5s
  // timeout under full-suite load; hoist the imports with a generous timeout.
  let loadedEffects: { slug: string; mod: { controls: any[]; defaults: Record<string, unknown> } }[] = []
  beforeAll(async () => {
    loadedEffects = await Promise.all(
      LAB_EFFECTS.flatMap((e) => {
        const loader = EFFECT_LOADERS[e.slug]
        if (!loader) return [] // standalone pages like circuit-sim have no loader
        return [loader().then((mod) => ({ slug: e.slug, mod }))]
      })
    )
  }, 60_000)

  it('has unique slugs', () => {
    const s = LAB_EFFECTS.map((e) => e.slug)
    expect(new Set(s).size).toBe(s.length)
  })
  it('every default key has a matching in-range control', () => {
    for (const { slug, mod } of loadedEffects) {
      const byKey = Object.fromEntries(mod.controls.map((c: any) => [c.key, c]))
      for (const [k, v] of Object.entries(mod.defaults)) {
        const spec = byKey[k]
        expect(spec, `${slug}.${k} has a control`).toBeTruthy()
        if (spec.type === 'range') { expect(v).toBeGreaterThanOrEqual(spec.min); expect(v).toBeLessThanOrEqual(spec.max) }
        if (spec.type === 'select') expect(spec.options.some((o: any) => o.value === v)).toBe(true)
      }
    }
  })
  it('home embed subset is non-empty', () => { expect(HOME_EMBED_EFFECTS.length).toBeGreaterThan(0) })
  it('getEffect resolves a known slug and rejects unknown', () => {
    expect(getEffect('orbits')?.title).toBe('Orbits')
    expect(getEffect('nope')).toBeUndefined()
  })
})
