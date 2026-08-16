import { describe, it, expect } from 'vitest'
import { formatQuotaWindow, parseQuotaResetMs, quotaLockedModels } from './quota'
import type { BenchmarkResult } from './types'

const HOUR = 60 * 60 * 1000
const MINUTE = 60 * 1000

describe('parseQuotaResetMs', () => {
  it('parses the agy "Resets in 57h27m" shape', () => {
    expect(parseQuotaResetMs('individual quota reached. Resets in 57h27m')).toBe(57 * HOUR + 27 * MINUTE)
  })

  it('parses an hours-only window', () => {
    expect(parseQuotaResetMs('resets in 2h')).toBe(2 * HOUR)
  })

  it('parses a minutes-only window', () => {
    expect(parseQuotaResetMs('resets in 45m')).toBe(45 * MINUTE)
  })

  it('tolerates extra whitespace between the components', () => {
    expect(parseQuotaResetMs('resets in  3h  5m')).toBe(3 * HOUR + 5 * MINUTE)
  })

  it('accepts the singular "Reset in" spelling, case-insensitively', () => {
    expect(parseQuotaResetMs('Reset in 1h')).toBe(1 * HOUR)
  })

  it('returns undefined when the message carries no window', () => {
    expect(parseQuotaResetMs('some other error')).toBeUndefined()
    expect(parseQuotaResetMs('')).toBeUndefined()
  })

  it('returns undefined (not 0) for a phrase with no digits', () => {
    // The regex components are both optional, so an empty match is possible.
    // Treating that as "0ms from now" would stamp an already-expired window and
    // read as "quota is back" — the opposite of what the message says.
    expect(parseQuotaResetMs('resets in')).toBeUndefined()
    expect(parseQuotaResetMs('quota reached, resets in a while')).toBeUndefined()
  })
})

describe('formatQuotaWindow', () => {
  it('renders hours and minutes', () => {
    expect(formatQuotaWindow(57 * HOUR + 27 * MINUTE)).toBe('57h27m')
  })

  it('drops the minute part when it is zero', () => {
    expect(formatQuotaWindow(2 * HOUR)).toBe('2h')
  })

  it('renders a sub-hour window in minutes', () => {
    expect(formatQuotaWindow(45 * MINUTE)).toBe('45m')
    expect(formatQuotaWindow(30 * 1000)).toBe('0m')
  })
})

function makeResult(overrides: Partial<BenchmarkResult> = {}): BenchmarkResult {
  return {
    taskId: 'task-a',
    modelId: 'model-a',
    score: 0,
    runtimeMs: 0,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    iterations: 1,
    iterationsSucceeded: 0,
    status: 'fail',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('quotaLockedModels', () => {
  const now = new Date('2026-01-01T00:00:00Z')
  const future = '2026-01-03T09:27:00.000Z'
  const past = '2025-12-31T23:00:00.000Z'

  it('reports a targeted model whose stored window is still in the future', () => {
    const locks = quotaLockedModels([makeResult({ quotaNextResetAt: future })], ['model-a'], now)
    expect(locks).toEqual([{ modelId: 'model-a', until: future }])
  })

  it('ignores a window that has already passed', () => {
    expect(quotaLockedModels([makeResult({ quotaNextResetAt: past })], ['model-a'], now)).toEqual([])
  })

  it('ignores models that are not targeted by this run', () => {
    const results = [makeResult({ modelId: 'model-b', quotaNextResetAt: future })]
    expect(quotaLockedModels(results, ['model-a'], now)).toEqual([])
  })

  it('ignores records with no window and malformed timestamps', () => {
    const results = [makeResult(), makeResult({ taskId: 'task-b', quotaNextResetAt: 'not-a-date' })]
    expect(quotaLockedModels(results, ['model-a'], now)).toEqual([])
  })

  it('reports the furthest-future window when several records disagree', () => {
    const results = [
      makeResult({ taskId: 'task-a', quotaNextResetAt: '2026-01-02T00:00:00.000Z' }),
      makeResult({ taskId: 'task-b', quotaNextResetAt: future }),
      makeResult({ taskId: 'task-c', quotaNextResetAt: past }),
    ]
    expect(quotaLockedModels(results, ['model-a'], now)).toEqual([{ modelId: 'model-a', until: future }])
  })

  it('reports one entry per locked model, in the order the run targets them', () => {
    const results = [
      makeResult({ modelId: 'model-b', quotaNextResetAt: future }),
      makeResult({ modelId: 'model-a', quotaNextResetAt: future }),
    ]
    expect(quotaLockedModels(results, ['model-a', 'model-b'], now).map((l) => l.modelId)).toEqual([
      'model-a',
      'model-b',
    ])
  })
})
