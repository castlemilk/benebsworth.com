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
- No alert/confirm/prompt; render all feedback into the page itself.

QUALITY BAR — the artifact is showcased head-to-head against other frontier models:
- Fill the viewport; default to a polished dark theme with a small overlay containing the title and any controls (sliders, buttons, stats).
- The showcase frame is short and sometimes narrow — roughly 1200×600 CSS px on desktop and 380×480 on mobile. Keep HUD overlays compact (they must not cover the scene on small screens), and compose the scene so the critical action is visible at those sizes from the first frame.
- Animate with requestAnimationFrame (cancel on unload); size canvases for devicePixelRatio and re-layout on window resize.
- Include a viewport meta tag and make the layout work at 380px wide without horizontal scrolling.
- Every control must actually work. No placeholder text, no TODOs, no dead buttons, no lorem ipsum.
- Make the first frame already look intentional — no unstyled white flash, no collapsed layout while scripts boot.`

/**
 * Append the sandbox contract to tasks whose output is executed in the demo
 * iframe. Text-output tasks (maths, security analysis) are untouched.
 */
export function withSandboxConstraints(task: BenchmarkTask): BenchmarkTask {
  if (!HTML_CATEGORIES.has(task.category)) return task
  return { ...task, prompt: task.prompt + SANDBOX_CONSTRAINTS }
}
