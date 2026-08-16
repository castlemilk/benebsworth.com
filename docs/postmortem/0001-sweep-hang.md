# 0001 — The sweep hang

**Executive summary.** Behavioural scoring lazily launches one shared Playwright
browser and nothing owned closing it, so a sweep wrote every result correctly
and then sat there forever with a drained work queue and a live event loop.
Every long run had to be killed by hand, and "is it working or is it stuck?"
became unanswerable. The sweep script now closes the browser in a `finally` and
hard-exits after the last write.

## Timeline

- **2026-08-09** (`ecd8703`) — the Playwright behavioural scorer lands.
  `getBrowser()` in `scorers/sandbox.ts` launches one browser lazily and caches
  it for the process; `closeSandbox()` exists but no sweep caller invokes it.
- **date unrecovered** — sweeps start hanging after the final `Wrote N results`
  line. The git history records the fix, not the first observation.
- **2026-08-12** (`fb30017`) — `closeSandbox()` added to `run-benchmark.mjs`,
  in the `finally` of `main()`, as a rider on the OpenCode provider commit.
- **2026-08-12** (`ac6aedb`) — written down in the skill's operational gotchas:
  "MUST call `closeSandbox()` before exiting or the process hangs after the
  final write; keep it in any new sweep/reporting script too."
- **2026-08-13** (`abece55`) — the same symptom reappears from a different
  owner: opencode's `bun` server grandchild survives a timeout kill and holds
  the process open. Fixed at the source (detached process group, SIGTERM then
  SIGKILL) *and* backstopped with a hard `process.exit` after `closeSandbox()`.

## Root cause

Node exits when the event loop drains, and a Playwright browser is a live
handle. The scorer acquired that handle lazily, deep inside `runTask`, and the
sweep script's success path simply fell off the end of `main()` — nobody at any
layer owned releasing it. The bug is invisible in a diff because the acquiring
code is correct, the scoring code is correct, and the writing code is correct;
only the *absence* of a release is wrong, and absences do not appear in review.

The 2026-08-13 recurrence proved the class rather than the instance: two
unrelated owners of a live handle (a browser, a detached grandchild process)
produce one indistinguishable symptom — results on disk, process alive. So the
guardrail has to be a terminal guarantee, not a per-owner cleanup.

## Guardrails

- `scripts/run-benchmark.mjs` — `await closeSandbox()` in `main()`'s `finally`,
  so it runs on the failure path too, with the comment naming the mechanism.
- `scripts/run-benchmark.mjs` — `process.exit(process.exitCode ?? 0)` in
  `main().then(...)`. The comment states the guarantee: all work (the
  synchronous `writeResults`, the awaited save-queue flush) is done, so a stray
  escaped child cannot hold the sweep open.
- `lib/lab/llm-benchmark/runners/cli.ts` — CLI children spawn `detached` in
  their own process group; a timeout SIGTERMs the group and SIGKILLs 1s later.
- `lib/lab/llm-benchmark/runners/cli.test.ts` — `'kills the whole process group
  on timeout so CLI server grandchildren cannot leak'` (spawns a parent+child
  that never exit, asserts the grandchild dies).
- `.claude/skills/llm-benchmark/SKILL.md`, "Sweep operations" → **Long sweeps**:
  "The sweep hard-exits after the final write (`closeSandbox()` +
  `process.exit`), so a zombie sweep is a bug, not a feature."
