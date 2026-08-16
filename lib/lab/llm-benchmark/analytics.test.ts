import { describe, it, expect } from 'vitest'
import { modelCompletion } from './analytics'
import type { BenchmarkResult } from './types'

function makeResult(overrides: Partial<BenchmarkResult> = {}): BenchmarkResult {
  return {
    taskId: 'task-a',
    modelId: 'model-a',
    score: 80,
    runtimeMs: 1000,
    tokensIn: 100,
    tokensOut: 200,
    costUsd: 0.01,
    iterations: 5,
    iterationsSucceeded: 5,
    status: 'success',
    createdAt: '2026-01-01T00:00:00Z',
    source: 'live',
    ...overrides,
  }
}

describe('modelCompletion', () => {
  it('counts success and partial as done, and counts timeouts separately', () => {
    const c = modelCompletion(
      [
        makeResult({ taskId: 't1', status: 'success' }),
        makeResult({ taskId: 't2', status: 'partial' }),
        makeResult({ taskId: 't3', status: 'timeout', failureReason: 'cli_timeout' }),
        makeResult({ taskId: 't4', status: 'timeout', failureReason: 'cli_timeout' }),
        makeResult({ taskId: 't5', status: 'fail', failureReason: 'model_error' }),
      ],
      8
    )
    expect(c.tasksDone).toBe(2)
    expect(c.timeouts).toBe(2)
    expect(c.tasksTotal).toBe(8)
    expect(c.attempted).toBe(5)
  })

  it('excludes seeded sample data from every statistic', () => {
    const c = modelCompletion(
      [
        makeResult({ taskId: 't1', source: 'seeded', costUsd: 5, score: 100 }),
        makeResult({ taskId: 't2', source: 'seeded', status: 'timeout' }),
        makeResult({ taskId: 't3', source: 'live', costUsd: 0.02, score: 50, runtimeMs: 2000 }),
      ],
      7
    )
    expect(c.attempted).toBe(1)
    expect(c.tasksDone).toBe(1)
    expect(c.timeouts).toBe(0)
    expect(c.totalCostUsd).toBeCloseTo(0.02)
    expect(c.meanScore).toBe(50)
    expect(c.meanRuntimeMs).toBe(2000)
  })

  it('treats a record with no source as live (older records predate the field)', () => {
    const { source: _drop, ...noSource } = makeResult()
    const c = modelCompletion([noSource as BenchmarkResult], 7)
    expect(c.attempted).toBe(1)
    expect(c.tasksDone).toBe(1)
  })

  it('returns an all-zero shape for a model with no live results', () => {
    const c = modelCompletion([], 7)
    expect(c).toEqual({
      tasksTotal: 7,
      tasksDone: 0,
      timeouts: 0,
      attempted: 0,
      meanRuntimeMs: 0,
      meanScore: 0,
      totalCostUsd: 0,
      costPerPoint: 0,
    })
  })

  it('averages runtime and score over COMPLETED tasks only', () => {
    const c = modelCompletion(
      [
        makeResult({ taskId: 't1', status: 'success', score: 90, runtimeMs: 1000 }),
        makeResult({ taskId: 't2', status: 'partial', score: 50, runtimeMs: 3000 }),
        // A timeout scores 0 and burns wall clock; it must not drag the
        // "how did it do when it finished" averages.
        makeResult({ taskId: 't3', status: 'timeout', score: 0, runtimeMs: 900_000 }),
      ],
      7
    )
    expect(c.meanScore).toBe(70)
    expect(c.meanRuntimeMs).toBe(2000)
  })

  it('locks cost-per-point as totalCost / max(meanScore, 0.1)', () => {
    const c = modelCompletion(
      [
        makeResult({ taskId: 't1', status: 'success', score: 50, costUsd: 0.4 }),
        makeResult({ taskId: 't2', status: 'success', score: 50, costUsd: 0.6 }),
      ],
      7
    )
    expect(c.totalCostUsd).toBeCloseTo(1)
    expect(c.meanScore).toBe(50)
    expect(c.costPerPoint).toBeCloseTo(1 / 50)
  })

  it('clamps the divisor at 0.1 so a zero-scoring model does not divide by zero', () => {
    const c = modelCompletion(
      [makeResult({ taskId: 't1', status: 'fail', score: 0, costUsd: 0.5 })],
      7
    )
    expect(c.meanScore).toBe(0)
    expect(c.costPerPoint).toBeCloseTo(5) // 0.5 / 0.1
    expect(Number.isFinite(c.costPerPoint)).toBe(true)
  })

  it('counts total cost across every live record, including failures', () => {
    const c = modelCompletion(
      [
        makeResult({ taskId: 't1', status: 'success', costUsd: 0.01 }),
        makeResult({ taskId: 't2', status: 'timeout', costUsd: 0.02 }),
        makeResult({ taskId: 't3', status: 'fail', costUsd: 0.03 }),
      ],
      7
    )
    expect(c.totalCostUsd).toBeCloseTo(0.06)
  })

  it('reports zero cost-per-point for a free-tier model', () => {
    const c = modelCompletion(
      [makeResult({ taskId: 't1', status: 'success', score: 60, costUsd: 0 })],
      7
    )
    expect(c.costPerPoint).toBe(0)
  })

  it('defaults tasksTotal to the merged registry roster', () => {
    const c = modelCompletion([])
    expect(c.tasksTotal).toBeGreaterThanOrEqual(8)
  })
})
