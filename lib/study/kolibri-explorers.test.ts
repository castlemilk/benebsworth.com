import { describe, expect, it } from 'vitest'
import { cacheBudget, routeToyToken } from './kolibri-explorers'

describe('Kolibri explainers', () => {
  it('uses the bias to choose experts and the raw logits to weight their outputs', () => {
    const before = routeToyToken(0)
    const after = routeToyToken(3)
    expect(before.filter((expert) => expert.selected).map((expert) => expert.id)).toEqual(['A', 'B'])
    expect(after.filter((expert) => expert.selected).map((expert) => expert.id)).toEqual(['A', 'C'])
    expect(after.find((expert) => expert.id === 'C')?.weight).toBe(0.5)
    expect(after.filter((expert) => expert.selected).reduce((sum, expert) => sum + expert.weight, 0)).toBeCloseTo(1.381)
  })

  it('caps local layers and leaves the full layers growing', () => {
    const short = cacheBudget(512, 1)
    expect(short.hybrid).toBe(short.full)
    const trained = cacheBudget(262144, 1)
    const extended = cacheBudget(1048576, 1)
    expect(trained.hybrid).toBeCloseTo(2.52, 2)
    expect(trained.full).toBe(12.5)
    expect(extended.local).toBe(trained.local)
    expect(extended.global).toBe(4 * trained.global)
    expect(cacheBudget(262144, 2).hybrid).toBe(2 * trained.hybrid)
  })
})
