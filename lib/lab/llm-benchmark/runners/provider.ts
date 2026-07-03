import type { BenchmarkModel, BenchmarkResult, BenchmarkRunner, BenchmarkTask, Scorer } from '../types'
import { estimateCost } from '../harness'
import { generateOpenAI, type OpenAIConfig } from './openai'
import { generateAnthropic, type AnthropicConfig } from './anthropic'
import { generateGoogle, type GoogleConfig } from './google'
import { generateMoonshot, type MoonshotConfig } from './moonshot'
import { generateAgy, type AgyConfig } from './agy'
import { generateCodex, type CodexConfig } from './codex'
import {
  getCachedResponse,
  setCachedResponse,
  setBustCache,
  saveQueue,
  type CachedResponse,
} from '../cache'
import { htmlScorer, textScorer } from '../scorers'

export interface ProviderRunnerConfig {
  openai?: OpenAIConfig
  anthropic?: AnthropicConfig
  google?: GoogleConfig
  moonshot?: MoonshotConfig
  agy?: AgyConfig
  codex?: CodexConfig
  /** Per-call timeout in milliseconds. Defaults to 10 minutes. */
  timeoutMs?: number
  /** Maximum retries for transient failures. Defaults to 2. */
  maxRetries?: number
  /** Optional scorer; a default category-based scorer is used when omitted. */
  scorer?: Scorer
  /** If true, ignore the response cache and always call the provider. */
  bustCache?: boolean
}

interface GenerationResponse {
  output: string
  tokensIn: number
  tokensOut: number
  runtimeMs: number
}

function stripCodeFences(output: string): string {
  return output
    .replace(/^\s*```[a-zA-Z0-9]*\s*\n/, '')
    .replace(/\n\s*```\s*$/, '')
    .trim()
}

function extractFirstCodeBlock(output: string): string | undefined {
  const match = output.match(/```[a-zA-Z0-9]*\s*\n([\s\S]*?)\n\s*```/)
  return match?.[1]?.trim()
}

function removePreamble(output: string): string {
  // If the output is prose followed by a <!DOCTYPE or <html, trim the prose.
  const doctypeMatch = output.match(/(?:^|\n)\s*(<!DOCTYPE\s+html|<html[\s>])/i)
  if (doctypeMatch && doctypeMatch.index !== undefined && doctypeMatch.index > 0) {
    return output.slice(doctypeMatch.index).trim()
  }

  // If the output starts with an explanatory sentence and then code, find the first code-like line.
  const firstCodeLine = output.search(
    /\n\s*(?:<!DOCTYPE\s+html|<html[\s>]|import\s+|const\s+|function\s+|class\s+|def\s+|#\s*\w+\s*\n|<canvas|<script|<style|<div|<section|<svg)/i
  )
  if (firstCodeLine > 0) {
    return output.slice(firstCodeLine).trim()
  }

  return output
}

function cleanOutput(output: string): string {
  const extracted = extractFirstCodeBlock(output)
  const noFences = stripCodeFences(extracted ?? output)
  const trimmed = removePreamble(noFences).trim()
  return trimmed || output.trim()
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
    }),
  ])
}

function extractStatus(err: unknown): number | undefined {
  if (!(err instanceof Error)) return undefined
  const match = err.message.match(/(?:error|status)\s*(\d{3})/i) ?? err.message.match(/\b(\d{3})\b/)
  return match ? Number(match[1]) : undefined
}

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const message = err.message.toLowerCase()

  // Timeout
  if (message.includes('timeout')) return true

  // Network / DNS / socket errors
  if (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('enotfound') ||
    message.includes('socket')
  ) {
    return true
  }

  // HTTP status markers inside error messages: retry 5xx, never 4xx auth/validation errors.
  const status = extractStatus(err)
  if (status !== undefined) {
    return status >= 500
  }

  return false
}

function configForModel(model: BenchmarkModel, cfg: ProviderRunnerConfig) {
  switch (model.provider) {
    case 'OpenAI':
      if (!cfg.openai) throw new Error(`OpenAI config missing for ${model.id}`)
      return { provider: 'openai' as const, config: cfg.openai }
    case 'Anthropic':
      if (!cfg.anthropic) throw new Error(`Anthropic config missing for ${model.id}`)
      return { provider: 'anthropic' as const, config: cfg.anthropic }
    case 'Google':
      if (!cfg.google) throw new Error(`Google config missing for ${model.id}`)
      return { provider: 'google' as const, config: cfg.google }
    case 'Moonshot AI':
      if (!cfg.moonshot) throw new Error(`Moonshot config missing for ${model.id}`)
      return { provider: 'moonshot' as const, config: cfg.moonshot }
    case 'Agy':
      if (!cfg.agy) throw new Error(`Agy config missing for ${model.id}`)
      return { provider: 'agy' as const, config: cfg.agy }
    case 'Codex':
      if (!cfg.codex) throw new Error(`Codex config missing for ${model.id}`)
      return { provider: 'codex' as const, config: cfg.codex }
    default:
      throw new Error(`Unsupported provider: ${model.provider}`)
  }
}

async function generateWithProvider(
  cfg: ProviderRunnerConfig,
  model: BenchmarkModel,
  task: BenchmarkTask
): Promise<GenerationResponse> {
  const { provider, config } = configForModel(model, cfg)
  switch (provider) {
    case 'openai':
      return generateOpenAI(config, model, task)
    case 'anthropic':
      return generateAnthropic(config, model, task)
    case 'google':
      return generateGoogle(config, model, task)
    case 'moonshot':
      return generateMoonshot(config, model, task)
    case 'agy':
      return generateAgy(config, model, task)
    case 'codex':
      return generateCodex(config, model, task)
  }
}

