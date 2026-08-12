import type {
  BenchmarkFailureReason,
  BenchmarkModel,
  BenchmarkResult,
  BenchmarkRunner,
  BenchmarkStatus,
  BenchmarkTask,
  IterationCheckResult,
  Scorer,
} from '../types'
import { estimateCost } from '../harness'
import { generateOpenAI, type OpenAIConfig } from './openai'
import { generateAnthropic, type AnthropicConfig } from './anthropic'
import { generateGoogle, type GoogleConfig } from './google'
import { generateMoonshot, type MoonshotConfig } from './moonshot'
import { generateOpenRouter, type OpenRouterConfig } from './openrouter'
import { generateAgy, type AgyConfig } from './agy'
import { generateCodex, type CodexConfig } from './codex'
import { generateOpencode, type OpencodeConfig } from './opencode'
import { getCachedResponse, setCachedResponse, setBustCache, saveQueue } from '../cache'
import { selectScorer } from '../scorers'
import { withSandboxConstraints } from '../prompts'
import { inlineDependenciesAsync } from '../sandbox/inline-dependencies'

export interface ProviderRunnerConfig {
  openai?: OpenAIConfig
  anthropic?: AnthropicConfig
  google?: GoogleConfig
  moonshot?: MoonshotConfig
  openrouter?: OpenRouterConfig
  agy?: AgyConfig
  codex?: CodexConfig
  opencode?: OpencodeConfig
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

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

export function isTimeoutError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  // Runner-internal timeouts are TimeoutError; CLI runners throw plain Errors
  // with a "Timeout after Nms" message, so fall back to message matching.
  return err.name === 'TimeoutError' || /\btime(?:d[ -]?|-)?out\b/i.test(err.message)
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const raced = Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new TimeoutError(`Timeout after ${ms}ms: ${label}`)), ms)
    }),
  ])
  // Clear the timer whichever side wins, otherwise every call leaks a live
  // timer that keeps the process alive for up to the full timeout window.
  return raced.finally(() => {
    if (timer !== undefined) clearTimeout(timer)
  })
}

function extractStatus(err: unknown): number | undefined {
  if (!(err instanceof Error)) return undefined
  const match = err.message.match(/(?:error|status)\s*(\d{3})/i) ?? err.message.match(/\b(\d{3})\b/)
  return match ? Number(match[1]) : undefined
}

function isRateLimitError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const message = err.message.toLowerCase()
  if (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('overloaded')
  ) {
    return true
  }
  return extractStatus(err) === 429
}

/**
 * Quota/billing exhaustion (Moonshot "usage limit for this billing cycle",
 * OpenAI insufficient_quota, Anthropic credit balance, ...). These are NOT
 * transient: every subsequent call to the provider fails identically, so the
 * runner fail-fast breaks the current task and trips a circuit breaker that
 * skips the provider for the rest of the sweep — leaving existing results
 * untouched instead of replacing them with quota-error failures.
 */
export function isQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const message = err.message.toLowerCase()
  return (
    message.includes('access_terminated_error') ||
    message.includes('usage limit') ||
    message.includes('insufficient_quota') ||
    message.includes('exceeded your current quota') ||
    message.includes('credit balance') ||
    message.includes('billing cycle') ||
    // OpenRouter free tier: the per-model daily cap is a hard stop, not a
    // transient rate limit — every later call fails identically.
    message.includes('daily limit') ||
    message.includes('no free model provider') ||
    // Agy CLI subscription quota (per-model rate limit; not transient).
    // Without this, the runner retries every iteration for ~3h until the
    // quota resets, wasting the whole sweep window.
    message.includes('individual quota reached')
  )
}

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const message = err.message.toLowerCase()

  // Timeout
  if (isTimeoutError(err)) return true

  // Truncated generation (reasoning consumed the completion budget) — worth a
  // retry: sampling is stochastic at temperature 1 and the next attempt may
  // finish. NOT loop-breaking, unlike quota/auth failures.
  if (message.includes('truncated at the completion-token limit')) return true

  // Rate limiting / overload — always retryable.
  if (isRateLimitError(err)) return true

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

  // HTTP status markers inside error messages: retry 5xx plus 429 (rate limit)
  // and 408 (request timeout); never other 4xx auth/validation errors.
  const status = extractStatus(err)
  if (status !== undefined) {
    return status >= 500 || status === 429 || status === 408
  }

  return false
}

