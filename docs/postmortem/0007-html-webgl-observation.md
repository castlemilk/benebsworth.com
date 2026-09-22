# 0007 — Valid HTML and visible WebGL frames disappeared in the harness

**Executive summary.** Astra's N-body artifacts rendered correctly when opened
directly, but the published preview showed a snippet and the animation check
reported no motion. HTML cleanup discarded the document head, and canvas
capture read a WebGL buffer after presentation had cleared it. Both were
harness failures; retained artifacts can be rescored without another generation.

## Timeline

- **2026-09-22** (`5be874d`) — sweep `2026-09-22T08-50-23` recorded
  `[54, 54, 54]` for Astra's three N-body generations.
- **2026-09-22** — browser review exposed the missing document shell. A
  minimal complete document reproduced the cleanup issue, and an animated
  WebGL fixture reproduced the blank-frame capture. Corrected offline checks
  returned `[97, 97, 97]` on the same three retained files.

## Root cause

Cleanup looked for code-looking lines even when the input was already a full
HTML file. A doctype and opening HTML element on the same line could cause
the following canvas line to become the start of the cleaned output. Complete
documents now bypass prose and Markdown extraction.

`canvas.toDataURL()` reads the drawing buffer. WebGL's default
`preserveDrawingBuffer: false` allows that buffer to clear after presentation,
so two samples could be identical blank images while the browser visibly
animated. Canvas checks now capture the displayed element with Playwright.

## Guardrails

- `runners/provider.test.ts` — `preserves a document whose doctype and html
  element share a line` covers normalization of a complete file.
- `scorers/canvas-capture.test.ts` — `observes WebGL animation without
  requiring preserveDrawingBuffer` exercises a real Chromium WebGL context.
- `task bench:visual-games-fixtures` runs that regression alongside the new
  lighthouse and racer interaction fixtures.
- `scripts/rescore-cli-pair.mjs` verifies retained file hashes and compares
  their redacted bytes to the original response before applying current
  normalization. Corrected traces preserve generation evidence and identify
  the source run and scorer commit.
- Known limit: a changing screenshot proves visible motion, not correct
  physics or genuine three-dimensional geometry.
