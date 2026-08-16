import { describe, it, expect } from 'vitest'
import {
  SWEEP_PROFILES,
  estimateSweepDuration,
  parseSweepArgs,
  parseSweepProfiles,
  resolveSweepConfig,
} from './sweep-profiles'
import profilesJson from './sweep-profiles.json'
import type { BenchmarkResult } from './types'

const MINUTE = 60 * 1000

describe('parseSweepProfiles', () => {
  it('accepts the shipped sweep-profiles.json unchanged (round-trip)', () => {
    expect(parseSweepProfiles(profilesJson)).toEqual(SWEEP_PROFILES)
  })

  it('requires every profile to carry a one-line description', () => {
    expect(() => parseSweepProfiles({ smoke: { iterations: 1 } })).toThrow(/smoke.*description/i)
  })

  it('rejects unknown keys rather than silently ignoring a typo', () => {
    // `retries` is not a knob — accepting it would silently drop RUN_MAX_RETRIES,
    // the exact mistake this feature exists to prevent.
    expect(() => parseSweepProfiles({ slow: { description: 'x', retries: 0 } })).toThrow(/slow.*unknown key.*retries/i)
  })

  it('rejects wrong types with a message naming the profile and the field', () => {
    expect(() => parseSweepProfiles({ a: { description: 'x', iterations: '3' } })).toThrow(/a.*iterations.*number/i)
    expect(() => parseSweepProfiles({ a: { description: 'x', bustCache: 'yes' } })).toThrow(/a.*bustCache.*boolean/i)
    expect(() => parseSweepProfiles({ a: { description: 'x', models: 'kimi-k2.7' } })).toThrow(
      /a.*models.*array of strings/i
    )
    expect(() => parseSweepProfiles({ a: { description: 'x', tasks: [1] } })).toThrow(/a.*tasks.*array of strings/i)
  })

  it('rejects a non-object document or profile', () => {
    expect(() => parseSweepProfiles([])).toThrow(/object/i)
    expect(() => parseSweepProfiles({ a: null })).toThrow(/a.*object/i)
  })
})

describe('shipped profiles', () => {
  const resolved = (name: string) => resolveSweepConfig({ flags: {}, env: {}, profile: name })

  it('exposes exactly the four documented recipes, each with a description', () => {
    expect(Object.keys(SWEEP_PROFILES).sort()).toEqual(['agy-quota', 'fast-refresh', 'slow-model', 'smoke'])
    for (const profile of Object.values(SWEEP_PROFILES)) {
      expect(profile.description.length).toBeGreaterThan(0)
    }
  })

  it('smoke: 1 iteration, concurrency 1, 10-minute cap, model/task from the CLI', () => {
    const config = resolved('smoke')
    expect(config.iterations).toEqual({ value: 1, source: 'profile:smoke' })
    expect(config.concurrency).toEqual({ value: 1, source: 'profile:smoke' })
    expect(config.timeoutMs).toEqual({ value: 10 * MINUTE, source: 'profile:smoke' })
    // Not pinned by the profile — a hardcoded model id would rot.
    expect(config.models.source).toBe('default')
    expect(config.tasks.value).toBeUndefined()
  })

  it('fast-refresh: 5 iterations, concurrency 2, 10-minute cap', () => {
    const config = resolved('fast-refresh')
    expect(config.iterations.value).toBe(5)
    expect(config.concurrency.value).toBe(2)
    expect(config.timeoutMs.value).toBe(10 * MINUTE)
    expect(config.maxRetries.value).toBeUndefined()
    expect(config.bustCache.value).toBe(false)
  })

  it('slow-model: concurrency 2, NO retries, 25-minute cap, cache busted', () => {
    const config = resolved('slow-model')
    expect(config.concurrency.value).toBe(2)
    expect(config.maxRetries).toEqual({ value: 0, source: 'profile:slow-model' })
    expect(config.timeoutMs.value).toBe(25 * MINUTE)
    expect(config.bustCache).toEqual({ value: true, source: 'profile:slow-model' })
    expect(config.iterations.value).toBeUndefined()
  })

  it('agy-quota: concurrency 1, 5 iterations, default timeouts', () => {
    const config = resolved('agy-quota')
    expect(config.concurrency.value).toBe(1)
    expect(config.iterations.value).toBe(5)
    expect(config.timeoutMs).toEqual({ value: undefined, source: 'default' })
    expect(config.maxRetries.value).toBeUndefined()
  })
})

