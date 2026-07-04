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
- Inline ALL CSS and JavaScript. Nothing may load from the network: no <script src>, no <link href>, no @import, no CDN (React/Tailwind/three.js/fonts/images included). If you need a library, hand-write the code instead.
- Write plain browser JavaScript only. No JSX, no <script type="text/babel">, no Babel standalone, no TypeScript, no build step, no runtime compilation.
- localStorage/sessionStorage/cookies may be unavailable — feature-detect or wrap in try/catch; the page must still work without them.
- No alert/confirm/prompt; render all feedback into the page itself.`

/**
 * Append the sandbox contract to tasks whose output is executed in the demo
 * iframe. Text-output tasks (maths, security analysis) are untouched.
 */
export function withSandboxConstraints(task: BenchmarkTask): BenchmarkTask {
  if (!HTML_CATEGORIES.has(task.category)) return task
  return { ...task, prompt: task.prompt + SANDBOX_CONSTRAINTS }
}
