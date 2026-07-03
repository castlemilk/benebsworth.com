import type { BenchmarkModel, BenchmarkResult, BenchmarkRunner, BenchmarkTask } from './types'

export type { BenchmarkRunner }

export function estimateCost(tokensIn: number, tokensOut: number, model: BenchmarkModel): number {
  return (tokensIn / 1000) * model.costPer1kInputUsd + (tokensOut / 1000) * model.costPer1kOutputUsd
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

export async function runBenchmark(
  runner: BenchmarkRunner,
  tasks: BenchmarkTask[],
  models: BenchmarkModel[],
  iterations?: number,
  concurrencyOrOptions?: number | { concurrency?: number }
): Promise<BenchmarkResult[]> {
  const concurrency =
    typeof concurrencyOrOptions === 'number'
      ? concurrencyOrOptions
      : (concurrencyOrOptions?.concurrency ?? 3)

  const all: BenchmarkResult[] = []

  const jobs: (() => Promise<void>)[] = []
  for (const task of tasks) {
    const taskIterations = iterations ?? task.iterationsDefault
    for (const model of models) {
      jobs.push(async () => {
        const runs = await runner.runTask(model, task, taskIterations)
        all.push(...runs)
      })
    }
  }

  await runWithConcurrency(jobs, concurrency)
  return all
}
