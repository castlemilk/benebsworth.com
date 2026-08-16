import type { BenchmarkScorerName, BenchmarkTask, Scorer } from '../types'
import { htmlScorer } from './html'
import { textScorer } from './text'
import { behavioralScorer } from './behavioral'

/**
 * The scorer registry: name → implementation. A task row declares one of
 * these names in `task.scorer` and gets that scorer, full stop.
 *
 * `html` is registered even though no shipped task declares it — the names
 * are a vocabulary for future tasks (a structural-only HTML task is a
 * reasonable thing to want), and a registry with a hole in it is worse than
 * one with a currently-unused entry.
 */
const SCORERS: Record<BenchmarkScorerName, Scorer> = {
  behavioral: behavioralScorer,
  html: htmlScorer,
  text: textScorer,
}

/**
 * Categories whose artifacts render as a live HTML page, and so get the
 * Playwright behavioural scorer.
 *
 * This is the FALLBACK heuristic only — kept so a task row without an
 * explicit `scorer` keeps the exact behaviour it had before the field
 * existed. New tasks should declare `scorer` on the registry row rather than
 * relying on their category being in this set.
 */
const HTML_CATEGORIES = new Set([
  '3d-physics-animation',
  'advanced-game-building',
  'advanced-physics',
  'advanced-electronics',
  'ui-building',
])

/**
 * Resolve the scorer for a task: the task's own declaration wins; the
 * category heuristic is the fallback for unstamped rows.
 */
export function selectScorer(task: BenchmarkTask): Scorer {
  if (task.scorer) return SCORERS[task.scorer]
  if (HTML_CATEGORIES.has(task.category)) return behavioralScorer
  return textScorer
}

/**
 * The ids of every task that resolves to the behavioural scorer.
 *
 * Scripts that only operate on behaviourally-scored records
 * (`scripts/rescore-behavioral.mjs`, `scripts/backfill-iteration-checks.mjs`)
 * derive their task set from here rather than each keeping a hand-maintained
 * copy that silently rots the moment a task is added.
 */
export function behavioralTaskIds(tasks: BenchmarkTask[]): Set<string> {
  return new Set(tasks.filter((t) => selectScorer(t) === behavioralScorer).map((t) => t.id))
}

export { htmlScorer, textScorer, behavioralScorer }
