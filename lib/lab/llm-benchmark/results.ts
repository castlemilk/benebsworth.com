import { createHash } from 'node:crypto'
import type { BenchmarkResult } from './types'
import resultsJson from './results.json'

/**
 * Benchmark results — SERVER-SIDE ONLY.
 *
 * results.json is ~2.8 MB because every record carries the model's full
 * generated output for the side-by-side comparison view. Importing this
 * module from a 'use client' component would ship all of that in the
 * client bundle (it did, once: a 3.1 MB chunk on every benchmark page).
 *
 * Rules:
 *  - Pages (server components) import from here at build time.
 *  - Client components receive `BenchmarkResultMeta` (output stripped)
 *    via props — see stripOutput().
 *  - Full outputs are published as static per-task JSON by
 *    scripts/gen-benchmark-outputs.mjs and fetched on demand.
 */
export const BENCHMARK_RESULTS: BenchmarkResult[] = resultsJson as BenchmarkResult[]

/** A result without its (potentially huge) generated output — safe to pass to client components. */
export type BenchmarkResultMeta = Omit<BenchmarkResult, 'output'> & {
  hasOutput: boolean
  /**
   * Short content hash of the output, appended as `?v=` to the on-demand
   * output-JSON fetch. The demo fetches with `cache: 'force-cache'` (never
   * revalidates), and the JSON path is stable across deploys — without a
   * content-derived version, a rerun artifact would be shadowed by the
   * browser's stale copy forever.
   */
  outputVersion: string
}

export function stripOutput(r: BenchmarkResult): BenchmarkResultMeta {
  const { output, ...meta } = r
  const hasOutput = Boolean(output && output.trim().length > 0)
  const outputVersion =
    output && hasOutput ? createHash('sha256').update(output).digest('hex').slice(0, 10) : ''
  return { ...meta, hasOutput, outputVersion }
}

export function resultsForTask(taskId: string): BenchmarkResult[] {
  return BENCHMARK_RESULTS.filter((r) => r.taskId === taskId)
}

export function resultsForModel(modelId: string): BenchmarkResult[] {
  return BENCHMARK_RESULTS.filter((r) => r.modelId === modelId)
}

/** How many iterations of a recorded result actually produced an artifact.
 *  Older records predate the iterationsSucceeded field; per its contract an
 *  absent field means "all iterations succeeded". */
function succeededIterations(r: BenchmarkResult): number {
  return r.iterationsSucceeded ?? (r.status === 'success' ? r.iterations : 0)
}

/**
 * Merge freshly-run results into a baseline, replacing matching
 * (modelId, taskId) records — with one protection: a fresh result with ZERO
 * successful iterations (e.g. a sweep killed by quota/billing exhaustion or
 * auth failure) never replaces a baseline record that did produce artifacts.
 * A quota outage says nothing about the model; clobbering good data with it
 * would corrupt the comparison. Such drops are logged by the caller-visible
 * `onProtect` hook. The only things a dropped record contributes are its
 * `quotaNextResetAt` estimate and its `budgetExceeded` stamp — see the
 * carry-over comment below.
 */
export function mergeResults(
  baseline: BenchmarkResult[],
  fresh: BenchmarkResult[],
  onProtect?: (kept: BenchmarkResult, dropped: BenchmarkResult) => void
): BenchmarkResult[] {
  const byKey = new Map(baseline.map((r) => [`${r.modelId}|${r.taskId}`, r]))
  for (const f of fresh) {
    const key = `${f.modelId}|${f.taskId}`
    const prev = byKey.get(key)
    if (prev && succeededIterations(prev) > 0 && succeededIterations(f) === 0) {
      onProtect?.(prev, f)
      // Keep the baseline record — but carry over the fresh run's estimated
      // quota window if it has one. That stamp is operational METADATA about
      // the ACCOUNT (when may I run again?), not measurement data about the
      // model, so copying it forward doesn't violate the never-clobber-good-data
      // contract: every scored field stays exactly as the good run left it.
      // Without this the stamp would only ever survive for (model, task) pairs
      // that had no prior success, and the pre-flight — which is the whole
      // point of recording it — would be blind for well-covered models.
      // `budgetExceeded` (#28) rides along for exactly the same reason: it is
      // operator metadata about the SWEEP (this model hit its cap), not a
      // measurement of the model, and it is the only surviving explanation of
      // why later tasks for that model have no fresh rows at all.
      byKey.set(key, {
        ...prev,
        ...(f.quotaNextResetAt ? { quotaNextResetAt: f.quotaNextResetAt } : {}),
        ...(f.budgetExceeded ? { budgetExceeded: f.budgetExceeded } : {}),
      })
      continue
    }
    byKey.set(key, f)
  }
  return [...byKey.values()]
}
