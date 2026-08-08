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
| Provider-specific API clients | `lib/lab/llm-benchmark/runners/{openai,anthropic,google,moonshot}.ts` |
| Automated scorers | `lib/lab/llm-benchmark/scorers/{html,text}.ts` |
| Dependency sandbox | `lib/lab/llm-benchmark/sandbox/inline-dependencies.ts` |
| Shared frame prelude (storage shim + error reporter) | `lib/lab/llm-benchmark/frame-prelude.ts` |
| Run script | `scripts/run-benchmark.mjs` |
| Seed data for sample/mock outputs | `scripts/sample-outputs.json` |
| Seed script for mock results | `scripts/seed-mock-results.mjs` |
| Route/path helpers | `lib/lab/llm-benchmark/nav.ts` |
| MDX loader | `lib/lab/llm-benchmark/content.ts` |
| Category & task UI | `components/lab/llm-benchmark/*` |
| Side-by-side output comparison | `components/lab/llm-benchmark/model-output-comparison.tsx` |
| Interactive demos | `components/lab/llm-benchmark/demos/*.tsx` |
| Demo-to-task mapping | `components/lab/llm-benchmark/demos/demo-registry.tsx` |
| Pre/post task text | `content/lab/llm-benchmark/tasks/<slug>.mdx` and `<slug>.post.mdx` |
| Category text | `content/lab/llm-benchmark/categories/<slug>.mdx` |
| Landing intro | `content/lab/llm-benchmark/index.mdx` |
| Routes | `app/lab/llm-benchmark/**` |
| Skill | `.claude/skills/llm-benchmark/SKILL.md` |

## Adding a Model

1. Edit `lib/lab/llm-benchmark/registry.ts`.
2. Append to `BENCHMARK_MODELS` with:
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

1. `scripts/run-benchmark.mjs` reads env vars and builds a `ProviderRunnerConfig`.
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

The provider runner selects the HTML scorer for HTML-generating task categories (`ui-building`, `3d-physics-animation`, `advanced-game-building`, `advanced-physics`, `advanced-electronics`) and the text scorer for everything else. Scores are shown as a 0-100 badge in the side-by-side output comparison UI.

To add a new scorer:

1. Create `lib/lab/llm-benchmark/scorers/<name>.ts` and export a `Scorer`.
2. Export it from `lib/lab/llm-benchmark/scorers/index.ts`.
3. Update `selectScorer()` to return it for the relevant task(s).
4. Run typecheck and tests.

## Response Caching

Successful provider responses are cached in `.cache/llm-benchmark-responses.json` (gitignored, never deployed). The cache key includes `modelId`, `taskId`, an SHA-256 hash of the prompt, and the iteration index. Set `RUN_BUST_CACHE=1` to ignore the cache and force fresh API calls.

## CLI-based providers

The harness also supports providers that are locally-installed CLIs (e.g. `agy`, `codex`). This is useful when the CLI handles its own authentication and you don't want to manage API keys in `.env`.

- `lib/lab/llm-benchmark/runners/cli.ts` — generic `spawn`-based CLI wrapper with stdin EOF, stdout parsing, token estimation, and timeout handling.
- `lib/lab/llm-benchmark/runners/agy.ts` — wraps `agy -p <prompt> --model <model>`.
- `lib/lab/llm-benchmark/runners/codex.ts` — wraps `codex exec --ephemeral --sandbox read-only <prompt>`.

To add a CLI provider:

1. Create a runner file that builds a `CliRunnerConfig` and calls `generateFromCli()`.
2. Add the model to `BENCHMARK_MODELS` with `provider` set to a unique value (e.g. `'Agy'`, `'Codex'`).
3. Wire the new provider case into `configForModel()` and `generateWithProvider()` in `lib/lab/llm-benchmark/runners/provider.ts`.
4. The CLI must be installed and authenticated locally. Test it manually first:
   ```bash
   agy -p "say hi" --model "Gemini 3.5 Flash (High)"
   codex exec --ephemeral --sandbox read-only "say hi"
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
4. Never commit API keys. Read them from `process.env` at runtime.

## Operational Gotchas

- **Kimi Code vs Moonshot**: Kimi Code API keys use `https://api.kimi.com/coding/v1`, not `https://api.moonshot.cn/v1`. Set `MOONSHOT_BASE_URL` accordingly.
- **Kimi Code temperature**: The API only accepts `temperature: 1`. The Moonshot runner hardcodes this.
- **Kimi K3**: Model id is `k3` at the Kimi Code endpoint. It has always-on thinking with `reasoning_effort` (only `max` is currently supported) and a 1M context window. Pricing is flat: $3/M input tokens, $15/M output tokens. `temperature=1.0` is fixed.
- **Model name mapping**: Use `apiModelId` in the registry when the provider's model name differs from the URL-safe registry `id` (e.g. `kimi-k2.7` → `kimi-k2-7`, `kimi-k3` → `k3`).
- **Long runs**: Kimi K2.7 can take 30–200s per task. A full 5-iteration sweep can take 30–40 minutes. Use `RUN_ITERATIONS=1` for a quick smoke test.
- **No output placeholder**: If a model has no result or a failed result with no output, the side-by-side comparison shows "No captured output for this model yet."
- **Quota/billing exhaustion**: `isQuotaError()` in `runners/provider.ts` detects provider quota errors (Moonshot `access_terminated_error`, OpenAI `insufficient_quota`, Anthropic credit balance). The runner (a) breaks the current task's iteration loop on the first quota error, (b) trips a circuit breaker that throws on all later tasks for that provider (skipped jobs record nothing), and (c) never retries quota errors. `mergeResults()` in `results.ts` adds the second layer: a fresh result with 0 successful iterations never replaces a baseline record that has successes — so a quota-killed re-run can't corrupt good data. Non-transient errors (auth/validation) also break the iteration loop: same prompt, same guaranteed failure.
- **Static artifacts**: `scripts/gen-benchmark-outputs.mjs` (prebuild, run under `tsx`) publishes `public/lab-data/llm-benchmark/outputs/<task>/<model>.json` plus a prelude-wrapped `.html` for every full HTML document. `public/_headers` serves that path with `Content-Security-Policy: sandbox allow-scripts` so artifacts are opaque-origin even opened top-level. The demo iframe uses srcdoc with the SAME prelude (`lib/lab/llm-benchmark/frame-prelude.ts`) — keep both paths on that one implementation.
- **Sandbox dependency inlining**: external `<script src>`/`<link>` URLs are resolved to canonical classic builds BEFORE fetching (aliases like unpkg `three.module.js` would otherwise inline an ES-module build as a classic script — guaranteed syntax error). Each canonical URL inlines at most once; unknown module scripts keep `type="module"`.

## Verification Checklist

- [ ] `task bench:verify` passes (typecheck + benchmark unit tests)
- [ ] `task build` statically generates new routes
- [ ] New task has pre + post MDX files
- [ ] New demo is exported and mapped
- [ ] Results reference valid task and model IDs
- [ ] After harness changes, a live smoke test succeeds (`task bench:smoke`)
