# Scorer/display prelude parity — measurement

**Date:** 2026-08-17. **Harness:** `harness-backlog` at the sandbox-backend-seam
commit (#12). **Author of the numbers:** `scripts/probe-corpus.mjs` over the
committed failure corpus.

## The divergence being measured

The behavioural scorer loads the RAW artifact (`page.setContent(html)`), while
the live frame (`ArtifactFrame`, `GeneratedDemo`) and the published `.html`
load `withPrelude(html)` — a CSS reset + dark backdrop, an in-memory
`localStorage`/`sessionStorage` shim, a runtime-error reporter, a guaranteed
viewport meta, and an auto-prepended `<!DOCTYPE html>` (see
`lib/lab/llm-benchmark/frame-prelude.ts`).

So a check can fail on a page that a reader sees working, or pass on one that
looks broken in the frame. `promptBundle` fingerprints the DISPLAY environment,
not the scoring one, which makes the gap invisible in the provenance chain.

Turning the prelude on for scoring is now an OPTION, not a change:
`BENCH_PRELUDE_PARITY=1`. Every record's run log states which mode scored it
(the `sandboxPolicy` event). **The default is OFF** — flipping it would shift
stored behavioural scores and break comparability with the published history.

## Method

Both runs, same machine, same commit, same artifacts, back to back:

```bash
npx tsx scripts/probe-corpus.mjs                        # parity OFF (default)
BENCH_PRELUDE_PARITY=1 npx tsx scripts/probe-corpus.mjs # parity ON
```

Corpus: all 39 committed cases (`failure-corpus/provenance.json`), 6 tasks
× 3 models, every one a real failing iteration from the 2026-08-17 sweeps.
Local headless Chromium (`BENCH_SANDBOX=chromium`, enforcement `partial`).

The flag was verified to reach the page, not just the config: with it set, a
probe check reading `document.documentElement.outerHTML` inside the real
browser finds the prelude's `__llm-demo-error` reporter; without it, it does
not.

## Result

**Zero delta.** All 39 cases scored identically in both modes, and the failing
check sets were identical line for line — the two transcripts differ in no
character except their order-independent timing.

| Task | Model | Iter | Score OFF | Score ON | Δ | Failing checks (identical in both modes) |
| --- | --- | --- | --- | --- | --- | --- |
| circuit-builder-teaser | nemotron-nano-12b-vl | #0 | 62 | 62 | 0 | circuit-interact, no-runtime-errors |
| circuit-builder-teaser | nemotron-nano-12b-vl | #1 | 62 | 62 | 0 | circuit-interact, no-runtime-errors |
| circuit-builder-teaser | nemotron-nano-12b-vl | #2 | 30 | 30 | 0 | circuit-structure, circuit-interact, no-runtime-errors |
| circuit-builder-teaser | nemotron-nano-12b-vl | #3 | 43 | 43 | 0 | circuit-interact |
| landing-page-morph | deepseek-v4-flash-free | #0 | 3 | 3 | 0 | landing-structure, landing-animates |
| landing-page-morph | gemini-3.6-flash | #0 | 62 | 62 | 0 | landing-animates |
| landing-page-morph | nemotron-nano-12b-vl | #0 | 62 | 62 | 0 | landing-animates, no-runtime-errors |
| landing-page-morph | nemotron-nano-12b-vl | #1 | 29 | 29 | 0 | landing-structure, landing-animates |
| landing-page-morph | nemotron-nano-12b-vl | #2 | 30 | 30 | 0 | landing-structure, landing-animates, no-runtime-errors |
| landing-page-morph | nemotron-nano-12b-vl | #3 | 62 | 62 | 0 | landing-animates |
| landing-page-morph | nemotron-nano-12b-vl | #4 | 62 | 62 | 0 | landing-animates, no-runtime-errors |
| mini-platformer | nemotron-nano-12b-vl | #0 | 30 | 30 | 0 | platformer-jump, platformer-move, no-runtime-errors |
| mini-platformer | nemotron-nano-12b-vl | #1 | 30 | 30 | 0 | platformer-jump, platformer-move |
| mini-platformer | nemotron-nano-12b-vl | #2 | 11 | 11 | 0 | platformer-jump, platformer-move |
| mini-platformer | nemotron-nano-12b-vl | #3 | 30 | 30 | 0 | platformer-jump, platformer-move, no-runtime-errors |
| mini-platformer | nemotron-nano-12b-vl | #4 | 30 | 30 | 0 | platformer-jump, platformer-move |
| n-body-field | gemini-3.6-flash | #0 | 68 | 68 | 0 | nbody-animates |
| n-body-field | gemini-3.6-flash | #2 | 68 | 68 | 0 | nbody-animates |
| n-body-field | gemini-3.6-flash | #3 | 68 | 68 | 0 | nbody-animates |
| n-body-field | gemini-3.6-flash | #4 | 68 | 68 | 0 | nbody-animates |
| n-body-field | nemotron-nano-12b-vl | #0 | 30 | 30 | 0 | nbody-renders, nbody-animates, no-runtime-errors |
| n-body-field | nemotron-nano-12b-vl | #1 | 30 | 30 | 0 | nbody-renders, nbody-animates, no-runtime-errors |
| n-body-field | nemotron-nano-12b-vl | #2 | 30 | 30 | 0 | nbody-renders, nbody-animates, no-runtime-errors |
| n-body-field | nemotron-nano-12b-vl | #3 | 30 | 30 | 0 | nbody-renders, nbody-animates, no-runtime-errors |
| n-body-field | nemotron-nano-12b-vl | #4 | 30 | 30 | 0 | nbody-renders, nbody-animates |
| physics-pendulum-wave | nemotron-nano-12b-vl | #0 | 30 | 30 | 0 | (unnamed — page load failed) |
| physics-pendulum-wave | nemotron-nano-12b-vl | #1 | 68 | 68 | 0 | pendulum-animates, no-runtime-errors |
| physics-pendulum-wave | nemotron-nano-12b-vl | #2 | 30 | 30 | 0 | pendulum-renders, pendulum-animates, no-runtime-errors |
| physics-pendulum-wave | nemotron-nano-12b-vl | #4 | 30 | 30 | 0 | pendulum-renders, pendulum-animates, no-runtime-errors |
| tic-tac-toe | gemini-3.6-flash | #0 | 68 | 68 | 0 | ttt-win-detected |
| tic-tac-toe | gemini-3.6-flash | #1 | 68 | 68 | 0 | ttt-win-detected |
| tic-tac-toe | gemini-3.6-flash | #2 | 68 | 68 | 0 | ttt-win-detected |
| tic-tac-toe | gemini-3.6-flash | #3 | 68 | 68 | 0 | ttt-win-detected |
| tic-tac-toe | gemini-3.6-flash | #4 | 68 | 68 | 0 | ttt-win-detected |
| tic-tac-toe | nemotron-nano-12b-vl | #0 | 30 | 30 | 0 | ttt-grid-interacts, ttt-win-detected, no-runtime-errors |
| tic-tac-toe | nemotron-nano-12b-vl | #1 | 68 | 68 | 0 | ttt-win-detected |
| tic-tac-toe | nemotron-nano-12b-vl | #2 | 100 | 100 | 0 | no-runtime-errors |
| tic-tac-toe | nemotron-nano-12b-vl | #3 | 68 | 68 | 0 | ttt-win-detected |
| tic-tac-toe | nemotron-nano-12b-vl | #4 | 30 | 30 | 0 | ttt-grid-interacts, ttt-win-detected, no-runtime-errors |

Corpus verdict tallies were also identical: 38 still-broken, 0 now-passing,
1 changed (the pendulum #0 case, whose page fails to load in BOTH modes and
whose resulting check results carry empty names — a pre-existing reporting
quirk of the page-load-failure path in `runChecks`, not a parity effect).

## What this does and does not establish

- The corpus DOES exercise the prelude's three jobs, counted rather than
  assumed: **32 of 39** cases ship no `<!DOCTYPE>` (parity adds one, so they
  parse in standards mode instead of quirks), **6 of 39** ship no viewport meta
  (parity adds one), and **2 of 39** touch `localStorage`
  (`7a227620b9861c63`, `96564dd0c4bae9e0` — both landing-page-morph). Every one
  of those scored identically in both modes. So this is not a null result for
  lack of exposure.
- It measures the corpus that exists: 39 **failing** artifacts. They fail for
  reasons the prelude does not touch (no listener wired, canvas never redrawn,
  a thrown ReferenceError), and the checks that grade them are coarse enough
  (does the canvas change? did a click do anything?) that a quirks-vs-standards
  layout shift does not move them. **Nothing here says a PASSING artifact would
  be unaffected** — no passing artifact was measured, because the corpus only
  files failures.
- Cost: two full corpus passes, minutes each on an M-series laptop, no API
  spend.

**No recommendation is made here.** The default stays OFF; the data says only
that flipping it would not have moved any score in this corpus.

## Reproducing

```bash
npx tsx scripts/probe-corpus.mjs > /tmp/parity-off.txt
BENCH_PRELUDE_PARITY=1 npx tsx scripts/probe-corpus.mjs > /tmp/parity-on.txt
diff <(sed 's/^ *\[[0-9]*\///' /tmp/parity-off.txt) <(sed 's/^ *\[[0-9]*\///' /tmp/parity-on.txt)
```

Re-run after any change to the checks, the prelude, or the corpus — a delta
that appears later is the finding this page exists to make visible.
