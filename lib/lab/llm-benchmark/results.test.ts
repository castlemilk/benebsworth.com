import { describe, it, expect, vi } from 'vitest'
import { mergeResults } from './results'
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
    output: 'real artifact',
    ...overrides,
  }
}

describe('mergeResults', () => {
  it('keeps a good baseline record when the fresh run produced zero successes', () => {
    const baseline = [makeResult()]
    const fresh = [
      makeResult({
        score: 0,
        status: 'fail',
        iterationsSucceeded: 0,
        output: 'Moonshot error 403: usage limit',
      }),
    ]
    const onProtect = vi.fn()
    const merged = mergeResults(baseline, fresh, onProtect)
    expect(merged).toHaveLength(1)
    expect(merged[0].status).toBe('success')
    expect(merged[0].output).toBe('real artifact')
    expect(onProtect).toHaveBeenCalledOnce()
  })

  it('carries the dropped record’s quota window onto the record it kept', () => {
    // The stamp is account metadata (when may I run again?), not measurement
    // data — and without this carry-over it would be lost for exactly the
    // models that HAVE good data, i.e. the ones a sweep is most likely to
    // target, leaving the pre-flight blind.
    const baseline = [makeResult()]
    const fresh = [
      makeResult({
        score: 0,
        status: 'fail',
        iterationsSucceeded: 0,
        output: 'individual quota reached. Resets in 57h27m',
        quotaNextResetAt: '2026-01-03T09:27:00.000Z',
      }),
    ]
    const merged = mergeResults(baseline, fresh)
    expect(merged[0].status).toBe('success')
    expect(merged[0].score).toBe(80)
    expect(merged[0].output).toBe('real artifact')
    expect(merged[0].quotaNextResetAt).toBe('2026-01-03T09:27:00.000Z')
    // Purity: the caller's baseline array is untouched.
    expect(baseline[0].quotaNextResetAt).toBeUndefined()
  })

  it('carries the dropped record’s budget stamp onto the record it kept', () => {
    // Same argument as quotaNextResetAt: `budgetExceeded` is OPERATOR metadata
    // (this model hit its cap for this sweep), not measurement data about the
    // model — so it survives the protection path while every scored field
    // stays exactly as the good run left it.
    const baseline = [makeResult()]
    const fresh = [
      makeResult({
        score: 0,
        status: 'fail',
        iterationsSucceeded: 0,
        output: 'budget cap reached',
        budgetExceeded: { spentUsd: 0.012, capUsd: 0.01 },
      }),
    ]
    const merged = mergeResults(baseline, fresh)
    expect(merged[0].status).toBe('success')
    expect(merged[0].score).toBe(80)
    expect(merged[0].budgetExceeded).toEqual({ spentUsd: 0.012, capUsd: 0.01 })
    expect(baseline[0].budgetExceeded).toBeUndefined()
  })

  it('carries BOTH stamps when a dropped record has a quota window and a budget stamp', () => {
    const baseline = [makeResult()]
    const fresh = [
      makeResult({
        score: 0,
        status: 'fail',
        iterationsSucceeded: 0,
        quotaNextResetAt: '2026-01-03T09:27:00.000Z',
        budgetExceeded: { spentUsd: 0.012, capUsd: 0.01 },
      }),
    ]
    const merged = mergeResults(baseline, fresh)
    expect(merged[0].quotaNextResetAt).toBe('2026-01-03T09:27:00.000Z')
    expect(merged[0].budgetExceeded).toEqual({ spentUsd: 0.012, capUsd: 0.01 })
    expect(merged[0].output).toBe('real artifact')
  })

  it('leaves the kept record alone when the dropped one has no quota window or budget stamp', () => {
    const baseline = [makeResult({ quotaNextResetAt: '2026-01-03T09:27:00.000Z' })]
    const fresh = [makeResult({ score: 0, status: 'fail', iterationsSucceeded: 0 })]
    const merged = mergeResults(baseline, fresh)
    expect(merged[0].quotaNextResetAt).toBe('2026-01-03T09:27:00.000Z')
  })

  it('replaces a baseline success with a fresh success', () => {
    const baseline = [makeResult({ score: 70 })]
    const fresh = [makeResult({ score: 90 })]
    const merged = mergeResults(baseline, fresh)
    expect(merged[0].score).toBe(90)
  })

  it('replaces a baseline success with a fresh partial (some iterations succeeded)', () => {
    const baseline = [makeResult()]
    const fresh = [makeResult({ status: 'partial', iterationsSucceeded: 2, score: 60 })]
    const merged = mergeResults(baseline, fresh)
    expect(merged[0].status).toBe('partial')
  })

  it('replaces a baseline fail with a fresh fail (nothing good to protect)', () => {
    const baseline = [makeResult({ status: 'fail', iterationsSucceeded: 0, output: 'old error' })]
    const fresh = [makeResult({ status: 'fail', iterationsSucceeded: 0, output: 'new error' })]
    const merged = mergeResults(baseline, fresh)
    expect(merged[0].output).toBe('new error')
  })

  it('adds a fresh fail when there is no baseline record for that key', () => {
    const merged = mergeResults([], [makeResult({ status: 'fail', iterationsSucceeded: 0 })])
    expect(merged).toHaveLength(1)
  })

  it('treats legacy records without iterationsSucceeded (success = all) as protected', () => {
    const legacy = makeResult()
    delete legacy.iterationsSucceeded
    const fresh = [makeResult({ status: 'fail', iterationsSucceeded: 0 })]
    const merged = mergeResults([legacy], fresh)
    expect(merged[0].status).toBe('success')
  })

  it('protects only the matching key, merging everything else normally', () => {
    const baseline = [makeResult(), makeResult({ taskId: 'task-b', score: 50 })]
    const fresh = [
      makeResult({ status: 'fail', iterationsSucceeded: 0 }), // protected
      makeResult({ taskId: 'task-b', score: 99 }), // replaces
    ]
    const merged = mergeResults(baseline, fresh)
    const a = merged.find((r) => r.taskId === 'task-a')
    const b = merged.find((r) => r.taskId === 'task-b')
    expect(a?.status).toBe('success')
    expect(b?.score).toBe(99)
  })
})