/**
 * Map a thrown error (or empty-body signal) to a BenchmarkFailureReason.
 * Order matters: the most specific classification wins.
 *
 *   quota → rate-limit → auth → invalid → endpoint-hung/timeout →
 *   truncated → empty-body → model-error
 *
 * `output` is the assistant content (may be empty) for the case where the
 * provider returned 200 with a length finish and no usable content; pass it
 * to distinguish `truncated` (reasoning burned the budget) from `empty_body`
 * (the stream produced no deltas at all).
 */
export function classifyFailureReason(
  err: unknown,
  output?: { content: string; finishReason?: string }
): BenchmarkFailureReason {
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  const status = extractStatus(err)

  // Quota / billing — hard stop, every later call fails identically.
  if (isQuotaError(err)) return 'quota_exhausted'

  // Transient 429 / overload — the runner already retried; it still failed.
  if (status === 429 || message.includes('rate limit') || message.includes('too many requests') || message.includes('overloaded')) {
    return 'rate_limited'
  }

  // Auth / scope errors — never transient, never retry.
  if (status === 401 || status === 403) return 'auth_error'

  // Provider rejected the request shape.
  if (status === 400 || message.includes('invalid request')) return 'invalid_request'

  // Network-level failures that survived retries → endpoint genuinely unreachable
  // or hung. Distinct from the per-call runner timeout (which surfaces as
  // `endpoint_hung` via the TimeoutError path below — same outcome).
  if (
    message.includes('fetch failed') ||
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('enotfound') ||
    message.includes('socket hang up')
  ) {
    return 'endpoint_hung'
  }

  // Runner timeout (10-minute per-call cap). If the elapsed was near the cap,
  // the endpoint was hanging; otherwise a generic timeout. We surface both as
  // `endpoint_hung` because from the model's perspective the result is the same.
  if (isTimeoutError(err)) return 'endpoint_hung'

  // Truncated generation — reasoning consumed the completion budget before the
  // model wrote any answer. The runners throw this explicitly so we can
  // distinguish it from a generic model error.
  if (message.includes('truncated at the completion-token limit')) return 'truncated'

  // 5xx after retries — the provider is degraded.
  if (status !== undefined && status >= 500) return 'model_error'

  // The response was 200 but the assistant message carried no usable content.
  // Distinguish truncated (reasoning consumed the budget) from a plain
  // empty body (stream ended with no deltas).
  if (output !== undefined) {
    if (output.finishReason === 'length' && output.content.trim().length === 0) {
      return 'truncated'
    }
    if (output.content.trim().length === 0) {
      return 'empty_body'
    }
  }

  return 'model_error'
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
    case 'OpenRouter':
      if (!cfg.openrouter) throw new Error(`OpenRouter config missing for ${model.id}`)
      return { provider: 'openrouter' as const, config: cfg.openrouter }
    case 'Agy':
      if (!cfg.agy) throw new Error(`Agy config missing for ${model.id}`)
      return { provider: 'agy' as const, config: cfg.agy }
    case 'Codex':
      if (!cfg.codex) throw new Error(`Codex config missing for ${model.id}`)
      return { provider: 'codex' as const, config: cfg.codex }
    case 'OpenCode':
      if (!cfg.opencode) throw new Error(`OpenCode config missing for ${model.id}`)
      return { provider: 'opencode' as const, config: cfg.opencode }
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
    case 'openrouter':
      return generateOpenRouter(config, model, task)
    case 'agy':
      return generateAgy(config, model, task)
    case 'codex':
      return generateCodex(config, model, task)
    case 'opencode':
      return generateOpencode(config, model, task)
  }
}