const HTML_CATEGORIES = new Set([
  '3d-physics-animation',
  'advanced-game-building',
  'advanced-physics',
  'advanced-electronics',
  'ui-building',
])

function defaultScorer(task: BenchmarkTask): Scorer {
  return HTML_CATEGORIES.has(task.category) ? htmlScorer : textScorer
}

async function generateOne(
  cfg: ProviderRunnerConfig,
  model: BenchmarkModel,
  task: BenchmarkTask,
  iterationIndex: number,
  bustCache: boolean,
  timeoutMs: number,
  label: string
): Promise<GenerationResponse> {
  if (!bustCache) {
    const cached = getCachedResponse(model.id, task.id, task.prompt, iterationIndex)
    if (cached) {
      console.log(`[harness] cache hit ${model.name} :: ${task.title} #${iterationIndex + 1}`)
      return cached
    }
  }

  const maxRetries = cfg.maxRetries ?? 2
  let lastErr: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await withTimeout(
        generateWithProvider(cfg, model, task),
        timeoutMs,
        label
      )
      if (!bustCache && response.output.trim().length > 0) {
        setCachedResponse(model.id, task.id, task.prompt, iterationIndex, response)
      }
      return response
    } catch (err) {
      lastErr = err
      if (!isTransientError(err) || attempt === maxRetries) {
        throw err
      }
      const delayMs = 1000 * 2 ** attempt
      console.warn(
        `[harness] retry ${attempt + 1}/${maxRetries} for ${model.name} :: ${task.title} #${iterationIndex + 1} after ${delayMs}ms: ${err instanceof Error ? err.message : String(err)}`
      )
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw lastErr ?? new Error(`All retries exhausted for ${model.name} :: ${task.title}`)
}

/**
 * Create a real API runner for the benchmark.
 *
 * The runner executes `iterations` calls per task/model, retries transient
 * failures, caches successful responses, cleans generated output, scores
 * successful results, and returns a single aggregated result per task/model.
 */
export function createProviderRunner(cfg: ProviderRunnerConfig): BenchmarkRunner {
  const timeoutMs = cfg.timeoutMs ?? 10 * 60 * 1000 // 10 minutes
  const bustCache =
    cfg.bustCache ??
    (process.env.RUN_BUST_CACHE === '1' || process.env.RUN_BUST_CACHE === 'true')
  setBustCache(bustCache)

  return {
    runTask: async (model: BenchmarkModel, task: BenchmarkTask, iterations: number): Promise<BenchmarkResult[]> => {
      const now = new Date().toISOString()
      const scorer = cfg.scorer ?? defaultScorer(task)
      const runs: {
        output: string
        tokensIn: number
        tokensOut: number
        runtimeMs: number
        status: 'success' | 'fail'
      }[] = []

      for (let i = 0; i < iterations; i++) {
        const label = `${model.name} :: ${task.title} #${i + 1}/${iterations}`
        console.log(`[harness] starting ${label}`)
        const callStart = Date.now()
        try {
          const { output, tokensIn, tokensOut, runtimeMs } = await generateOne(
            cfg,
            model,
            task,
            i,
            bustCache,
            timeoutMs,
            label
          )
          console.log(
            `[harness] completed ${label} in ${Date.now() - callStart}ms (${tokensIn}/${tokensOut} tokens)`
          )
          runs.push({ output: cleanOutput(output), tokensIn, tokensOut, runtimeMs, status: 'success' })
        } catch (err) {
          console.error(
            `[harness] failed ${label} after ${Date.now() - callStart}ms: ${err instanceof Error ? err.message : String(err)}`
          )
          runs.push({
            output: err instanceof Error ? err.message : String(err),
            tokensIn: 0,
            tokensOut: 0,
            runtimeMs: 0,
            status: 'fail',
          })
        }
      }

      // Make sure any cache writes queued by this task have flushed to disk.
      await saveQueue

      const successRuns = runs.filter((r) => r.status === 'success')
      const totalTokensIn = runs.reduce((sum, r) => sum + r.tokensIn, 0)
      const totalTokensOut = runs.reduce((sum, r) => sum + r.tokensOut, 0)
      const totalRuntimeMs = runs.reduce((sum, r) => sum + r.runtimeMs, 0)
      const allSuccess = runs.length > 0 && runs.every((r) => r.status === 'success')

      // Keep the first successful output for inspection; fall back to the last run's output
      // (which will be an error message if every iteration failed).
      const representativeOutput =
        successRuns[0]?.output ?? runs[runs.length - 1]?.output ?? ''

      // A success that produced no usable output is effectively a failure for scoring/display.
      const hasUsableOutput = representativeOutput.trim().length > 0
      const rawScore = allSuccess && hasUsableOutput ? await scorer.score(representativeOutput, task) : 0
      const score = allSuccess && hasUsableOutput ? Math.max(1, Math.min(100, Math.round(rawScore))) : 0

      return [
        {
          taskId: task.id,
          modelId: model.id,
          score,
          runtimeMs: Math.round(totalRuntimeMs / iterations),
          tokensIn: totalTokensIn,
          tokensOut: totalTokensOut,
          costUsd: estimateCost(totalTokensIn, totalTokensOut, model),
          iterations,
          status: allSuccess ? 'success' : 'fail',
          createdAt: now,
          output: representativeOutput,
        },
      ]
    },
  }
}
