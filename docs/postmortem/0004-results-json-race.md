# 0004 — The mid-sweep results.json race

**Executive summary.** `writeResults` rebuilt the whole of `results.json` from
`BENCHMARK_RESULTS` — a module-level snapshot taken at process start — so a long
sweep's write silently reverted anything that had touched the file since: a
concurrent sweep, a hand edit, another process's incremental write. It now
re-reads the on-disk file on every write, persists after every completed task,
and merges through `mergeResults`, which refuses to let a 0-success run
overwrite a record that has real artifacts.

## Timeline

- **before 2026-07-19** — `writeResults` filters the imported
  `BENCHMARK_RESULTS` array by the fresh keys and writes the entire file, once,
  at the end of the run.
- **date unrecovered** — good records disappear during the Kimi K3 sweep window
  (10+ minute generations, so the stale window runs to hours). The history
  records the fix, not the discovery.
- **2026-07-19 01:14** (`b124072`) — the fix: "persist results after every
  completed task and re-read the on-disk file before each write (no lost work,
  no clobbering)". `outPath` becomes the single source read back on every write.
- **2026-07-19 16:12** (`e3debcb`) — the second half, from the quota direction:
  `mergeResults()` — "a fresh 0-success result never replaces a baseline record
  that has real artifacts — a quota-killed re-run can't corrupt data", with unit
  tests.
- **2026-08-16** (`e73a97f`) — one deliberate exception to the protection: the
  dropped record's `quotaNextResetAt` is carried onto the kept record.
  Operational metadata about the *account*, never scored fields.

## Root cause

Two writers, one whole-file write, one stale baseline. The script held an
in-memory picture of `results.json` from import time and rewrote the file from
it, so the write was not "apply my results" but "restore my startup view, plus
my results". Anything that changed the file after startup lost, and the window
scaled with the length of the sweep — exactly backwards, since long sweeps are
the ones most likely to overlap with something else.

Two failure shapes share that mechanism. The *race* is external (another
writer), fixed by re-reading. The *clobber* is internal — this run's own
0-success records winning on recency after a quota trip — fixed by making the
merge value-aware: a run that produced no artifacts says nothing about the
model, so it must not replace a run that did.

## Guardrails

- `scripts/run-benchmark.mjs` — `writeResults` calls `readResults()` on **every**
  write, above the comment stating why: "concurrent runs (or a hand edit between
  iterations) aren't clobbered by the stale snapshot this process loaded at
  startup".
- `scripts/run-benchmark.mjs` — `recordingRunner` writes after every completed
  task, bounding both the exposure window and the work lost to a kill.
- `lib/lab/llm-benchmark/results.ts` — `mergeResults()` 0-success protection,
  the `onProtect` hook the sweep logs (`kept existing <model> :: <task>`), and
  `succeededIterations()` for legacy records without `iterationsSucceeded`.
- `lib/lab/llm-benchmark/results.test.ts` — `'keeps a good baseline record when
  the fresh run produced zero successes'`, `'treats legacy records without
  iterationsSucceeded (success = all) as protected'`, `'protects only the
  matching key, merging everything else normally'`, and the quota carry-over
  pair (`'carries the dropped record's quota window onto the record it kept'` /
  `'leaves the kept record alone when the dropped one has no quota window'`).
- `task bench:verify-results` (`lib/lab/llm-benchmark/verify-results.ts`) — runs
  first in the pre-push gate, so a corrupted or thinned `results.json` fails
  before it can be pushed.
- `.claude/skills/llm-benchmark/SKILL.md`, "Sweep operations" → **Never push
  mid-sweep**: the same file, the same window, from the build's side.
