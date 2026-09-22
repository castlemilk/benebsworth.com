# Astra extra high and Devin SWE-2

This comparison runs agent systems: GPT-6 Astra through Codex and SWE-2 High
through Devin. Their CLI tools and system prompts differ. The task prompts,
iteration counts, timeout, retries, browser environment and scoring are shared.

## Reproduce

Install and authenticate `codex` and `devin`, then install this repository's
Chromium version with `npx playwright install chromium`.
Run `task bench:devin-preflight` before a Devin sweep. It makes one live call,
verifies a command-created marker plus the HTML handoff, and never writes scores.

```sh
npx tsx scripts/run-benchmark.mjs --profile astra-devin \
  --model codex-gpt-6-astra-xhigh,devin-swe-2-high --dump-config
npx tsx scripts/run-benchmark.mjs --profile astra-devin \
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
mode with `--sandbox --permission-mode autonomous`, skips the interactive
workspace trust prompt, and writes a unique artifact inside each iteration's
scratch directory. Its delivery suffix asks for sandboxed `exec` file creation:
Devin 3000.11.1's direct write/edit tools still require approval in sandbox mode.
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

`task bench:visual-games-fixtures` runs hand-written working and broken
fixtures from `plugins/visual-games/checks.test.ts` in Chromium. Ordinary unit
tests skip these browser integration cases. Missing controls retain their point budgets and score
zero. The fixtures only demonstrate interaction-check discrimination: genuine
3D geometry, visual richness, collision realism and lap integrity are outside
the automated score and must be inspected in the artifacts.

Preflight also checks the executable scorer on Node 24: the stable permission
flag and canonical macOS temporary paths preserve the existing filesystem
boundary. `scorers/code-runtime.test.ts` covers successful execution, crashes,
timeouts, output limits, environment isolation and denied filesystem writes.

The sweep also exposed Python scorer import/packaging issues documented in
`docs/postmortem/0006-python-probe-imports.md`. After the generating sweep has
stopped, re-score its complete CLI pair without provider calls:

```sh
npx tsx scripts/rescore-cli-pair.mjs --run 2026-09-22T08-50-23 \
  --model codex-gpt-6-astra-xhigh --task crypto-hash-race
```

Add `--write` only after committing the scorer changes. It preserves the source
trace and generation metrics, writes a new trace with `rescoreOf` provenance,
and updates only that result. A changed artifact hash or mismatch against the
original response aborts the operation. `--output-run ID` groups multiple
corrected pairs in one new run directory. Complete HTML normalization and
WebGL frame capture corrections are documented in
`docs/postmortem/0007-html-webgl-observation.md`; apply the same current
scorers to every retained pair from both models after generation finishes.
These corrections do not modify generated source. Final rescoring runs one
artifact at a time. Browser capture and the new tasks' control actions allow
five seconds, with 20 seconds per check and 90 seconds per batch.
The browser fixtures also exercise the actual tsx CLI loader, which exposed
a callback serialization bug that Vitest alone missed; see
`docs/postmortem/0008-browser-callback-loader.md`.
Partial pairs keep their original failed iterations, completion count and
failure reason. Only successful retained artifacts receive a new score; the
script checks that generation usage, runtime and status remain unchanged.
Dependency normalization may fetch a vendor library, but rejects it unless
its bytes already occur in the original redacted trace. No model calls occur.

To stage corrections while generation continues, set `RESULTS_OUT_PATH` to
a separate JSON file containing the source records. Merge those corrected
records into the board only after its generating sweep stops. Never let two
writers share the same results file during rescoring.
