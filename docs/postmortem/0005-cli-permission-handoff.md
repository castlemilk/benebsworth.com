# 0005 — CLI permission prompts became benchmark artifacts

**Executive summary.** The first Devin wrapper auto-approved edits but not
commands. A Python task stopped at an approval prompt, exited successfully,
and the shared stdout fallback treated its commentary as an artifact. A live
command-and-file preflight and required file handoff now catch this class.

## Timeline

- **2026-09-22** (`5be874d`) — the initial wrapper and sweep used
  `--permission-mode accept-edits`. HTML and equation smoke tests passed;
  Crypto Hash Race returned commentary in all three attempts.
- **2026-09-22** — a minimal command-and-HTML probe reproduced the failure.
  Devin 3000.11.1's bundled permissions documentation explained the two
  boundaries: Accept Edits prompts for commands; Sandbox/Autonomous prompts
  for direct write/edit tools, which run outside its OS sandbox.

## Root cause

The unit test verified argv, and the live smoke verified a generated page.
Neither required the agent to execute a command before delivering a file.
The CLI could return exit code zero after a tool approval was declined in
print mode. Its commentary exceeded the harness's 40-character minimum,
so stdout fallback gave it a structural score and a successful-run status.

Simply adding `--sandbox` is insufficient: it selects Autonomous mode, whose
direct file tools still require interactive approval. The wrapper now asks
for artifact creation through sandboxed `exec`, keeping command writes
bounded to the iteration workspace. No user permission configuration changes.

## Guardrails

- `runners/devin.ts` — pins sandboxed Autonomous mode and describes the
  supported file delivery path; requires an actual file artifact.
- `runners/cli.test.ts` — `rejects commentary-only stdout when file delivery
  is required` prevents a successful process exit from masquerading as output.
- `runners/agent-cli.test.ts` — `runs the exact SWE-2 variant noninteractively
  and keeps prompt as one argument` pins model, sandbox, delivery and timeout.
- `task bench:devin-preflight` / `scripts/probe-devin.mjs` — one live call
  checks a command-created marker and the delivered HTML. It writes no scores.
- Known gap: other CLI wrappers retain stdout fallback for compatibility.
  Model-specific tool permissions still need live verification; unit tests
  cannot emulate a vendor CLI's approval behavior.

The initial Devin sweep is diagnostic, excluded from the published comparison.
The corrected wrapper is evaluated with fresh attempts rather than rescoring
commentary or repairing generated outputs.
