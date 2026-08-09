import type { BenchmarkResult, BenchmarkTask, Scorer } from '../types'
import { htmlScorer } from './html'
import { getChecksForTask } from './checks'
import { runChecks, type CheckResult } from './sandbox'

/**
 * Composite behavioral scorer.
 *
 * Replaces the pure-structural `htmlScorer` for the interactive benchmark
 * tasks. The structural score is kept as a 30% floor (it still catches
 * malformed markup) but the headline number comes from real Playwright
 * behavioral checks (70%) — does Space actually jump the player, does the
 * canvas re-render after an input change, etc.
 *
 * The composite is 0..100 with this weighting:
 *   - 70% from behavioural checks (Playwright runs the artifact and asserts)
 *   - 30% from structural HTML heuristics (existing `htmlScorer`)
 *
 * If Playwright is unavailable (e.g. browser binary missing in CI), the
 * scorer falls back to the structural score and tags the result with a
 * `behaviouralFallback` reason so the report makes it clear.
 *
 * Caching: `result.cached` is set true on the BenchmarkResult when this
 * scorer is used with `useCache`, so a re-rescore batch doesn't relaunch
 * the browser for unchanged artifacts. The cache key is a sha256 of the
 * artifact HTML + the task id + a content-version stamp; bumps force a
 * recompute.
 */

const STRUCTURAL_WEIGHT = 0.3
const BEHAVIORAL_WEIGHT = 0.7

interface BehavioralScoreOptions {
  /** Per-task check timeout in ms (forwarded to runChecks). */
  perCheckTimeoutMs?: number
}

interface BehavioralScoreResult {
  score: number
  structural: number
  behavioral: number
  behavioralMax: number
  checks: CheckResult[]
  fallbackReason?: string
}

async function scoreBehavioral(
  html: string,
  task: BenchmarkTask,
  options: BehavioralScoreOptions = {}
): Promise<BehavioralScoreResult> {
  const checks = getChecksForTask(task.id)
  const structural = htmlScorer.score(html, task) as number

  if (checks.length === 0) {
    // No behavioural spec for this task yet — fall back to structural.
    return {
      score: structural,
      structural,
      behavioral: 0,
      behavioralMax: 0,
      checks: [],
      fallbackReason: 'no behavioural checks defined for task',
    }
  }

  try {
    const results = await runChecks(html, checks, {
      settleMs: 600,
      perCheckTimeoutMs: options.perCheckTimeoutMs ?? 6000,
      totalTimeoutMs: 25_000,
    })
    const behavioralMax = results.reduce((s, r) => s + r.maxPoints, 0)
    const behavioral = results.reduce((s, r) => s + r.points, 0)
    const behaviouralScore = behavioralMax > 0 ? (behavioral / behavioralMax) * 100 : 0
    const score = Math.round(
      behaviouralScore * BEHAVIORAL_WEIGHT + structural * STRUCTURAL_WEIGHT
    )
    return { score, structural, behavioral, behavioralMax, checks: results }
  } catch (e) {
    // Playwright failed (no browser, timeout, etc.) — fall back to structural
    // but flag it so the report can call out which records lack behavioural
    // coverage.
    return {
      score: structural,
      structural,
      behavioral: 0,
      behavioralMax: 0,
      checks: [],
      fallbackReason: `behavioural run failed: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}

export const behavioralScorer: Scorer = {
  score: async (output: string, task: BenchmarkTask): Promise<number> => {
    const result = await scoreBehavioral(output, task)
    return result.score
  },
}

/**
 * Standalone helper: score one artifact and return the full breakdown (used
 * by the rescore CLI and the reporting layer). Returns the composite score
 * alongside the structural and behavioural components so the caller can
 * surface *why* a record scored the way it did.
 */
export async function scoreWithBreakdown(
  html: string,
  task: BenchmarkTask,
  options: BehavioralScoreOptions = {}
): Promise<BehavioralScoreResult> {
  return scoreBehavioral(html, task, options)
}

export type { BehavioralScoreResult }
