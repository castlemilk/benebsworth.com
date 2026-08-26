import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { BenchmarkModel, BenchmarkTask, PluginGenerate } from '../types'
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
  clearPluginGeneratorCache,
  createProviderRunner,
  isCliProvider,
  isQuotaError,
  TimeoutError,
} from './provider'
import { registerPlugin, unregisterPlugin } from '../plugins'
import { BUILTIN_PROVIDERS } from '../providers'
import { generateMoonshot } from './moonshot'
import { generateOpencode } from './opencode'
import type { IterationRun } from './provider'
import { openRunLog, readRunLog, runLogFileName, setRunLogDir, spillPreview } from '../runlog'
import { resolveSandboxPolicy } from '../scorers/sandbox-backend'
import { promptBundleHash } from '../prompt-bundle'

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

  it('stamps the estimated next window when the quota error states one', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    generateMock.mockRejectedValue(
      new Error('Agy error: individual quota reached. Resets in 2h')
    )
    const runner = createProviderRunner({ moonshot: { apiKey: 'k' }, bustCache: true, maxRetries: 0 })

    const before = Date.now()
    const [result] = await runner.runTask(MODEL, TASK, 5)
    const after = Date.now()

    expect(result.failureReason).toBe('quota_exhausted')
    expect(result.quotaNextResetAt).toBeDefined()
    const stamped = Date.parse(result.quotaNextResetAt!)
    expect(stamped).toBeGreaterThanOrEqual(before + 2 * 60 * 60 * 1000)
    expect(stamped).toBeLessThanOrEqual(after + 2 * 60 * 60 * 1000)

    // The operator line names the model and the window, so a killed sweep's
    // log answers "when can I run this again?" without re-reading raw errors.
    const windowLog = consoleErrorSpy.mock.calls
      .map((args) => String(args[0]))
      .find((line) => line.includes('next window'))
    expect(windowLog).toMatch(/Test Kimi/)
    expect(windowLog).toMatch(/~2h/)
    consoleErrorSpy.mockRestore()
  })

  // Real write+fsync round-trips through the run log: fast alone but observed
  // blowing the default 5s cap under full-suite IO contention (four separate
  // sessions). The assertion is about event content, never speed.
  it('records the estimated window as its own run-log event (the record may be dropped)', { timeout: 20_000 }, async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const dir = mkdtempSync(join(tmpdir(), 'provider-quota-runlog-'))
    setRunLogDir(dir)
    generateMock.mockRejectedValue(new Error('Agy error: individual quota reached. Resets in 2h'))
    const runner = createProviderRunner({ moonshot: { apiKey: 'k' }, bustCache: true, maxRetries: 0 })

    const [result] = await runner.runTask(MODEL, TASK, 5)

    const { events } = readRunLog(join(dir, runLogFileName(MODEL.id, TASK.id)))
    const quota = events.find((e) => e.type === 'quota')
    if (quota?.type !== 'quota') throw new Error('expected a quota event')
    expect(quota.iterationIndex).toBe(0)
    expect(quota.quotaNextResetAt).toBe(result.quotaNextResetAt)
    // …and it lands BEFORE the aggregate, i.e. at the trip, not after the fold.
    expect(events.indexOf(quota)).toBeLessThan(events.findIndex((e) => e.type === 'aggregate'))

    setRunLogDir(undefined)
    rmSync(dir, { recursive: true, force: true })
    consoleErrorSpy.mockRestore()
  })

  it('leaves the window absent when the quota error states none', async () => {
    generateMock.mockRejectedValue(
      new Error('Moonshot error 403: usage limit for this billing cycle (access_terminated_error)')
    )
    const runner = createProviderRunner({ moonshot: { apiKey: 'k' }, bustCache: true, maxRetries: 0 })

    const [result] = await runner.runTask(MODEL, TASK, 5)
    expect(result.failureReason).toBe('quota_exhausted')
    expect(result.quotaNextResetAt).toBeUndefined()
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
      // The trace names its own prompt bundle: a log has to be readable alone.
      promptBundle: promptBundleHash(TASK),
    })

    expect(events.map((e) => e.type)).toEqual([
      'request',
      'retry',
      'response',
      'clean',
      // The sandbox policy the scorer ran under (#12), appended at scoring
      // time — after the artifact exists, before the aggregate it describes.
      'sandboxPolicy',
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

    const policy = events[4]
    if (policy.type !== 'sandboxPolicy') throw new Error('expected a sandboxPolicy event')
    expect(policy.backend).toBe('chromium')

    const aggregate = events[5]
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

  // Same fsync-bound flake family as the quota run-log test above: real
  // write+fsync round-trips blow the 5s default under full-suite contention.
  it('logs one check event per check per iteration, naming the true iteration index', { timeout: 20_000 }, async () => {
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

  it('carries ttftMs/tokensPerSec/rateKind on the response event when the provider measured them', async () => {
    setRunLogDir(dir)
    generateMock.mockResolvedValue({ ...OK, tokensOut: 300, runtimeMs: 1600, ttftMs: 100 })
    const runner = createProviderRunner({
      moonshot: { apiKey: 'k' },
      bustCache: true,
      maxRetries: 0,
      scorer: { score: () => 55 },
    })
    await runner.runTask(MODEL, TASK, 1)

    const { events } = readRunLog(join(dir, runLogFileName(MODEL.id, TASK.id)))
    const response = events.find((e) => e.type === 'response')
    if (response?.type !== 'response') throw new Error('expected a response event')
    expect(response.ttftMs).toBe(100)
    // decode rate: 300 tokens over (1600 - 100)ms = 200 tok/s
    expect(response.tokensPerSec).toBe(200)
    expect(response.rateKind).toBe('decode')
  })

  it('omits the telemetry fields entirely when the provider could not measure them', async () => {
    setRunLogDir(dir)
    // A non-streaming API provider: no first-token boundary is observable.
    generateMock.mockResolvedValue({ ...OK, tokensOut: 200, runtimeMs: 1000 })
    const runner = createProviderRunner({
      moonshot: { apiKey: 'k' },
      bustCache: true,
      maxRetries: 0,
      scorer: { score: () => 55 },
    })
    await runner.runTask(MODEL, TASK, 1)

    const { events } = readRunLog(join(dir, runLogFileName(MODEL.id, TASK.id)))
    const response = events.find((e) => e.type === 'response')
    if (response?.type !== 'response') throw new Error('expected a response event')
    // No `null` noise: the key is simply not on the record.
    expect('ttftMs' in response).toBe(false)
    // The wall-clock fallback is still published, but LABELLED as such.
    expect(response.tokensPerSec).toBe(200)
    expect(response.rateKind).toBe('wall-clock')
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

describe('runTask telemetry threading', () => {
  beforeEach(() => {
    generateMock.mockReset()
  })

  it('keeps the FIRST attempt TTFT across an in-step empty-body retry, and counts the retry', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    generateMock
      // Under the 40-char floor → the runTask empty-body retry fires.
      .mockResolvedValueOnce({ output: 'DONE', tokensIn: 10, tokensOut: 2, runtimeMs: 300, ttftMs: 50 })
      .mockResolvedValueOnce({ ...OK, tokensOut: 100, runtimeMs: 1050, ttftMs: 900 })

    const runner = createProviderRunner({
      moonshot: { apiKey: 'k' },
      bustCache: true,
      maxRetries: 0,
      scorer: { score: () => 55 },
    })
    const [result] = await runner.runTask(MODEL, TASK, 1)
    warn.mockRestore()

    expect(result.status).toBe('success')
    // dsh `resetForRetry` parity: a retry inside the step does NOT reset TTFT.
    expect(result.telemetry?.meanTtftMs).toBe(50)
    expect(result.telemetry?.retries).toBe(1)
    expect(result.telemetry?.cacheHits).toBe(0)
  }, 20_000)

  it('counts transient retries even when the iteration ultimately FAILED', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    generateMock.mockRejectedValue(new Error('fetch failed'))

    const runner = createProviderRunner({
      moonshot: { apiKey: 'k' },
      bustCache: true,
      maxRetries: 1,
      scorer: { score: () => 55 },
    })
    const [result] = await runner.runTask(MODEL, TASK, 1)
    warn.mockRestore()
    error.mockRestore()

    expect(result.status).toBe('fail')
    // The retry happened; a return-value-only channel would have lost it to the throw.
    expect(result.telemetry?.retries).toBe(1)
  }, 20_000)
})

describe('plugin-provided generators', () => {
  const PLUGIN_MODEL: BenchmarkModel = {
    id: 'test-plugin-model',
    name: 'Test Plugin Model',
    provider: 'TestProvider',
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
    contextWindow: 1000,
    capabilities: '',
  }

  beforeEach(() => {
    clearPluginGeneratorCache()
    unregisterPlugin('test-provider-plugin')
  })
  afterEach(() => {
    clearPluginGeneratorCache()
    unregisterPlugin('test-provider-plugin')
  })

  it('still throws for an unknown provider, naming the built-in and plugin sets', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const runner = createProviderRunner({ bustCache: true, maxRetries: 0, scorer: { score: () => 50 } })

    const [result] = await runner.runTask({ ...PLUGIN_MODEL, provider: 'NoSuchProvider' }, TASK, 1)
    expect(result.status).toBe('fail')
    const logged = consoleErrorSpy.mock.calls.map((c) => String(c[0])).join('\n')
    expect(logged).toMatch(/Unsupported provider: NoSuchProvider/)
    expect(logged).toMatch(/built-in: OpenAI, Anthropic/)
    expect(logged).toMatch(/plugin-provided: none/)
    consoleErrorSpy.mockRestore()
  })

  it('runs a plugin model end to end — scored and aggregated like any provider', async () => {
    // The acceptance criterion: a plugin registers a model + generator pair and
    // the sweep machinery treats it as a first-class provider, with no
    // provider.ts case for 'TestProvider'.
    const generate = vi.fn<PluginGenerate>(async () => ({ ...OK, output: 'p'.repeat(120) }))
    registerPlugin({
      id: 'test-provider-plugin',
      name: 'Test Provider Plugin',
      version: '0.0.1',
      models: [PLUGIN_MODEL],
      generators: { TestProvider: async () => generate },
    })

    const runner = createProviderRunner({ bustCache: true, maxRetries: 0, scorer: { score: () => 77 } })
    const [result] = await runner.runTask(PLUGIN_MODEL, TASK, 2)

    expect(generate).toHaveBeenCalledTimes(2)
    expect(generate.mock.calls[0][2]).toBe(0)
    expect(generate.mock.calls[1][2]).toBe(1)
    expect(result.status).toBe('success')
    expect(result.iterationsSucceeded).toBe(2)
    expect(result.iterationScores).toEqual([77, 77])
    expect(result.score).toBe(77)
    expect(result.modelId).toBe('test-plugin-model')
    expect(result.tokensIn).toBe(OK.tokensIn * 2)
    expect(result.tokensOut).toBe(OK.tokensOut * 2)
  })

  it('awaits the lazy factory exactly once and caches it for the process', async () => {
    const generate = vi.fn<PluginGenerate>(async () => ({ ...OK, output: 'p'.repeat(120) }))
    const factory = vi.fn(async () => generate as PluginGenerate)
    registerPlugin({
      id: 'test-provider-plugin',
      name: 'Test Provider Plugin',
      version: '0.0.1',
      models: [PLUGIN_MODEL],
      generators: { TestProvider: factory },
    })

    const runner = createProviderRunner({ bustCache: true, maxRetries: 0, scorer: { score: () => 60 } })
    await runner.runTask(PLUGIN_MODEL, TASK, 2)

    expect(generate).toHaveBeenCalledTimes(2)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('classifies a plugin generator failure like any other provider error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    registerPlugin({
      id: 'test-provider-plugin',
      name: 'Test Provider Plugin',
      version: '0.0.1',
      models: [PLUGIN_MODEL],
      generators: {
        TestProvider: async () => async () => {
          throw new Error('TestProvider error 401: bad key')
        },
      },
    })

    const runner = createProviderRunner({ bustCache: true, maxRetries: 0, scorer: { score: () => 50 } })
    const [result] = await runner.runTask(PLUGIN_MODEL, TASK, 2)
    expect(result.status).toBe('fail')
    expect(result.failureReason).toBe('auth_error')
    consoleErrorSpy.mockRestore()
  })
})

describe('built-in provider list', () => {
  it('names exactly the providers configForModel can route', async () => {
    // Keeps `providers.ts:BUILTIN_PROVIDERS` — which plugins/registry.ts uses
    // to reject a shadowing generator — honest about the switch it mirrors: a
    // routable provider fails with "config missing", never "Unsupported".
    // Ollama is the exception: it has no required config (host defaults to
    // localhost), so it fails with "model not found" instead.
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const runner = createProviderRunner({ bustCache: true, maxRetries: 0, scorer: { score: () => 50 } })
    for (const provider of BUILTIN_PROVIDERS) {
      consoleErrorSpy.mockClear()
      await runner.runTask({ ...MODEL, id: `probe-${provider}`, provider }, TASK, 1)
      const logged = consoleErrorSpy.mock.calls.map((c) => String(c[0])).join('\n')
      if (provider === 'Ollama') {
        expect(logged, provider).toMatch(/model not found|Ollama/)
        expect(logged, provider).not.toMatch(/Unsupported provider/)
      } else {
        expect(logged, provider).toMatch(/config missing/)
        expect(logged, provider).not.toMatch(/Unsupported provider/)
      }
    }
    consoleErrorSpy.mockRestore()
  })
})

describe('aggregateRuns', () => {
  const runs = (n: number): IterationRun[] =>
    Array.from({ length: n }, () => ({ ...OK, status: 'success' }))

  it('stamps the prompt bundle the score was produced under', async () => {
    const result = await aggregateRuns(runs(1), 1, MODEL, TASK, { score: () => 50 })
    // The record must carry the bundle for THIS task's amended prompt — the
    // only moment it is computable (a later prompt edit erases it forever).
    expect(result.promptBundle).toBe(promptBundleHash(TASK))
    expect(result.promptBundle).toMatch(/^[0-9a-f]{16}$/)
    // …and a task whose contract differs stamps a different bundle.
    const amended = await aggregateRuns(
      runs(1),
      1,
      MODEL,
      { ...TASK, sandboxConstraints: 'Return one HTML file.' },
      { score: () => 50 }
    )
    expect(amended.promptBundle).not.toBe(result.promptBundle)
  })

  it('records the sandbox policy that scored the record, once', async () => {
    // #12: "which sandbox produced this number?" has to be answerable from the
    // trace alone — including the parity mode, since a prelude-wrapped scoring
    // run is not comparable with the stored history.
    const dir = mkdtempSync(join(tmpdir(), 'provider-sandbox-runlog-'))
    setRunLogDir(dir)
    const log = openRunLog({
      modelId: MODEL.id,
      taskId: TASK.id,
      configSnapshot: { iterations: 2, timeoutMs: 1000, maxRetries: 0, bustCache: true },
    })!
    await aggregateRuns(runs(2), 2, MODEL, TASK, { score: () => 50 }, undefined, log)
    await log.close()

    const { events } = readRunLog(join(dir, runLogFileName(MODEL.id, TASK.id)))
    const policies = events.filter((e) => e.type === 'sandboxPolicy')
    expect(policies).toHaveLength(1)
    const policy = policies[0]
    if (policy.type !== 'sandboxPolicy') throw new Error('expected a sandboxPolicy event')
    expect(policy).toMatchObject(resolveSandboxPolicy())
    expect(policy.backend).toBe('chromium')
    // The default is the pre-seam behaviour: real browser, raw artifact.
    expect(policy.preludeParity).toBe(false)
    // …and Chromium runs with --no-sandbox here, so the log says `partial`.
    expect(policy.enforcement).toBe('partial')
    // It lands BEFORE the checks and the aggregate it describes.
    expect(events.indexOf(policy)).toBeLessThan(events.findIndex((e) => e.type === 'aggregate'))

    setRunLogDir(undefined)
    rmSync(dir, { recursive: true, force: true })
  })

  it('records no sandbox policy when nothing was scored', async () => {
    // No successful iteration means no scoring happened, so there is no policy
    // fact to report — an event here would claim a sandbox that never ran.
    const dir = mkdtempSync(join(tmpdir(), 'provider-sandbox-runlog-'))
    setRunLogDir(dir)
    const log = openRunLog({
      modelId: MODEL.id,
      taskId: TASK.id,
      configSnapshot: { iterations: 1, timeoutMs: 1000, maxRetries: 0, bustCache: true },
    })!
    const failed: IterationRun[] = [{ ...OK, status: 'fail', output: '' }]
    await aggregateRuns(failed, 1, MODEL, TASK, { score: () => 50 }, undefined, log)
    await log.close()

    const { events } = readRunLog(join(dir, runLogFileName(MODEL.id, TASK.id)))
    expect(events.filter((e) => e.type === 'sandboxPolicy')).toEqual([])

    setRunLogDir(undefined)
    rmSync(dir, { recursive: true, force: true })
  })

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

  describe('telemetry roll-up', () => {
    const scorer = { score: () => 50 }
    const base = { output: 'x'.repeat(80), tokensIn: 10, status: 'success' as const }

    it('means over CONTRIBUTING iterations only; counters exact; rateKind mixed', async () => {
      const mixed: IterationRun[] = [
        // decode rate: 500 tokens over (1200 - 200)ms = 500 tok/s
        { ...base, tokensOut: 500, runtimeMs: 1200, ttftMs: 200 },
        // no TTFT observable (non-streaming API) → wall-clock 250/1s = 250 tok/s
        { ...base, tokensOut: 250, runtimeMs: 1000 },
        // cache replay: nothing was generated, so neither mean may include it
        { ...base, tokensOut: 9999, runtimeMs: 5, cacheHit: true },
        // a failure that burned two retries
        {
          output: 'fetch failed',
          tokensIn: 0,
          tokensOut: 0,
          runtimeMs: 0,
          status: 'fail',
          failureReason: 'endpoint_hung',
          retries: 2,
        },
      ]

      const result = await aggregateRuns(mixed, 4, MODEL, TASK, scorer)
      expect(result.telemetry).toEqual({
        meanTtftMs: 200,
        meanTokensPerSec: 375,
        rateKind: 'mixed',
        cacheHits: 1,
        retries: 2,
      })
    })

    it('reports rateKind decode when every contributing iteration carried a TTFT', async () => {
      const runsWithTtft: IterationRun[] = [
        { ...base, tokensOut: 100, runtimeMs: 600, ttftMs: 100 },
        { ...base, tokensOut: 300, runtimeMs: 1500, ttftMs: 500 },
      ]
      const result = await aggregateRuns(runsWithTtft, 2, MODEL, TASK, scorer)
      expect(result.telemetry?.rateKind).toBe('decode')
      expect(result.telemetry?.meanTtftMs).toBe(300)
      // (100 / 0.5s = 200) and (300 / 1.0s = 300) → 250
      expect(result.telemetry?.meanTokensPerSec).toBe(250)
    })

    it('omits meanTtftMs entirely when nothing measured it (absence = not measured)', async () => {
      const result = await aggregateRuns(
        [{ ...base, tokensOut: 200, runtimeMs: 2000 }],
        1,
        MODEL,
        TASK,
        scorer
      )
      expect(result.telemetry?.meanTtftMs).toBeUndefined()
      expect('meanTtftMs' in result.telemetry!).toBe(false)
      expect(result.telemetry?.rateKind).toBe('wall-clock')
      expect(result.telemetry?.meanTokensPerSec).toBe(100)
    })

    it('keeps the counters at 0 (present, readable) when nothing contributed', async () => {
      const result = await aggregateRuns(
        [{ output: 'boom', tokensIn: 0, tokensOut: 0, runtimeMs: 0, status: 'fail' }],
        1,
        MODEL,
        TASK,
        scorer
      )
      expect(result.telemetry).toEqual({ cacheHits: 0, retries: 0 })
    })
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

describe('createProviderRunner budget caps (#28)', () => {
  // Priced so ONE iteration costs exactly $0.006: the cap is crossed on the
  // SECOND response (0.012 >= 0.01) and never mid-call.
  const PRICEY: BenchmarkModel = {
    ...MODEL,
    id: 'test-pricey',
    name: 'Test Pricey',
    costPer1kInputUsd: 0.003,
    costPer1kOutputUsd: 0.003,
  }
  const BIG = { output: 'y'.repeat(80), tokensIn: 1000, tokensOut: 1000, runtimeMs: 100 }
  const ITERATION_USD = 0.006

  beforeEach(() => {
    generateMock.mockReset()
  })

  it('is off when no cap is configured — the pre-feature behaviour', async () => {
    generateMock.mockResolvedValue(BIG)
    const runner = createProviderRunner({ moonshot: { apiKey: 'k' }, bustCache: true, maxRetries: 0 })

    const [result] = await runner.runTask(PRICEY, TASK, 5)
    expect(generateMock).toHaveBeenCalledTimes(5)
    expect(result.budgetExceeded).toBeUndefined()
  })

  it('trips at the iteration boundary that crosses the cap, and the partial record is honest', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    generateMock.mockResolvedValue(BIG)
    const runner = createProviderRunner({
      moonshot: { apiKey: 'k' },
      bustCache: true,
      maxRetries: 0,
      budgetMaxUsd: 0.01,
    })

    const [result] = await runner.runTask(PRICEY, TASK, 5)

    // Iteration 1 spent $0.006 (under), iteration 2 took it to $0.012 (over).
    // The in-flight call is never killed: the check runs BETWEEN iterations.
    expect(generateMock).toHaveBeenCalledTimes(2)
    expect(result.iterations).toBe(5)
    expect(result.iterationsSucceeded).toBe(2)
    expect(result.status).toBe('partial')
    expect(result.budgetExceeded).toEqual({ spentUsd: 2 * ITERATION_USD, capUsd: 0.01 })
    expect(result.costUsd).toBeCloseTo(2 * ITERATION_USD, 10)

    // The operator line names the model, the spend and the cap.
    const line = consoleErrorSpy.mock.calls
      .map((args) => String(args[0]))
      .find((l) => l.includes('budget cap'))
    expect(line).toMatch(/Test Pricey/)
    expect(line).toMatch(/0\.01/)
    consoleErrorSpy.mockRestore()
  })

  it('skips every later task for that model with a BUDGET message, never a quota one', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    generateMock.mockResolvedValue(BIG)
    const runner = createProviderRunner({
      moonshot: { apiKey: 'k' },
      bustCache: true,
      maxRetries: 0,
      budgetMaxUsd: 0.01,
    })

    await runner.runTask(PRICEY, TASK, 5)
    expect(generateMock).toHaveBeenCalledTimes(2)

    // A budget stop is an OPERATOR POLICY, not a provider failure — the skip
    // must not read as quota exhaustion.
    await expect(runner.runTask(PRICEY, TASK, 5)).rejects.toThrow(/budget cap/i)
    await expect(runner.runTask(PRICEY, TASK, 5)).rejects.not.toThrow(/quota/i)
    expect(generateMock).toHaveBeenCalledTimes(2)
    consoleErrorSpy.mockRestore()
  })

  it('caps PER MODEL — a second model keeps its own budget', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    generateMock.mockResolvedValue(BIG)
    const runner = createProviderRunner({
      moonshot: { apiKey: 'k' },
      bustCache: true,
      maxRetries: 0,
      budgetMaxUsd: 0.01,
    })

    await runner.runTask(PRICEY, TASK, 5)
    expect(generateMock).toHaveBeenCalledTimes(2)

    // Same provider, its own spend counter — it must still run.
    const [other] = await runner.runTask({ ...PRICEY, id: 'test-pricey-2', name: 'Other' }, TASK, 1)
    expect(other.status).toBe('success')
    expect(other.budgetExceeded).toBeUndefined()
    expect(generateMock).toHaveBeenCalledTimes(3)
    consoleErrorSpy.mockRestore()
  })

  it('accrues ACROSS tasks, so the cap is per (model, sweep) not per (model, task)', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    generateMock.mockResolvedValue(BIG)
    const runner = createProviderRunner({
      moonshot: { apiKey: 'k' },
      bustCache: true,
      maxRetries: 0,
      budgetMaxUsd: 0.014,
    })

    const [first] = await runner.runTask(PRICEY, TASK, 1)
    expect(first.budgetExceeded).toBeUndefined()
    expect(generateMock).toHaveBeenCalledTimes(1)

    const [second] = await runner.runTask(PRICEY, { ...TASK, id: 'task-y' }, 5)
    // $0.006 carried in, so the cap falls on this task's SECOND iteration.
    expect(generateMock).toHaveBeenCalledTimes(3)
    expect(second.budgetExceeded).toEqual({ spentUsd: 3 * ITERATION_USD, capUsd: 0.014 })
    consoleErrorSpy.mockRestore()
  })

  // Real write+fsync round-trips (same flake family as the quota run-log test).
  it('records the incident as a budget event and prices every response in the log', { timeout: 20_000 }, async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const dir = mkdtempSync(join(tmpdir(), 'provider-budget-runlog-'))
    setRunLogDir(dir)
    generateMock.mockResolvedValue(BIG)
    const runner = createProviderRunner({
      moonshot: { apiKey: 'k' },
      bustCache: true,
      maxRetries: 0,
      budgetMaxUsd: 0.01,
    })

    const [result] = await runner.runTask(PRICEY, TASK, 5)

    const { events } = readRunLog(join(dir, runLogFileName(PRICEY.id, TASK.id)))

    // Cost events: every response carries its own priced cost, so spend is
    // auditable from the log alone and sums to the record's costUsd.
    const responses = events.filter((e) => e.type === 'response')
    expect(responses).toHaveLength(2)
    for (const response of responses) {
      if (response.type !== 'response') throw new Error('expected a response event')
      expect(response.costUsd).toBeCloseTo(ITERATION_USD, 10)
    }
    const summed = responses.reduce(
      (total, e) => total + (e.type === 'response' ? (e.costUsd ?? 0) : 0),
      0
    )
    expect(summed).toBeCloseTo(result.costUsd, 10)

    const budget = events.find((e) => e.type === 'budget')
    if (budget?.type !== 'budget') throw new Error('expected a budget event')
    expect(budget.modelId).toBe(PRICEY.id)
    expect(budget.capUsd).toBe(0.01)
    expect(budget.spentUsd).toBeCloseTo(2 * ITERATION_USD, 10)
    expect(budget.iterationIndex).toBe(1)
    // …and it lands BEFORE the aggregate: at the trip, not after the fold.
    expect(events.indexOf(budget)).toBeLessThan(events.findIndex((e) => e.type === 'aggregate'))

    setRunLogDir(undefined)
    rmSync(dir, { recursive: true, force: true })
    consoleErrorSpy.mockRestore()
  })
})
