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
 *  - 'cli_timeout'       : the CLI-driven generation exceeded the per-call cap —
 *                          a capability/speed story (the model was too slow to
 *                          finish in-window; free CLI tiers run 10-20 tok/s and
 *                          a 20-50k-token artifact simply cannot land inside a
 *                          10-minute cap), NOT the network story 'endpoint_hung'
 *                          tells
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
  | 'cli_timeout'
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

/**
 * Name of a registered scorer, as declared on a task row.
 *
 * These are the three built-in scorers exported from `scorers/index.ts`; a
 * plugin can register more via `registerScorer()`. The name is the
 * vocabulary a task uses to pick its evaluator without the selection
 * logic having to know anything about categories. The `(string & {})`
 * widening lets plugin-provided scorer names typecheck while built-ins
 * stay exhaustively enumerated.
 */
export type BenchmarkScorerName = 'behavioral' | 'html' | 'text' | (string & {})

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
  /**
   * Which scorer evaluates this task's output. **Explicit declaration beats
   * the category heuristic**: `selectScorer()` reads this field first and
   * only falls back to "is this one of the HTML-runnable categories?" when
   * it is absent. Absent is therefore backward compatible — an unstamped
   * task scores exactly as it did before the field existed — but every task
   * in the shipped registry declares one, and `registry.test.ts` fails a new
   * HTML-runnable task that forgets to.
   */
  scorer?: BenchmarkScorerName
  /**
   * Named behavioral checks for this task, resolved through the check
   * registry (`scorers/checks.ts`) — built-in names plus any a plugin
   * registered. When present, it REPLACES the per-task fallback map;
   * when absent, the fallback map (or no checks) applies.
   */
  checks?: string[]
  /**
   * The plugin that contributed this task, when it did not ship in the
   * built-in registry. Surfaced in the UI for attribution and used by the
   * loader for collision diagnostics.
   */
  pluginId?: string
}

/**
 * One behavioural check's outcome for a single iteration (mirrors the
 * `CheckResult` shape used by the sandbox, but lives here so the persisted
 * record has no Playwright/CLI types in it).
 */
export interface IterationCheckResult {
  /** Short, stable name (e.g. 'space-jump-dispatch'). */
  name: string
  /** True if the check passed. */
  passed: boolean
  /** Points awarded for this check (0 if failed). */
  points: number
  /** Max points this check is worth. */
  maxPoints: number
  /** Free-text detail for the report. */
  detail?: string
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
  /**
   * Per-iteration behavioural check results for interactive tasks (the five
   * HTML-runnable categories: 3d-physics-animation, advanced-game-building,
   * advanced-physics, advanced-electronics, ui-building). Each entry is the
   * flat list of checks for that iteration (passed/failed + name + detail)
   * so a reader can see WHY a model scored 30 on the platformer — which
   * specific check (Space-dispatch, canvas-advance, ...) tripped.
   *
   * Absent on text-only tasks and older records; populated only by
   * behavioural scorers that expose per-iteration check breakdowns.
   */
  iterationCheckResults?: IterationCheckResult[][]
  status: BenchmarkStatus
  /**
   * If status is not 'success', the dominant failure reason across the
   * aggregated iterations. 'none' when status is 'success'. See
   * BenchmarkFailureReason for the taxonomy.
   */
  failureReason?: BenchmarkFailureReason
  createdAt: string
  /**
   * Pointer to the per-iteration run log that produced this record —
   * `sweeps/<runId>/<file>` (see `lib/lab/llm-benchmark/runlog.ts`). The log
   * holds what the aggregate cannot: the exact prompt hash, every iteration's
   * raw and cleaned output, retries, timings, and per-check verdicts. Replay it
   * with `npx tsx scripts/retrace.mjs --run <runId>`.
   *
   * Present on every record produced by a sweep that had run logging enabled
   * (i.e. a run-log dir was set); absent on older records and on library/unit
   * runs with logging off.
   */
  runLogRef?: { runId: string; file: string }
  /**
   * When this model's quota is next expected to be available, as an ISO
   * timestamp — parsed from the provider's own error text at the moment the
   * circuit breaker tripped (agy says `Resets in 57h27m`).
   *
   * Present only on records from a run that a quota error killed AND whose
   * error message stated a window; absent everywhere else, including quota
   * trips whose message said nothing about a reset. It is an estimate from the
   * provider, not a guarantee. `scripts/run-benchmark.mjs` pre-flights against
   * it and refuses to start a sweep for a still-locked model.
   */
  quotaNextResetAt?: string
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
  /**
   * Optional: score an output and return the composite score PLUS the
   * per-check breakdown (used by behavioural scorers). When present, the
   * runner persists each successful iteration's checks on the result so the
   * UI can show *which* check tripped for a low score.
   */
  scoreWithBreakdown?(
    output: string,
    task: BenchmarkTask
  ): Promise<{ score: number; checks: IterationCheckResult[] }> | { score: number; checks: IterationCheckResult[] }
}
