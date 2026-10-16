# 0006 — Python probe shims rejected working modules

**Executive summary.** Astra's Crypto Hash Race artifacts imported
`unittest.mock`, which exposed two scorer shims that changed standard-library
behavior. The import alias hooked optional platform imports, and the network
guard replaced a class with a function. Both failures belonged to the harness.
Separate fixtures now cover those imports and split implementation/test blocks.

## Timeline

- **2026-09-22** (`5be874d`) — sweep `2026-09-22T08-50-23` recorded
  `[30, 26, 30]` for Astra's three Crypto Hash Race generations. All three
  import checks failed with `CREATE_NEW_CONSOLE` errors.
- **2026-09-22** — a small working fixture importing `unittest.mock` reproduced
  the issue. Fixing the alias revealed the socket-class problem underneath.
  Inspecting the remaining failed test check exposed unsupported continuation
  blocks in an HTML artifact whose download joined them into one Python file.

## Root cause

The driver aliases unknown imports to the subject to accommodate generated
module names. It also caught optional standard-library imports such as
`msvcrt`, causing `subprocess` to select its Windows path on macOS. Aliases
now require an explicit subject import and exclude known standard-library names.

The network guard changed `socket.socket` into a function. `ssl` subclasses
that object while loading, so its import then failed. The replacement remains
a class and denies construction; the existing best-effort network boundary
remains in place.

Sibling test snippets now inherit implementation globals, and explicit imports
bind to the selected implementation instead of a failed first-pass alias.

## Guardrails

- `scorers/executable.test.ts` — `leaves optional standard-library imports
  alone when loading unittest.mock` also verifies socket construction is denied.
- The same suite — `executes test snippets that continue the main module in a
  sibling code block` and `binds a separate test module import to the selected
  implementation` cover both supported packaging forms.
- `scripts/rescore-cli-pair.mjs` reuses saved, content-addressed artifacts and
  proves their redacted form matches the original scored copy. `--write` creates
  a separate trace with source-run and scorer-commit provenance, preserving
  generation timestamps, token counts, runtime and the original trace.
- Known limits: Python's network guard is best-effort, and this scorer checks
  functional comparison behavior rather than proving constant-time execution.
  Forensic log redaction may alter credential-like source text; rescoring uses
  the retained original artifact after checking its correspondence to the log.
