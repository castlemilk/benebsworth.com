# Executable scoring: measured impact on the stored records

**What this is.** #15 replaced the structural-only `text` scorer on
`crypto-hash-race` and `equation-solver` with the composite `executable`
scorer, which EXTRACTS the model's program and RUNS it (70% executed / 30%
structural). This page measures what that does to the numbers already on the
board.

**THE BOARD IS UNCHANGED.** Nothing here was written back to `results.json`.
Every published row for both tasks was scored STRUCTURALLY, in the text era,
and none was rescored; the executable scorer applies from the NEXT sweep
onward. Both tasks' `methodNotes` in `registry.ts` say exactly that and point
here, so a reader of a task page cannot mistake a text-era score for an
executed one.
Re-scoring published records is a maintainer decision with its own cost (the
stored `output` is ONE iteration; the published score is the mean of five), and
this measurement exists so that decision can be made from numbers rather than
from a hunch.

**Why a bespoke script and not the existing tools.**
`scripts/verify-results.mjs`' `stale-prompt` check covers a PROMPT change and
has no equivalent for a SCORER change; scorer versioning was explicitly out of
scope for #15. `scripts/probe-corpus.mjs` only knows the failure corpus, whose
39 cases are all behaviourally-scored HTML tasks — zero executable-task cases,
so it has nothing to say here. (It CAN now probe one if a sweep ever files one:
it branches on `scorer.scoreWithBreakdown` rather than on scorer identity, so
an executable case reports its real failed checks instead of an empty list and
a false `now-passing`.) `scripts/rescore-artifact.mjs` does exactly the right
thing but needs a sweep run log, and only the most recent models have one (it
was run as a smoke: `nemotron-nano-12b-vl / crypto-hash-race` reports
`DRIFT: recorded 100 (iteration) vs current 58`, which agrees with the table
below). The full-coverage instrument is
`npx tsx scripts/measure-executable-impact.mjs [--task <id>] [--json]`, which
reads the published `output` field of every stored record.

## Reproduce

```bash
npx tsx scripts/measure-executable-impact.mjs             # both tasks
npx tsx scripts/measure-executable-impact.mjs --json      # machine-readable
```

Needs `python3` on PATH (`BENCH_PYTHON` overrides). ~13s for all 56 records.

## Headline finding

**Seven of the 27 executable crypto-hash-race artifacts (26%) call a standard
library module they never imported.** `hashlib`, `base64`, `secrets` and `os`
all appear; every one is a `NameError` on the FIRST call to the hashing
function, in code that reads perfectly and scored 82–96 structurally:

| model | recorded | executed reason |
| --- | --- | --- |
| kimi-k2.7 | 96.4 | `hash_password raised NameError: name 'hashlib' is not defined` |
| gemini-3.6-flash | 92.8 | `hash_password raised NameError: name 'hashlib' is not defined` |
| codex-gpt-5.5 | 90 | `hash_password raised NameError: name 'base64' is not defined` |
| gemma-4-26b | 89.2 | `hash_password raised NameError: name 'secrets' is not defined` |
| gemma-4-31b | 88 | `hash_password raised NameError: name 'hashlib' is not defined` |
| north-mini-code | 88 | `generate_password_hash raised NameError: name 'os' is not defined` |
| nemotron-nano-9b | 76 | `pbkdf2_hash raised NameError: name 'os' is not defined` |

Two more never parse at all: `gpt-oss-20b` has a French phrase
(`particulière du`) spliced into the middle of a function body at line 66, and
`nemotron-3-nano-30b` leaves a call unclosed at line 61 —
`self.assertFalse(verify_password(stored, "wrong horse")`. Both scored 89–94
structurally. This is precisely the class of failure #15 exists to catch: **the
structural scorer cannot distinguish a working module from a plausible one,
and 33% of this task's board is not working.**

