import { describe, expect, it } from 'vitest'
import {
  calcAiMemoryFootprint,
  calcBandwidth,
  dramChargeAt,
  normalizeShare,
  type AiMemoryInput,
} from './memory-chip-ecosystem'

describe('memory chip ecosystem math', () => {
  it('calculates HBM4 and GDDR7 bandwidth from bus width and pin rate', () => {
    expect(calcBandwidth({ busBits: 2048, pinGbps: 8 })).toEqual({
      gbPerSecond: 2048,
      tbPerSecond: 2.05,
    })

    expect(calcBandwidth({ busBits: 512, pinGbps: 28 })).toEqual({
      gbPerSecond: 1792,
      tbPerSecond: 1.79,
    })
  })

  it('separates static model weights from sequence-sized KV cache', () => {
    const llamaLike70B: AiMemoryInput = {
      paramsB: 70,
      weightBits: 4,
      layers: 80,
      kvHeads: 8,
      headDim: 128,
      contextTokens: 32768,
      batch: 4,
      kvBytes: 2,
    }

    expect(calcAiMemoryFootprint(llamaLike70B)).toMatchObject({
      weightsGb: 35,
      kvCacheGb: 42.95,
      totalGb: 77.95,
    })
  })

  it('shows DRAM charge leaking toward the refresh cliff', () => {
    expect(dramChargeAt({ elapsedMs: 0, refreshMs: 64 }).charge).toBe(1)
    expect(dramChargeAt({ elapsedMs: 32, refreshMs: 64 })).toEqual({
      charge: 0.5,
      label: 'margin',
      needsRefresh: false,
    })
    expect(dramChargeAt({ elapsedMs: 64, refreshMs: 64 })).toEqual({
      charge: 0,
      label: 'refresh now',
      needsRefresh: true,
    })
  })

  it('normalizes supplier revenue shares while preserving source values', () => {
    const normalized = normalizeShare([
      { label: 'Samsung', value: 38.5 },
      { label: 'SK hynix', value: 28.8 },
      { label: 'Micron', value: 22.4 },
    ])

    expect(normalized.map((item) => item.label)).toEqual(['Samsung', 'SK hynix', 'Micron'])
    expect(normalized.map((item) => item.rawValue)).toEqual([38.5, 28.8, 22.4])
    expect(normalized.reduce((sum, item) => sum + item.percent, 0)).toBeCloseTo(100, 5)
  })
})
