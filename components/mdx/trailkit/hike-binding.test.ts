import { describe, it, expect } from 'vitest'
import { getHikeDefaults } from './hike-binding'

describe('getHikeDefaults', () => {
  it('returns stats + accent + waypoints for a known slug', () => {
    const d = getHikeDefaults('overland-track')
    expect(d).not.toBeNull()
    expect(d!.distanceKm).toBe(65)
    expect(d!.accent).toBe('#5b8c5a')
    expect(d!.waypoints.length).toBeGreaterThan(0)
  })
  it('returns null for an unknown slug', () => {
    expect(getHikeDefaults('not-a-real-hike')).toBeNull()
  })
})
