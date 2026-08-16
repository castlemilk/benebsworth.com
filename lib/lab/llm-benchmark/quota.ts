import type { BenchmarkResult } from './types'

/**
 * Quota-reset estimation.
 *
 * Provider quota errors often carry the next window in the message itself —
 * agy's is `individual quota reached. Resets in 57h27m`. The harness used to
 * throw that away, so a sweep launched right after a trip died instantly on
 * every iteration and the operator had to read the raw error to find out when
 * to come back. These helpers turn that text into a timestamp the runner can
 * stamp on results (`BenchmarkResult.quotaNextResetAt`) and the sweep script
 * can pre-flight against.
 *
 * Deliberately dependency-free and pure: `scripts/run-benchmark.mjs` (plain JS)
 * imports it, and so do the unit tests.
 */

const HOUR_MS = 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

/**
 * Extract a quota-reset window from a provider error message.
 *
 * Handles `Resets in 57h27m`, `resets in 2h`, `Reset in 45m` and arbitrary
 * whitespace, case-insensitively. Returns milliseconds from now, or undefined
 * when the message carries no window.
 *
 * Both components are optional in the pattern, so a bare `resets in` matches
 * with nothing captured — that case returns undefined rather than 0: an
 * already-expired window would read as "quota is back", the opposite of what
 * the message says.
 */
export function parseQuotaResetMs(message: string): number | undefined {
  const match = /resets?\s+in\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/i.exec(message)
  if (!match) return undefined
  const [, hours, minutes] = match
  if (hours === undefined && minutes === undefined) return undefined
  return Number(hours ?? 0) * HOUR_MS + Number(minutes ?? 0) * MINUTE_MS
}

/** Render a window as the provider states it: `57h27m`, `2h`, `45m`. */
export function formatQuotaWindow(ms: number): string {
  const totalMinutes = Math.floor(Math.max(0, ms) / MINUTE_MS)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return minutes === 0 ? `${hours}h` : `${hours}h${minutes}m`
}

/** A model that cannot usefully be run yet, and the moment its quota returns. */
export interface QuotaLock {
  modelId: string
  /** ISO timestamp — the furthest-future window recorded for this model. */
  until: string
}

/**
 * Which of the models a sweep is about to run are still quota-locked according
 * to the results already on disk.
 *
 * Records are scanned per model and the FURTHEST-future window wins: different
 * tasks trip at different moments, and the pessimistic read is the one that
 * avoids burning a sweep on guaranteed failures. Records without a window (the
 * overwhelming majority) and unparseable timestamps are ignored — a
 * quota-locked verdict must never rest on a bad date.
 */
export function quotaLockedModels(
  results: readonly BenchmarkResult[],
  modelIds: readonly string[],
  now: Date = new Date()
): QuotaLock[] {
  const targeted = new Set(modelIds)
  const furthest = new Map<string, number>()
  for (const result of results) {
    if (!result.quotaNextResetAt || !targeted.has(result.modelId)) continue
    const at = Date.parse(result.quotaNextResetAt)
    if (Number.isNaN(at) || at <= now.getTime()) continue
    furthest.set(result.modelId, Math.max(furthest.get(result.modelId) ?? 0, at))
  }
  // Ordered by the run's own model list so the operator reads the models back
  // in the order they asked for them.
  return modelIds
    .filter((id) => furthest.has(id))
    .map((id) => ({ modelId: id, until: new Date(furthest.get(id)!).toISOString() }))
}
