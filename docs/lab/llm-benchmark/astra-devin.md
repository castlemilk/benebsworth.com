# Astra extra high and Devin SWE-2

This comparison runs agent systems: GPT-6 Astra through Codex and SWE-2 High
through Devin. Their CLI tools and system prompts differ. The task prompts,
iteration counts, timeout, retries, browser environment and scoring are shared.

## Reproduce

Install and authenticate `codex` and `devin`, then install this repository's
Chromium version with `pnpm exec playwright install chromium`.

```sh
pnpm exec tsx scripts/run-benchmark.mjs --profile astra-devin \
  --model codex-gpt-6-astra-xhigh,devin-swe-2-high --dump-config
pnpm exec tsx scripts/run-benchmark.mjs --profile astra-devin \
  --model codex-gpt-6-astra-xhigh,devin-swe-2-high
```

The profile uses three fresh iterations, four concurrent task/model jobs,
a 25-minute cap per generation, and no transient retries. The shared runner
still has its existing empty-response recovery. Logs retain the exact model
identifier, reasoning effort (where separately configurable), prompt bundle,
per-iteration checks and generation artifacts.

Astra's model id is `gpt-6-astra`; the wrapper explicitly passes
`model_reasoning_effort="xhigh"`. Devin's model id is `swe-2-high`, verified
with `devin models list` on 22 September 2026. The Devin wrapper uses print
mode, permits workspace edits, skips the interactive workspace trust prompt,
and writes a unique artifact inside each iteration's scratch directory.
It inherits the shared process timeout, credential scrubbing and trace storage.

CLI versions at preflight: Codex 0.153.4 and Devin 3000.11.1. The Devin catalog
listed SWE-2 High as free. Codex used an authenticated subscription. Zero API
cost in these rows is not a measurement of subscription cost or agent billing;
CLI token counts remain estimates.

## New tasks and checks

`visual-games` contributes `voxel-lighthouse` and `car-racer`. Each has a
100-point behavioral budget, combined with structural HTML at the harness's
existing 70/30 weighting. The lighthouse checks rotation/pause, manual orbit,
and reset. The racer checks acceleration, steering, braking and restart, using
both rendered output and the prompt's vehicle telemetry.

`plugins/visual-games/checks.test.ts` runs hand-written working and broken
fixtures in Chromium. Missing controls retain their point budgets and score
zero. The fixtures only demonstrate interaction-check discrimination: genuine
3D geometry, visual richness, collision realism and lap integrity are outside
the automated score and must be inspected in the artifacts.

Preflight also checks the executable scorer on Node 24: the stable permission
flag and canonical macOS temporary paths preserve the existing filesystem
boundary. `scorers/code-runtime.test.ts` covers successful execution, crashes,
timeouts, output limits, environment isolation and denied filesystem writes.
