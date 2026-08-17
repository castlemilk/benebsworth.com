import { describe, it, expect } from 'vitest'
import { summarizeUsage, costFromUsage, type UsageSummary } from './billing'
import { estimateCost } from './harness'
import type { BenchmarkModel } from './types'

const model: BenchmarkModel = {
  id: 'test-model',
  name: 'Test Model',
  provider: 'Test',
  costPer1kInputUsd: 0.003,
  costPer1kOutputUsd: 0.015,
  contextWindow: 128000,
  capabilities: 'testing',
}

const free: BenchmarkModel = { ...model, costPer1kInputUsd: 0, costPer1kOutputUsd: 0 }

describe('summarizeUsage', () => {
  it('totals tokens and keeps a single provenance when every contributor agrees', () => {
    expect(
      summarizeUsage([
        { tokensIn: 100, tokensOut: 200, usageSource: 'reported' },
        { tokensIn: 50, tokensOut: 25, usageSource: 'reported' },
      ])
    ).toEqual({ inputTokens: 150, outputTokens: 225, source: 'reported' })

    expect(
      summarizeUsage([
        { tokensIn: 10, tokensOut: 20, usageSource: 'estimated' },
        { tokensIn: 30, tokensOut: 40, usageSource: 'estimated' },
      ])
    ).toEqual({ inputTokens: 40, outputTokens: 60, source: 'estimated' })
  })

  it("rolls a genuine mix up to 'mixed' rather than picking a winner", () => {
    expect(
      summarizeUsage([
        { tokensIn: 100, tokensOut: 200, usageSource: 'reported' },
        { tokensIn: 10, tokensOut: 20, usageSource: 'estimated' },
      ])
    ).toEqual({ inputTokens: 110, outputTokens: 220, source: 'mixed' })
  })

  it("treats an unstamped run as 'estimated' — unknown provenance is never a provider statement", () => {
    expect(summarizeUsage([{ tokensIn: 8, tokensOut: 12 }])).toEqual({
      inputTokens: 8,
      outputTokens: 12,
      source: 'estimated',
    })
    // …and mixing an unstamped run with a reported one is a mix, not a promotion.
    expect(
      summarizeUsage([
        { tokensIn: 8, tokensOut: 12 },
        { tokensIn: 100, tokensOut: 100, usageSource: 'reported' },
      ]).source
    ).toBe('mixed')
  })

  it('ignores zero-token runs when rolling up provenance', () => {
    // A failed iteration contributes 0/0 tokens; letting its (necessarily
    // estimated) stamp drag a fully-reported record to 'mixed' would describe
    // tokens that do not exist.
    expect(
      summarizeUsage([
        { tokensIn: 100, tokensOut: 200, usageSource: 'reported' },
        { tokensIn: 0, tokensOut: 0, usageSource: 'estimated' },
      ])
    ).toEqual({ inputTokens: 100, outputTokens: 200, source: 'reported' })
  })

  it("summarizes an empty or all-zero run list as estimated zero", () => {
    expect(summarizeUsage([])).toEqual({ inputTokens: 0, outputTokens: 0, source: 'estimated' })
    expect(summarizeUsage([{ tokensIn: 0, tokensOut: 0, usageSource: 'reported' }])).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      source: 'estimated',
    })
  })

  it('totals cached tokens and emits them only when non-zero', () => {
    expect(
      summarizeUsage([
        { tokensIn: 100, tokensOut: 10, usageSource: 'reported', cachedReadTokens: 40 },
        { tokensIn: 100, tokensOut: 10, usageSource: 'reported', cachedWriteTokens: 5 },
      ])
    ).toEqual({
      inputTokens: 200,
      outputTokens: 20,
      cachedReadTokens: 40,
      cachedWriteTokens: 5,
      source: 'reported',
    })
    expect(
      summarizeUsage([{ tokensIn: 1, tokensOut: 1, cachedReadTokens: 0, cachedWriteTokens: 0 }])
    ).toEqual({ inputTokens: 1, outputTokens: 1, source: 'estimated' })
  })
})

describe('costFromUsage', () => {
  const usage = (inputTokens: number, outputTokens: number): UsageSummary => ({
    inputTokens,
    outputTokens,
    source: 'reported',
  })

  it('is the flat per-1k math, to the last decimal', () => {
    expect(costFromUsage(usage(1500, 0), model)).toBeCloseTo(0.0045, 10)
    expect(costFromUsage(usage(0, 2000), model)).toBeCloseTo(0.03, 10)
    expect(costFromUsage(usage(1500, 1000), model)).toBeCloseTo(0.0045 + 0.015, 10)
    expect(costFromUsage(usage(0, 0), model)).toBe(0)
    expect(costFromUsage(usage(12345, 67890), free)).toBe(0)
  })

  it('LOCK: matches the pre-billing estimateCost across fixtures with no cached tokens', () => {
    const fixtures: Array<[number, number]> = [
      [0, 0],
      [1, 1],
      [200, 400],
      [1500, 1000],
      [31_204, 88_411],
      [999_999, 1],
    ]
    for (const [tokensIn, tokensOut] of fixtures) {
      for (const m of [model, free]) {
        expect(costFromUsage(usage(tokensIn, tokensOut), m)).toBe(estimateCost(tokensIn, tokensOut, m))
      }
    }
  })

  it('bills cached tokens at the NORMAL input rate (no cached-rate fields exist yet)', () => {
    // Documented, deliberately conservative: cached reads are normally cheaper,
    // so charging them at full input rate over-states spend rather than
    // under-stating it. Cached counts are ADDITIVE to inputTokens.
    const withCache: UsageSummary = {
      inputTokens: 1000,
      outputTokens: 0,
      cachedReadTokens: 500,
      cachedWriteTokens: 500,
      source: 'reported',
    }
    expect(costFromUsage(withCache, model)).toBeCloseTo(0.006, 10)
    // …and a summary carrying no cached fields is unaffected by the rule.
    expect(costFromUsage(usage(1000, 0), model)).toBeCloseTo(0.003, 10)
  })

  it('never returns a negative or NaN cost for a degenerate summary', () => {
    expect(costFromUsage({ inputTokens: -5, outputTokens: -5, source: 'estimated' }, model)).toBe(0)
    expect(
      costFromUsage({ inputTokens: Number.NaN, outputTokens: 10, source: 'estimated' }, model)
    ).toBeCloseTo(0.00015, 10)
  })
})
