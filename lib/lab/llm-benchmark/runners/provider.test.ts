import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BenchmarkModel, BenchmarkTask } from '../types'
// Mock the wire + cache layers so the runner logic is exercised in isolation.
vi.mock('./moonshot', () => ({ generateMoonshot: vi.fn() }))
vi.mock('../cache', () => ({
  getCachedResponse: vi.fn(() => undefined),
  setCachedResponse: vi.fn(),
  setBustCache: vi.fn(),
  saveQueue: Promise.resolve(),
}))

import { aggregateRuns, createProviderRunner, isQuotaError } from './provider'
import { generateMoonshot } from './moonshot'
import type { IterationRun } from './provider'

const generateMock = vi.mocked(generateMoonshot)

const MODEL: BenchmarkModel = {
  id: 'test-kimi',
  name: 'Test Kimi',
  provider: 'Moonshot AI',
  costPer1kInputUsd: 0.001,
  costPer1kOutputUsd: 0.002,
  contextWindow: 1000,
  capabilities: '',
}

const MODEL2: BenchmarkModel = {
  id: 'test-gemini',
  name: 'Test Gemini',
  provider: 'Moonshot AI',
  costPer1kInputUsd: 0.001,
  costPer1kOutputUsd: 0.002,
  contextWindow: 1000,
  capabilities: '',
}

const TASK: BenchmarkTask = {
  id: 'task-x',
  category: 'security-tasks',
  title: 'Task X',
  blurb: '',
  prompt: 'do the thing',
  runtimeHint: '',
  iterationsDefault: 5,
  methodNotes: '',
  demoComponentName: 'CryptoHashRaceDemo',
  slug: 'task-x',
}

const OK = { output: 'x'.repeat(80), tokensIn: 10, tokensOut: 20, runtimeMs: 100 }

describe('isQuotaError', () => {
  it('detects provider quota/billing errors', () => {
    expect(
      isQuotaError(
        new Error(
          'Moonshot error 403: {"error":{"message":"You\'ve reached your usage limit for this billing cycle.","type":"access_terminated_error"}}'
        )
      )
    ).toBe(true)
    expect(isQuotaError(new Error('OpenAI error 429: insufficient_quota'))).toBe(true)
    expect(isQuotaError(new Error('Anthropic error: credit balance is too low'))).toBe(true)
  })

  it('rejects transient and unrelated errors', () => {
    expect(isQuotaError(new Error('Timeout after 600000ms'))).toBe(false)
    expect(isQuotaError(new Error('fetch failed'))).toBe(false)
    expect(isQuotaError(new Error('Moonshot error 500: internal'))).toBe(false)
    expect(isQuotaError('not an error')).toBe(false)
  })
})