At the other end, seven artifacts pass all five executed checks
(`nemotron-3-super`, `laguna-s-2.1`, `laguna-xs-2.1`, `nemotron-3-ultra`,
`gemini-3.6-flash-agy`, `gemini-3.5-flash-agy`, `codex-gpt-5.6-terra`) — the
scorer is not simply harsher, it REORDERS. `codex-gpt-5.6-terra` was the
LOWEST-scoring non-zero crypto record (80.4) and is a perfect 100 when run;
`kimi-k2.7` was near the top (96.4) and lands at 58.

## crypto-hash-race — 28 records

`executed` is executed points / 100. `origin` is where in the artifact the
program was found. Sorted by delta.

| model | recorded | executable | delta | executed | origin | failing checks |
| --- | --- | --- | --- | --- | --- | --- |
| gpt-oss-20b | 94 | 28 | -66 | 0/100 | python/bare | module-executes + all |
| nemotron-3-nano-30b | 89.2 | 30 | -59.2 | 0/100 | python/bare | module-executes + all |
| gemma-4-31b | 88 | 40 | -48 | 20/100 | python/bare | compare, salt, verify, tests |
| gemma-4-26b | 89.2 | 44 | -45.2 | 20/100 | python/bare | compare, salt, verify, tests |
| kimi-k2.7 | 96.4 | 58 | -38.4 | 40/100 | python/bare | salt, verify, tests |
| gemini-3.6-flash | 92.8 | 58 | -34.8 | 40/100 | python/bare | salt, verify, tests |
| codex-gpt-5.5 | 90 | 58 | -32 | 40/100 | python/bare | salt, verify, tests |
| north-mini-code | 88 | 58 | -30 | 40/100 | python/bare | salt, verify, tests |
| nemotron-nano-12b-vl | 82 | 58 | -24 | 40/100 | python/bare | compare, verify, tests |
| nemotron-nano-9b | 76 | 53 | -23 | 40/100 | python/bare | salt, verify, tests |
| gemini-2.5-pro | 87 | 74 | -13 | 65/100 | python/bare | compare, tests |
| claude-opus-4-6-thinking-agy | 100 | 90 | -10 | 85/100 | python/pre-code | tests |
| claude-4 | 89 | 81 | -8 | 85/100 | python/bare | tests |
| nemotron-3-nano-omni | 94 | 86 | -8 | 80/100 | python/bare | compare |
| ling-3.0-tiny | 95.5 | 90 | -5.5 | 85/100 | python/bare | tests |
| codex-gpt-5.6-luna | 95.2 | 90 | -5.2 | 85/100 | python/script-tag | tests |
| codex-gpt-5.6-sol | 94 | 90 | -4 | 85/100 | python/script-tag | tests |
| laguna-xs-2.1 | 100 | 100 | 0 | 100/100 | python/bare | — |
| kimi-k3 | 86.8 | 88 | +1.2 | 85/100 | python/bare | tests |
| gpt-5 | 82 | 84 | +2 | 85/100 | python/bare | tests |
| nemotron-3-super | 97.6 | 100 | +2.4 | 100/100 | python/bare | — |
| laguna-s-2.1 | 96.4 | 100 | +3.6 | 100/100 | python/bare | — |
| nemotron-3-ultra | 96 | 100 | +4 | 100/100 | python/bare | — |
| gemini-3.6-flash-agy | 96 | 100 | +4 | 100/100 | python/script-tag | — |
| deepseek-v4-flash-free | 84.4 | 90 | +5.6 | 85/100 | python/pre-code | tests |
| gemini-3.5-flash-agy | 90 | 100 | +10 | 100/100 | python/bare | — |
| codex-gpt-5.6-terra | 80.4 | 96 | +15.6 | 100/100 | python/pre-code | — |
| gpt-oss-120b-agy | 0 | 20 | +20 | — | — | codeFallback (extraction-failed) |

