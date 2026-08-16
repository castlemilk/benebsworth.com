import type {
  BenchmarkFailureReason,
  BenchmarkModel,
  BenchmarkResult,
} from './types'
import { BENCHMARK_MODELS, BENCHMARK_TASKS } from './registry'
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

/**
 * Failure reasons that are **infrastructure weather** rather than model
 * capability. A model that scores 0 because the free tier rate-limited it
 * shouldn't be ranked the same as a model that scored 0 because it produced
 * broken output. The model-only average excludes these so the reader sees
 * the real capability number, with the reliability summary showing how
 * much of the dataset was lost to infrastructure.
 *
 * `cli_timeout` is deliberately NOT in this set: a CLI run that blew the
 * per-call cap was still generating when the timer fired, so "too slow to
 * finish in-window" is the model's own limitation and counts as capability —
 * the same way 'truncated' does.
 */
const INFRA_FAILURE_REASONS: ReadonlySet<BenchmarkFailureReason> = new Set([
  'rate_limited',
  'quota_exhausted',
  'endpoint_hung',
  'empty_body',
  'auth_error',
  'invalid_request',
])

export interface ModelReliability {
  /** Count of records grouped by failureReason (includes 'none' for successes). */
  histogram: Partial<Record<BenchmarkFailureReason, number>>
  /** How many records failed for *infrastructure* reasons (rate-limit, hang, quota, ...). */
  infraFailures: number
  /** How many records failed for *model* reasons (truncated or genuine model_error). */
  modelFailures: number
  /** Average score computed only over records that weren't lost to infrastructure. */
  modelOnlyAvgScore: number
  /** Number of records included in `modelOnlyAvgScore`. */
  modelOnlySampleSize: number
}

export interface ModelRanking {
  model: BenchmarkModel
  stats: AggregateStats
  /** avg score per US dollar of total spend — the "value" axis */
  scorePerDollar: number
  /** true if every result for this model is seeded sample data */
  seededOnly: boolean
  /** true if any result for this model is seeded sample data */
  hasSeeded: boolean
  /** Failure breakdown — separates model capability from infra reliability. */
  reliability: ModelReliability
}

/**
 * Per-model failure breakdown. The `modelOnlyAvgScore` is the headline number
 * for free-tier models with significant infra failure rates (e.g. gemma-4-31b
 * flickers between 100 and 429 from the Google AI Studio shared pool — its
 * raw 41.1 average is infrastructure weather, not capability).
 */
export function modelReliability(rs: BenchmarkResult[]): ModelReliability {
  const histogram: Partial<Record<BenchmarkFailureReason, number>> = {}
  let infraFailures = 0
  let modelFailures = 0
  let scored = 0
  let scoreSum = 0
  for (const r of rs) {
    const reason: BenchmarkFailureReason = r.failureReason ?? (r.status === 'success' ? 'none' : 'model_error')
    histogram[reason] = (histogram[reason] ?? 0) + 1
    if (reason === 'none') {
      scored++
      scoreSum += r.score
    } else if (INFRA_FAILURE_REASONS.has(reason)) {
      infraFailures++
    } else {
      // 'truncated', 'cli_timeout' and 'model_error' are capability signals,
      // not infra.
      modelFailures++
      scored++
      scoreSum += r.score
    }
  }
  return {
    histogram,
    infraFailures,
    modelFailures,
    modelOnlyAvgScore: scored > 0 ? Math.round((scoreSum / scored) * 10) / 10 : 0,
    modelOnlySampleSize: scored,
  }
}

function isSeeded(r: BenchmarkResult): boolean {
  return r.source === 'seeded'
}

export interface ModelCompletion {
  /** How many tasks the model COULD have run — the merged registry roster (built-ins + plugin tasks). */
  tasksTotal: number
  /** Tasks that produced a usable artifact: status 'success' or 'partial'. */
  tasksDone: number
  /** Records whose status is 'timeout' — the "ran out of clock" bucket. */
  timeouts: number
  /** Live records of any status (done + timed out + failed). 0 = never swept. */
  attempted: number
  /** Mean wall clock over COMPLETED tasks only. */
  meanRuntimeMs: number
  /** Mean score over COMPLETED tasks only. */
  meanScore: number
  /** Total spend across every live record, including the ones that failed. */
  totalCostUsd: number
  /** Dollars per point of mean score — see `modelCompletion` for the formula. */
  costPerPoint: number
}

/**
 * Per-model completion + value stats for the model cards and the model page
 * header. Answers "how much of the board did this model actually finish, and
 * what did that cost" without the reader counting table rows.
 *
 * SEEDED RECORDS ARE EXCLUDED from every field. Hand-authored sample data must
 * never inflate a model's completion — a model whose whole board is seeded
 * reads as `attempted: 0` ("no runs yet"), same as one that was never swept.
 * A record with no `source` is treated as live (the field postdates the
 * earliest records, and everything hand-authored carries 'seeded' explicitly).
 *
 * Averages (`meanScore`, `meanRuntimeMs`) cover COMPLETED tasks only: a
 * timeout scores 0 and burns the full per-call cap, so folding it into the
 * means would say something about the sweep's patience rather than about the
 * model's work. The timeouts are reported as their own count instead.
 *
 * COST-PER-POINT = `totalCostUsd / max(meanScore, 0.1)` — the whole bill for
 * this model divided by the quality it averaged, i.e. "dollars per point of
 * mean score". Total (not mean) cost is the numerator on purpose: it is the
 * number actually paid, so a model that burned spend on tasks it then failed
 * is charged for them. The 0.1 clamp keeps a 0-scoring model finite rather
 * than Infinity. Free-tier models are exactly 0, which reads honestly (they
 * cost nothing per point) — the "unbounded value" framing belongs to
 * `scorePerDollar`, which divides the other way.
 */
export function modelCompletion(
  results: BenchmarkResult[],
  tasksTotal: number = BENCHMARK_TASKS.length
): ModelCompletion {
  const live = results.filter((r) => !isSeeded(r))
  const done = live.filter((r) => r.status === 'success' || r.status === 'partial')
  const totalCostUsd = live.reduce((sum, r) => sum + r.costUsd, 0)
  const meanScore = done.length > 0 ? done.reduce((s, r) => s + r.score, 0) / done.length : 0
  const meanRuntimeMs =
    done.length > 0 ? done.reduce((s, r) => s + r.runtimeMs, 0) / done.length : 0
  return {
    tasksTotal,
    tasksDone: done.length,
    timeouts: live.filter((r) => r.status === 'timeout').length,
    attempted: live.length,
    meanRuntimeMs,
    meanScore,
    totalCostUsd,
    costPerPoint: totalCostUsd > 0 ? totalCostUsd / Math.max(meanScore, 0.1) : 0,
  }
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
      reliability: modelReliability(rs),
    }
  }).sort((a, b) => b.stats.avgScore - a.stats.avgScore)
}

/**
 * Ranks models by their **model-only** average — i.e. averaging only over
 * records that weren't lost to infrastructure (rate-limits, hangs, quota).
 * For free-tier models with flaky endpoints this is a far fairer number than
 * the raw average; for frontier models with reliable endpoints the two are
 * typically identical.
 */
export function rankModelsByModelQuality(results: BenchmarkResult[] = BENCHMARK_RESULTS): ModelRanking[] {
  return [...rankModels(results)].sort(
    (a, b) => b.reliability.modelOnlyAvgScore - a.reliability.modelOnlyAvgScore
  )
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
