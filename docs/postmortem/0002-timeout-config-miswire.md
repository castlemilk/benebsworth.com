# 0002 — The timeout-config miswire

**Executive summary.** `RUN_TIMEOUT_MS` set the runner's outer per-call cap but
was forwarded to each CLI provider's *inner* timer one provider at a time, so a
sweep that asked for 25 minutes had its child killed at `cli.ts`'s 10-minute
default and recorded slow-but-working models as timeouts. It was fixed once, for
opencode only, on 2026-08-12 — and the class survived in agy and codex for four
more days until the effective-config dump made the promise legible and a
final-review pass checked it against delivery. This is the incident that argues
for the dump.

## Timeline

- **2026-07-19** (`e3debcb`) — `RUN_TIMEOUT_MS` introduced for slow
  thinking-model generations. It feeds the runner's outer `withTimeout` only;
  CLI providers do not exist yet.
- **2026-08-12** (`fb30017`) — the opencode CLI provider lands with an empty
  `CliRunnerConfig`, so `cli.ts` applies `config.timeoutMs ?? 10*60*1000`.
- **2026-08-12** (`9566605`) — **first fix.** "The runner-level `timeoutMs` was
  never passed to the OpenCode provider's `CliRunnerConfig`, so opencode calls
  hit the cli.ts default 600s cap and landing-page iterations burned 3×10min
  retry attempts before failing." Only the `opencode:` line changes; `agy: {}`
  and `codex: {}` are left untouched.
- **2026-08-16** (`fe95b14`) — sweep profiles + `--dump-config`. The dump prints
  `timeoutMs` with its value, formatted duration and provenance; the
  `slow-model` profile advertises a 25-minute cap.
- **2026-08-16** (`bdd8d49`, finding **I2**) — **second fix.** The adversarial
  final review compares what the dump promised against what the child got: agy
  and codex still received `{}`, "so the slow-model profile promised (and
  dumped) 25 minutes while the child was killed at 10." All three providers now
  take the sweep's `timeoutMs`.

## Root cause

Two timers share one name. The outer one lives in `provider.ts`'s `withTimeout`
and reads `config.timeoutMs` directly. The inner one lives in `runCli` and reads
the *provider's own* `CliRunnerConfig`, defaulting independently to ten minutes.
Forwarding between them is a per-provider literal in the config object
(`agy:`, `codex:`, `opencode:`), which makes correctness an **opt-in with a
silent default**: every new CLI provider re-introduces the bug by simply not
mentioning it, and the failure mode is a `cli_timeout` record that looks exactly
like a genuinely slow model.

The first fix repaired the *instance*, not the shape: the config object still
listed three providers, two still empty. And the class stayed invisible from
outside for as long as the effective timeout was never printed — the log showed
the number the operator asked for, not the number the child was killed at. The
dump made the promise inspectable, which is what turned a silent miswire into a
checkable claim.

## Guardrails

- `scripts/run-benchmark.mjs` — `agy`, `codex` and `opencode` each get
  `TIMEOUT_MS ? { timeoutMs: TIMEOUT_MS } : {}`, above a comment that names the
  inner/outer split and the 10-minute default it defeats. Read that comment
  before adding a fourth CLI provider.
- `scripts/run-benchmark.mjs` — the `--dump-config` table's `timeoutMs` row
  prints value, human duration and source, so "why did it die at 10 minutes?" is
  answerable from the run's own header rather than from memory.
- `lib/lab/llm-benchmark/sweep-profiles.test.ts` — timeout provenance across the
  precedence chain (`{ value: 10*MINUTE, source: 'profile:smoke' }`,
  `{ value: 900000, source: 'env' }`, `{ value: undefined, source: 'default' }`).
- **Known gap.** No test asserts the *forwarding itself* — that a resolved
  `timeoutMs` reaches each CLI provider's `CliRunnerConfig`. The provenance
  tests cover resolution, not delivery, which is precisely the seam this
  incident lives in. A fourth CLI provider added with `{}` would still ship.
