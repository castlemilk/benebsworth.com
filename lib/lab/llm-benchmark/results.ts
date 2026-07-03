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
export type BenchmarkResultMeta = Omit<BenchmarkResult, 'output'> & { hasOutput: boolean }

export function stripOutput(r: BenchmarkResult): BenchmarkResultMeta {
  const { output, ...meta } = r
  return { ...meta, hasOutput: Boolean(output && output.trim().length > 0) }
}

export function resultsForTask(taskId: string): BenchmarkResult[] {
  return BENCHMARK_RESULTS.filter((r) => r.taskId === taskId)
}

export function resultsForModel(modelId: string): BenchmarkResult[] {
  return BENCHMARK_RESULTS.filter((r) => r.modelId === modelId)
}
