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

import { createProviderRunner, isQuotaError } from './provider'
import { generateMoonshot } from './moonshot'

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

  it('trips the provider circuit breaker on quota errors: one call, then skips', async () => {
    generateMock.mockRejectedValue(
      new Error('Moonshot error 403: usage limit for this billing cycle (access_terminated_error)')
    )
    const runner = createProviderRunner({ moonshot: { apiKey: 'k' }, bustCache: true, maxRetries: 0 })

    // First task: quota error on iteration 1 — remaining 4 iterations skipped.
    const [result] = await runner.runTask(MODEL, TASK, 5)
    expect(result.status).toBe('fail')
    expect(generateMock).toHaveBeenCalledTimes(1)

    // Every later task for the same provider short-circuits without an API call.
    await expect(runner.runTask(MODEL, TASK, 5)).rejects.toThrow(/quota\/billing/i)
    expect(generateMock).toHaveBeenCalledTimes(1)
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
