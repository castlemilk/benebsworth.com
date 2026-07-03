import { describe, it, expect } from 'vitest'
import { runBenchmark, aggregateResults } from './harness'
import type { BenchmarkModel, BenchmarkResult, BenchmarkRunner, BenchmarkTask } from './types'

const model: BenchmarkModel = {
  id: 'test-model',
  name: 'Test Model',
  provider: 'OpenAI',
  costPer1kInputUsd: 0.01,
  costPer1kOutputUsd: 0.03,
  contextWindow: 128000,
  capabilities: '',
}

const task: BenchmarkTask = {
  id: 'test-task',
  category: 'ui-building',
  title: 'Test Task',
  blurb: '',
  prompt: '',
  runtimeHint: '',
  iterationsDefault: 3,
  methodNotes: '',
  demoComponentName: 'TestDemo',
  slug: 'test-task',
}

function createRecordingRunner(records: { start: number; end: number }[]): BenchmarkRunner {
  return {
    runTask: async (_model: BenchmarkModel, _task: BenchmarkTask, _iterations: number): Promise<BenchmarkResult[]> => {
      const start = Date.now()
      await new Promise((resolve) => setTimeout(resolve, 100))
      const end = Date.now()
      records.push({ start, end })
      return [
        {
          taskId: _task.id,
          modelId: _model.id,
          score: 50,
          runtimeMs: end - start,
          tokensIn: 10,
          tokensOut: 10,
          costUsd: 0.001,
          iterations: _iterations,
          status: 'success',
          createdAt: new Date().toISOString(),
        },
      ]
    },
  }
}

describe('runBenchmark', () => {
  it('runs all task/model combinations', async () => {
    const runner = createRecordingRunner([])
    const results = await runBenchmark(runner, [task], [model])
    expect(results).toHaveLength(1)
    expect(results[0]?.taskId).toBe('test-task')
    expect(results[0]?.modelId).toBe('test-model')
    expect(results[0]?.iterations).toBe(3)
  })

  it('respects the concurrency limit', async () => {
    const records: { start: number; end: number }[] = []
    const runner = createRecordingRunner(records)
    const models = [model, model, model]
    const start = Date.now()
    await runBenchmark(runner, [task], models, undefined, 2)
    const elapsed = Date.now() - start

    // With 3 models each taking ~100ms and concurrency 2, total elapsed should
    // be well under the 300ms a fully sequential run would take.
    expect(elapsed).toBeLessThan(250)

    // At least two runs should overlap.
    const overlaps = records.some((a) =>
      records.some((b) => a !== b && a.start < b.end && b.start < a.end)
    )
    expect(overlaps).toBe(true)
  })

  it('overrides iterations when provided', async () => {
    const runner = createRecordingRunner([])
    const results = await runBenchmark(runner, [task], [model], 7)
    expect(results[0]?.iterations).toBe(7)
  })
})

describe('aggregateResults', () => {
  it('computes averages and totals', () => {
    const results: BenchmarkResult[] = [
      {
        taskId: 'a',
        modelId: 'm1',
        score: 80,
        runtimeMs: 100,
        tokensIn: 10,
        tokensOut: 20,
        costUsd: 0.1,
        iterations: 5,
        status: 'success',
        createdAt: '',
      },
      {
        taskId: 'b',
        modelId: 'm2',
        score: 60,
        runtimeMs: 300,
        tokensIn: 30,
        tokensOut: 40,
        costUsd: 0.3,
        iterations: 5,
        status: 'fail',
        createdAt: '',
      },
    ]
    const stats = aggregateResults(results)
    expect(stats.count).toBe(2)
    expect(stats.avgScore).toBe(70)
    expect(stats.avgRuntimeMs).toBe(200)
    expect(stats.avgCostUsd).toBe(0.2)
    expect(stats.totalTokensIn).toBe(40)
    expect(stats.totalTokensOut).toBe(60)
    expect(stats.totalIterations).toBe(10)
    expect(stats.successRate).toBe(0.5)
  })
})
