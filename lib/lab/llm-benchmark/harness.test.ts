import { describe, it, expect } from 'vitest'
import { runBenchmark, aggregateResults, estimateCost } from './harness'
import { aggregateRuns, type IterationRun } from './runners/provider'
import type { BenchmarkModel, BenchmarkResult, BenchmarkRunner, BenchmarkTask, Scorer } from './types'

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

  it('continues past a task/model job that throws and keeps the other results', async () => {
    const throwingRunner: BenchmarkRunner = {
      runTask: async (_model, _task, _iterations) => {
        if (_model.id === 'boom') throw new Error('provider exploded')
        return [
          {
            taskId: _task.id,
            modelId: _model.id,
            score: 50,
            runtimeMs: 1,
            tokensIn: 1,
            tokensOut: 1,
            costUsd: 0,
            iterations: _iterations,
            status: 'success',
            createdAt: new Date().toISOString(),
          },
        ]
      },
    }
    const boom = { ...model, id: 'boom' }
    const results = await runBenchmark(throwingRunner, [task], [boom, model], 1, 1)
    expect(results).toHaveLength(1)
    expect(results[0]?.modelId).toBe('test-model')
  })

  it('never calls the runner for a skipPairs pair (the resume skip)', async () => {
    const called: string[] = []
    const runner: BenchmarkRunner = {
      runTask: async (m, t, iterations) => {
        called.push(`${m.id}|${t.id}`)
        return [
          {
            taskId: t.id,
            modelId: m.id,
            score: 50,
            runtimeMs: 1,
            tokensIn: 1,
            tokensOut: 1,
            costUsd: 0,
            iterations,
            status: 'success',
            createdAt: new Date().toISOString(),
          },
        ]
      },
    }
    const other = { ...model, id: 'other-model' }
    const results = await runBenchmark(runner, [task], [model, other], 1, {
      concurrency: 1,
      skipPairs: new Set(['test-model|test-task']),
    })
    // Skipped means NOT RUN — no call, and therefore no fresh record either
    // (the original run's record is already in results.json).
    expect(called).toEqual(['other-model|test-task'])
    expect(results.map((r) => r.modelId)).toEqual(['other-model'])
  })

  it('runs everything when skipPairs is empty or absent', async () => {
    const runner = createRecordingRunner([])
    expect(await runBenchmark(runner, [task], [model], 1, { skipPairs: new Set() })).toHaveLength(1)
    expect(await runBenchmark(runner, [task], [model], 1, { concurrency: 2 })).toHaveLength(1)
  })
})

describe('estimateCost', () => {
  const pricedModel: BenchmarkModel = {
    ...model,
    costPer1kInputUsd: 0.003,
    costPer1kOutputUsd: 0.015,
  }

  it('computes per-1k input pricing', () => {
    // 1500 tokens in at $0.003/1k = $0.0045
    expect(estimateCost(1500, 0, pricedModel)).toBeCloseTo(0.0045, 10)
  })

  it('computes per-1k output pricing', () => {
    // 2000 tokens out at $0.015/1k = $0.03
    expect(estimateCost(0, 2000, pricedModel)).toBeCloseTo(0.03, 10)
  })

  it('sums input and output costs', () => {
    expect(estimateCost(1500, 1000, pricedModel)).toBeCloseTo(0.0045 + 0.015, 10)
  })

  it('returns 0 for zero tokens', () => {
    expect(estimateCost(0, 0, pricedModel)).toBe(0)
  })
})

