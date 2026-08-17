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
  /**
   * The plugin that contributed this model, when it did not ship in the
   * built-in registry (mirrors `BenchmarkTask.pluginId`). Stamped by
   * `registerPlugin()`; never set it by hand. A plugin model normally pairs
   * with a plugin generator for the same `provider` string — see
   * `PluginGeneratorFactory`.
   */
  pluginId?: string
}

/**
 * What one generation call returns, whatever produced it.
 *
 * This is the harness's GENERATION SEAM: every built-in runner
 * (`runners/openai.ts`, `runners/agy.ts`, …) resolves to this shape, and it is
 * the contract a plugin-provided generator implements. It lives in `types.ts`
 * — the bottom layer — so the plugin registry can name it without importing
 * anything from `runners/` (which would invert the layering and close a
 * cycle; see `layering.test.ts`).
 */
/**
 * Where ONE call's token counts came from.
 *
 *  - `'reported'`  — the provider stated them (an API `usage` block).
 *  - `'estimated'` — we derived them (the ~4-chars-per-token heuristic in
 *                    `runners/cli.ts`), or the provider said nothing and the
 *                    counts are a zero-valued fallback.
 *
 * A call is never `'mixed'`: that value only exists on an AGGREGATE of calls
 * (`UsageSummary.source`). Declared here rather than in `billing.ts` because
 * `types.ts` is the bottom layer and may import nothing in-tree
 * (`layering.test.ts`); `billing.ts` re-exports both names and owns the math.
 */
export type UsageProvenance = 'reported' | 'estimated'

/** `UsageProvenance` widened for an aggregate, where both kinds can co-occur. */
export type UsageSource = UsageProvenance | 'mixed'

/**
 * Token accounting for one aggregated record — the single shape every provider
 * funnels into, whatever it could observe.
 *
 * `source` is the HONESTY field: it says whether the numbers beside it are the
 * provider's own or our heuristic's, so a cost figure can never quietly imply a
 * precision it does not have. Build one with `summarizeUsage()` and price it
 * with `costFromUsage()` (`billing.ts`) — never by hand.
 *
 * `cachedReadTokens` / `cachedWriteTokens` are ADDITIVE to `inputTokens`
 * (Anthropic-style disjoint counters), absent when zero, and produced by
 * nothing today — see `costFromUsage` for how they are billed.
 */
export interface UsageSummary {
  inputTokens: number
  outputTokens: number
  cachedReadTokens?: number
  cachedWriteTokens?: number
  source: UsageSource
}

export interface GenerationResponse {
  output: string
  tokensIn: number
  tokensOut: number
  runtimeMs: number
  /**
   * Where `tokensIn`/`tokensOut` came from — see `UsageProvenance`.
   *
   * Absent means the producer predates the field; consumers treat that as
   * `'estimated'` (unknown provenance must never be presented as a provider
   * statement). Who sets what:
   *  - **API providers** (`moonshot`, `openrouter`, `openai`, `anthropic`,
   *    `google`): `'reported'` when the response carried a usage block,
   *    `'estimated'` when it did not (the counts are then a zero fallback).
   *  - **CLI providers** (`agy`, `opencode`, `codex`): always `'estimated'`.
   *    Codex is the interesting case — it prints a real TOTAL, but the 25/75
   *    input/output SPLIT is our heuristic, and a split we invented does not
   *    earn `'reported'` for either half.
   */
  usageSource?: UsageProvenance
  /**
   * Time-to-first-observable-output, in ms from the same call start
   * `runtimeMs` is measured from. **Optional because it is genuinely not
   * observable everywhere** — absence means "not measured", never "zero"
   * (a 0ms TTFT is physically impossible, so a 0 would be a lie).
   *
   * Who sets it, and what the boundary actually is:
   *  - **Streaming API providers** (`moonshot.ts`, `openrouter.ts`): the
   *    arrival of the first non-empty `delta.content` chunk. This is a true
   *    first-TOKEN boundary.
   *  - **CLI providers** (`cli.ts` `runCli`, so agy/codex/opencode): the first
   *    stdout chunk from the spawned process. CAVEAT: that is first OUTPUT,
   *    not first token — an agent CLI's banner//spinner chrome can land before
   *    the model has decoded anything, so CLI TTFT is a proxy that reads LOW.
   *  - **Non-streaming API providers** (`openai.ts`, `anthropic.ts`,
   *    `google.ts`): NOT SET. A single-shot `fetch` gives exactly one
   *    timestamp — the assembled response — so there is no first-token
   *    boundary to observe. Stamping response-arrival time here would make
   *    TTFT == runtimeMs and the decode rate infinite; the honest record is
   *    absence. Instrumenting them means switching them to streaming first.
   */
  ttftMs?: number
}