describe('resolveSweepConfig', () => {
  it('falls back to the built-in defaults with no profile, env, or flags', () => {
    const config = resolveSweepConfig({ flags: {}, env: {} })
    expect(config.models).toEqual({ value: ['kimi-k2.7'], source: 'default' })
    expect(config.tasks).toEqual({ value: undefined, source: 'default' })
    expect(config.iterations).toEqual({ value: undefined, source: 'default' })
    expect(config.concurrency).toEqual({ value: 3, source: 'default' })
    expect(config.timeoutMs).toEqual({ value: undefined, source: 'default' })
    expect(config.maxRetries).toEqual({ value: undefined, source: 'default' })
    expect(config.bustCache).toEqual({ value: false, source: 'default' })
  })

  it('reads every env knob the way the script always has', () => {
    const config = resolveSweepConfig({
      flags: {},
      env: {
        RUN_MODELS: 'a,b',
        RUN_TASKS: 't1,t2',
        RUN_ITERATIONS: '2',
        RUN_CONCURRENCY: '4',
        RUN_TIMEOUT_MS: '900000',
        RUN_MAX_RETRIES: '0',
        RUN_BUST_CACHE: '1',
      },
    })
    expect(config.models).toEqual({ value: ['a', 'b'], source: 'env' })
    expect(config.tasks).toEqual({ value: ['t1', 't2'], source: 'env' })
    expect(config.iterations).toEqual({ value: 2, source: 'env' })
    expect(config.concurrency).toEqual({ value: 4, source: 'env' })
    expect(config.timeoutMs).toEqual({ value: 900000, source: 'env' })
    expect(config.maxRetries).toEqual({ value: 0, source: 'env' })
    expect(config.bustCache).toEqual({ value: true, source: 'env' })
  })

  it('treats an empty env var as unset — the Taskfile passes RUN_MODELS="" for an omitted knob', () => {
    const config = resolveSweepConfig({
      flags: {},
      env: { RUN_MODELS: '', RUN_TASKS: '', RUN_ITERATIONS: '', RUN_CONCURRENCY: '', RUN_TIMEOUT_MS: '', RUN_BUST_CACHE: '' },
    })
    expect(config.models.source).toBe('default')
    expect(config.concurrency.value).toBe(3)
    expect(config.bustCache.value).toBe(false)
  })

  it('preserves the historical RUN_MAX_RETRIES="" => 0 reading', () => {
    // The original script tested `!== undefined`, so a defined-but-empty value
    // became Number('') === 0. Kept deliberately: changing it would alter an
    // existing pure-env invocation.
    expect(resolveSweepConfig({ flags: {}, env: { RUN_MAX_RETRIES: '' } }).maxRetries).toEqual({
      value: 0,
      source: 'env',
    })
  })

  it('accepts RUN_BUST_CACHE=true as well as 1, and nothing else', () => {
    expect(resolveSweepConfig({ flags: {}, env: { RUN_BUST_CACHE: 'true' } }).bustCache.value).toBe(true)
    expect(resolveSweepConfig({ flags: {}, env: { RUN_BUST_CACHE: '0' } }).bustCache.value).toBe(false)
    expect(resolveSweepConfig({ flags: {}, env: { RUN_BUST_CACHE: 'yes' } }).bustCache.value).toBe(false)
  })

  it('lets env beat the profile', () => {
    const config = resolveSweepConfig({ flags: {}, env: { RUN_CONCURRENCY: '5' }, profile: 'smoke' })
    expect(config.concurrency).toEqual({ value: 5, source: 'env' })
    expect(config.iterations).toEqual({ value: 1, source: 'profile:smoke' })
  })

  it('lets flags beat env, which beats profile, which beats default', () => {
    const config = resolveSweepConfig({
      flags: { concurrency: 7, iterations: 9 },
      env: { RUN_CONCURRENCY: '5', RUN_TIMEOUT_MS: '1000' },
      profile: 'smoke',
    })
    expect(config.concurrency).toEqual({ value: 7, source: 'flag' })
    expect(config.iterations).toEqual({ value: 9, source: 'flag' })
    expect(config.timeoutMs).toEqual({ value: 1000, source: 'env' })
    expect(config.maxRetries).toEqual({ value: undefined, source: 'default' })
  })

  it('lets --bust-cache win even though the env var is absent (flag-only true)', () => {
    const config = resolveSweepConfig({ flags: { bustCache: true }, env: {} })
    expect(config.bustCache).toEqual({ value: true, source: 'flag' })
  })

  it('never lets an absent --bust-cache flag cancel RUN_BUST_CACHE=1', () => {
    // The flag is presence-only: there is no --no-bust-cache, so `false` must
    // mean "not passed", not "explicitly off".
    const config = resolveSweepConfig({ flags: {}, env: { RUN_BUST_CACHE: '1' } })
    expect(config.bustCache).toEqual({ value: true, source: 'env' })
  })

  it('records the profile name it resolved against', () => {
    expect(resolveSweepConfig({ flags: {}, env: {}, profile: 'smoke' }).profile).toBe('smoke')
    expect(resolveSweepConfig({ flags: {}, env: {} }).profile).toBeUndefined()
  })

  it('throws a listing-friendly error for an unknown profile', () => {
    expect(() => resolveSweepConfig({ flags: {}, env: {}, profile: 'nope' })).toThrow(/unknown sweep profile.*nope/i)
  })
})