describe('aggregateRuns', () => {
  const scorer: Scorer = {
    // Deterministic: score = output length (so mean-across-iterations is checkable).
    score: (output: string) => output.length,
  }

  const success = (output: string, runtimeMs: number, tokensIn = 100, tokensOut = 200): IterationRun => ({
    output,
    tokensIn,
    tokensOut,
    runtimeMs,
    status: 'success',
  })
  const failure = (timedOut = false): IterationRun => ({
    output: timedOut ? 'Timeout after 1ms: x' : 'HTTP 500',
    tokensIn: 0,
    tokensOut: 0,
    runtimeMs: 0,
    status: 'fail',
    timedOut,
  })

  it('all iterations succeed: status success, mean score and runtime, total tokens/cost', async () => {
    const runs = [success('a'.repeat(80), 1000), success('b'.repeat(90), 3000)]
    const result = await aggregateRuns(runs, 2, model, task, scorer, '2026-01-01T00:00:00.000Z')

    expect(result.status).toBe('success')
    expect(result.iterations).toBe(2)
    expect(result.iterationsSucceeded).toBe(2)
    expect(result.source).toBe('live')
    // Mean score across BOTH successful iterations, not just the first.
    expect(result.score).toBe(85)
    // Mean runtime per successful iteration.
    expect(result.runtimeMs).toBe(2000)
    // Tokens are totals.
    expect(result.tokensIn).toBe(200)
    expect(result.tokensOut).toBe(400)
    // Cost is the TOTAL spend across all iterations.
    expect(result.costUsd).toBeCloseTo(estimateCost(200, 400, model), 10)
    // The BEST-scoring successful output is published (the demo renders it) —
    // 'b'.repeat(90) scores 90 vs 80 under the length scorer.
    expect(result.output).toBe('b'.repeat(90))
    expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('carries a usage summary whose totals and provenance match the iterations', async () => {
    const runs: IterationRun[] = [
      { ...success('a'.repeat(80), 1000), usageSource: 'reported' },
      { ...success('b'.repeat(90), 3000), usageSource: 'reported' },
    ]
    const result = await aggregateRuns(runs, 2, model, task, scorer)

    expect(result.usage).toEqual({ inputTokens: 200, outputTokens: 400, source: 'reported' })
    // The flat fields are the same totals — they are derived from the summary.
    expect(result.tokensIn).toBe(result.usage!.inputTokens)
    expect(result.tokensOut).toBe(result.usage!.outputTokens)
  })

  it("rolls a reported + estimated pair up to 'mixed', and unstamped runs to 'estimated'", async () => {
    const mixed = await aggregateRuns(
      [
        { ...success('a'.repeat(80), 1000), usageSource: 'reported' },
        { ...success('b'.repeat(90), 3000), usageSource: 'estimated' },
      ],
      2,
      model,
      task,
      scorer
    )
    expect(mixed.usage!.source).toBe('mixed')

    // A pre-usageSource producer (or a plugin generator that never sets it):
    // unknown provenance reads as estimated, never as a provider statement.
    const unstamped = await aggregateRuns([success('a'.repeat(80), 1000)], 1, model, task, scorer)
    expect(unstamped.usage!.source).toBe('estimated')

    // A failed 0-token iteration does not drag a reported record to 'mixed'.
    const withFailure = await aggregateRuns(
      [{ ...success('a'.repeat(80), 1000), usageSource: 'reported' }, failure()],
      2,
      model,
      task,
      scorer
    )
    expect(withFailure.usage!.source).toBe('reported')
  })

  it('LOCK: costUsd is byte-identical to the pre-billing flat math', async () => {
    const runs = [success('a'.repeat(80), 1000, 1234, 5678), success('b'.repeat(90), 3000, 1, 2)]
    const result = await aggregateRuns(runs, 2, model, task, scorer)

    // Hard-coded from the OLD formula (tokens/1000 * rate) so this test would
    // still fail if both the implementation and estimateCost drifted together:
    // 1235/1000*0.01 + 5680/1000*0.03 = 0.012350 + 0.170400.
    expect(result.costUsd).toBeCloseTo(0.01235 + 0.1704, 10)
    expect(result.costUsd).toBeCloseTo(estimateCost(1235, 5680, model), 10)
  })

  it('some iterations fail: status partial, stats over successful runs only', async () => {
    const runs = [success('a'.repeat(60), 1500), failure(), success('b'.repeat(70), 2500)]
    const result = await aggregateRuns(runs, 3, model, task, scorer)

    expect(result.status).toBe('partial')
    expect(result.iterationsSucceeded).toBe(2)
    expect(result.score).toBe(65)
    // Failed 0ms runs must not deflate the mean runtime.
    expect(result.runtimeMs).toBe(2000)
    expect(result.tokensIn).toBe(200)
    expect(result.tokensOut).toBe(400)
    // Best-scoring successful output wins (70 > 60 under the length scorer).
    expect(result.output).toBe('b'.repeat(70))
  })

  it('all iterations fail: status fail, score 0, error message as output', async () => {
    const result = await aggregateRuns([failure(), failure()], 2, model, task, scorer)
    expect(result.status).toBe('fail')
    expect(result.iterationsSucceeded).toBe(0)
    expect(result.score).toBe(0)
    expect(result.runtimeMs).toBe(0)
    expect(result.output).toBe('HTTP 500')
  })

  it('all fail with a final timeout: status timeout', async () => {
    const result = await aggregateRuns([failure(false), failure(true)], 2, model, task, scorer)
    expect(result.status).toBe('timeout')
    expect(result.iterationsSucceeded).toBe(0)
    expect(result.score).toBe(0)
  })

  it('demotes degenerate short outputs (e.g. a bare "DONE" acknowledgement)', async () => {
    // A file-handoff iteration that never wrote the artifact leaves stdout
    // "DONE" — under 40 chars, it must not count as a scoreable success nor be
    // published as the representative output.
    const runs = [success('DONE', 10), success('r'.repeat(64), 20)]
    const result = await aggregateRuns(runs, 2, model, task, scorer)
    expect(result.status).toBe('partial')
    expect(result.iterationsSucceeded).toBe(1)
    expect(result.output).toBe('r'.repeat(64))
  })

  it('clamps the mean score to 1..100 and rounds to one decimal', async () => {
    const tiny = await aggregateRuns([success('', 10), success('x'.repeat(41), 10)], 2, model, task, scorer)
    // Empty-output "success" is demoted to a failure; the remaining score stays clamped >= 1.
    expect(tiny.status).toBe('partial')
    expect(tiny.score).toBe(41)

    const huge = await aggregateRuns([success('z'.repeat(500), 10)], 1, model, task, scorer)
    expect(huge.score).toBe(100)

    const fractional = await aggregateRuns(
      [success('a'.repeat(80), 10), success('b'.repeat(85), 10), success('c'.repeat(91), 10)],
      3,
      model,
      task,
      scorer
    )
    // mean(80, 85, 91) = 85.333... -> rounded to one decimal
    expect(fractional.score).toBe(85.3)
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