Mean recorded 87.5 → mean executable 73.7. 27 executed, 1 codeFallback
(`gpt-oss-120b-agy`, whose record is a 135-byte quota error, not an answer —
its +20 is the structural floor the text scorer gives any non-empty string,
and it is the one row in this table whose delta says nothing about the model).

Failure taxonomy across the 27 executed artifacts (47 failing checks total):
`not-found` 19, `runtime-error` 19, `wrong-output` 9. Per check:

| check | budget | fails | dominant reason |
| --- | --- | --- | --- |
| module-executes | 20 | 2 | `runtime-error` (SyntaxError, both) |
| constant-time-compare | 20 | 7 | `not-found` 4 (comparison is inlined into verify, never exposed), `runtime-error` 3 |
| salted-hash-random | 20 | 9 | `runtime-error` 9 (7 of them the missing-import NameError above) |
| verify-round-trip | 25 | 10 | `not-found` 7 (no hash to verify — the hash call already failed), `runtime-error` 3 |
| unit-tests-pass | 15 | 19 | `wrong-output` 9 (tests ran and failed), `not-found` 8 (no TestCase at all), `runtime-error` 2 |

## equation-solver — 28 records, ALL codeFallback

Every stored equation-solver answer is prose. Not one model emitted a program:
no fenced block, no `<script>`, no `<pre><code>`. So the executable scorer
falls back to the structural score on all 28, and **on every one of those 28
artifacts it returns exactly what the old `text` scorer returns** — verified
directly (29 of 29 codeFallback rows across both tasks match the old scorer to
the point, 0 mismatches), which is what the fallback path is supposed to
guarantee.

The delta column is therefore NOT a scorer effect for this task; it is caveat
(1) below in isolation. The recorded means run 0–16 points below a fresh score
of the single stored artifact (mean recorded 87.2 vs 91.4), because the board
number is a mean over five iterations and this is one of them. Read the
equation-solver rows as a calibration of how much iteration variance the delta
column carries generally — the crypto table's deltas contain the same noise on
top of the real scorer change.

That is a real result, not a gap: the task prompt ("Solve the system … and
justify the algebraic steps") asks for a derivation, and models answer with
one. The probe is live and will grade the first model that answers with code —
tested against fixtures in `executable.test.ts` (a program printing all four
pairs scores ≥80; one printing `(2,5),(5,2),(-2,-5),(-5,-2)` scores below 50
with `wrong-output`).

## Caveats a reader must apply to the delta column

1. **Mean vs single artifact.** `recorded` is the mean over 5 iterations;
   `executable` re-scores the ONE artifact stored in the record's `output`.
   Some of every delta is iteration variance, not scorer change. (For
   `gemini-3.6-flash` the recorded per-iteration scores were 88/88/100/88/100 —
   a ±12 spread on its own.)
2. **Six records are seeded, not live.** `claude-4`, `gpt-5` and
   `gemini-2.5-pro` on both tasks carry `source: 'seeded'` — hand-written mock
   data from before the harness ran real sweeps. Their deltas measure a
   fixture, not a model.
3. **`constant-time-compare` requires a discoverable function.** Four modules
   call `hmac.compare_digest` inline inside `verify` and expose no comparison
   function of their own. The prompt says the module must *provide* constant-
   time string comparison, so failing them is deliberate — but it is a
   judgement call about the prompt, and it is the one check most likely to be
   argued with.
4. **The driver discovers functions by name shape and arity.** It tries both
   argument orders for verify and splats a tuple-shaped hash across a
   multi-parameter verify (that fix alone took `laguna-xs-2.1` from 83 to 100).
   A module with a genuinely unguessable API would read as `not-found`, which
   the breakdown states rather than hides.

## If the maintainer decides to re-score

There is no scorer-version field on a record and #15 did not add one. The
honest sequence would be: re-run the two tasks (fresh artifacts, fresh
iterations, new `promptBundle` unchanged) rather than re-scoring stored
`output` fields — because the stored field is one iteration and the published
score is a mean, so a re-score in place would silently change what the number
MEANS as well as its value.
