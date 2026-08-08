import type { BenchmarkModel, BenchmarkResult } from './types'
import { BENCHMARK_MODELS } from './registry'
import { BENCHMARK_RESULTS } from './results'
import { aggregateResults, type AggregateStats } from './harness'

/**
 * Derived leaderboard analytics — SERVER-SIDE (imports results).
 *
 * The landing page and rankings need a headline "who wins, at what cost"
 * verdict and per-model score bars. Compute it once here so the UI just
 * renders, and so seeded (non-real) results can be filtered out of the
 * headline consistently in one place.
 */

export interface ModelRanking {
  model: BenchmarkModel
  stats: AggregateStats
  /** avg score per US dollar of total spend — the "value" axis */
  scorePerDollar: number
  /** true if every result for this model is seeded sample data */
  seededOnly: boolean
  /** true if any result for this model is seeded sample data */
  hasSeeded: boolean
}

function isSeeded(r: BenchmarkResult): boolean {
  return r.source === 'seeded'
}

export function rankModels(results: BenchmarkResult[] = BENCHMARK_RESULTS): ModelRanking[] {
  return BENCHMARK_MODELS.map((model) => {
    const rs = results.filter((r) => r.modelId === model.id)
    const stats = aggregateResults(rs)
    const totalCost = rs.reduce((sum, r) => sum + r.costUsd, 0)
    // Free-tier models cost $0, so score-per-dollar is unbounded (infinity)
    // rather than zero — a real result, and a more honest "best value" crown.
    const scorePerDollar =
      rs.length > 0 && totalCost === 0
        ? Number.POSITIVE_INFINITY
        : totalCost > 0
          ? stats.avgScore / totalCost
          : 0
    return {
      model,
      stats,
      scorePerDollar,
      seededOnly: rs.length > 0 && rs.every(isSeeded),
      hasSeeded: rs.some(isSeeded),
    }
  }).sort((a, b) => b.stats.avgScore - a.stats.avgScore)
}

export interface Verdict {
  label: string
  modelId: string
  modelName: string
  value: string
  detail: string
}

/** The three headline verdicts shown under the hero: best score, best value, fastest. */
export function headlineVerdicts(rankings: ModelRanking[]): Verdict[] {
  const withResults = rankings.filter((r) => r.stats.count > 0)
  if (withResults.length === 0) return []

  const topScore = [...withResults].sort((a, b) => b.stats.avgScore - a.stats.avgScore)[0]
  const bestValue = [...withResults].sort((a, b) => b.scorePerDollar - a.scorePerDollar)[0]
  const fastest = [...withResults].sort((a, b) => a.stats.avgRuntimeMs - b.stats.avgRuntimeMs)[0]

  return [
    {
      label: 'Top score',
      modelId: topScore.model.id,
      modelName: topScore.model.name,
      value: topScore.stats.avgScore.toFixed(1),
      detail: 'highest mean score across all tasks',
    },
    {
      label: 'Best value',
      modelId: bestValue.model.id,
      modelName: bestValue.model.name,
      // Free-tier models score-per-dollar is unbounded; show ∞ rather than a
      // meaningless number.
      value:
        Number.isFinite(bestValue.scorePerDollar)
          ? `${Math.round(bestValue.scorePerDollar).toLocaleString()}`
          : '∞',
      detail:
        Number.isFinite(bestValue.scorePerDollar)
          ? 'score per US dollar of total spend'
          : 'score per US dollar — $0 spend, unbounded value',
    },
    {
      label: 'Fastest',
      modelId: fastest.model.id,
      modelName: fastest.model.name,
      value:
        fastest.stats.avgRuntimeMs < 1000
          ? `${Math.round(fastest.stats.avgRuntimeMs)}ms`
          : `${(fastest.stats.avgRuntimeMs / 1000).toFixed(1)}s`,
      detail: 'lowest mean runtime per task',
    },
  ]
}

/** True if any published result is seeded sample data (drives the disclosure note). */
export function hasSeededResults(results: BenchmarkResult[] = BENCHMARK_RESULTS): boolean {
  return results.some(isSeeded)
}
