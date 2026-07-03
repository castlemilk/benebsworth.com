/**
 * Shared visual language for the LLM benchmark section.
 *
 * The section gets its own accent (indigo) instead of borrowing
 * --color-project, and score colour is a status encoding (pass / warn /
 * fail) routed through paired Tailwind classes so it clears WCAG AA in
 * both themes — always alongside the numeric value (secondary encoding).
 */

/** Section accent — carried as `--ink` and rendered via the `.accent-ink` utility. */
export const BENCH_ACCENT = '#6366f1'

export interface ScoreColors {
  /** text colour class pair (light + dark), AA-safe */
  text: string
  /** bar-fill hex (needs only 3:1 vs surface, which -500 shades clear) */
  fill: string
  band: 'high' | 'mid' | 'low'
}

/** Threshold buckets for a 0-100 score. */
export function scoreColors(score: number): ScoreColors {
  if (score >= 80) return { text: 'text-emerald-600 dark:text-emerald-400', fill: '#10b981', band: 'high' }
  if (score >= 50) return { text: 'text-amber-600 dark:text-amber-400', fill: '#f59e0b', band: 'mid' }
  return { text: 'text-rose-600 dark:text-rose-400', fill: '#f43f5e', band: 'low' }
}

/** Podium colours for the top three ranks (gold / silver / bronze), else muted. */
export function medalColor(rank: number): string {
  return ['#f59e0b', '#9ca3af', '#b45309'][rank] ?? 'var(--color-muted)'
}
