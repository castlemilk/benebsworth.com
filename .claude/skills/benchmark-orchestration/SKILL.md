---
name: benchmark-orchestration
description: Use when running, extending, or debugging the LLM benchmark sweep on benebsworth.com — probing new free-tier models, adding registry entries, running long sweeps, classifying failures, re-running excluded models, or publishing updated outputs. Captures the end-to-end orchestration loop (probe → register → validate → sweep → analyze → publish) and the failure-mode vocabulary that distinguishes model capability from infrastructure weather.
---

# Benchmark Orchestration

> **Read this before running a sweep or adding models.** The benchmark is a
> long-running, rate-limited, retry-heavy process. The defaults and failure
> modes below are the ones that actually fire on free-tier endpoints — they
> were learned by burning six hours on a real sweep, so don't re-derive them.

## The loop

```
probe  →  register  →  validate  →  sweep  →  analyze  →  publish
   ↓          ↓           ↓           ↓          ↓          ↓
 curl      registry     1-shot      full       model       prebuild
 OpenRouter  .ts        smoke      5-iter    reliability  posts JSON
 /models    entry       RUN_ITER=1  sweep     summary     + HTML
```

1. **Probe** — query `https://openrouter.ai/api/v1/models` with your key,
   filter `pricing.prompt === '0' && pricing.completion === '0'` to find the
   current free catalog. The catalog rotates (models appear/disappear weekly).
2. **Register** — append to `BUILTIN_MODELS` in `lib/lab/llm-benchmark/registry.ts`
   (the array `BENCHMARK_MODELS` merges with plugin-contributed models)
   with `id`, `name`, `provider: 'OpenRouter'`, `apiModelId` (full `:free` slug),
   `costPer1kInputUsd: 0`, `costPer1kOutputUsd: 0`, plus the optional metadata
   (modelCardUrl, vendorUrl, company, family, released, license, params, tags,
   blurb). URL-safe id, unique.
3. **Validate** — a single-iteration smoke test per new model:
   `RUN_MODELS=<new-id> RUN_ITERATIONS=1 RUN_TASKS=equation-solver npm run benchmark:run`.
   If it hangs >120s, the endpoint is dead — exclude (see Excluded models).
4. **Sweep** — full board:
   `RUN_MODELS=<ids> RUN_ITERATIONS=5 RUN_CONCURRENCY=2 npm run benchmark:run`.
   Free-tier concurrency=2 is safer than 3; OpenRouter's rate limiter is
   per-provider-pool, not per-key, and 3 free models hitting 3 providers
   simultaneously can trip shared quotas.
5. **Analyze** — read `lib/lab/llm-benchmark/results.json`. For each model
   compute the **model-only average** (excludes infra failures):
   `modelReliability()` in `analytics.ts` does this. A model that scored 41
   but has 4 `rate_limited` records is actually a 96-average model that got
   unlucky on the shared pool.
6. **Publish** — `npm run build` runs the prebuild, which calls
   `scripts/gen-benchmark-outputs.mjs`. This writes
   `public/lab-data/llm-benchmark/outputs/<task>/<model>.{json,html}` for
   every record with non-empty output (133 JSON + 90 HTML artifacts after a
   full free-tier sweep).

## Deploy target: Cloudflare Pages, NOT Vercel

**Production is Cloudflare Pages** (`benebsworth.pages.dev`), even though
`.vercel/project.json` exists (the Vercel project is a leftover preview alias).
Deploy with:

```bash
CLOUDFLARE_API_TOKEN=<valid token> \
CLOUDFLARE_ACCOUNT_ID=2132ccf47ceb5fff234c34d85490470a \
npm run deploy:pages:prod
```

This runs `scripts/deploy-pages.sh prod` → `npm run build` →
`npx wrangler pages deploy out --project-name=benebsworth --branch=master --commit-dirty=true`.

The `cfat_...` token in `.env` may be **stale/invalid** (returns 1000 Invalid
API Token on `/user/tokens/verify`). Ask the user for a fresh token with
`Pages: Edit` permission. If `npx wrangler whoami` hangs, it needs an
interactive browser OAuth login — run it in the user's shell, not here.

See `.claude/skills/deploying-the-site/SKILL.md` for the canonical runbook.

## Failure vocabulary (Loop 1)

Every `BenchmarkResult` carries a `failureReason` field that classifies
**why** it failed. This separates model capability from infrastructure weather
— the #1 lesson from the free-tier sweep (Gemma 4 31B's raw 41.1 was 4
rate-limits, not bad code).

| Reason | Means | Counts as infra? | UI badge |
|---|---|---|---|
| `none` | Iteration succeeded | — | success |
| `rate_limited` | Transient 429/overload (retried, still failed) | yes | yellow "rate-limited" |
| `quota_exhausted` | Hard stop (daily cap, billing cycle) | yes | red "quota" |
| `endpoint_hung` | Fetch never completed (connect/socket stall) or runner timeout | yes | red "hung" |
| `truncated` | `finish_reason: length`, zero content (reasoning burned the budget) | **no** — capability | grey "truncated" |
| `empty_body` | 200 response, zero deltas | yes | grey "empty" |
| `auth_error` | 401/403 (key invalid/scope wrong) | yes | red "auth" |
| `invalid_request` | 400 (prompt rejected) | yes | red "400" |
| `model_error` | 5xx after retries or unclassified | **no** — capability | red "error" |