async function generateOne(
  cfg: ProviderRunnerConfig,
  model: BenchmarkModel,
  rawTask: BenchmarkTask,
  iterationIndex: number,
  bustCache: boolean,
  timeoutMs: number,
  label: string
): Promise<GenerationResponse> {
  // HTML-category tasks get the demo-sandbox contract appended (self-contained
  // doc, no CDNs, no runtime JSX) so models generate directly-runnable
  // artifacts instead of relying on post-processing to patch them up. The
  // amended prompt is also the cache key, so constraint changes re-run live.
  const task = withSandboxConstraints(rawTask)

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
      // Same 40-char floor as aggregation: never cache degenerate outputs
      // (e.g. a bare "DONE" from a file-handoff run that wrote nothing) — a
      // poisoned cache would keep serving them on every non-busted rerun.
      if (!bustCache && response.output.trim().length >= 40) {
        setCachedResponse(model.id, task.id, task.prompt, iterationIndex, response)
      }
      return response
    } catch (err) {
      lastErr = err
      if (!isTransientError(err) || attempt === maxRetries) {
        throw err
      }
      // Rate limits deserve a much longer backoff than generic transient errors.
      const baseDelayMs = 1000 * 2 ** attempt
      const delayMs = isRateLimitError(err) ? baseDelayMs * 4 : baseDelayMs
      console.warn(
        `[harness] retry ${attempt + 1}/${maxRetries} for ${model.name} :: ${task.title} #${iterationIndex + 1} after ${delayMs}ms: ${err instanceof Error ? err.message : String(err)}`
      )
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw lastErr ?? new Error(`All retries exhausted for ${model.name} :: ${task.title}`)
}

/** One iteration's outcome, as collected by the runner before aggregation. */
export interface IterationRun {
  /** Cleaned model output on success; the error message on failure. */
  output: string
  tokensIn: number
  tokensOut: number
  runtimeMs: number
  status: 'success' | 'fail'
  /** Set on failed iterations whose failure was a timeout. */
  timedOut?: boolean
  /** Classified failure reason; 'none' when status === 'success'. */
  failureReason?: BenchmarkFailureReason
  /** Raw finish_reason from the provider, when known. Used to disambiguate truncated vs empty_body. */
  finishReason?: string
}

/**
 * Aggregate per-iteration runs into a single BenchmarkResult, per the
 * contract documented on BenchmarkResult in ../types:
 *  - score:      mean 0-100 score across SUCCESSFUL iterations (0 if none),
 *                clamped to 1..100 and rounded to 1 decimal
 *  - runtimeMs:  mean wall-clock per SUCCESSFUL iteration (0 if none)
 *  - tokensIn/tokensOut: TOTALS across all iterations
 *  - costUsd:    TOTAL estimated spend across all iterations
 *  - status:     'success' = all iterations succeeded; 'partial' = some;
 *                'fail' = none; 'timeout' = none, and the last error was a timeout
 */