/**
 * A plugin-provided generation function for one provider.
 *
 * Plugins plug in HERE, not at `BenchmarkRunner.runTask`: everything the
 * runner wraps around a generation call — transient retries, the response
 * cache, empty-body recovery, run-log events, the quota circuit breaker and
 * scoring — is the harness's value, and a plugin that replaced the loop would
 * fork the trust story (two code paths producing "the same" numbers). A
 * generator answers exactly one question: given a model and a task, what did
 * the provider return?
 */
export type PluginGenerate = (
  model: BenchmarkModel,
  task: BenchmarkTask,
  iterationIndex: number
) => Promise<GenerationResponse>

/**
 * How a plugin declares a generator: a LAZY factory that dynamically imports
 * the implementation.
 *
 * A generator is node-only by nature (it spawns a CLI or holds an API key),
 * while `plugins/registry.ts` is reachable from `demo-registry.tsx` and
 * therefore from the browser bundle. A static import of the implementation in
 * the plugin's `index.ts` would drag node code into that graph; the factory
 * defers it to first use inside `runners/provider.ts`, which is node-only
 * already. `provider.ts` awaits the factory once and caches the resolved
 * function for the process.
 *
 *     generators: { Echo: () => import('./generate').then((m) => m.echoGenerate) }
 */