Classification happens in `classifyFailureReason()` in `runners/provider.ts`.
The classifier walks the error message from most-specific to least, so add new
patterns ABOVE the `model_error` fallthrough.

**Infra failures** are excluded from the **model-only average**
(`modelReliability()` in `analytics.ts`). For frontier models with reliable
endpoints the model-only and raw averages are identical; for free-tier
models with shared-pool rate-limits the model-only number is dramatically
higher and the right one to lead with.

## Empty-body retry (Loop 2)

The runner's transient-retry (network/429/5xx) does NOT catch empty bodies
because an empty body is a successful 200 response, not an error. Free-tier
endpoints in particular occasionally return 200 with zero assistant deltas
when the shared pool is pressured.

Loop 2 adds a dedicated retry: after a successful response with empty
content, retry up to 3 times total with a 1.5s × attempt backoff. If all
attempts return empty, record as `empty_body` failure.

This recovers the vast majority of Ling 3.0 Tiny / Laguna XS 2.1 style
partials on the free tier — the model's first attempt dropped the stream,
the retry got a clean response, the iteration now scores as a success.

## Per-iteration transparency (Loop 3)

`BenchmarkResult.iterationScores` carries the per-iteration 0-100 scores for
the successful iterations of a record, in run order. The model detail page
renders a compact `{min}–{max} σ{stddev}` indicator under the score bar so
readers can see whether a 99.4 average is "five consistent 99s" or "one lucky
100 averaged with four 74s". A full `title=` tooltip carries the raw list.

**Only populated for runs after Loop 3 shipped** — the earlier 84-record
free-tier sweep discarded per-iteration scores after aggregation. Re-run a
model with `RUN_MODELS=<id> npm run benchmark:run` to populate; the cache
makes this nearly free.

## Circuit breaker

`createProviderRunner()` in `runners/provider.ts` tracks a `trippedProviders`
set. The first time `isQuotaError()` fires for a provider, the runner breaks
out of the current task's iteration loop AND adds the provider to
`trippedProviders`; every later task for any model from that provider throws
immediately without calling the API. Combined with `mergeResults()` in
`results.ts` (a re-run with 0 successes never overwrites a record with
successes), this means a quota outage during a sweep:

- Saves the remaining sweep time (no point hammering a dead provider).
- Leaves existing good results intact (never overwrites with zeros).
- Marks skipped jobs as nothing (no `fail` record gets written).

## Caching

Successful provider responses are cached in `.cache/llm-benchmark-responses.json`
(gitignored). Cache key = `{modelId, taskId, sha256(prompt), iterationIndex}`.
`RUN_BUST_CACHE=1` ignores the cache. The cache is what lets a 6-hour sweep
resume in minutes after a kill — completed iterations replay instantly.

## Excluded models

Some free endpoints genuinely hang (Nemotron Nano 12B VL's route returns
empty bodies indefinitely; direct probe timed out at 120s). The convention:

1. Probe with `RUN_ITERATIONS=1 RUN_TASKS=n-body-field RUN_MODELS=<id>`.
2. If it hangs >120s OR returns empty for all 5 iterations, **exclude**.
3. Leave the model in the registry (so the UI doesn't 404) but don't sweep it.
4. Re-test periodically — free endpoints sometimes recover.

## Run scripts

```bash
# Full sweep, all free models, 5 iterations, concurrency 2 (safe for free tier)
OPENROUTER_API_KEY=sk-or-v1-... \
  RUN_MODELS=nemotron-3-ultra,nemotron-3-super,...,laguna-xs-2.1 \
  RUN_CONCURRENCY=2 npm run benchmark:run

# Smoke test a single model
RUN_MODELS=ling-3.0-tiny RUN_ITERATIONS=1 RUN_TASKS=equation-solver npm run benchmark:run

# Re-classify existing results.json after adding new failureReason patterns
node scripts/backfill-failure-reasons.mjs

# Regenerate published outputs after a sweep
npm run build   # prebuild runs gen-benchmark-outputs.mjs
```

## Stash before deploy (gotcha learned the hard way)

The working tree is often dirty with unrelated uncommitted changes (other
features, blog drafts, vectors/, harness-eval/, etc.). A naive deploy ships
all of them. Before deploying:

1. `git add` ONLY the files you intend to ship (benchmark code + new blog
   post + regenerated outputs).
2. `git stash push --keep-index --include-untracked -m "unrelated-dirty-tree"`
   stashes everything not staged.
3. Build (`npm run build`), deploy (`npm run deploy:pages:prod`).
4. `git stash pop` restores the unrelated work.
