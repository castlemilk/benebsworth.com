import { costFromUsage } from './billing'
import type { BenchmarkModel, BenchmarkResult, BenchmarkRunner, BenchmarkTask } from './types'

export type { BenchmarkRunner }

/**
 * @deprecated Use `costFromUsage(summarizeUsage(runs), model)` from
 * `./billing` — it carries the provenance of the tokens it prices
 * (`UsageSummary.source`) and knows about cached-token counters, neither of
 * which a bare pair of numbers can express.
 *
 * Kept as a thin wrapper (identical results by construction: a summary with no
 * cached tokens IS the flat math) so existing callers and their tests stay
 * valid. `billing.test.ts` locks the two against each other across fixtures.
 */
export function estimateCost(tokensIn: number, tokensOut: number, model: BenchmarkModel): number {
  return costFromUsage({ inputTokens: tokensIn, outputTokens: tokensOut, source: 'estimated' }, model)
}

export interface AggregateStats {
  count: number
  avgScore: number
  avgRuntimeMs: number
  avgCostUsd: number
  totalTokensIn: number
  totalTokensOut: number
  totalIterations: number
  successRate: number
}

export function aggregateResults(results: BenchmarkResult[]): AggregateStats {
  const count = results.length
  if (count === 0) {
    return {
      count: 0,
      avgScore: 0,
      avgRuntimeMs: 0,
      avgCostUsd: 0,
      totalTokensIn: 0,
      totalTokensOut: 0,
      totalIterations: 0,
      successRate: 0,
    }
  }

  const sumScore = results.reduce((sum, r) => sum + r.score, 0)
  const sumRuntime = results.reduce((sum, r) => sum + r.runtimeMs, 0)
  const sumCost = results.reduce((sum, r) => sum + r.costUsd, 0)
  const totalTokensIn = results.reduce((sum, r) => sum + r.tokensIn, 0)
  const totalTokensOut = results.reduce((sum, r) => sum + r.tokensOut, 0)
  const totalIterations = results.reduce((sum, r) => sum + r.iterations, 0)
  const successCount = results.filter((r) => r.status === 'success').length

  return {
    count,
    avgScore: sumScore / count,
    avgRuntimeMs: sumRuntime / count,
    avgCostUsd: sumCost / count,
    totalTokensIn,
    totalTokensOut,
    totalIterations,
    successRate: successCount / count,
  }
}

async function runWithConcurrency<T>(
  jobs: (() => Promise<T>)[],
  concurrency: number
): Promise<(T | undefined)[]> {
  if (concurrency < 1) concurrency = 1
  const results: (T | undefined)[] = new Array(jobs.length)
  let index = 0

  async function worker() {
    while (index < jobs.length) {
      const i = index++
      try {
        results[i] = await jobs[i]()
      } catch (err) {
        // One failed task/model combination must not abort the whole run and
        // discard every other job's results — log it and keep going.
        console.error(
          `[harness] job ${i + 1}/${jobs.length} failed: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`
        )
      }
    }
  }

  const workers = Array.from({ length: concurrency }, worker)
  await Promise.all(workers)
  return results
}

export interface RunBenchmarkOptions {
  concurrency?: number
  /**
   * `${modelId}|${taskId}` keys to leave OUT of the job list entirely — the
   * resume path (`lib/lab/llm-benchmark/resume.ts`), which skips pairs a killed
   * sweep already checkpointed. The set is computed by the caller; this
   * function only declines to build those jobs, so a skipped pair costs no
   * call, no run log (the writer truncates on open) and no fresh record.
   *
   * It is a PAIR set rather than a smaller `tasks`/`models` pair of lists
   * because a resume's completed set is generally not a rectangle: a sweep dies
   * partway through the cross product.
   */
  skipPairs?: ReadonlySet<string>
}

export async function runBenchmark(
  runner: BenchmarkRunner,
  tasks: BenchmarkTask[],
  models: BenchmarkModel[],
  iterations?: number,
  concurrencyOrOptions?: number | RunBenchmarkOptions
): Promise<BenchmarkResult[]> {
  const concurrency =
    typeof concurrencyOrOptions === 'number'
      ? concurrencyOrOptions
      : (concurrencyOrOptions?.concurrency ?? 3)
  const skipPairs = typeof concurrencyOrOptions === 'number' ? undefined : concurrencyOrOptions?.skipPairs

  const all: BenchmarkResult[] = []

  const jobs: (() => Promise<void>)[] = []
  for (const task of tasks) {
    const taskIterations = iterations ?? task.iterationsDefault
    for (const model of models) {
      if (skipPairs?.has(`${model.id}|${task.id}`)) continue
      jobs.push(async () => {
        const runs = await runner.runTask(model, task, taskIterations)
        all.push(...runs)
      })
    }
  }

  await runWithConcurrency(jobs, concurrency)
  return all
}