export type PluginGeneratorFactory = () => Promise<PluginGenerate>

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
   * This task's own sandbox contract — the text `withSandboxConstraints()`
   * appends to `prompt` before it reaches the model. **Explicit beats the
   * category heuristic**, like `scorer` (#10). Three states:
   *
   * - `undefined` — inherit: the global `SANDBOX_CONSTRAINTS` (prompts.ts)
   *   is appended iff `category` is one of the HTML-runnable ones. This is
   *   what every built-in task does.
   * - `''` — explicitly NO contract, even for an HTML-runnable category.
   *   For a task whose whole point is that the model gets no scaffolding.
   * - non-empty — append exactly this text (separated by a blank line),
   *   whatever the category. It REPLACES the global contract rather than
   *   extending it; to extend, interpolate `SANDBOX_CONSTRAINTS` yourself.
   *
   * Lets a plugin ship task-specific constraints instead of editing a core
   * file. The amended prompt is the cache key and the run log's
   * `promptHash`, so changing this re-runs the task rather than replaying a
   * cached response — by design.
   */
  sandboxConstraints?: string
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
  /**
   * The same token accounting as `tokensIn`/`tokensOut`, plus the PROVENANCE of
   * those numbers and any cached-token counters — the richer view, and the one
   * `costUsd` is computed from (`costFromUsage` in `billing.ts`).
   *
   * `tokensIn`/`tokensOut` stay for backward compatibility: every stored record
   * and every consumer (analytics, the stat strips, verify-results) reads them,
   * and `usage.inputTokens`/`usage.outputTokens` are always equal to them. Read
   * `usage.source` when the question is "how much do I trust this cost" — a
   * `'estimated'` record's spend came from a ~4-chars-per-token guess.
   *
   * Absent on records written before this shipped; absence means "unknown
   * provenance", not "estimated zero".
   */
  usage?: UsageSummary
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
  /**
   * The sweep's per-model spend cap stopped this model, and this is the record
   * that was in flight when it did — `spentUsd` is the model's CUMULATIVE spend
   * across the sweep at the moment of the trip (so it can exceed this record's
   * own `costUsd`), and `capUsd` is the cap it crossed.
   *
   * The analogue of `quotaNextResetAt`: operational metadata about the RUN, not
   * a measurement of the model, which is why `mergeResults` carries it across
   * its never-clobber-good-data protection. It also explains an otherwise
   * puzzling record — `iterationsSucceeded` below `iterations` with no failed
   * iteration to blame — so it must not be read as a model defect.
   *
   * A budget stop is an OPERATOR POLICY, not a provider failure: it is
   * deliberately NOT a `BenchmarkFailureReason`, and the tasks skipped after
   * the trip produce no records at all (same as the quota breaker).
   *
   * Absent on every record from a sweep that ran without a cap, or under a cap
   * it never reached — i.e. almost all of them.
   */
  budgetExceeded?: { spentUsd: number; capUsd: number }
  /**
   * Per-call timing/efficiency rolled up over this record's iterations.
   *
   * WHY: `runtimeMs` is wall-clock only, and wall-clock cannot tell "the model
   * is slow" from "the network/queue is slow" — the distinction the
   * `cli_timeout` vs `endpoint_hung` taxonomy exists to make. TTFT is the
   * queue/prefill half and the decode rate is the generation half.
   *
   * Presence rules are deliberately NOT uniform (dsh `session-stats` says "0
   * until the first contributing event; clients read the value, never key
   * presence" — that rule is right for counters and wrong for latencies here):
   *  - `cacheHits` / `retries` are COUNTERS: always present, 0 meaning "none
   *    happened". Read the value; never key on presence.
   *  - `meanTtftMs` / `meanTokensPerSec` are MEASUREMENTS: absent means "no
   *    iteration could measure it". 0 would be a physically impossible TTFT
   *    and an infinitely slow decode, so absence is the honest signal here.
   *  - `rateKind` is present iff `meanTokensPerSec` is — it says WHICH rate the
   *    number is, and a rate without its label is unreadable.
   *
   * Absent entirely on records written before this shipped.
   */
  telemetry?: {
    /**
     * Mean TTFT over the iterations that measured one. See
     * `GenerationResponse.ttftMs` for which providers can and cannot.
     */
    meanTtftMs?: number
    /** Mean tokens/sec over the iterations a rate was computable for. */
    meanTokensPerSec?: number
    /**
     * What `meanTokensPerSec` measures:
     *  - `'decode'`     — tokensOut / (runtime − ttft): the real decode rate.
     *  - `'wall-clock'` — tokensOut / runtime: the documented fallback when no
     *                     first-token boundary was observable. It is DEPRESSED
     *                     by queue/prefill time and is not comparable to a
     *                     decode rate.
     *  - `'mixed'`      — some iterations of each; treat as a lower bound.
     */
    rateKind?: 'decode' | 'wall-clock' | 'mixed'
    /** Iterations served from the response cache (nothing was generated). */
    cacheHits: number
    /** Retries across all iterations — transient AND empty-body, failures included. */
    retries: number
  }
  /**
   * The prompt bundle this record was produced under — `promptBundleHash(task)`
   * at sweep time (`prompt-bundle.ts`): a short sha256 over the AMENDED prompt
   * (task prompt + the applied sandbox contract) plus the frame-prelude
   * fingerprint. In one line: everything that changes what the model SAW, or
   * the environment its artifact is DISPLAYED/PUBLISHED in.
   *
   * NOT the scoring environment: the behavioural scorer loads the raw artifact,
   * never `withPrelude` (see prompt-bundle.ts's header and TODO #12). A prelude
   * change stales history because the published rendering changed, not because
   * a check would flip.
   *
   * WHY it is on the record and not derived at read time: it is only derivable
   * for the CURRENT prompt. A stored score's bundle is history, and history is
   * exactly what a prompt edit destroys — tic-tac-toe's results were scored
   * under the old global contract and nothing marked them stale when its own
   * contract landed (#36).
   *
   * Absent on every record written before this shipped; those group as
   * `pre-bundle` in `scripts/prompt-bundle-audit.mjs` and SKIP (never warn) in
   * verify-results' `stale-prompt` check — legacy, not broken.
   */
  promptBundle?: string
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
