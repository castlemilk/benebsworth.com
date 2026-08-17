---
name: llm-benchmark
description: Use when extending, running, or modifying the LLM benchmark section on benebsworth.com — adding models, tasks, demos, results, harness runners, scoring, caching, or operational changes.
---

# LLM Benchmark

## Overview

The site has a benchmark section at `/lab/llm-benchmark/` that compares frontier LLMs head-to-head across coding, physics, security, UI, mathematics, and electronics tasks. The section is a **hybrid registry + MDX + live API harness** design:

- Structured data (models, tasks, results, method metadata) lives in TypeScript registries under `lib/lab/llm-benchmark/`.
- Long-form pre/post text lives in MDX files under `content/lab/llm-benchmark/`.
- Interactive demos live in React components under `components/lab/llm-benchmark/demos/`.
- The harness scaffold, cost estimation, and aggregation live in `lib/lab/llm-benchmark/harness.ts`.
- Live API runners live in `lib/lab/llm-benchmark/runners/`.
- Response caching is handled by the provider runner and stored in `.cache/llm-benchmark-responses.json`.
- Automated scoring lives in `lib/lab/llm-benchmark/scorers/`.
- The orchestration script is `scripts/run-benchmark.mjs`.
- Side-by-side output comparison is `components/lab/llm-benchmark/model-output-comparison.tsx`.

## When to Use

- Adding a new model to the benchmark
- Adding a new task or category
- Recording real benchmark results from live APIs
- Adding or updating an interactive demo
- Wiring a new API runner (OpenAI, Anthropic, Google, Moonshot/Kimi Code, etc.)
- Changing scoring, cost estimation, or aggregation
- Running the harness and deploying updated results

## File Map

| Purpose | Path |
| --- | --- |
| Domain types | `lib/lab/llm-benchmark/types.ts` |
| Categories, models, tasks, results | `lib/lab/llm-benchmark/registry.ts` |
| Cost/aggregation helpers | `lib/lab/llm-benchmark/harness.ts` |
| Provider runner orchestrator | `lib/lab/llm-benchmark/runners/provider.ts` |
| Provider-specific API clients | `lib/lab/llm-benchmark/runners/{openai,anthropic,google,moonshot,openrouter}.ts` |
| CLI-based providers (locally authenticated) | `lib/lab/llm-benchmark/runners/{cli,agy,codex,opencode}.ts` |
| Execution target + CLI command resolution (`CLI_COMMANDS`, `resolveCommand`, sweep pre-flight) | `lib/lab/llm-benchmark/runners/execution-target.ts` |
| Sandbox contract (appended to HTML-runnable task prompts) | `lib/lab/llm-benchmark/prompts.ts` |
| Failure classification + `isQuotaError` (per-model `Agy` "individual quota reached" included) | `lib/lab/llm-benchmark/runners/provider.ts` |
| Automated scorers | `lib/lab/llm-benchmark/scorers/{html,text,sandbox,checks,behavioral}.ts` |
| Scorer registry (`selectScorer`, `behavioralTaskIds`) | `lib/lab/llm-benchmark/scorers/index.ts` |
| Dependency sandbox | `lib/lab/llm-benchmark/sandbox/inline-dependencies.ts` |
| Shared frame prelude (DOCTYPE, CSS reset, storage shim, in-iframe error overlay) | `lib/lab/llm-benchmark/frame-prelude.ts` |
| Run script | `scripts/run-benchmark.mjs` |
| Sweep run-id + prune policy (`sweepRunId`, `selectPrunable`) | `lib/lab/llm-benchmark/sweep.ts` |
| Sweep prune script | `scripts/sweep-clean.mjs` |
| Named sweep recipes (data) | `lib/lab/llm-benchmark/sweep-profiles.json` |
| Profile loader + config resolution/provenance + duration estimate | `lib/lab/llm-benchmark/sweep-profiles.ts` |
| Quota-reset parsing + pre-flight lock check (`parseQuotaResetMs`, `quotaLockedModels`) | `lib/lab/llm-benchmark/quota.ts` |
| Per-iteration run log (JSONL writer, spill store) | `lib/lab/llm-benchmark/runlog.ts` |
| Run-log record shapes + `parseRunLog` (browser-safe — the ONLY run-log module the UI may import) | `lib/lab/llm-benchmark/runlog-format.ts` |
| Run-log replay ("transcript") script | `scripts/retrace.mjs` |
| Trace publication decisions (pure) + build-time index read | `lib/lab/llm-benchmark/traces.ts`, `traces-server.ts` |
| Trace publication script (`task bench:publish-traces`) | `scripts/publish-traces.mjs` |
| Run-trace UI (the transcript, in the browser) | `components/lab/llm-benchmark/run-trace.tsx` |
| Per-call telemetry (TTFT/decode-rate sink + `foldTelemetry`) | `lib/lab/llm-benchmark/runners/provider.ts` |
| Usage summaries + cost inference (pure: `summarizeUsage`, `costFromUsage`) | `lib/lab/llm-benchmark/billing.ts` |
| Sweep resume: checkpoint reader, pure `planResume`, log-derived recovery, typed `ResumeError` codes | `lib/lab/llm-benchmark/resume.ts` |
| Results/run-log invariant checksuite (pure) | `lib/lab/llm-benchmark/verify-results.ts` |
| Invariant verification script | `scripts/verify-results.mjs` |
| Prompt-regression probes (data) | `lib/lab/llm-benchmark/probes/probes.json` |
| Probe loader + pure `evaluateProbe` / `probePrompt` | `lib/lab/llm-benchmark/probes.ts` |
| Probe runner (`task bench:probe`) | `scripts/prompt-probe.mjs` |
| Probe-only generation seam (no cache/scoring/run log) | `generateForProbe` in `lib/lab/llm-benchmark/runners/provider.ts` |
| Prompt-bundle hash + grouping/delta helpers (pure, node-only) | `lib/lab/llm-benchmark/prompt-bundle.ts` |
| Prompt-bundle audit script (per-bundle means + deltas) | `scripts/prompt-bundle-audit.mjs` |
| Seed data for sample/mock outputs | `scripts/sample-outputs.json` |
| Seed script for mock results | `scripts/seed-mock-results.mjs` |
| Dependency-layering guard (enforces `types.ts` → `scorers/` → `runners/` → `scripts/`: zero import cycles, `types.ts` a leaf, nothing imports upward into `scripts/`, `scorers/` never imports `runners/`) | `lib/lab/llm-benchmark/layering.test.ts` |
| Route/path helpers | `lib/lab/llm-benchmark/nav.ts` |
| MDX loader | `lib/lab/llm-benchmark/content.ts` |
| Category & task UI | `components/lab/llm-benchmark/*` |
| Per-model completion + value stats (`modelCompletion`: live-only `x/y done`, timeouts, total cost, cost-per-point = `totalCost / max(meanScore, 0.1)`) | `lib/lab/llm-benchmark/analytics.ts` → `components/lab/llm-benchmark/stat-strip.tsx` |
| Side-by-side output comparison | `components/lab/llm-benchmark/model-output-comparison.tsx` |
| Interactive demos | `components/lab/llm-benchmark/demos/*.tsx` |
| Demo-to-task mapping | `components/lab/llm-benchmark/demos/demo-registry.tsx` |
| Pre/post task text | `content/lab/llm-benchmark/tasks/<slug>.mdx` and `<slug>.post.mdx` |
| Category text | `content/lab/llm-benchmark/categories/<slug>.mdx` |
| Landing intro | `content/lab/llm-benchmark/index.mdx` |
| Routes | `app/lab/llm-benchmark/**` |
| Plugin registry + roster + worked example | `lib/lab/llm-benchmark/plugins/{registry,index}.ts`, `plugins/community-tasks/` |
| Plugin-provided provider (generator + model) | `lib/lab/llm-benchmark/plugins/echo-provider/`, built-in names in `lib/lab/llm-benchmark/providers.ts` |
| Plugin authoring guide | `docs/lab/llm-benchmark/plugins-authoring.md` |
| Plugin scaffold (`task bench:plugin-scaffold`) | `scripts/plugin-scaffold.mjs` + `scripts/templates/plugin/*.tmpl`, pure helpers in `lib/lab/llm-benchmark/plugins/scaffold.ts` |
| Skill | `.claude/skills/llm-benchmark/SKILL.md` |

## Adding a Model

