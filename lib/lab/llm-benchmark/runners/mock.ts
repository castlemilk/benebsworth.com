import { estimateCost } from '../harness'
import type { BenchmarkModel, BenchmarkResult, BenchmarkRunner, BenchmarkTask } from '../types'

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function createMockRunner(seed = 42): BenchmarkRunner {
  const rng = mulberry32(seed)

  return {
    runTask: async (model: BenchmarkModel, task: BenchmarkTask, iterations: number): Promise<BenchmarkResult[]> => {
      const pairSeed = seed + hashString(task.id) + hashString(model.id)
      const pairRng = mulberry32(pairSeed)

      const baseScore = clamp(60 + Math.floor(pairRng() * 35), 0, 100)
      const baseRuntime = 2500 + Math.floor(pairRng() * 12000)
      const baseTokensIn = 1200 + Math.floor(pairRng() * 3000)
      const baseTokensOut = 700 + Math.floor(pairRng() * 2300)

      const results: BenchmarkResult[] = []
      const now = new Date().toISOString()

      for (let i = 0; i < iterations; i++) {
        const score = clamp(Math.round(baseScore + (rng() - 0.5) * 10), 0, 100)
        const runtimeMs = Math.round(baseRuntime * (0.8 + rng() * 0.4))
        const tokensIn = Math.round(baseTokensIn * (0.9 + rng() * 0.2))
        const tokensOut = Math.round(baseTokensOut * (0.9 + rng() * 0.2))

        const statusRoll = rng()
        const status = statusRoll > 0.92 ? 'timeout' : statusRoll > 0.85 ? 'fail' : 'success'

        results.push({
          taskId: task.id,
          modelId: model.id,
          score,
          runtimeMs,
          tokensIn,
          tokensOut,
          costUsd: estimateCost(tokensIn, tokensOut, model),
          iterations: 1,
          status,
          createdAt: now,
        })
      }

      return results
    },
  }
}
