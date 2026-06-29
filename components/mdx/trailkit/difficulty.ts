export type Difficulty = 'easy' | 'moderate' | 'hard' | 'severe' | 'extreme'

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy', moderate: 'Moderate', hard: 'Hard', severe: 'Severe', extreme: 'Extreme',
}

export const DIFFICULTY_VAR: Record<Difficulty, string> = {
  easy: 'var(--trail-easy)', moderate: 'var(--trail-moderate)', hard: 'var(--trail-hard)',
  severe: 'var(--trail-severe)', extreme: 'var(--trail-extreme)',
}

const ORDER: Difficulty[] = ['easy', 'moderate', 'hard', 'severe', 'extreme']

/** Heuristic 0..~4 score from the four index stats. Tuned so the seeded hikes in
 *  content/hiking.ts land sensibly (Overland≈moderate/hard, Larapinta/GR20≈severe+). */
export function difficultyScore(s: { distanceKm: number; days: number; elevationGainM: number; maxAltitudeM: number }): number {
  const perDayKm = s.distanceKm / Math.max(1, s.days)
  const perDayAscent = s.elevationGainM / Math.max(1, s.days)
  const distScore = Math.min(1.4, s.distanceKm / 160)        // 224km → ~1.4
  const ascentScore = Math.min(1.3, s.elevationGainM / 9000) // 12000m → 1.3
  const altScore = Math.min(1.3, Math.max(0, s.maxAltitudeM - 1500) / 3500) // 5000m → 1.0
  const intensity = Math.min(1, (perDayKm / 22) * 0.5 + (perDayAscent / 1100) * 0.5)
  return distScore + ascentScore + altScore + intensity
}

export function deriveDifficulty(s: { distanceKm: number; days: number; elevationGainM: number; maxAltitudeM: number }): Difficulty {
  const score = difficultyScore(s)
  // thresholds: easy <1, moderate <1.8, hard <2.6, severe <3.4, else extreme
  const idx = score < 1 ? 0 : score < 1.8 ? 1 : score < 2.6 ? 2 : score < 3.4 ? 3 : 4
  return ORDER[idx]
}
