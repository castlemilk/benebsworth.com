// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { EFFECT_LOADERS, LAB_DEMO_EFFECTS } from '@/lib/lab/registry'
import { MATRIX_EFFECTS } from './lab-matrix'

describe('home lab matrix pool', () => {
  it('only offers effects that have a live preview module', () => {
    expect(MATRIX_EFFECTS.length).toBeGreaterThanOrEqual(6)
    for (const effect of MATRIX_EFFECTS) expect(EFFECT_LOADERS[effect.slug]).toBeTypeOf('function')
  })

  it('leaves out lab entries that would only ever show a placeholder', () => {
    const withoutPreview = LAB_DEMO_EFFECTS.filter((effect) => !(effect.slug in EFFECT_LOADERS))
    expect(withoutPreview.length).toBeGreaterThan(0)
    for (const effect of withoutPreview) expect(MATRIX_EFFECTS).not.toContain(effect)
  })
})