describe('createProviderRunner quota handling', () => {
  beforeEach(() => {
    generateMock.mockReset()
  })

  it('trips the model circuit breaker on quota errors: one call, then skips', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    generateMock.mockRejectedValue(
      new Error('Moonshot error 403: usage limit for this billing cycle (access_terminated_error)')
    )
    const runner = createProviderRunner({ moonshot: { apiKey: 'k' }, bustCache: true, maxRetries: 0 })

    // First task: quota error on iteration 1 — remaining 4 iterations skipped.
    const [result] = await runner.runTask(MODEL, TASK, 5)
    expect(result.status).toBe('fail')
    expect(generateMock).toHaveBeenCalledTimes(1)

    // Every later task for the same model short-circuits without an API call.
    await expect(runner.runTask(MODEL, TASK, 5)).rejects.toThrow(/quota\/billing/i)
    expect(generateMock).toHaveBeenCalledTimes(1)

    // The breaker log must reference the model (not the provider) so a
    // user reading logs can see which subscription hit its cap. Per-model
    // quotas (e.g. Agy "individual quota reached") need the model name, not
    // the shared provider string — every Agy model uses provider 'Agy'.
    const breakerLog = consoleErrorSpy.mock.calls
      .map((args) => String(args[0]))
      .find((line) => line.includes('quota/billing exhausted'))
    expect(breakerLog).toBeDefined()
    expect(breakerLog).toMatch(/Test Kimi/)
    expect(breakerLog).not.toMatch(/Moonshot AI/)
    consoleErrorSpy.mockRestore()
  })

  it('does not trip other models on the same provider', async () => {
    generateMock.mockRejectedValue(
      new Error('Moonshot error 403: usage limit for this billing cycle (access_terminated_error)')
    )
    const runner = createProviderRunner({ moonshot: { apiKey: 'k' }, bustCache: true, maxRetries: 0 })

    await runner.runTask(MODEL, TASK, 5)
    expect(generateMock).toHaveBeenCalledTimes(1)

    // A different model sharing the provider must still be able to run.
    generateMock.mockResolvedValueOnce(OK)
    const [result] = await runner.runTask(MODEL2, TASK, 1)
    expect(result.status).toBe('success')
    expect(generateMock).toHaveBeenCalledTimes(2)
  })

  it('breaks the iteration loop on non-transient errors', async () => {
    generateMock.mockRejectedValue(new Error('Moonshot error 400: invalid request'))
    const runner = createProviderRunner({ moonshot: { apiKey: 'k' }, bustCache: true, maxRetries: 0 })

    const [result] = await runner.runTask(MODEL, TASK, 5)
    expect(result.status).toBe('fail')
    expect(generateMock).toHaveBeenCalledTimes(1)
  })

  it('keeps iterating through transient failures', async () => {
    generateMock
      .mockRejectedValueOnce(new Error('Timeout after 600000ms'))
      .mockResolvedValueOnce(OK)
    const runner = createProviderRunner({ moonshot: { apiKey: 'k' }, bustCache: true, maxRetries: 0 })

    const [result] = await runner.runTask(MODEL, TASK, 2)
    expect(generateMock).toHaveBeenCalledTimes(2)
    expect(result.status).toBe('partial')
    expect(result.iterationsSucceeded).toBe(1)
  })
})

describe('aggregateRuns', () => {
  const runs = (n: number): IterationRun[] =>
    Array.from({ length: n }, () => ({ ...OK, status: 'success' }))

  it('persists no iterationCheckResults when the scorer has no breakdown', async () => {
    const scorer = {
      score: () => 50,
    }
    const result = await aggregateRuns(runs(3), 3, MODEL, TASK, scorer)
    expect(result.iterationScores).toEqual([50, 50, 50])
    expect(result.iterationCheckResults).toBeUndefined()
  })

  it('persists per-iteration checks aligned with iterationScores via scoreWithBreakdown', async () => {
    const checks = [
      { name: 'space-jump-dispatch', passed: true, points: 40, maxPoints: 40 },
      { name: 'canvas-advance', passed: false, points: 0, maxPoints: 30, detail: 'pixels unchanged' },
    ]
    const scorer = {
      score: () => 40,
      scoreWithBreakdown: () => ({ score: 40, checks }),
    }

    const result = await aggregateRuns(runs(3), 3, MODEL, TASK, scorer)
    expect(result.iterationScores).toEqual([40, 40, 40])
    expect(result.iterationCheckResults).toHaveLength(3)
    for (const it of result.iterationCheckResults!) {
      expect(it).toEqual(checks)
    }
  })

  it('drops the check breakdown when no iteration produced a scoreable artifact', async () => {
    const scorer = {
      score: () => 0,
      scoreWithBreakdown: () => ({ score: 0, checks: [] }),
    }

    const failedRuns: IterationRun[] = [
      { ...OK, status: 'fail', failureReason: 'quota_exhausted', output: 'error 403' },
    ]
    const result = await aggregateRuns(failedRuns, 5, MODEL, TASK, scorer)
    expect(result.status).toBe('fail')
    expect(result.iterationScores).toBeUndefined()
    expect(result.iterationCheckResults).toBeUndefined()
  })
})