export async function aggregateRuns(
  runs: IterationRun[],
  iterations: number,
  model: BenchmarkModel,
  task: BenchmarkTask,
  scorer: Scorer,
  createdAt: string = new Date().toISOString()
): Promise<BenchmarkResult> {
  // A "success" that produced no usable output can't be scored or displayed;
  // treat it as a failed iteration. The 40-char floor also catches degenerate
  // acknowledgements — e.g. file-handoff runs where the CLI replied "DONE"
  // without writing the artifact; no real artifact for any task is that short.
  const successRuns = runs.filter((r) => r.status === 'success' && r.output.trim().length >= 40)

  const totalTokensIn = runs.reduce((sum, r) => sum + r.tokensIn, 0)
  const totalTokensOut = runs.reduce((sum, r) => sum + r.tokensOut, 0)

  // Score EVERY successful iteration's output and publish the mean. When the
  // scorer exposes a per-iteration breakdown (behavioural scorers), capture
  // each iteration's checks alongside its score so the UI can show WHICH
  // check tripped for a low score.
  let score = 0
  let iterationScores: number[] = []
  let iterationCheckResults: IterationCheckResult[][] = []
  if (successRuns.length > 0) {
    if (scorer.scoreWithBreakdown) {
      const breakdowns = await Promise.all(
        successRuns.map((r) => scorer.scoreWithBreakdown!(r.output, task))
      )
      iterationScores = breakdowns.map((b) => b.score)
      iterationCheckResults = breakdowns.map((b) => b.checks)
    } else {
      iterationScores = await Promise.all(successRuns.map((r) => scorer.score(r.output, task)))
    }
    const mean = iterationScores.reduce((sum, s) => sum + s, 0) / iterationScores.length
    score = Math.round(Math.min(100, Math.max(1, mean)) * 10) / 10
  }

  // Mean runtime over SUCCESSFUL iterations only — failed runs report 0ms and
  // would deflate the average.
  const runtimeMs =
    successRuns.length > 0
      ? Math.round(successRuns.reduce((sum, r) => sum + r.runtimeMs, 0) / successRuns.length)
      : 0

  const lastFailed = [...runs].reverse().find((r) => r.status === 'fail')
  const status: BenchmarkStatus =
    runs.length > 0 && successRuns.length === runs.length
      ? 'success'
      : successRuns.length > 0
        ? 'partial'
        : lastFailed?.timedOut
          ? 'timeout'
          : 'fail'

  // Aggregate failure reason: if everything succeeded, 'none'. Otherwise take
  // the LAST failed iteration's reason (the most recent cause — if the loop
  // kept retrying transient failures and finally hit a quota, quota is the
  // dominant story). When multiple different reasons occurred, the per-iteration
  // breakdown is lost — the UI surfaces a histogram of reasons for that.
  const failureReason: BenchmarkFailureReason =
    status === 'success'
      ? 'none'
      : (lastFailed?.failureReason ?? 'model_error')

  // Publish the BEST-scoring successful iteration's output — the demo renders
  // this artifact, so it should be the strongest run, not whichever happened
  // to come first. Fall back to the last run's output (an error message when
  // every iteration failed).
  let output = runs[runs.length - 1]?.output ?? ''
  if (successRuns.length > 0) {
    let bestIdx = 0
    for (let i = 1; i < iterationScores.length; i++) {
      if (iterationScores[i] > iterationScores[bestIdx]) bestIdx = i
    }
    output = successRuns[bestIdx].output
  }

  return {
    taskId: task.id,
    modelId: model.id,
    score,
    runtimeMs,
    tokensIn: totalTokensIn,
    tokensOut: totalTokensOut,
    costUsd: estimateCost(totalTokensIn, totalTokensOut, model),
    iterations,
    iterationsSucceeded: successRuns.length,
    status,
    failureReason,
    // Per-iteration scores so the UI can show variance (Loop 3). Only present
    // when at least one iteration produced a scoreable artifact.
    iterationScores: iterationScores.length > 0 ? iterationScores : undefined,
    // Per-iteration behavioural check outcomes, aligned by index with
    // iterationScores. Only present when a behavioural scorer ran and at
    // least one iteration produced checks.
    iterationCheckResults:
      iterationCheckResults.length > 0 ? iterationCheckResults : undefined,
    createdAt,
    source: 'live',
    output,
  }
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

  // Circuit breaker: once a model reports quota/billing exhaustion, every
  // later call fails identically. Skipping its remaining jobs avoids burning
  // the sweep on guaranteed failures — and since no result is recorded for a
  // skipped job, existing good records are left untouched.
  //
  // Scoped per MODEL, not per provider: quota/billing exhaustion is a
  // per-model condition (per-model daily caps, per-model subscription limits
  // like Agy's "individual quota reached", per-model credit balances). A
  // provider-wide outage still trips every model individually on its first
  // failing call, so nothing is lost by keeping the breaker model-scoped.
  const trippedModels = new Set<string>()

  return {
    runTask: async (model: BenchmarkModel, task: BenchmarkTask, iterations: number): Promise<BenchmarkResult[]> => {
      if (trippedModels.has(model.id)) {
        throw new Error(
          `${model.name} disabled for the rest of this run after a quota/billing error — skipping ${model.name} :: ${task.title}`
        )
      }

      const now = new Date().toISOString()
      const scorer = cfg.scorer ?? selectScorer(task)
      const runs: IterationRun[] = []

      for (let i = 0; i < iterations; i++) {
        const label = `${model.name} :: ${task.title} #${i + 1}/${iterations}`
        console.log(`[harness] starting ${label}`)
        const callStart = Date.now()
        try {
          // Empty-body retry (Loop 2): a 200 response with zero assistant
          // deltas is a distinct failure mode from network/429 errors — the
          // transient-retry inside generateOne won't catch it (it's not an
          // error). Free-tier endpoints in particular occasionally return
          // 200 with an empty stream when the shared pool is pressured; one
          // more attempt with a short backoff recovers the vast majority.
          // The retry only fires when the cache miss produced empty content;
          // cached empty responses still replay (they're real data points).
          const emptyBodyMaxAttempts = 3
          let attempt = 0
          let response: GenerationResponse | undefined
          while (true) {
            response = await generateOne(cfg, model, task, i, bustCache, timeoutMs, label)
            const cleanedProbe = cleanOutput(response.output)
            if (cleanedProbe.trim().length >= 40) break
            attempt++
            if (attempt >= emptyBodyMaxAttempts) break
            const delayMs = 1500 * attempt
            console.warn(
              `[harness] empty body on attempt ${attempt}/${emptyBodyMaxAttempts} for ${label} (${response.tokensIn}/${response.tokensOut} tokens) — retrying after ${delayMs}ms`
            )
            await new Promise((resolve) => setTimeout(resolve, delayMs))
          }
          const { output, tokensIn, tokensOut, runtimeMs } = response
          let cleaned = cleanOutput(output)
          if (/<html[\s>]|<!doctype|<head>|<body>|<script\b|<link\b|<style\b|<canvas\b|<svg\b/i.test(cleaned)) {
            try {
              const rewritten = await inlineDependenciesAsync(cleaned)
              if (rewritten.inlined.length || rewritten.failed.length || rewritten.removed.length || rewritten.warnings.length) {
                console.log(
                  `[harness] sandboxed ${rewritten.inlined.length} deps, removed ${rewritten.removed.length}, failed ${rewritten.failed.length}, warnings ${rewritten.warnings.length} for ${label}`
                )
                for (const warning of rewritten.warnings) {
                  console.warn(`[harness] sandbox warning for ${label}: ${warning}`)
                }
              }
              cleaned = rewritten.output
            } catch (inlineErr) {
              console.warn(
                `[harness] failed to inline dependencies for ${label}: ${inlineErr instanceof Error ? inlineErr.message : String(inlineErr)}`
              )
            }
          }
          // Empty-body detection: the provider returned 200 with no usable
          // assistant content after exhausting the empty-body retry loop above.
          // Record as a failed iteration so it doesn't pad the success count
          // with degenerate runs, and stamp the failure reason so the UI can
          // show "empty_body" rather than burying it inside a partial.
          if (cleaned.trim().length === 0) {
            const reason = classifyFailureReason(new Error('empty body'), { content: cleaned, finishReason: undefined })
            console.error(
              `[harness] empty body for ${label} after ${Date.now() - callStart}ms and ${attempt + 1} attempt(s) (${tokensIn}/${tokensOut} tokens) — recording as ${reason}`
            )
            runs.push({
              output: `empty body (${tokensIn}/${tokensOut} tokens)`,
              tokensIn,
              tokensOut,
              runtimeMs,
              status: 'fail',
              timedOut: false,
              failureReason: reason,
            })
            // No quota / non-transient break here — an empty body on a free
            // endpoint is often a transient provider-pool blip; let the next
            // iteration try again. The outer transient-retry already handled
            // 429/5xx, so reaching here means the 200 itself was empty.
            continue
          }
          if (attempt > 0) {
            console.log(
              `[harness] recovered empty body for ${label} on attempt ${attempt + 1} after ${Date.now() - callStart}ms (${tokensIn}/${tokensOut} tokens)`
            )
          } else {
            console.log(
              `[harness] completed ${label} in ${Date.now() - callStart}ms (${tokensIn}/${tokensOut} tokens)`
            )
          }
          runs.push({ output: cleaned, tokensIn, tokensOut, runtimeMs, status: 'success', failureReason: 'none' })
        } catch (err) {
          const reason = classifyFailureReason(err)
          console.error(
            `[harness] failed ${label} after ${Date.now() - callStart}ms [${reason}]: ${err instanceof Error ? err.message : String(err)}`
          )
          runs.push({
            output: err instanceof Error ? err.message : String(err),
            tokensIn: 0,
            tokensOut: 0,
            runtimeMs: 0,
            status: 'fail',
            timedOut: isTimeoutError(err),
            failureReason: reason,
          })
          if (isQuotaError(err)) {
            trippedModels.add(model.id)
            console.error(
              `[harness] quota/billing exhausted for ${model.name} — skipping remaining iterations and all further ${model.name} tasks this run`
            )
            break
          }
          if (!isTransientError(err)) {
            // Auth/validation failures repeat identically for the same prompt —
            // don't burn the remaining iterations on guaranteed failures.
            console.error(
              `[harness] non-transient error — skipping remaining iterations for ${model.name} :: ${task.title}`
            )
            break
          }
        }
      }

      // Make sure any cache writes queued by this task have flushed to disk.
      await saveQueue

      return [await aggregateRuns(runs, iterations, model, task, scorer, now)]
    },
  }
}
