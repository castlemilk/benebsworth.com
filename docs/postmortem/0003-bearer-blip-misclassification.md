# 0003 — The bearer-blip misclassification

**Executive summary.** opencode's free tier intermittently rejects concurrent
sessions with `invalid_bearer_credential`. The harness read the wording — a
credential error — as non-transient, which breaks the iteration loop rather than
retrying, so the first parallel sweep after CLI concurrency was enabled died on
a key that was in fact working. It is now classified transient (retried, bounded
by `maxRetries`) and surfaced as `rate_limited`, on the strength of a measured
distribution rather than the message text.

## Timeline

- **2026-08-12** (`fb30017`) — opencode provider lands. CLI providers hand off
  through a shared artifact filename, so sweeps run at `RUN_CONCURRENCY=1` and
  the failure never appears.
- **2026-08-13** (`5bcaf6c`) — CLI file-handoff made parallel-safe (unique
  `artifact-<model>-<task>-<n>.html` per iteration), unlocking concurrency 2-3
  to cut slow CLI sweeps ~3×. Sweeps immediately start failing with
  `Error: Upstream request failed: [invalid_bearer_credential] Missing or
  invalid bearer credential`.
- **2026-08-13** — measured rather than argued: **0 occurrences across 5
  sequential sweeps, present in every parallel batch**, with the same key.
- **2026-08-13** (`5bcaf6c`, same commit) — classified transient in
  `isTransientError` and mapped to `rate_limited` in `classifyFailureReason`,
  with the verification counts written into the comment and two regression
  tests.

## Root cause

The message names a credential; the condition is concurrency. `isTransientError`
matched on network-shaped substrings and HTTP status markers, and this error
carried neither — so it fell through to `false`, and `generateOne` treats
non-transient as fatal for the iteration loop. That default is the expensive
one: a mislabelled transient costs the whole sweep, while a mislabelled fatal
costs at most `maxRetries` extra attempts.

The deeper error was classifying on what the string appeared to *mean* rather
than on how the failure was *distributed*. The distinguishing rule, now in the
code, was available on day one: a genuinely revoked key fails identically on
**every** attempt, so retrying it is bounded and harmless; an intermittent
failure correlated with parallelism is a pool blip, not a credential state.

The fix is split across two functions with two jobs — retry policy
(`isTransientError`) and operator-facing labelling (`classifyFailureReason`,
which must not let the UI imply a revoked key) — and the mapping sits *above*
the 401/403 branch so the generic auth rule cannot claim it.

## Guardrails

- `lib/lab/llm-benchmark/runners/provider.ts` — `isTransientError` returns true
  for `invalid_bearer_credential`, above a comment carrying the verification
  story (dated counts, sequential vs parallel) and the revoked-key argument.
  Keep the counts in the comment: they are the evidence, and without them the
  next reader sees only an unexplained special case.
- `lib/lab/llm-benchmark/runners/provider.ts` — `classifyFailureReason` maps it
  to `rate_limited`, ordered before the `401/403 → auth_error` branch.
- `lib/lab/llm-benchmark/runners/provider.test.ts`, describe `'opencode
  free-tier bearer blip classification'`:
  - `'classifies invalid_bearer_credential as transient, not auth_error'`
  - `'keeps it out of the quota classification (no circuit breaker trip)'` —
    a quota classification would trip the model circuit breaker and skip every
    remaining job for that model, which is the worse failure.
