import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { BenchmarkModel, BenchmarkTask } from '../types'
// Mock the wire + cache layers so the runner logic is exercised in isolation.
vi.mock('./moonshot', () => ({ generateMoonshot: vi.fn() }))
vi.mock('./opencode', () => ({ generateOpencode: vi.fn() }))
vi.mock('../cache', () => ({
  getCachedResponse: vi.fn(() => undefined),
  setCachedResponse: vi.fn(),
  setBustCache: vi.fn(),
  saveQueue: Promise.resolve(),
}))

import {
  aggregateRuns,
  classifyFailureReason,
  createProviderRunner,
  isCliProvider,
  isQuotaError,
  TimeoutError,
} from './provider'
import { generateMoonshot } from './moonshot'
import { generateOpencode } from './opencode'
import type { IterationRun } from './provider'
import { readRunLog, runLogFileName, setRunLogDir, spillPreview } from '../runlog'

const generateMock = vi.mocked(generateMoonshot)
const generateOpencodeMock = vi.mocked(generateOpencode)

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

const CLI_MODEL: BenchmarkModel = {
  id: 'test-deepseek',
  name: 'Test DeepSeek',
  provider: 'OpenCode',
  apiModelId: 'opencode/deepseek-v4-flash-free',
  costPer1kInputUsd: 0,
  costPer1kOutputUsd: 0,
  contextWindow: 128000,
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

describe('opencode free-tier bearer blip classification', () => {
  const bearerError = new Error(
    'Error: Upstream request failed: [invalid_bearer_credential] Missing or invalid bearer credential'
  )

  it('classifies invalid_bearer_credential as transient, not auth_error', () => {
    // A revoked key would fail every attempt; this string fires intermittently
    // on opencode's free tier under concurrency while the same key succeeds
    // sequentially (0 occurrences in 5 sequential sweeps). It must be retried.
    expect(classifyFailureReason(bearerError)).toBe('rate_limited')
    expect(classifyFailureReason(bearerError)).not.toBe('auth_error')
  })

  it('keeps it out of the quota classification (no circuit breaker trip)', () => {
    expect(isQuotaError(bearerError)).toBe(false)
  })
})

describe('CLI timeout classification', () => {
  // Raw shape thrown by runCli (cli.ts) when the spawned CLI blows its cap.
  const rawCliTimeout = new Error(
    'Timeout after 600000ms: opencode run -m opencode/deepseek-v4-flash-free build the artifact'
  )
  // Shape thrown by the runner's outer withTimeout — indistinguishable from an
  // API provider timing out except for the model behind the label, which is
  // why classification takes the provider as context.
  const outerTimeout = new TimeoutError(
    'Timeout after 600000ms: DeepSeek V4 Flash Free :: Landing Page Morph #1/1'
  )

  it('flags CLI-backed providers', () => {
    expect(isCliProvider(CLI_MODEL)).toBe(true)
    expect(isCliProvider({ ...CLI_MODEL, provider: 'Agy' })).toBe(true)
    expect(isCliProvider({ ...CLI_MODEL, provider: 'Codex' })).toBe(true)
    expect(isCliProvider(MODEL)).toBe(false)
  })

  it('classifies the raw runCli timeout as cli_timeout without context', () => {
    expect(classifyFailureReason(rawCliTimeout)).toBe('cli_timeout')
    expect(classifyFailureReason(rawCliTimeout)).not.toBe('endpoint_hung')
  })

  it('classifies the outer timeout as cli_timeout when the model is CLI-backed', () => {
    expect(classifyFailureReason(outerTimeout, undefined, { cliProvider: true })).toBe('cli_timeout')
  })

  it('keeps API-provider timeouts as endpoint_hung', () => {
    expect(classifyFailureReason(outerTimeout)).toBe('endpoint_hung')
    expect(classifyFailureReason(outerTimeout, undefined, { cliProvider: false })).toBe('endpoint_hung')
    expect(classifyFailureReason(new Error('fetch failed'), undefined, { cliProvider: true })).toBe(
      'endpoint_hung'
    )
  })

  it('records cli_timeout on a CLI model and still retries (transient)', async () => {
    generateOpencodeMock.mockReset()
    // Timeout on iteration 1, success on iteration 2: a timeout stays transient,
    // so the loop must keep going rather than break like an auth failure.
    generateOpencodeMock
      .mockRejectedValueOnce(
        new TimeoutError('Timeout after 600000ms: Test DeepSeek :: Task X #1/2')
      )
      .mockResolvedValueOnce(OK)
    const runner = createProviderRunner({ opencode: {}, bustCache: true, maxRetries: 0 })

    const [result] = await runner.runTask(CLI_MODEL, TASK, 2)
    expect(generateOpencodeMock).toHaveBeenCalledTimes(2)
    expect(result.status).toBe('partial')
    expect(result.iterationsSucceeded).toBe(1)
  })

  it('reports cli_timeout as the aggregate reason when every iteration times out', async () => {
    generateOpencodeMock.mockReset()
    generateOpencodeMock.mockRejectedValue(
      new TimeoutError('Timeout after 600000ms: Test DeepSeek :: Task X #1/1')
    )
    const runner = createProviderRunner({ opencode: {}, bustCache: true, maxRetries: 0 })

    const [result] = await runner.runTask(CLI_MODEL, TASK, 1)
    expect(result.status).toBe('timeout')
    expect(result.failureReason).toBe('cli_timeout')
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

describe('run log integration', () => {
  let dir: string

  beforeEach(() => {
    generateMock.mockReset()
    dir = mkdtempSync(join(tmpdir(), 'provider-runlog-'))
  })

  afterEach(() => {
    // Module-level state: leaving it set would make every later test write logs.
    setRunLogDir(undefined)
    rmSync(dir, { recursive: true, force: true })
  })

  it('logs the whole lifecycle of an iteration that retried once, and stamps runLogRef', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setRunLogDir(dir)
    generateMock
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce(OK)

    const runner = createProviderRunner({
      moonshot: { apiKey: 'k' },
      bustCache: true,
      maxRetries: 1,
      timeoutMs: 5000,
      // Simple scorer (no scoreWithBreakdown) — there should be no check events.
      scorer: { score: () => 55 },
    })
    const [result] = await runner.runTask(MODEL, TASK, 1)

    const file = join(dir, runLogFileName(MODEL.id, TASK.id))
    const { header, events } = readRunLog(file)

    expect(header.type).toBe('header')
    expect(header.modelId).toBe(MODEL.id)
    expect(header.taskId).toBe(TASK.id)
    expect(header.configSnapshot).toEqual({
      iterations: 1,
      timeoutMs: 5000,
      maxRetries: 1,
      bustCache: true,
    })

    expect(events.map((e) => e.type)).toEqual([
      'request',
      'retry',
      'response',
      'clean',
      'aggregate',
    ])
    events.forEach((event, i) => expect(event.seq).toBe(i + 1))

    const request = events[0]
    if (request.type !== 'request') throw new Error('expected a request event')
    expect(request.iterationIndex).toBe(0)
    expect(request.promptHash).toMatch(/^[0-9a-f]{64}$/)
    expect(request.promptLength).toBeGreaterThan(0)

    const retry = events[1]
    if (retry.type !== 'retry') throw new Error('expected a retry event')
    expect(retry.kind).toBe('transient')
    expect(retry.attempt).toBe(1)
    expect(retry.error).toContain('fetch failed')
    expect(retry.delayMs).toBeGreaterThan(0)

    const response = events[2]
    if (response.type !== 'response') throw new Error('expected a response event')
    expect(response.cacheHit).toBe(false)
    expect(spillPreview(response.rawOutput)).toBe(OK.output)
    expect(response.tokensIn).toBe(OK.tokensIn)
    expect(response.tokensOut).toBe(OK.tokensOut)

    const clean = events[3]
    if (clean.type !== 'clean') throw new Error('expected a clean event')
    expect(spillPreview(clean.output)).toBe(OK.output)

    const aggregate = events[4]
    if (aggregate.type !== 'aggregate') throw new Error('expected an aggregate event')
    const logged = aggregate.result as Record<string, unknown>
    expect(logged.score).toBe(55)
    expect(logged.status).toBe('success')
    expect(logged.runLogRef).toEqual({ runId: header.runId, file: runLogFileName(MODEL.id, TASK.id) })
    // The artifact is referenced, never inlined, in the aggregate line.
    const spilled = logged.output as { spillRef: string; bytes: number }
    expect(spilled.spillRef).toMatch(/^spill\/[0-9a-f]{16}\.txt$/)
    expect(readFileSync(join(dir, spilled.spillRef), 'utf8')).toBe(OK.output)

    // The published record points back at its trace.
    expect(result.runLogRef).toEqual({ runId: header.runId, file: runLogFileName(MODEL.id, TASK.id) })
    warn.mockRestore()
  })

  it('logs one check event per check per iteration, naming the true iteration index', async () => {
    setRunLogDir(dir)
    const checks = [
      { name: 'space-jump-dispatch', passed: true, points: 40, maxPoints: 40 },
      { name: 'canvas-advance', passed: false, points: 0, maxPoints: 30, detail: 'pixels unchanged' },
    ]
    // Iteration 0 fails non-transiently... use a transient failure so the loop
    // keeps going: iteration 0 fails, iteration 1 succeeds. The single check
    // pair must therefore be stamped iterationIndex 1, not 0.
    generateMock
      .mockRejectedValueOnce(new TimeoutError('Timeout after 5000ms: Test Kimi :: Task X #1/2'))
      .mockResolvedValueOnce(OK)

    const runner = createProviderRunner({
      moonshot: { apiKey: 'k' },
      bustCache: true,
      maxRetries: 0,
      scorer: { score: () => 40, scoreWithBreakdown: () => ({ score: 40, checks }) },
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const [result] = await runner.runTask(MODEL, TASK, 2)
    consoleError.mockRestore()

    const { events } = readRunLog(join(dir, runLogFileName(MODEL.id, TASK.id)))
    const failure = events.find((e) => e.type === 'failure')
    if (failure?.type !== 'failure') throw new Error('expected a failure event')
    expect(failure.iterationIndex).toBe(0)
    expect(failure.timedOut).toBe(true)
    expect(failure.failureReason).toBe('endpoint_hung')

    const checkEvents = events.filter((e) => e.type === 'check')
    expect(checkEvents).toHaveLength(2)
    for (const event of checkEvents) {
      if (event.type !== 'check') throw new Error('expected a check event')
      expect(event.iterationIndex).toBe(1)
    }
    expect(checkEvents.map((e) => (e.type === 'check' ? e.check.name : ''))).toEqual([
      'space-jump-dispatch',
      'canvas-advance',
    ])
    expect(result.status).toBe('partial')
  })

  it('writes no log and keeps the record ref-free when no run-log dir is set', async () => {
    generateMock.mockResolvedValue(OK)
    const runner = createProviderRunner({
      moonshot: { apiKey: 'k' },
      bustCache: true,
      maxRetries: 0,
      scorer: { score: () => 55 },
    })
    const [result] = await runner.runTask(MODEL, TASK, 1)
    expect(result.runLogRef).toBeUndefined()
    expect(readdirSync(dir)).toEqual([])
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
