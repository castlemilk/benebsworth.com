import { describe, it, expect } from 'vitest'
import { deriveDifficulty, DIFFICULTY_LABEL, type Difficulty } from './difficulty'

describe('deriveDifficulty', () => {
  it('rates a short, low, gentle walk as easy', () => {
    expect(deriveDifficulty({ distanceKm: 20, days: 3, elevationGainM: 600, maxAltitudeM: 400 })).toBe<Difficulty>('easy')
  })
  it('rates a long, very-high, big-ascent traverse as severe or extreme', () => {
    const d = deriveDifficulty({ distanceKm: 223, days: 14, elevationGainM: 12000, maxAltitudeM: 5644 })
    expect(['severe', 'extreme']).toContain(d)
  })
  it('returns a band for every hike without throwing', () => {
    const d = deriveDifficulty({ distanceKm: 65, days: 6, elevationGainM: 2500, maxAltitudeM: 1617 })
    expect(Object.keys(DIFFICULTY_LABEL)).toContain(d)
  })
})
