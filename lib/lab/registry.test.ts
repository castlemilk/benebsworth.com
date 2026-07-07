import { describe, it, expect, beforeAll } from 'vitest'
import {
  LAB_CONCEPT_GUIDES,
  LAB_DEMO_EFFECTS,
  LAB_EFFECTS,
  HOME_EMBED_EFFECTS,
  getEffect,
  EFFECT_LOADERS,
  effectsByCategory,
  isLabConceptGuide,
} from './registry'

const CONCEPT_GUIDE_SLUGS = [
  'aliasing-and-nyquist',
  'feedback-stability-margins',
  'complex-maps-and-airfoils',
  'chaos-sensitivity',
  'turing-patterns',
]

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
  it('keeps concept guides separate from effect demo discovery lists', () => {
    const demoSlugs = new Set(LAB_DEMO_EFFECTS.map((e) => e.slug))
    const guideSlugs = new Set(LAB_CONCEPT_GUIDES.map((e) => e.slug))
    const homeSlugs = new Set(HOME_EMBED_EFFECTS.map((e) => e.slug))

    expect(guideSlugs).toEqual(new Set(CONCEPT_GUIDE_SLUGS))
    for (const slug of CONCEPT_GUIDE_SLUGS) {
      expect(isLabConceptGuide(slug)).toBe(true)
      expect(demoSlugs.has(slug)).toBe(false)
      expect(homeSlugs.has(slug)).toBe(false)
      expect(effectsByCategory(getEffect(slug)!.category).some((e) => e.slug === slug)).toBe(false)
    }
  })
  it('getEffect resolves a known slug and rejects unknown', () => {
    expect(getEffect('orbits')?.title).toBe('Orbits')
    expect(getEffect('nope')).toBeUndefined()
  })
})
