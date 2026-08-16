import type { BenchmarkTask } from './types'

/** Task categories whose artifacts are rendered live in the demo sandbox. */
const HTML_CATEGORIES = new Set([
  '3d-physics-animation',
  'advanced-game-building',
  'advanced-physics',
  'advanced-electronics',
  'ui-building',
])

/**
 * The demo renders artifacts inside `<iframe srcDoc sandbox="allow-scripts">`
 * under a strict CSP: opaque origin, zero network access, no runtime
 * compilers. Models that reach for a CDN <script>, Babel-in-the-browser JSX,
 * or bare component snippets produce artifacts the sandbox can't run — the
 * post-processing pipeline patches some of that up (dependency inlining,
 * esbuild JSX pre-compilation), but the reliable fix is telling the model the
 * execution environment up front.
 */
export const SANDBOX_CONSTRAINTS = `

EXECUTION ENVIRONMENT — your artifact runs inside a locked-down sandboxed iframe (sandbox="allow-scripts", opaque origin, NO network access). Hard requirements:
- Produce ONE complete, self-contained HTML document: <!DOCTYPE html> through </html>.
- Use this exact skeleton: <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>...</title><style>...</style></head><body>...</body></html>. The DOCTYPE must be the very first node — a DOCTYPE after any other content still triggers quirks mode, and the canvas/CSS sizing comes out wrong. All visible content must live inside <body>, never as bare siblings of <html>.
- Inline ALL CSS and JavaScript. Nothing may load from the network: no <script src>, no <link href>, no @import, no CDN (React/Tailwind/three.js/fonts/images included). If you need a library, hand-write the code instead.
- Write plain browser JavaScript only. No JSX, no <script type="text/babel">, no Babel standalone, no TypeScript, no build step, no runtime compilation.
- localStorage/sessionStorage/cookies may be unavailable — feature-detect or wrap in try/catch; the page must still work without them.
- No alert/confirm/prompt; render all feedback into the page itself.
- Wrap your top-level script body in try/catch and, on failure, write the error message into a visible <div role="alert"> inside <body>. The sandbox auto-injects an error overlay, but a model that catches its own errors and renders them gives a much better demo than one that crashes silently.

LAYOUT — the showcase frame is short and sometimes narrow (~1200×600 CSS px on desktop, ~380×480 on mobile). Fill it; don't sit in the corner:
- Set html,body{margin:0;padding:0;min-height:100%;box-sizing:border-box;background:#0c0c10;color:#ececf0;font-family:ui-sans-serif,system-ui} so the page fills the frame and inherits a dark backdrop.
- Size any <canvas> with CSS — width:100%;height:100% or width:100vw;height:100vh — NOT with the canvas.width/canvas.height attributes, which set the bitmap (not the displayed size) and leave the canvas stuck at its initial size inside the larger frame.
- Add a window 'resize' listener that recomputes the canvas backing store from window.innerWidth/innerHeight × devicePixelRatio and redraws the scene. A canvas that doesn't resize on viewport change is the single most common rendering bug in this benchmark.
- Animate with requestAnimationFrame; cancel on window 'unload' to avoid leaks across navigations.

QUALITY BAR — the artifact is showcased head-to-head against other frontier models:
- Fill the viewport; default to a polished dark theme with a small overlay containing the title and any controls (sliders, buttons, stats).
- The showcase frame is short and sometimes narrow — roughly 1200×600 CSS px on desktop and 380×480 on mobile. Keep HUD overlays compact (they must not cover the scene on small screens), and compose the scene so the critical action is visible at those sizes from the first frame.
- Every control must actually work. No placeholder text, no TODOs, no dead buttons, no lorem ipsum.
- Make the first frame already look intentional — no unstyled white flash, no collapsed layout while scripts boot.`

/**
 * The exact text `withSandboxConstraints` appends to this task's prompt —
 * `''` when nothing is appended. Three states, mirroring `task.scorer`
 * (#10): **explicit beats the category heuristic**.
 *
 * | `task.sandboxConstraints` | Applied |
 * | --- | --- |
 * | `undefined` | the global `SANDBOX_CONSTRAINTS`, iff the category is HTML-runnable |
 * | `''` | nothing, even for an HTML-runnable category |
 * | non-empty | that text, whatever the category |
 *
 * A custom contract is separated from the prompt by a blank line, the same
 * way the global constant leads with `\n\n`.
 *
 * Exported so the task page can render the applied contract from the real
 * source rather than a copy of the text
 * (`components/lab/llm-benchmark/sandbox-contract.tsx`).
 */
export function appliedSandboxConstraints(task: BenchmarkTask): string {
  const custom = task.sandboxConstraints
  if (custom !== undefined) {
    const trimmed = custom.trim()
    return trimmed === '' ? '' : `\n\n${trimmed}`
  }
  return HTML_CATEGORIES.has(task.category) ? SANDBOX_CONSTRAINTS : ''
}

/**
 * Append the sandbox contract to tasks whose output is executed in the demo
 * iframe, honouring a per-task override (see `appliedSandboxConstraints`).
 * Text-output tasks (maths, security analysis) are untouched by default.
 *
 * The amended prompt is what the model receives, what `hashPrompt` records
 * as `promptHash`, and what keys the response cache — so editing a task's
 * constraints re-runs it instead of replaying a stale response.
 */
export function withSandboxConstraints(task: BenchmarkTask): BenchmarkTask {
  const constraints = appliedSandboxConstraints(task)
  if (constraints === '') return task
  return { ...task, prompt: task.prompt + constraints }
}