1. Edit `lib/lab/llm-benchmark/registry.ts` (core model) — or contribute it from a plugin via `BenchmarkPlugin.models`, which merges into `BENCHMARK_MODELS` and is the right move when the model needs a provider the harness has no built-in runner for (ship a `generators` entry with it, #35).
2. Append to `BUILTIN_MODELS` with:
   - `id`, `name`, `provider`
   - `apiModelId` (optional) — the provider's exact API/CLI model name if it differs from `id`
   - `costPer1kInputUsd`, `costPer1kOutputUsd`
   - `contextWindow`, `capabilities`
3. For API providers, ensure the runner config is wired and API keys are available. For CLI providers, ensure the CLI is installed and authenticated locally.
4. Run the harness to generate results for the new model, or seed mock results.
5. Run `task bench:verify` (typecheck + the benchmark unit tests).

Model `id` must be URL-safe and unique.

## Adding a Task

1. Choose or create a category in `BENCHMARK_CATEGORIES`.
2. Append the task to `BENCHMARK_TASKS` in `lib/lab/llm-benchmark/registry.ts`:
   - `id` and `slug`: URL-safe, unique
   - `category`: must match a category slug
   - `demoComponentName`: must match a demo export in `components/lab/llm-benchmark/demos/`
   - `prompt`, `runtimeHint`, `iterationsDefault`, `methodNotes`, `title`, `blurb`
3. Run the harness to generate results for the new task.
4. Create pre/post MDX files:
   - `content/lab/llm-benchmark/tasks/<slug>.mdx`
   - `content/lab/llm-benchmark/tasks/<slug>.post.mdx`
5. Build or reuse a demo component (see below).
6. Run typecheck and tests.

## Adding a Demo

1. Create `components/lab/llm-benchmark/demos/<slug>-demo.tsx` as a `'use client'` component.
2. Export it as a named component, e.g. `export function MyDemo({ className }: { className?: string })`.
3. Add the export to `components/lab/llm-benchmark/demos/index.ts` and to `BENCHMARK_DEMOS`.
4. Set the task's `demoComponentName` to match the export name exactly.
5. Keep demos self-contained (canvas refs, requestAnimationFrame cleanup, prefers-reduced-motion checks).

## Recording Results

Results are persisted in `lib/lab/llm-benchmark/results.json` and typed as `BenchmarkResult` in `lib/lab/llm-benchmark/types.ts`. One record aggregates `iterations` API calls per task × model:

```ts
{
  taskId: string
  modelId: string
  score: number        // MEAN 0-100 score across SUCCESSFUL iterations (0 if none);
                       // clamped 1..100 and rounded to 1 decimal
  runtimeMs: number    // MEAN wall-clock per SUCCESSFUL iteration (0 if none)
  tokensIn: number     // TOTAL across all iterations
  tokensOut: number    // TOTAL across all iterations
  costUsd: number      // TOTAL estimated spend across all iterations (estimateCost of the token totals)
  iterations: number   // how many API calls were aggregated into this result
  iterationsSucceeded?: number // how many of them succeeded (absent on older records = all)
  status: 'success' | 'partial' | 'fail' | 'timeout'
  createdAt: string    // ISO timestamp
  source?: 'live' | 'seeded' // 'live' = real harness run; 'seeded' = hand-authored sample data
  output?: string      // representative generated output (first successful iteration)
}
```

Status semantics: `'success'` = every iteration succeeded; `'partial'` = some succeeded (score/runtime are computed over the successful ones); `'fail'` = none succeeded; `'timeout'` = none succeeded and the final error was a timeout.

Source flag: the provider runner stamps `source: 'live'` on every record it produces; `scripts/seed-mock-results.mjs` stamps `source: 'seeded'` on every record it writes. The UI must always disclose seeded results and exclude them from headline verdicts.

To regenerate results from live APIs, run the harness. To restore sample/mock outputs without calling APIs, run `node scripts/seed-mock-results.mjs`.

## Running the Harness

### Environment variables

```bash
# Moonshot / Kimi Code
MOONSHOT_API_KEY=sk-...
MOONSHOT_BASE_URL=https://api.kimi.com/coding/v1   # use Kimi Code endpoint for Kimi Code keys

# Optional: other providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

### Commands

The harness is wrapped by taskfiles/benchmark.yml — `task bench` prints the
knobs, `task bench:run --summary` prints the cost/failure/caching semantics. The
`RUN_*` env vars below still work if you call the script directly.

**Prefer a profile over a hand-typed recipe.** The four sweep shapes below are
stored in `lib/lab/llm-benchmark/sweep-profiles.json`; the env vars are the
override layer, not the interface. Precedence: **CLI flag > env var > profile >
built-in default**, and every run prints its effective config (with the
provenance of each value + a rough duration estimate) before spending.

```bash
# What recipes exist
task bench:profiles                  # or: npx tsx scripts/run-benchmark.mjs --list-profiles

# Print exactly what a sweep WOULD do, spend nothing (do this before long runs)
task bench:profile -- slow-model --model deepseek-v4-flash-free --dump-config

# smoke        1 iteration, concurrency 1, 10-min cap — cheapest wiring check
task bench:profile -- smoke --model kimi-k2.7 --task equation-solver

# fast-refresh 5 iterations, concurrency 2, 10-min cap — re-measure a fast API model
task bench:profile -- fast-refresh --model kimi-k2.7

# slow-model   concurrency 2, maxRetries 0, 25-min cap, cache busted (deepseek lesson)
task bench:profile -- slow-model --model deepseek-v4-flash-free

# agy-quota    concurrency 1, 5 iterations, default timeouts — one agy quota window
task bench:profile -- agy-quota --model gemini-3.6-flash-agy

# builtins-only  mounts no plugins ("plugins": []) — the core task set only
task bench:profile -- builtins-only --model kimi-k2.7

# Overrides are flags (repeatable or comma lists); env vars still win over a profile:
npx tsx scripts/run-benchmark.mjs --profile slow-model --model a --model b --task t1,t2 \
  --iterations 1 --concurrency 1 --timeout-ms 600000 --max-retries 0 --bust-cache
```

**Plugin bundles** (`plugins` knob, #37). A sweep selects which plugins mount,
and therefore which contributed tasks run. Profile field `"plugins": ["a","b"]`;
flag `--plugins a,b` (repeatable or comma list); env `RUN_PLUGINS=a,b` (empty =
unset, like every list env var). Three states, and **only three**:

| Said as | Means |
| --- | --- |
| nothing anywhere | ALL registered plugins (the default; backward compatible) |
| `--plugins none` / `RUN_PLUGINS=none` / `"plugins": []` | **builtins only** |
| `--plugins community-tasks` / `"plugins": ["community-tasks"]` | exactly that set |

`none` is the command-line spelling of the empty array (you cannot type `[]` in
a flag); mixing it with real ids is fatal. A built-in task is ALWAYS eligible —
bundle selection is not a task allowlist. An unknown plugin id exits 1 with the
roster printed, and `--task <plugin task> --plugins none` is a **fatal
conflict** (one flag asks for the task, the other unmounts its supplier) rather
than a silently smaller sweep. The same is true of a plugin **MODEL**
(`--model <plugin model> --plugins none`): plugin models are merged into the
registry unconditionally, so without that check a plugin's model and generator
ran while the run-log header snapshotted `plugins: []`. `--dump-config` prints a `plugins` row with
provenance, the `tasks` row appends `[N excluded by plugin set]`, and the
resolved set is written into every run log header's `configSnapshot.plugins`.

**Resuming a killed sweep** (`--resume <run-id>`, #18). A sweep that died to a
quota trip, a timeout, or a kill has already paid for every (model, task) pair
it finished, and the run log proves it: `runners/provider.ts` fsyncs an
`aggregate` event as the last act of a completed pair.

```bash
# What would a resume skip? (spends nothing — do this first)
npx tsx scripts/run-benchmark.mjs --resume 2026-08-16T09-30-12 --dump-config

# Actually resume, same knobs as the original sweep
npx tsx scripts/run-benchmark.mjs --profile slow-model --resume 2026-08-16T09-30-12
```

- **Boundary rule.** A pair is skipped iff its log parses AND holds an
  `aggregate` event **that recorded at least one success**. Anything else — no
  log, torn tail from a mid-iteration kill, unreadable header — re-runs **from
  scratch**, never mid-iteration. Every decision prints a line (`resume:
  skipping …` / `resume: re-running … (incomplete: N events, no aggregate)`),
  because a silent skip and a sweep that ran nothing look identical in a
  transcript.
- **A 0-success aggregate is complete and worthless.** A quota trip writes a
  structurally perfect aggregate with `iterationsSucceeded: 0` (or status
  `fail`/`timeout`). Counting that as "done" made a resume re-run everything
  EXCEPT the pair the quota killed — the pair you resumed *for*. It re-runs, with
  its own loud line: `resume: re-running … (aggregate recorded 0 successes)`.
- **Same tree.** The sweep root IS `sweeps/<run-id>/` — no `-2` suffixing. Skipped
  pairs keep their logs and artifacts; only re-run pairs get truncated on reopen.
  `SWEEP_ROOT` + `--resume` is a fatal conflict (two destinations).
- **Recovery.** The aggregate is durable *before* results.json is written, so a
  kill in that window leaves a pair complete on disk but missing from — or
  STALE in — the published file. A resume re-derives it from the log (`resume:
  recovered …`), un-spilling the artifact, restamping the log's `quota` event as
  `quotaNextResetAt`, and merges it through `mergeResults` — the 0-success
  protection is unchanged. This is the crash case's whole value: no re-spend for
  bytes already stored. Recovery fires when the pair is **absent** from
  results.json, and also when the recorded record came from an **older run**
  (its `runLogRef.runId` differs, or it predates the log header and has no ref)
  — a re-swept pair is invisible to a plain key-presence test. A 0-success
  aggregate is recovered only when the pair is absent (a fail record beats a
  hole); it then re-runs anyway, and the rerun's merge replaces it if it
  succeeds. Recovery runs **before** the quota pre-flight: it spends nothing,
  and a quota-locked model is exactly the case with an unrecovered record — the
  pre-flight then sees the recovered window too.
- **`--bust-cache` / `RUN_BUST_CACHE=1` wins.** Cache-busting means "measure this
  again", so it overrides every skip and says so in one line. Don't combine them
  expecting a cheap resume.
- **No profile carries a resume.** It is flag > env only (`RUN_RESUME`); a stored
  run id would be stale on its second use.
- Typed failures, exit 1 with the code printed: `RESUME_TARGET_NOT_FOUND` (no
  such dir), `RESUME_NO_CHECKPOINTS` (no readable run-log header in it),
  `RESUME_SWEEP_ROOT_CONFLICT`. None of them degrade into a full re-sweep.

**An unknown `--model`/`--task` id is fatal**, including when other ids in the
same flag resolve: the script prints `Unknown model id(s): …` with a sample of
the known ids and exits 1 rather than silently sweeping the partial set. (A
typo'd id used to run the wrong shape quietly.) The same applies to the
`MODELS=`/`TASKS=` env layer, which feeds the same resolution.

The env-var wrappers below are unchanged and still the right tool for anything
that is not one of the stored recipes.

```bash
# Cheapest check that the harness works: 1 model, 1 iteration
task bench:smoke

# Run all models, all tasks, using each task's iterationsDefault
task bench:run

# Run only specific models
task bench:run MODELS=kimi-k2.7
task bench:run MODELS=kimi-k2.7,gpt-5

# Run only a specific task (useful for debugging one provider)
task bench:run TASKS=equation-solver

# Override iterations (default is each task's iterationsDefault, currently 5)
task bench:run MODELS=kimi-k2.7 ITER=1

# Control parallel task/model combinations (default 3)
task bench:run MODELS=kimi-k2.7 CONC=1

# Skip the response cache and force fresh API calls
task bench:run MODELS=kimi-k2.7 BUST=1

# CLI-based providers (no API key needed; uses locally authenticated CLIs).
# `bench:cli` FORCES concurrency 1 — agy is unreliable in parallel.
task bench:cli MODELS=gemini-3.5-flash-agy
task bench:cli MODELS=codex-gpt-5.5

# Restore sample/mock outputs without API calls
task bench:seed

# After any results.json change: republish artifacts, then verify
task bench:outputs
task bench:verify
```

### How it works

1. `scripts/run-benchmark.mjs` resolves flags + env + profile into one effective
   config (`resolveSweepConfig()` in `lib/lab/llm-benchmark/sweep-profiles.ts`),
   prints it with per-value provenance, and builds a `ProviderRunnerConfig`.
2. `createProviderRunner()` in `lib/lab/llm-benchmark/runners/provider.ts`:
   - Runs `iterations` API calls per task/model.
   - Wraps each call in a 10-minute timeout (raised as an identifiable `TimeoutError`).
   - Retries transient errors (network, timeout, 5xx, 429/408 rate-limit/overload) up to `maxRetries` times (default 2), but not other 4xx auth/validation errors. Rate-limit errors get a 4x longer backoff.
   - Logs start/completion/failure per iteration.
   - Strips Markdown code fences, removes leading/trailing prose, and extracts the first code block if the model wraps output.
   - Looks up successful API responses in `.cache/llm-benchmark-responses.json` and caches new ones.
   - Scores EVERY successful iteration's output using a task-appropriate heuristic scorer (`selectScorer()` in `lib/lab/llm-benchmark/scorers/index.ts`) and publishes the mean.
   - Aggregates all iterations into **one result per task/model** via the exported pure `aggregateRuns()` (status success/partial/fail/timeout, `iterationsSucceeded`, `source: 'live'`).
3. `runBenchmark()` in `lib/lab/llm-benchmark/harness.ts` orchestrates independent task/model combinations in parallel (concurrency controlled by `RUN_CONCURRENCY`, default 3) and falls back to each task's `iterationsDefault`. A task/model job that throws is logged and skipped without aborting the rest of the run.
4. Results are written to `lib/lab/llm-benchmark/results.json` **incrementally after every completed task** — a long sweep never loses finished work to a kill or timeout. Each write re-reads the on-disk file first so concurrent runs aren't clobbered. If the run fails part-way, `scripts/run-benchmark.mjs` still writes the partial results collected so far before exiting non-zero.

### Automated Scoring

The provider runner scores every successful output before writing results. Scorers implement the `Scorer` interface in `lib/lab/llm-benchmark/types.ts`:

```ts
export interface Scorer {
  score(output: string, task: BenchmarkTask): Promise<number> | number
}
```

- `lib/lab/llm-benchmark/scorers/html.ts` — basic HTML validity heuristics (doctype, tag balance, closed scripts).
- `lib/lab/llm-benchmark/scorers/text.ts` — generic text/math heuristics plus task-specific keyword checks.
- `lib/lab/llm-benchmark/scorers/behavioral.ts` — Playwright-driven behavioural scorer (headless Chromium with `--no-sandbox`). Runs each artifact as it would render in the demo iframe, drives the actual key events the task requires (Space for platformer jump, ArrowRight for movement, scroll for landing page morph, click for circuit builder), and pixel-diffs the canvas against the pre-event baseline. Composite is 70% behavioural + 30% structural. The big catch: a model that emits structurally complete HTML that doesn't actually react to input scores 30, not 100 — visible in the gemini platformer run from the agy frontier sweep.

**Each task declares its own scorer.** `BenchmarkTask.scorer` (`'behavioral' | 'html' | 'text'`) is read first by `selectScorer()`; the old "is the category one of the five HTML-runnable ones?" heuristic (`ui-building`, `3d-physics-animation`, `advanced-game-building`, `advanced-physics`, `advanced-electronics`) is only the FALLBACK for an unstamped row. All seven shipped tasks declare theirs explicitly, so the registry is the one place you read to know how a task is evaluated. Scripts never keep their own task-id set: `behavioralTaskIds(BENCHMARK_TASKS)` from `scorers/index.ts` derives it (`scripts/rescore-behavioral.mjs`, `scripts/backfill-iteration-checks.mjs`). Scores are shown as a 0-100 badge in the side-by-side output comparison UI.

To add an HTML-runnable task: add the registry row with `scorer: 'behavioral'`, add its checks to `scorers/checks.ts` (`CHECKS_BY_TASK`) — `registry.test.ts` fails a behavioural task with zero checks, because zero checks silently degrades to the structural score, which happily gives 100 to a game that ignores input.

To add a new scorer:

1. Create `lib/lab/llm-benchmark/scorers/<name>.ts` and export a `Scorer`.
2. Export it from `lib/lab/llm-benchmark/scorers/index.ts` and register it in the `SCORERS` map there under a new `BenchmarkScorerName`.
3. Declare `scorer: '<name>'` on the task rows that want it (no `selectScorer()` edit needed).
4. Run typecheck and tests.

## Response Caching

Successful provider responses are cached in `.cache/llm-benchmark-responses.json` (gitignored, never deployed). The cache key includes `modelId`, `taskId`, an SHA-256 hash of the prompt, and the iteration index. Set `RUN_BUST_CACHE=1` to ignore the cache and force fresh API calls.

## CLI-based providers

The harness also supports providers that are locally-installed CLIs (e.g. `agy`, `codex`). This is useful when the CLI handles its own authentication and you don't want to manage API keys in `.env`.

- `lib/lab/llm-benchmark/runners/cli.ts` — generic `spawn`-based CLI wrapper with stdin EOF, stdout parsing, token estimation, and timeout handling.
- `lib/lab/llm-benchmark/runners/execution-target.ts` — the pure half: `resolveExecutionTarget()` assembles argv (prompt + artifact suffix), env, cwd, the timeout (`config.timeoutMs ?? 10 min`, single-source), the per-iteration artifact name, the scratch decision and the `<model>-<task>-<n>` session label; `CLI_COMMANDS` maps provider → binary; `resolveCommand()` does the PATH lookup behind the sweep pre-flight.
- `lib/lab/llm-benchmark/runners/agy.ts` — wraps `agy -p <prompt> --model <model>`.
- `lib/lab/llm-benchmark/runners/codex.ts` — wraps `codex exec --ephemeral --sandbox read-only <prompt>`.
- `lib/lab/llm-benchmark/runners/opencode.ts` — wraps `opencode run -m <model> <prompt>` (model id is `provider/name` form, e.g. `opencode/deepseek-v4-flash-free`).

To add a CLI provider:

1. Add the binary to `CLI_COMMANDS` in `runners/execution-target.ts` (with an install hint), then create a runner file that builds a `CliRunnerConfig` with `command: CLI_COMMANDS.<Provider>` and calls `generateFromCli()`. The map is single-sourced: `isCliProvider` and the sweep pre-flight derive from it.
2. Add the model to `BUILTIN_MODELS` with `provider` set to a unique value (e.g. `'Agy'`, `'Codex'`, `'OpenCode'`).
3. Wire the new provider case into `configForModel()` and `generateWithProvider()` in `lib/lab/llm-benchmark/runners/provider.ts`, and add the name to `providers.ts:BUILTIN_PROVIDERS`. (A provider that does not belong in core ships as a plugin instead — `generators` + `models`, no core edit; see #35.)
4. The CLI must be installed and authenticated locally. Test it manually first:
   ```bash
   agy -p "say hi" --model "Gemini 3.5 Flash (High)"
   codex exec --ephemeral --sandbox read-only "say hi"
   opencode run -m opencode/deepseek-v4-flash-free "say hi"
   ```

CLI providers estimate token counts when the CLI doesn't report them, so costs are approximate.

## Adding a new API provider runner

1. Create `lib/lab/llm-benchmark/runners/<provider>.ts`.
2. Export a generation function and config type:

```ts
export interface MyProviderConfig {
  apiKey: string
  baseUrl?: string
}

export async function generateMyProvider(
  config: MyProviderConfig,
  model: BenchmarkModel,
  task: BenchmarkTask
): Promise<{ output: string; tokensIn: number; tokensOut: number; runtimeMs: number }> {
  // call provider API
}
```

3. Wire it into `configForModel()` and `generateWithProvider()` in `lib/lab/llm-benchmark/runners/provider.ts`.
4. Stamp `usageSource` on the response: `'reported'` only when the provider's
   own usage block was present, `'estimated'` otherwise (including a `?? 0`
   fallback). See "Billing + usage provenance" below — an unstamped response is
   read as estimated, which is safe but loses a real measurement.
5. Never commit API keys. Read them from `process.env` at runtime.

## Operational Gotchas

- **Kimi Code vs Moonshot**: Kimi Code API keys use `https://api.kimi.com/coding/v1`, not `https://api.moonshot.cn/v1`. Set `MOONSHOT_BASE_URL` accordingly.
- **Kimi Code temperature**: The API only accepts `temperature: 1`. The Moonshot runner hardcodes this.
- **Kimi K3**: Model id is `k3` at the Kimi Code endpoint. It has always-on thinking with `reasoning_effort` (only `max` is currently supported) and a 1M context window. Pricing is flat: $3/M input tokens, $15/M output tokens. `temperature=1.0` is fixed.
- **Model name mapping**: Use `apiModelId` in the registry when the provider's model name differs from the URL-safe registry `id` (e.g. `kimi-k2.7` → `kimi-k2-7`, `kimi-k3` → `k3`).
- **Long runs**: Kimi K2.7 can take 30–200s per task. A full 5-iteration sweep can take 30–40 minutes. Use `RUN_ITERATIONS=1` for a quick smoke test.
- **No output placeholder**: If a model has no result or a failed result with no output, the side-by-side comparison shows "No captured output for this model yet."
- **Quota/billing exhaustion**: `isQuotaError()` in `runners/provider.ts` detects provider quota errors (Moonshot `access_terminated_error`, OpenAI `insufficient_quota`, Anthropic credit balance, Agy `individual quota reached`). The runner (a) breaks the current task's iteration loop on the first quota error, (b) trips a circuit breaker **keyed on `model.id` (not `model.provider`)** that throws on all later tasks for that model — sibling models on the same provider (e.g. all three Agy models sharing `provider: 'Agy'`) keep running, and (c) never retries quota errors. `mergeResults()` in `results.ts` adds the second layer: a fresh result with 0 successful iterations never replaces a baseline record that has successes — so a quota-killed re-run can't corrupt good data. Non-transient errors (auth/validation) also break the iteration loop: same prompt, same guaranteed failure.
- **`cli_timeout` vs `endpoint_hung`**: a timeout on a CLI-backed provider (`Agy`, `Codex`, `OpenCode` — `isCliProvider()` in `runners/provider.ts`) classifies as `cli_timeout`, not `endpoint_hung`. It is a **capability/speed** story (free CLI tiers run 10-20 tok/s, so a 20-50k-token artifact cannot land inside a 10-minute cap), not a network one; `endpoint_hung` stays reserved for API providers stalling. Because the runner's outer `withTimeout` fires before the CLI's own timer, both paths throw the same message shape — so `classifyFailureReason(err, output, { cliProvider })` takes the provider as CONTEXT; message matching alone (`Timeout after Nms: <command>` with no ` :: ` label separator) only catches the raw `runCli` path. `cli_timeout` is transient (retried like any timeout) and is counted as a MODEL failure, not infra, in `analytics.ts` (`INFRA_FAILURE_REASONS`) — so it lowers `modelOnlyAvgScore` the way `truncated` does. Old `endpoint_hung` rows whose stored `output` is the raw timeout message: `npx tsx scripts/backfill-failure-reasons.mjs --cli-timeouts-only`.
- **CLI providers + per-model subscription quotas**: Agy enforces per-model subscription caps ("individual quota reached" — each model has its own ~25min to ~3.5h reset window, not a shared pool). A single 5-iteration sweep per Agy model typically exceeds the quota; multi-window crawls are normal. The runner's breaker keys on `model.id` so one model tripping does not starve the others. Skip Claude-thinking and gpt-oss-med once their quota is gone; come back next window.
- **CLI install pre-flight**: `scripts/run-benchmark.mjs` resolves every targeted CLI provider's binary on PATH (`resolveCliCommands()` → `resolveCommand()`, an in-process PATH scan, no shell) after model resolution and plugin gating, and ABORTS before the sweep root, run log or runner exist — `[harness] opencode CLI not found on PATH — needed by deepseek-v4-flash-free. Install: <hint>`, exit 1, listing every missing command at once. There is no override env var: unlike a quota lock (a provider estimate that can be stale) an absent binary is a local fact. `--dump-config` prints the same resolution as a `cli` row (`agy ✓ /path · opencode ✗ not found`), so a dry run tells you whether a sweep can even start.
- **Agy CLI flags**: headless agy needs `--dangerously-skip-permissions` to auto-approve the file handoff the benchmark relies on (agy writes the artifact to `./artifact.html` and the runner reads it back). Without it the CLI blocks on an interactive prompt that has no terminal.
- **opencode CLI quirks**: `opencode run -m opencode/<model> <prompt>` resolves relative paths against ITS OWN session directory (e.g. `/private/tmp`) rather than the process cwd — but prints the absolute path it wrote, so `cli.ts` fallback #3 reads it back. Parallel-safe since each iteration uses a unique `artifact-<model>-<task>-<n>.html` (verified 2026-08-13: two concurrent runs, no collision). Command-line model ids are in `provider/name` form (the bare name fails with `ProviderModelNotFoundError: Model not found`). Iterations are slow AND unstable (~40s to 15 min for the same task across runs — free-tier pool variance; never assume a timeout means a hang).
- **opencode free-tier bearer blips**: parallel batches intermittently fail with `invalid_bearer_credential` even though the same key has hundreds of sequential successes. Classified as `rate_limited` + retryable (`isTransientError`), NOT `auth_error` — a revoked key would fail identically every time and is bounded by maxRetries. If a parallel sweep accumulates these, drop `RUN_CONCURRENCY` to 1.
- **Credential scrub on CLI spawns**: `runCli` (`runners/cli.ts`) spawns with `{ ...scrubEnv(process.env), ...options.env }` — `scrubEnv()` drops every key matching `/(key|secret|token|password|auth|credential|private)/i` from the inherited environment. WHY: the CLI child *is* the model and its artifact is published publicly, so a model dumping `env` would otherwise leak `OPENROUTER_API_KEY`, Cloudflare/GitHub tokens and the rest onto the site. The three CLI providers authenticate from their own local stores (opencode `~/.config/opencode` + keychain, agy `~/.gemini`, codex `~/.codex`), so none of them needs an inherited key — verified live (agy replies under the scrubbed env; codex reaches the same authenticated usage-limit response with and without it). The scrub also takes `SSH_AUTH_SOCK`/`GITHUB_TOKEN`-style vars: intended. There is no allowlist — `PATH`, `HOME`, `TMPDIR`, `SHELL`, `TERM`, `LANG`/`LC_*`, `USER` don't match the pattern. If a future runner genuinely needs a credential, re-add it BY NAME in that runner's `CliRunnerConfig.env` (merged after the scrub, so the override wins); never widen the regex.
- **Value-based redaction on three surfaces** (`lib/lab/llm-benchmark/redact.ts`, #20): `scrubEnv` stops a secret reaching the model; `redactText`/`redactArgs`/`redactValue` stop one that is already inside a string reaching a durable surface. Applied at (1) `runCli`'s timeout + non-zero-exit error messages — which transitively covers the `[harness]` sweep log, results.json `output` and the run log's `failure` event; (2) the run log's `append` and header encode, BEFORE spilling, so `spill/` files are redacted too (redaction is deterministic, so content addressing still dedupes); (3) the `--dump-config` `row()` choke point (no row can carry a secret today — it is there so a future knob is covered by construction). Rules: `Authorization`/`Bearer` keep the scheme and lose the value, `NAME=`/`NAME:`/`"NAME": "…"` assignments keep the name and quotes, `--flag value`/`--flag=value` lose the value. **Explicit non-goal: bare high-entropy literals are NOT redacted** — a lone `sk-…`, hash or JWT survives, because artifacts are full of hashes and base64 data URIs and a false positive silently corrupts the thing being scored. Redaction is name-adjacent ONLY, and idempotent (tested). Artifact-HTML collateral is deliberately near-zero: no bare `key` in the name set and names must end at a word boundary, so `data-key="physics"`, `@keyframes`, `keydown`, `--max-tokens` and `"tokensIn"` are untouched; `<`/`>` terminate a value so a match can't eat the rest of a document; `(?<!--)` spares a `--token: #333` CSS custom property. Known accepted collateral: `document.cookie = "…"` in model JS, and a literal `secret:`/`password:` key, are rewritten in the FORENSIC copy (never in results.json, which the sweep script writes directly).
- **Sweep process hangs**: behavioural scoring lazily launches a shared Playwright browser (`getBrowser()`); `scripts/run-benchmark.mjs` MUST call `closeSandbox()` before exiting or the process hangs after the final write. Fixed in the OpenCode provider commit; keep closeSandbox() in any new sweep/reporting script too.
- **Per-iteration check results**: `aggregateRuns()` persists each successful iteration's behavioural checks as `iterationCheckResults` (aligned with `iterationScores`) when the scorer exposes `scoreWithBreakdown` (behaviouralScorer does). Old records can be backfilled from the stored best artifact with `npx tsx scripts/backfill-iteration-checks.mjs`. UI renders one pass/fail pill per check name.
- **Frame prelude** (`lib/lab/llm-benchmark/frame-prelude.ts`) auto-injects, ahead of any model-generated markup: (1) `<!DOCTYPE html>` if the artifact omits one — without it, browsers enter quirks mode and canvas/CSS sizing comes out wrong; (2) a CSS reset (`margin:0;padding:0;min-height:100%;box-sizing:border-box`, dark backdrop, font stack); (3) a viewport meta if missing; (4) a localStorage/sessionStorage shim — the frame runs at an opaque origin (`sandbox="allow-scripts"`, no `allow-same-origin`), where real Storage access throws; (5) a runtime-error reporter that renders a fixed-position red overlay inside the iframe on the FIRST script error and forwards the same message to the parent via `postMessage` for a non-blocking parent-side bar. `ArtifactFrame` and `GeneratedDemo` both listen for the postMessage.
- **Static artifacts**: `scripts/gen-benchmark-outputs.mjs` (prebuild, run under `tsx`) publishes `public/lab-data/llm-benchmark/outputs/<task>/<model>.json` plus a prelude-wrapped `.html` for every full HTML document. `public/_headers` serves that path with `Content-Security-Policy: sandbox allow-scripts` so artifacts are opaque-origin even opened top-level. The demo iframe uses srcdoc with the SAME prelude (`lib/lab/llm-benchmark/frame-prelude.ts`) — keep both paths on that one implementation.
- **Sandbox dependency inlining**: external `<script src>`/`<link>` URLs are resolved to canonical classic builds BEFORE fetching (aliases like unpkg `three.module.js` would otherwise inline an ES-module build as a classic script — guaranteed syntax error). Each canonical URL inlines at most once; unknown module scripts keep `type="module"`.
- **Sandbox prompt contract** (`lib/lab/llm-benchmark/prompts.ts`, appended to HTML-runnable tasks via `withSandboxConstraints()`): tells the model the iframe is opaque-origin / no-network, requires `<!DOCTYPE html><html><head><body>` skeleton, requires CSS-sized canvas + window resize handler (NOT attribute-sized), and asks for try/catch around the top-level script with the caught error rendered visibly. Tests in `prompts.test.ts`. The sandbox contract is appended to the task prompt at runtime — the prompt hash is part of the cache key, so any contract change requires a fresh sweep (`RUN_BUST_CACHE=1`) to take effect.
- **Per-task contract override** (`BenchmarkTask.sandboxConstraints`, #36): explicit beats the category heuristic, like `scorer`. `undefined` = inherit the global contract iff the category is HTML-runnable; `''` = no contract at all even for an HTML category; non-empty = that text is appended (blank-line separated) whatever the category, REPLACING the global one. `appliedSandboxConstraints(task)` returns the exact appended text (`''` for none) and is what `components/lab/llm-benchmark/sandbox-contract.tsx` renders as a collapsed `<details>` on the task page — the page shows what the model actually received, sourced from the real function, never a copy. Worked example: the `community-tasks` tic-tac-toe task ships a DOM-board contract instead of the canvas-oriented global one. Changing an override changes the cache key, i.e. the task re-runs rather than replaying.
- **Pre-commit hook blocking**: the `lint:prose:changed` task treats em-dash overuse (`em-dash-budget` rule) as a hard failure. If a new blog post trips it, count the em-dashes per line (budget 5/line) and convert `" — "` to `": "` or replace the dashes with other punctuation before committing.

## Sweep operations (hard-won runbook)

- **Probe before you sweep**: if this change touched a task prompt or the sandbox contract (`prompts.ts`), run `task bench:probe` FIRST. It is minutes and (on the default free model) free, and a probe failure means the sweep would have measured a broken contract. See "Prompt-regression probes" below.
- **Profiles first** (`lib/lab/llm-benchmark/sweep-profiles.json`): the five stored recipes are `smoke` (1 iter, conc 1, 10-min cap), `fast-refresh` (5 iters, conc 2, 10-min cap), `slow-model` (conc 2, maxRetries 0, 25-min cap, bustCache), `agy-quota` (conc 1, 5 iters, default timeouts) and `builtins-only` (`plugins: []` — no plugin bundles mounted, core task set only). Run one with `task bench:profile -- <name> --model <id>`; add `--dump-config` to print the effective config and exit without spending. Profiles deliberately do NOT pin model ids (they would rot) — pass `--model`/`--task`. Precedence is **flag > env > profile > default** and the pre-run dump names the source of every value, so "why did it retry?" is answerable from the log rather than from memory. Adding a knob means adding it in `sweep-profiles.ts` (validated allowlist — an unknown key in the JSON throws at import) AND in the script's flag table.
- **Duration estimate**: the dump's `est. duration` is ROUGH — sum over (model, task) of the historical mean `runtimeMs` in results.json × iterations ÷ concurrency. It ignores retries, cache hits, scoring time and imperfect packing, and pairs with no history count as 0 (reported as such). Treat it as a lower bound, never as a budget.
- **Env knobs** (`scripts/run-benchmark.mjs`): `RUN_MODELS`, `RUN_TASKS`, `RUN_ITERATIONS`, `RUN_CONCURRENCY` (CLI file-handoff providers are now parallel-safe — each iteration writes a unique `artifact-<model>-<task>-<n>.html`, so concurrency 2-3 cuts slow CLI sweeps ~3×), `RUN_BUST_CACHE=1`, `RUN_TIMEOUT_MS` (per-CALL cap; also forwarded into the agy/codex/opencode CLI configs, which otherwise default to `cli.ts`'s 600s — see postmortem 0002; text-only runners still use the 600s default), `RUN_MAX_RETRIES` (default 2; set `0` for slow-but-working models so a deterministic 25-min generation isn't retried 3×).
- **Slow models** (deepseek-v4-flash-free lesson): free tiers can run 10-20 tok/s — a 5-8k token artifact takes 4-12 min, a 20-50k token one (landing, equation, pendulum, circuit) can exceed any sane window. Strategy: (1) expect partial boards — the UI and `mergeResults` handle `partial` honestly; (2) run the fast tasks at 5 iterations, then bound the rest; (3) when a task times out at 25-30 min, RECORD the failure rather than retrying forever.
- **Recording failure rows**: an all-failed task only persists a `fail`/`timeout` record after ALL its iterations complete (killing mid-task loses the row). To give a model honest rows on tasks it can't complete, run `RUN_ITERATIONS=1 RUN_TIMEOUT_MS=600000 RUN_MAX_RETRIES=0` over those tasks — each persists a `timeout` record (score 0, `cli_timeout` for CLI providers), the UI renders it amber, and the registry coverage test counts it.
- **Long sweeps**: launch `nohup env ... npx tsx scripts/run-benchmark.mjs > /tmp/sweep.log 2>&1 &`; results are written incrementally after every task. `pgrep -f run-benchmark` for liveness; the log only grows on completion/retry, so check `ps -o etime -p $(pgrep -f "opencode run")` to distinguish "working" from "stalled". The sweep hard-exits after the final write (`closeSandbox()` + `process.exit`), so a zombie sweep is a bug, not a feature.
- **Process hygiene** (`lib/lab/llm-benchmark/runners/cli.ts`): CLI children spawn `detached` in their own process group; a timeout SIGTERMs the group and SIGKILLs 1s later, so opencode's bun server grandchild dies with the parent (regression-tested in `cli.test.ts`). Stray `./artifact.html` the model drops in the repo root is gitignored.
- **Forensic sweep retention** (see the dedicated section below): every run keeps its CLI scratch dirs and a copy of each handed-off artifact under `sweeps/<run-id>/`. Nothing is deleted at run time, including on failure; `npx tsx scripts/sweep-clean.mjs` is the cleanup path.
- **Quota windows and the pre-flight** (`lib/lab/llm-benchmark/quota.ts`): when a quota error states its own window (agy: `individual quota reached. Resets in 57h27m`) the circuit-breaker trip logs `[harness] next window for <model>: ~57h27m (resets ~Fri 02:04)` and stamps `quotaNextResetAt` (ISO) on that run's record; `mergeResults` carries the stamp onto the good record it protected, so it survives even when the failed run is dropped. On the next sweep, `run-benchmark.mjs` re-reads results.json and ABORTS (exit 1, before any call) if a targeted model is still locked: `[harness] <model> is quota-locked until <ISO> (~Xh Ym from now)`. Escape hatch when the estimate is stale or wrong: `RUN_IGNORE_QUOTA_LOCK=1` proceeds with a warning.
- **Read the postmortems** (`docs/postmortem/`): four founding incidents — the sweep hang (0001), the timeout-config miswire (0002), the opencode bearer blip (0003), the mid-sweep `results.json` race (0004). Each names the guardrail that now prevents its class; write a new one when a fix is subtle, systemic and costly to rediscover.
- **Never push mid-sweep**: pre-push runs the full suite; the registry coverage test is now stable against partially-swept models (see below), but a sweep still races the build if results.json changes under it. Push between sweeps.

## Forensic sweep retention (`sweeps/<run-id>/`)

`scripts/run-benchmark.mjs` computes ONE sweep root at startup and logs it
(`[harness] sweep root: sweeps/2026-08-16T09-30-12/`). The run id is a
filesystem-safe ISO timestamp (`sweepRunId()` in `lib/lab/llm-benchmark/sweep.ts` —
colons stripped, sortable). Override the whole path with `SWEEP_ROOT=` (absolute
or repo-relative). `sweeps/` is gitignored.

```
sweeps/<run-id>/
  scratch/<model-id>-<task-id>-<n>/          the CLI's actual working directory
  artifacts/artifact-<model-id>-<task-id>-<n>.html   copy of the handed-off artifact
```

- **Plumbing**: `setSweepRoot(dir)` exported from `runners/cli.ts` — module-level
  state, following the `setBustCache` precedent in `cache.ts`, because the sweep
  root is a property of the RUN, not of any one provider config. With NO sweep
  root set (unit tests, ad-hoc library use) `generateFromCli` keeps its original
  behaviour exactly: `mkdtemp(tmpdir())` scratch, deleted in `finally`.
- **Kept on failure too.** Under a sweep root the scratch dir is never deleted —
  not on success, and deliberately not on failure. Forensic value peaks exactly
  when an iteration failed: the half-written file, the wrongly-named file, or
  the nothing-at-all is the evidence for why. Pruning is the cleanup path.
- **Artifact copy**: whenever ANY of the three file-handoff paths in
  `generateFromCli` wins (direct name, largest-HTML scan, printed absolute
  path), the same bytes are copied into `artifacts/`. This is what makes an
  iteration's output recoverable when the model wrote it into its OWN session
  dir (opencode `/private/tmp`, agy's scratch) instead of the scratch. Written
  `{ flag: 'wx', mode: 0o600 }` — exclusive create, owner-only. A retry of the
  same iteration reuses the filename and hits `EEXIST`; that case unlinks and
  re-creates exclusively rather than opening with `'w'`, so the
  never-silently-clobber-another-writer guarantee survives. The copy is
  best-effort: a failure logs `[harness] could not retain artifact …` and never
  fails a run whose generation succeeded.
- **Pruning**:
  ```bash
  npx tsx scripts/sweep-clean.mjs --dry-run              # show what would go
  npx tsx scripts/sweep-clean.mjs                        # keep 5 newest + anything < 14d
  npx tsx scripts/sweep-clean.mjs --keep 10 --older-than 30
  ```
  A run is deleted only when it is BOTH beyond the keep-count AND older than the
  age floor (`selectPrunable()` in `sweep.ts`, unit-tested). The conjunction is
  deliberate: keep-only would evict this morning's evidence after a burst of ten
  sweeps in one afternoon, and age-only would evict every run you have after a
  quiet month.

## Run log (`sweeps/<run-id>/<model>-<task>.jsonl`)

**The invariant: model-visible means logged.** Anything that reached a model
request must be reconstructable from the log alone — the exact prompt, every
attempt, the raw response, the artifact that was actually scored, each check's
verdict, and the aggregate that landed in results.json. A `BenchmarkResult`
keeps only the BEST iteration's artifact plus the aggregate score, so without
this file "what did iteration 3 emit and why did it score 3?" is unanswerable a
week later. Borrowed from the dsh session log
(`session-persistence-jsonl`).

`scripts/run-benchmark.mjs` calls `setRunLogDir(SWEEP_ROOT)` with the SAME root
it gives `setSweepRoot()`, so logs sit beside the scratch dirs and artifacts:

```
sweeps/<run-id>/
  <model-id>-<task-id>.jsonl      one append-only log per (model, task)
  spill/<sha256[:16]>.txt         content-addressed store for large strings
  scratch/… artifacts/…           (see Forensic sweep retention, above)
```

- **Header first.** Line 0 is `{ type: 'header', seq: 0, version, runId,
  modelId, taskId, createdAt, configSnapshot }`; `configSnapshot` is the
  effective `{ iterations, timeoutMs, maxRetries, bustCache }`. Every later
  line is one event and `seq` is contiguous (line i has `seq === i`) — the
  writer owns the counter.
- **Event vocabulary** (all carry `type`, `seq`, `ts`, and `iterationIndex`
  where applicable):

  | Event | Emitted | Payload |
  | --- | --- | --- |
  | `request` | once per iteration, before the first provider call (and before the cache lookup, so cache hits still record their prompt) | `promptHash` (sha256 of the post-`withSandboxConstraints` prompt), `promptLength` |
  | `response` | every response that came back, **including cache replays** | `rawOutput`, `tokensIn`, `tokensOut`, `runtimeMs`, `cacheHit`, and (when measured) `ttftMs`, `tokensPerSec`, `rateKind` — see Per-call telemetry |
  | `retry` | transient retries inside `generateOne`; empty-body retries in the `runTask` loop | `attempt`, `error`, `delayMs`, `kind: 'transient' \| 'empty_body'` |
  | `clean` | after `cleanOutput` + dependency inlining | `output` — exactly the bytes the scorer sees |
  | `failure` | a failed iteration (terminal; retries are their own events) | `error`, `failureReason`, `timedOut` |
  | `check` | one per check per iteration, from `scoreWithBreakdown` | `iterationIndex` (the TRUE index, not a position among successes), `check` |
  | `quota` | at a quota trip whose error stated a reset window | `quotaNextResetAt` (ISO) — same estimate as the aggregate's field, logged separately because a 0-success record can be dropped by `mergeResults` |
  | `aggregate` | once, at the end | `result` — the BenchmarkResult with the artifact always spilled |

- **Spill.** Any string over 8 KB is written to `spill/<first-16-hex-of-sha256>.txt`
  and replaced in the event by `{ spillRef, preview (2 KB), bytes }`. Content
  addressing means a `response`, its `clean` artifact and the `aggregate` that
  published it collapse to one file when the bytes are identical, and the JSONL
  stays small enough to serve.
- **Flush at iteration boundaries.** Appends coalesce into 200 ms batches (one
  write + one `fsync`, serialized so batches never interleave), but `runTask`
  awaits `flush()` in a `finally` at the end of EVERY iteration and `close()`
  before returning. Guarantee: a killed sweep loses at most the in-flight
  iteration. A failed batch write rolls the file back to its last durable
  length and is dropped with a `console.warn` — degraded logging never fails a
  sweep.
- **Crash recovery.** `readRunLog()` keeps complete lines and stops at the
  first unparsable one (a killed sweep leaves a truncated tail); only a
  missing/invalid header throws.
- **`BenchmarkResult.runLogRef`** = `{ runId, file }` is stamped on every
  record produced while logging is on, so results.json points back at its
  trace. (#5's verifier will assert this.)
- **Plumbing note:** the log instance is passed EXPLICITLY into `generateOne`
  and `aggregateRuns`. It is deliberately NOT module-level "current log" state
  like `setSweepRoot` — several (model, task) jobs run concurrently and would
  interleave into each other's file. The same pair never runs concurrently, so
  one file per pair needs no locking. Re-running the same pair in the same
  sweep root truncates the file: one file = the latest run of that pair.
- **With no run-log dir set** (unit tests, library use) `openRunLog` returns
  `undefined` and every call site no-ops through `?.` — behaviour is
  byte-for-byte what it was before.

### Retrace (reading a run log back)

```bash
npx tsx scripts/retrace.mjs --run 2026-08-16T09-30-12                 # every log in the run
npx tsx scripts/retrace.mjs --run <id> --model kimi-k2.7 --task nbody # one pair
npx tsx scripts/retrace.mjs --run <id> --iteration 2                  # one iteration (0-based)
npx tsx scripts/retrace.mjs --run <id> --full                         # inline full spill content
```

Prints a per-iteration transcript: prompt hash/length, each attempt (cache hit,
retries with their delays), response size/tokens/runtime, the cleaned artifact
(8-line excerpt by default, spill refs resolved), each check's pass/fail with
points and detail, and the aggregate line (score, status, failureReason,
`runLogRef`). Model/task filtering reads the HEADER, not the filename — both
ids contain hyphens, so the name can't be split reliably. `SWEEPS_DIR`
overrides the directory scanned.

### Publishing a trace to the site (`task bench:publish-traces`)

`sweeps/` is gitignored and pruned, and the site is a static export with no
server — so a trace is readable on the web ONLY if it was copied into the repo
and committed. That is what publication is, and why published traces are the
one thing under the otherwise-generated `public/lab-data/` that git tracks
(see the carve-out in `.gitignore`).

**Runbook order after a sweep:**

```bash
task bench:outputs           # artifacts (results.json changed)
task bench:verify-results    # data invariants, incl. the run-log checks
task bench:publish-traces    # copy the referenced logs + their spill files in
git add lib/lab/llm-benchmark/results.json public/lab-data/traces && git commit
```

- Publishes `public/lab-data/traces/<runId>/<file>` for every record with a
  `runLogRef` whose log is present locally, plus ONLY the spill files that log
  references (walked recursively — the writer spills any oversized string
  anywhere in an event), plus `index.json` (`runId`, `file`, `modelId`,
  `taskId` from each HEADER, `bytes`, `spillRefs`).
- **The index is the authority.** The task page reads it at build time
  (`traces-server.ts`) and renders a trace disclosure only for a record whose
  ref is in it — a static export can't probe for a file, and a 404 per
  historical row is not an acceptable "does it exist?" test.
- **Three buckets, all reported.** Every wanted trace is `refreshed` (its source
  sweep is on this machine — copy it, rebuild its index entry from the header),
  `kept` (the source is gone but the published JSONL is committed — its existing
  index entry is carried through verbatim), or `pruned` (no record claims it any
  more). Only WANTEDNESS prunes; a missing source never does. Rebuilding the
  index from sources alone used to drop committed traces the moment
  `sweep-clean` ran — bytes still in the repo, invisible on the site.
- **Idempotent and pruning.** Re-running is a no-op; a trace no record claims
  any more (a pair re-run under a new run id) is DELETED, as are spill files no
  surviving log references. A stale trace is evidence for a result the site no
  longer shows.
- **Spill bytes are the cost.** Spill files are whole artifacts, copied
  verbatim — a clipped artifact would be evidence you can't trust. The script
  prints the totals and WARNS past a 2 MB soft budget; the operator decides
  whether to commit that much (pruning `sweeps/` first with
  `npx tsx scripts/sweep-clean.mjs` publishes fewer runs).
- Nothing in `prebuild` regenerates this: CI has no `sweeps/`, so publication
  is a deliberate local step, exactly like a results.json commit.

### Run-trace UI

`components/lab/llm-benchmark/run-trace.tsx` is `retrace.mjs` in the browser,
rendered on the task page under the results table as "Iteration traces": one
collapsed disclosure per model that HAS a published trace. Expanding it fetches
the JSONL once (`cache: 'force-cache'`; the run id is in the path, so a re-run
gets a new URL and there is no cache-buster) and parses it with `parseRunLog`.

- Per iteration: the request (prompt hash + length), each retry (kind, attempt,
  delay, one-line error), each response (tokens, runtime, TTFT + tok/s when
  measured, a cache-hit badge), the cleaned artifact, the checks as the shared
  `IterationChecks` pills, plus `failure` / `quota` lines; then the aggregate.
- Artifacts render as the log's own bounded preview with a `view full` link to
  the published spill file — never inlined whole.
- **Client-bundle rule:** the component imports `parseRunLog` from
  `runlog-format.ts` ONLY. `runlog.ts` is the writer and is node-only
  (`node:fs`, `node:crypto`); importing it from a client component would drag
  those into the bundle. The types live in `runlog-format.ts` and `runlog.ts`
  re-exports them, so the reader can never drift from the writer.
- **Degrading.** A record with no `runLogRef`, or one whose ref is not in the
  index, gets no disclosure; the section states the count of untraced runs in
  one muted line, and renders nothing at all when the task has no traces —
  which is the state of every task until the next sweep is published.

## Per-call telemetry (TTFT, decode rate, cache, retries)

Wall-clock `runtimeMs` cannot separate "the model is slow" from "the network
or queue is slow" — the same distinction the `cli_timeout` vs `endpoint_hung`
taxonomy exists to draw. TTFT is the queue+prefill half; the decode rate is
the generation half.

- **Fields.** `GenerationResponse.ttftMs?` (`types.ts`) → run-log `response`
  event `ttftMs?` / `tokensPerSec?` / `rateKind?` → `BenchmarkResult.telemetry`
  = `{ meanTtftMs?, meanTokensPerSec?, rateKind?, cacheHits, retries }`,
  folded by `foldTelemetry()` inside `aggregateRuns`.
- **Where TTFT is real, and where it is a proxy.**
  - *Streaming APIs* (`moonshot.ts`, `openrouter.ts`): the first NON-EMPTY
    `delta.content` — a true first-token boundary, measured from before the
    fetch so it includes connect/queue/prefill.
  - *CLI providers* (agy, codex, opencode via `runCli`): the first **stdout**
    chunk. This is first OUTPUT, not first token — an agent CLI's banner or
    spinner usually lands before the model decodes anything, so CLI TTFT
    reads **low**. Treat it as a proxy, not a number to compare against an
    API model's TTFT.
  - *`openai.ts` / `anthropic.ts` / `google.ts`*: **not instrumented, on
    purpose.** They are single-shot non-streaming `fetch`es with exactly one
    observable timestamp; stamping response-arrival time as TTFT would make
    TTFT == runtimeMs and the decode rate infinite. To close this gap,
    convert them to streaming first — do not backfill a fake.
- **Fold rules (dsh `session-stats` parity).**
  - The FIRST attempt's TTFT survives an in-step retry (`resetForRetry`
    parity) — a retry never re-starts the clock.
  - `rateKind: 'decode'` = tokensOut / (runtime − ttft). `'wall-clock'` =
    tokensOut / runtime, the documented fallback when no first-token boundary
    exists; it is depressed by queue time and is NOT comparable to a decode
    rate. `'mixed'` = a record folded over some of each — read it as a lower
    bound.
  - Cache replays are counted in `cacheHits` and excluded from BOTH means:
    nothing was generated, so their timings describe some earlier call.
  - `retries` counts transient AND empty-body retries, over failed iterations
    too. It rides a mutable `CallTelemetry` sink rather than `generateOne`'s
    return value precisely because the interesting case (failed after two
    retries) ends in a throw, and a throw delivers no return value.
- **Presence is NOT uniform, and the difference is the contract.** The
  counters (`cacheHits`, `retries`) are always present and 0-when-none —
  read the value, never key on presence. The two means are ABSENT when
  nothing measured them, because a 0ms TTFT is physically impossible and a
  0 tok/s decode rate is an infinitely slow model; `verify-results`'
  `telemetry-sanity` check fails a record that publishes either as 0, or a
  `meanTokensPerSec` with no `rateKind`.
- **No UI.** The model-page surface is deferred to backlog #9's trace UI;
  today the numbers are readable through `retrace.mjs` and results.json.

## Billing + usage provenance (`billing.ts`)

Token counts arrive from providers that know wildly different amounts, so the
harness records WHERE each number came from and prices everything in one place.

- **Shape.** `UsageSummary = { inputTokens, outputTokens, cachedReadTokens?,
  cachedWriteTokens?, source }` (declared in `types.ts` because
  `BenchmarkResult.usage` persists it and types.ts must stay a leaf; `billing.ts`
  re-exports it and owns the algebra). Build with `summarizeUsage(runs)`, price
  with `costFromUsage(usage, model)` — never multiply rates by hand.
- **`source` is the honesty field.** `'reported'` = the provider stated the
  counts; `'estimated'` = our ~4-chars-per-token heuristic, or a zero fallback
  we invented when the provider said nothing; `'mixed'` = one record folded over
  both. Roll-up rules: an UNSTAMPED contribution reads as `'estimated'` (unknown
  provenance is never a provider statement); only token-bearing contributions
  vote, so a failed 0/0 iteration can't drag a reported record to `'mixed'`; two
  kinds among the voters give `'mixed'`, never a majority winner.
- **Who stamps what** (`GenerationResponse.usageSource`): moonshot/openrouter
  `'reported'` iff the SSE stream carried a `usage` block; openai/anthropic/
  google `'reported'` iff `usage`/`usageMetadata` was present; `cli.ts` always
  `'estimated'`.
- **The codex carve-out — read this before "fixing" it.** Codex prints a real
  `tokens used` TOTAL, and `parseCodexTokens` splits it 25/75 into in/out. The
  TOTAL is reported; the SPLIT is ours. Neither half is a number codex ever
  stated, so the contribution stays `'estimated'` — stamping `'reported'` would
  let an invented split borrow the provider's authority. It earns `'reported'`
  only when a provider reports the two directions separately.
- **Cached tokens.** `cachedReadTokens`/`cachedWriteTokens` are ADDITIVE to
  `inputTokens` (Anthropic-style disjoint counters) and bill at the NORMAL INPUT
  RATE, because `BenchmarkModel` has no cached-rate fields yet. That over-states
  spend rather than under-stating it — the right direction for a benchmark that
  publishes costs. Nothing produces them today, so no existing number moves.
- **Back-compat.** `BenchmarkResult.tokensIn`/`tokensOut` stay and always equal
  `usage.inputTokens`/`usage.outputTokens`; `usage` is the richer view and
  `costUsd` is computed from it. `estimateCost()` in `harness.ts` is a
  deprecated thin wrapper over `costFromUsage`. The `usage-sanity` verify check
  fails any record where the two views disagree or `source` is off-vocabulary.

## Verifying the results themselves (`task bench:verify-results`)

`task bench:verify` checks the CODE. This checks the DATA — results.json and
the retained run logs — and it is free, offline and seconds long.

```bash
task bench:verify-results                 # after every sweep, before push/deploy
task bench:verify-results -- --strict     # warnings are failures too
task bench:verify-results -- --quiet      # summary line only
npx tsx scripts/verify-results.mjs        # same thing without task
```

- **When to run.** After any sweep, backfill, merge, or hand edit of
  results.json; before a deploy. The pre-push hook runs it first (cheapest
  gate), so a corrupted results.json cannot leave the machine.
- **What it catches.** Eleven invariants, each carrying the WHY it exists (the
  report prints that WHY on failure): `score` drifted from the `aggregateRuns`
  aggregation of `iterationScores`; `iterationCheckResults` misaligned with
  `iterationScores` (the UI pairs them by index — a misalignment attributes one
  iteration's failed checks to another's score); more iterations succeeded than
  ran, or a scores array shorter than the successes it claims; a `status` that
  disagrees with its counts (a `partial` published as `success`); ids that no
  longer resolve in the registry (renaming a model silently empties the board);
  a `failureReason` outside the taxonomy or on a `success`; a run log on disk
  whose record carries no `runLogRef` ("no record without a trace") or a ref
  whose log names a different model/task or never recorded an `aggregate`;
  run-log `seq` integrity; a `usage` summary that disagrees with the flat
  `tokensIn`/`tokensOut` beside it or carries an off-vocabulary `source`
  (`usage-sanity` — the published `costUsd` is priced off that summary); and a
  record scored under a superseded prompt bundle (`stale-prompt`, below).
- **The ref-less carve-out.** A run log whose record has no `runLogRef` only
  FAILS when the record's `createdAt` is at or after the log header's. A record
  that PREDATES the log beside it is the merge-protection shape: that run
  produced 0 successes (quota trip), so `mergeResults` kept the older good
  record, which legitimately has no ref — it skips. (Carrying the ref forward in
  `mergeResults` was rejected: it would point a kept SUCCESS record at a FAILED
  run's trace, which is false provenance.)
- **`seq` gaps are a WARNING, not a failure** — a gap is the deliberate evidence
  that a failed batch was rolled back and dropped (see the contract at the top
  of `runlog.ts`). A duplicate or decreasing `seq` IS a failure: the append-only
  contract was violated and the log can't be trusted as a replay.
- **Exit semantics.** 0 clean, 1 on any failure; `--strict` also exits 1 on
  warnings. The summary is one line: `N checks, N records, N failures, N
  warnings, N skipped, N pre-bundle`.
- **Skips are expected and are not weakening.** Records that predate a field
  (`iterationScores`, `iterationsSucceeded`) skip the checks needing it; seeded
  records are exempt from the run-log checks only (they never had a run); a
  `runLogRef` whose file has been pruned from `sweeps/` skips; and the
  single-entry `iterationCheckResults` that
  `scripts/backfill-iteration-checks.mjs` writes (one breakdown for the one
  published artifact) is a documented shape, not a misalignment. Current
  baseline: 183 records → 0 failures, 0 warnings, 1061 skipped, 183 pre-bundle
  (every stored record predates `usage`, so all 183 skip `usage-sanity`).
- **Adding a check.** Put it in `RESULT_CHECKS` with a `why` naming the bug it
  would have caught, keep it pure (filesystem inputs are injected as
  `runLogs` + `readLog`), and unit-test it in `verify-results.test.ts`. A check
  that can't state its bug is synthetic — it will be muted, not fixed.

## Prompt-regression probes (`task bench:probe`) — the pre-sweep gate

**RUNBOOK RULE: prompt or contract changed → `task bench:probe` → sweep.**
A probe failure GATES the sweep (exit 1). Never spend hours re-sweeping on a
contract edit that has not passed the probes; `task bench:verify` tests the
prompt TEXT, the probes test what a model DOES when it reads it.

- **Where.** Probe definitions are inert DATA in
  `lib/lab/llm-benchmark/probes/probes.json` (like `sweep-profiles.json`);
  `probes.ts` is the validated loader plus the pure evaluator; the runner is
  `scripts/prompt-probe.mjs`.
- **Shape.** `{ id, description, prompt, appendGlobalContract, asserts }` with
  `Assert = { kind, value, flags? }` over five kinds: `starts-with`,
  `contains`, `not-contains`, `matches`, `not-matches` (the last two compile
  `value` as a regex at LOAD time — a typo'd pattern fails before any call).
  **No inline JS**, deliberately: this repo publishes its harness, so a probe
  file must be auditable at a glance and must never execute. (Deviation from
  the paperclip promptfoo inspiration, which allows inline-JS asserts.)
- **The contract is never copied into the data.** A probe that tests the global
  contract sets `appendGlobalContract: true` and `probePrompt()` appends the
  REAL `SANDBOX_CONSTRAINTS` from `prompts.ts` at run time. A copy would drift
  silently, and a probe testing a stale contract is worse than no probe. A unit
  test locks the derivation (it asserts a distinctive contract line survives
  into the composed prompt).
- **The six probes.** `doctype-first` (DOCTYPE opens the reply — tolerates a
  leading code fence, NOT a prose preamble), `no-cdn` (no `<script … src=`, no
  `@import`), `css-sized-canvas` (no `width`/`height` attribute ON the
  `<canvas>` tag — setting `canvas.width` from JS is required by the contract
  and deliberately still passes), `try-catch-alert` (`role="alert"` present, no
  `window.alert|confirm|prompt(` — a bare `alert(` is out of scope),
  `fills-viewport` (`margin:\s*0`), `scoped-context` (three inline facts + "use
  ONLY these" → no `fetch(` / `XMLHttpRequest` / `import(`; the paperclip
  wake-payload lesson: the model must not reach for external data). Half the
  asserts are NEGATIVE on purpose — a contract regression is usually the model
  doing something the contract bans.
- **Asserts run on the RAW reply.** No `cleanOutput`, no fence stripping: a
  probe that ran on cleaned text could not see "the model narrated before the
  DOCTYPE". Tolerances are stated in the probe's own pattern.
- **Cost.** One generation per (probe × model), through `generateForProbe` —
  the real provider seam, with no cache, no retries, no scoring, no run log,
  and no write to `results.json`. Default model is the cheapest registered FREE
  model (`deepseek-v4-flash-free`, local `opencode` CLI), so the default run is
  free. Past 20 calls the script demands `--yes`.
- **Timeout.** Default 60s per call. Measured 2026-08-17: `doctype-first` on
  `deepseek-v4-flash-free` takes ~47s (free CLI tier, ~10-20 tok/s), so the
  headroom is thin — pass `--timeout-ms 120000` when probing slow CLI models,
  and read a timeout as "this model is slow", not "the contract regressed".

```bash
task bench:probe                              # all probes, default free model
task bench:probe -- --dry-run                 # probes + asserts, ZERO calls
task bench:probe -- --probe doctype-first
task bench:probe -- --model kimi-k2.7,deepseek-v4-flash-free --yes
```

## Prompt bundles (`promptBundle`, `prompt-bundle-audit`, `stale-prompt`)

The board's axis is the MODEL. The other axis — usually the bigger lever — is
the **prompt bundle**: the task prompt, the sandbox contract appended to it, and
the frame prelude the artifact executes inside. `lib/lab/llm-benchmark/prompt-bundle.ts`
makes that axis nameable.

- **What is hashed.** `promptBundleHash(task)` = 16-hex sha256 over
  `withSandboxConstraints(task).prompt` (the exact bytes the model received —
  task prompt PLUS whatever `appliedSandboxConstraints` resolved: global,
  task-specific, or none) + a separator + `framePreludeFingerprint()` (a digest
  of the `FRAME_PRELUDE` **source constant**, not a hand-bumped version number —
  the one time someone forgets to bump is the time it matters). The rule:
  **anything that changes what the model SEES or the environment its artifact is
  SCORED IN**.
- **What is NOT hashed, on purpose.** The task id/slug/title — the hash answers
  "same conditions?", and a rename changes no condition, so a rename must not
  invalidate history; two different tasks with identical prompts + environment
  therefore share a bundle hash, which is honest (a test locks this). Also out:
  the model/provider/temperature (that is the axis the board already compares,
  and it lives in the record) and the scorer/checks (a scoring change is real
  staleness of a different kind, and folding it in would churn every bundle on a
  check tweak).
- **Where it is stamped.** `aggregateRuns` writes `BenchmarkResult.promptBundle`
  — the only moment it is computable, since tomorrow's prompt edit erases the
  past forever. The run-log header also carries `configSnapshot.promptBundle`
  (deliberately redundant: a trace must be readable on its own).
- **The ground case.** tic-tac-toe's stored results were scored under the OLD
  global contract; when its task-specific contract landed (#36) nothing marked
  them stale and the board kept presenting them as current. That silent mismatch
  is the entire reason this field exists.

```bash
npx tsx scripts/prompt-bundle-audit.mjs                     # whole corpus
npx tsx scripts/prompt-bundle-audit.mjs --model kimi-k2.7   # repeatable filters
npx tsx scripts/prompt-bundle-audit.mjs --task mini-platformer --all
```

The audit groups records per (model, task) by bundle, prints each group's mean
score oldest-first, and the delta between consecutive bundles — "did the prompt
change help, for this model?". Grouping/delta arithmetic is pure
(`compareBundles`, `summarizePromptBundles`, unit-tested); the script is a
shell. Records with no field group as `pre-bundle`, which sorts first (legacy by
definition, whatever timestamp it carries).

**Ground state today: every record predates the field**, so the audit reports one
`pre-bundle` group everywhere and no deltas, and exits 0. That is the correct
answer, not an error — deltas start appearing after the first sweep run under
this code.

**Release gate.** verify-results' `stale-prompt` check warns on a record whose
`promptBundle` differs from the current `promptBundleHash(task)`
(`scored under bundle <old> (current <new>)`). It is a WARN and never a FAIL: a
stale result is still an honest result, just old, and failing would break the
build the moment you intentionally edit a prompt — before the re-run could
possibly exist. `--strict` promotes warnings to failures, and THAT is the
release gate: run `task bench:verify-results -- --strict` when publishing, where
a stale number would be a lie. Records with no `promptBundle` skip and are
reported as a single `N pre-bundle` count on the summary line — 183 identical
legacy warnings would train the reader to ignore the whole report.

**UI.** The task page renders a muted `· bundle <hash8> (stale)` marker beside
the model name for stale records ONLY (with the full old/current hashes in the
title). A current-bundle record shows nothing: the default reading is "these
numbers describe the prompt above this table".

## Plugin system (dsh-inspired)

The harness has a plugin system (`lib/lab/llm-benchmark/plugins/`): a plugin
contributes tasks, behavioral checks, scorers, demo components, and task-page
cards to the shared registries without touching core files. There is no
privileged plugin — the built-ins are just the first registrants, and every
registration unwinds on `unregisterPlugin()`.

- **Roster** (`plugins/index.ts`): each shipped plugin is imported statically
  and registered there — adding a plugin = one import + one
  `registerPlugin()` call. `registry.ts` merges `pluginTasks()` into
  `BENCHMARK_TASKS`; `scorers/checks.ts` merges `pluginChecks()` into the
  named check registry; `scorers/index.ts` merges `pluginScorers()`;
  `demo-registry.tsx` merges `pluginDemos()`; the task page renders
  `pluginTaskCard(task)`.
- **Task rows** declare `scorer` (name) + `checks` (names): the check names
  resolve through the registry (built-in + plugin); an unknown name throws
  loudly rather than silently scoring with no checks. Tasks without a
  `checks` list keep the per-task fallback map. Contributed tasks are
  stamped `pluginId` (shown as an attribution chip on the task page).
- **Providers as plugins** (#35): `generators` (keyed by `model.provider`,
  values are LAZY `() => import('./generate')` factories — the impl is
  node-only) + `models` (merged into `BENCHMARK_MODELS`, stamped `pluginId`).
  The seam is the GENERATION call (`PluginGenerate`), not `runTask`, so a
  plugin provider inherits retries/cache/run log/quota breaker/scoring;
  `configForModel` consults the map only for providers its switch doesn't
  know, and shadowing a built-in provider is rejected at registration.
  Example: `plugins/echo-provider/` (unrostered).
- **Client-bundle rule**: anything imported by `registry.ts`/`demo-registry`
  reaches the client bundle, so plugin CHECK files must use
  `import type { CheckFn }` — never a runtime import of `scorers/sandbox.ts`
  (that pulls Playwright in). Demo components may import React freely.
- **Example**: `plugins/community-tasks/` (manifest.json + index.ts +
  checks.ts + demo.tsx) ships the tic-tac-toe task with its own DOM-based
  checks (`ttt-grid-interacts`, `ttt-win-detected`) — the template for new
  plugins. Tests in `plugins/registry.test.ts` cover registration,
  collisions, unwind, and integration.
- **Authoring**: `docs/lab/llm-benchmark/plugins-authoring.md` — every
  extension point with its code reference, the client-bundle rule, the
  manifest fields, the point-budget/rationale convention for checks, roster
  ordering (later registration wins name collisions), and sweep bundle
  selection. Scaffold a new plugin with
  `task bench:plugin-scaffold -- <id> "<Display Name>"`
  (`scripts/plugin-scaffold.mjs` + `scripts/templates/plugin/*.tmpl`; pure
  helpers in `plugins/scaffold.ts`). The scaffold does NOT edit the roster —
  an unrostered plugin is dead code and `task verify` stays green on it.
  `manifest.json` is descriptive metadata only; nothing loads it.

## Verification Checklist

- [ ] `task bench:verify` passes (typecheck + benchmark unit tests)
- [ ] `task bench:verify-results` passes (results.json + run-log invariants)
- [ ] `task build` statically generates new routes
- [ ] New task has pre + post MDX files
- [ ] New demo is exported and mapped
- [ ] Results reference valid task and model IDs
- [ ] Registry coverage test: `registry.test.ts` auto-excludes unswept models and enforces a per-task board floor (≥20 records) — a new model needs no test edit, but a bad merge wiping records will fail
- [ ] After a prompt/contract change, `task bench:probe` passes BEFORE any sweep
- [ ] After harness changes, a live smoke test succeeds (`task bench:smoke`)
