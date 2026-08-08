export type BenchmarkStatus = 'success' | 'partial' | 'fail' | 'timeout'

/**
 * Classification of WHY an iteration or aggregate result failed.
 *
 * These exist so the UI can separate **model capability** (the model tried and
 * produced bad output) from **infrastructure reliability** (the endpoint 429'd,
 * hung, returned empty bodies, etc.). Without this distinction a free-tier
 * rate-limit storm reads as a model scoring 40 — which is wrong and unfair to
 * the model. The single failure on a partial/fail record is the LAST failed
 * iteration's reason (the dominant cause by recency); a per-iteration breakdown
 * is not persisted.
 *
 *  - 'none'              : iteration succeeded (no failure)
 *  - 'rate_limited'      : transient 429/overload (retried, still failed)
 *  - 'quota_exhausted'   : hard stop — daily cap, billing cycle, or provider
 *                          pool exhausted (non-transient, every later call fails)
 *  - 'endpoint_hung'     : fetch never completed (connect/socket stall, DNS,
 *                          or stream stalled past the runner timeout). Distinct
 *                          from 'timeout' which is a per-call cap.
 *  - 'truncated'         : finish_reason 'length' with empty content — the
 *                          reasoning trace consumed the completion budget before
 *                          the model wrote any answer
 *  - 'empty_body'        : HTTP 200 but the assistant message had no content
 *                          (model emitted reasoning/refusal only, or the stream
 *                          ended before any delta)
 *  - 'auth_error'        : 401/403 (key missing/invalid/quota scope wrong)
 *  - 'invalid_request'   : 400 (prompt rejected by the provider)
 *  - 'model_error'       : 5xx after retries, or any unclassified provider error
 */
export type BenchmarkFailureReason =
  | 'none'
  | 'rate_limited'
  | 'quota_exhausted'
  | 'endpoint_hung'
  | 'truncated'
  | 'empty_body'
  | 'auth_error'
  | 'invalid_request'
  | 'model_error'

/**
 * Where a result came from. 'live' results were produced by real API/CLI
 * harness runs; 'seeded' results are hand-authored sample data used to
 * scaffold the UI before a model has been run for real. The UI must always
 * disclose seeded results and exclude them from headline verdicts.
 */
export type BenchmarkSource = 'live' | 'seeded'

export interface BenchmarkModel {
  id: string
  name: string
  provider: string
  /** API model identifier, if it differs from the registry id (e.g. 'kimi-k2-7'). */
  apiModelId?: string
  costPer1kInputUsd: number
  costPer1kOutputUsd: number
  contextWindow: number
  capabilities: string
  /** Link to the provider's public model card (e.g. OpenRouter model page). */
  modelCardUrl?: string
  /** Link to the vendor's website. */
  vendorUrl?: string
  /** Vendor organisation name (e.g. 'NVIDIA'). */
  company?: string
  /** Model family (e.g. 'Nemotron 3'). */
  family?: string
  /** Release date as ISO yyyy-mm-dd. */
  released?: string
  /** Model license (e.g. 'Apache 2.0'). */
  license?: string
  /** Human-readable parameter count (e.g. '550B A55B'). */
  params?: string
  /** Short capability tags shown on cards. */
  tags?: string[]
  /** One-line description shown on model cards. */
  blurb?: string
}

export interface BenchmarkCategory {
  slug: string
  label: string
  glyph: string
  accent: string
  blurb: string
}

export interface BenchmarkTask {
  id: string
  category: string
  title: string
  blurb: string
  prompt: string
  runtimeHint: string
  iterationsDefault: number
  methodNotes: string
  demoComponentName: string
  slug: string
}

/**
 * One aggregated record per task × model.
 *
 * Field semantics (one record aggregates `iterations` API calls):
 *  - score:      mean 0-100 score across SUCCESSFUL iterations (0 if none)
 *  - runtimeMs:  mean wall-clock per SUCCESSFUL iteration
 *  - tokensIn/tokensOut: TOTALS across all iterations
 *  - costUsd:    TOTAL estimated spend across all iterations
 *  - status:     'success' = all iterations succeeded; 'partial' = some;
 *                'fail' = none; 'timeout' = none, and the last error was a timeout
 */
export interface BenchmarkResult {
  taskId: string
  modelId: string
  score: number
  runtimeMs: number
  tokensIn: number
  tokensOut: number
  costUsd: number
  iterations: number
  /** How many of the iterations succeeded (absent on older records = all succeeded). */
  iterationsSucceeded?: number
  /**
   * Per-iteration scores (0-100) for the successful iterations, in the order
   * they ran. Surfaced in the UI so readers can see whether a 99.4 average is
   * "five consistent runs at 99" or "one lucky 100 averaged with four 99s".
   * Absent on older records (added when failure-reason classification landed).
   */
  iterationScores?: number[]
  status: BenchmarkStatus
  /**
   * If status is not 'success', the dominant failure reason across the
   * aggregated iterations. 'none' when status is 'success'. See
   * BenchmarkFailureReason for the taxonomy.
   */
  failureReason?: BenchmarkFailureReason
  createdAt: string
  /** 'live' (real harness run) or 'seeded' (hand-authored sample data). */
  source?: BenchmarkSource
  /** Raw generated output from the model (code, derivation, etc.) for side-by-side comparison. */
  output?: string
}

export interface BenchmarkRunConfig {
  tasks?: string[]
  models?: string[]
  iterations?: number
  seed?: number
}

export interface BenchmarkRunner {
  runTask(model: BenchmarkModel, task: BenchmarkTask, iterations: number): Promise<BenchmarkResult[]>
}

export interface Scorer {
  /** Score a generated output for a task. Returns 0-100. */
  score(output: string, task: BenchmarkTask): Promise<number> | number
}
