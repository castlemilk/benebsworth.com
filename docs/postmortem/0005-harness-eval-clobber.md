# 0005 — The prebuild that wiped harness-eval history

**Executive summary.** `scripts/gen-harness-eval.mjs` rebuilt
`lib/lab/harness-eval/results.json` from whatever it found in
`~/.omega/reports/` — and the script runs in `prebuild`, on every machine
that builds the site. On a machine with no reports (a fresh clone, a new
laptop), the script wrote `{"timestamp": …, "models": []}` over the
committed 1.3 MB of accumulated eval history. The empty file then rode
along in an unrelated commit. Generation is now a MERGE through
`lib/lab/harness-eval/merge.mjs`, with a shrink guard and a write-only-on-
change rule; deliberate resets require `BENCH_RESET_HARNESS=1`.

## Timeline

- **2026-07-22** (`dd11291`) — the generator lands, whole-file write. The
  only machine building the site is the one with `~/.omega/reports`, so the
  clobber is invisible.
- **2026-08-09** (`99a9e19`) — the script is wired into `prebuild`
  (`npm run build` → `node scripts/gen-harness-eval.mjs`). From here any
  build on any machine regenerates the file.
- **2026-08-26 23:15** — a build on a machine whose `~/.omega/reports` is
  empty writes the 61-byte `{"models": []}` into the working tree. The
  timestamp in that file is the build's, not a human's. The tree stays dirty
  with the loss sitting in it.
- **2026-08-27** (`4b6dea6`, force-replaced by `b868700`) — the empty file
  is committed as collateral in an unrelated TanStack Table commit and
  pushed. Caught in review of the *next* step; history intact in git
  (`112fec7`), restored by checkout. Guardrails land in the same session.

## Root cause

One writer, one whole-file write, and a source of truth that lives outside
the repo. The script's model was "regenerate derived artifacts from
`~/.omega/reports/`", which is correct for `registry.ts` (a true derivative)
and wrong for `results.json` (accumulated output: the reports dir is a
cache of *some* runs, not a census of *all* runs). The two files share a
generator and an AUTO-GENERATED header, so the wrong ownership model for one
bled into the other.

The `output: 'export'` build then made the loss loud at exactly the wrong
time: empty `HARNESS_SUITES` → `generateStaticParams()` returns `[]` → the
build fails. Data loss discovered by a build failure is data loss
discovered late — the working tree had sat dirty with the empty file for a
day.

Same family as 0004: a whole-file write destroying accumulated results
(there, a stale in-memory baseline; here, an absent source dir). The lesson
both times is that `results.json` files are journals, and journals need
merge semantics at every writer — runner, generator, whatever comes next.

## Guardrails

- `lib/lab/harness-eval/merge.mjs` — `mergeModelSummaries()`: models absent
  from fresh reports are kept; tasks merge by `(suite, task id)`; a fresh
  result replaces a same-key baseline result; aggregates recomputed from the
  merged list. Output is a superset of the baseline by construction.
- `scripts/gen-harness-eval.mjs` — the shrink guard: if the merged set has
  fewer models or task results than the on-disk baseline, the script exits 1
  instead of writing (a merge bug, not a data state). `BENCH_RESET_HARNESS=1`
  is the only path to a deliberate reset.
- `scripts/gen-harness-eval.mjs` — write-only-on-change: a no-reports
  machine produces byte-identical output and does not rewrite the file. A
  timestamp-only rewrite dirtied the tree on every build, which is how the
  clobber masqueraded as routine prebuild churn.
- `lib/lab/harness-eval/merge.test.ts` — the empty-fresh regression
  (`'keeps baseline models absent from the fresh reports untouched'`), the
  re-run-updates-same-task case, the suite-scoped task key, and the
  never-shrinks invariant the guard asserts.
- `lib/lab/harness-eval/results.ts` — the loader header states the file is
  ACCUMULATED history with merge-only writes, so the ownership model is
  written where the next reader will find it.

**Still unguarded:** `~/.omega/reports` itself is a cache nothing backs up;
a run whose report never lands there never enters results.json at all.
Accepted for now — reports are re-derivable only at API cost, same as the
history they feed.