describe('parseSweepArgs', () => {
  it('accepts a comma list for --model and --task', () => {
    const args = parseSweepArgs(['--model', 'a,b', '--task', 't1,t2'])
    expect(args.flags.models).toEqual(['a', 'b'])
    expect(args.flags.tasks).toEqual(['t1', 't2'])
  })

  it('accepts repeated --model / --task flags, accumulating them', () => {
    const args = parseSweepArgs(['--model', 'a', '--model', 'b', '--task', 't1', '--task', 't2'])
    expect(args.flags.models).toEqual(['a', 'b'])
    expect(args.flags.tasks).toEqual(['t1', 't2'])
  })

  it('accepts --flag=value as well as --flag value', () => {
    expect(parseSweepArgs(['--iterations=3', '--profile=smoke']).flags.iterations).toBe(3)
    expect(parseSweepArgs(['--iterations=3', '--profile=smoke']).profile).toBe('smoke')
  })

  it('parses the numeric knobs and the boolean/mode flags', () => {
    const args = parseSweepArgs([
      '--concurrency',
      '2',
      '--timeout-ms',
      '1500000',
      '--max-retries',
      '0',
      '--bust-cache',
      '--dump-config',
    ])
    expect(args.flags.concurrency).toBe(2)
    expect(args.flags.timeoutMs).toBe(1500000)
    expect(args.flags.maxRetries).toBe(0)
    expect(args.flags.bustCache).toBe(true)
    expect(args.dumpConfig).toBe(true)
    expect(args.listProfiles).toBe(false)
  })

  it('leaves every knob unset for an empty argv', () => {
    expect(parseSweepArgs([])).toEqual({ flags: {}, profile: undefined, dumpConfig: false, listProfiles: false })
  })

  it('rejects an unknown flag and a numeric knob with a non-number', () => {
    expect(() => parseSweepArgs(['--nope'])).toThrow(/unknown argument.*--nope/i)
    expect(() => parseSweepArgs(['--iterations', 'many'])).toThrow(/--iterations.*number/i)
    expect(() => parseSweepArgs(['--model'])).toThrow(/--model.*value/i)
  })
})

function result(overrides: Partial<BenchmarkResult>): BenchmarkResult {
  return {
    taskId: 't1',
    modelId: 'm1',
    score: 90,
    runtimeMs: 0,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    iterations: 1,
    status: 'success',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('estimateSweepDuration', () => {
  it('sums per-pair mean runtime x iterations, divided by concurrency', () => {
    const results = [
      result({ taskId: 't1', modelId: 'm1', runtimeMs: 10_000 }),
      result({ taskId: 't2', modelId: 'm1', runtimeMs: 30_000 }),
    ]
    const estimate = estimateSweepDuration(results, [
      { modelId: 'm1', taskId: 't1', iterations: 3 },
      { modelId: 'm1', taskId: 't2', iterations: 2 },
    ], 2)
    // (10s x 3 + 30s x 2) / 2
    expect(estimate.totalMs).toBe((10_000 * 3 + 30_000 * 2) / 2)
    expect(estimate.pairsWithHistory).toBe(2)
    expect(estimate.pairsWithoutHistory).toBe(0)
  })

  it('averages several historical records for the same pair', () => {
    const results = [
      result({ runtimeMs: 10_000, createdAt: '2026-01-01T00:00:00Z' }),
      result({ runtimeMs: 20_000, createdAt: '2026-02-01T00:00:00Z' }),
    ]
    const estimate = estimateSweepDuration(results, [{ modelId: 'm1', taskId: 't1', iterations: 1 }], 1)
    expect(estimate.totalMs).toBe(15_000)
  })

  it('counts a pair with no history as 0ms and reports it', () => {
    const estimate = estimateSweepDuration([result({ runtimeMs: 10_000 })], [
      { modelId: 'm1', taskId: 't1', iterations: 1 },
      { modelId: 'm2', taskId: 't1', iterations: 5 },
    ], 1)
    expect(estimate.totalMs).toBe(10_000)
    expect(estimate.pairsWithHistory).toBe(1)
    expect(estimate.pairsWithoutHistory).toBe(1)
  })

  it('ignores records with no measured runtime (an all-failed row is not evidence of speed)', () => {
    const estimate = estimateSweepDuration([result({ runtimeMs: 0, status: 'fail' })], [
      { modelId: 'm1', taskId: 't1', iterations: 1 },
    ], 1)
    expect(estimate.totalMs).toBe(0)
    expect(estimate.pairsWithHistory).toBe(0)
    expect(estimate.pairsWithoutHistory).toBe(1)
  })

  it('never divides by zero or a negative concurrency', () => {
    const estimate = estimateSweepDuration([result({ runtimeMs: 10_000 })], [
      { modelId: 'm1', taskId: 't1', iterations: 1 },
    ], 0)
    expect(estimate.totalMs).toBe(10_000)
  })
})
