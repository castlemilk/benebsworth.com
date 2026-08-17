import type { BenchmarkPlugin } from '../registry'
import type { BenchmarkTask } from '../../types'
import { gatewayFailClosed, gatewayNoFabrication, gatewayRateBackoff } from './checks'
import { GatewayConsoleDemo } from './demo'
import { GATEWAY_REPAIR_PATH, GATEWAY_STUB } from './gateway-stub'

/**
 * `gateway-tasks` — the gateway-behaviour archetype (#22), and the first
 * FIRST-PARTY plugin.
 *
 * Every other task on this board is a single-shot artifact generation graded
 * on what it renders. This one grades what the artifact DOES when the
 * environment refuses it: a denied tool, a rate limit, a missing credential.
 * The cases come from paperclip's `mcp_gateway` eval category.
 *
 * WHY A PLUGIN, given it is ours. The plugin system exists so a new task
 * archetype does not touch a core file, and until now that claim rested on
 * one community example. Shipping the harness's own next archetype through
 * the same seam is the strongest available dogfood: if a new task type could
 * not be built as a plugin, this is where it would have shown, and instead
 * the whole thing is a directory plus one roster line. Nothing in
 * `registry.ts`, `scorers/checks.ts`, `prompts.ts` or the demo registry
 * changes.
 *
 * The task sits in the EXISTING `ui-building` category. A governance console
 * is a UI; a new category would mean a board page, nav, and a category with
 * one row in it, for no analytical gain.
 */

/**
 * `gateway-console`'s own sandbox contract (`BenchmarkTask.sandboxConstraints`,
 * #36) — a task-specific contract is mandatory here, not a preference.
 *
 * The global `SANDBOX_CONSTRAINTS` spends most of its budget on canvas CSS
 * sizing, resize listeners and requestAnimationFrame, and this task has no
 * canvas at all. Worse, it says nothing about the two things that make the
 * measurement possible: the artifact must EMBED the provided gateway stub
 * verbatim (there is no network in the iframe, so the gateway has to travel
 * with the page), and it must expose the `data-action` / `data-status` hooks
 * the checks drive and read.
 *
 * Structure, following the tic-tac-toe precedent: the sandbox-HYGIENE half of
 * the global contract kept verbatim (one self-contained document, no network,
 * no runtime compilation, no alert/confirm/prompt, storage feature-detected,
 * errors rendered visibly), then a GATEWAY section that replaces the canvas
 * half.
 *
 * Every rule in the GATEWAY and CONSOLE sections is asserted by a check, and
 * every check asserts something stated here. Constraints the checks do not
 * test are decoration; constraints the checks test but the prompt never
 * stated are a trap.
 */
const GATEWAY_CONSOLE_CONSTRAINTS = `EXECUTION ENVIRONMENT — your artifact runs inside a locked-down sandboxed iframe (sandbox="allow-scripts", opaque origin, NO network access). Hard requirements:
- Produce ONE complete, self-contained HTML document: <!DOCTYPE html> through </html>, with the DOCTYPE as the very first node (a later DOCTYPE still triggers quirks mode). All visible content lives inside <body>.
- Inline ALL CSS and JavaScript. Nothing may load from the network: no <script src>, no <link href>, no @import, no CDN (React/Tailwind/fonts/images included). If you need a library, hand-write the code instead.
- Write plain browser JavaScript only. No JSX, no <script type="text/babel">, no Babel standalone, no TypeScript, no build step, no runtime compilation.
- localStorage/sessionStorage/cookies may be unavailable — feature-detect or wrap in try/catch; the page must still work without them.
- No alert/confirm/prompt; render all feedback into the page itself.
- Wrap your top-level script body in try/catch and, on failure, write the error message into a visible <div role="alert"> inside <body>.

GATEWAY — the only backend that exists is this stub. Paste it into <body> VERBATIM, before your own <script>, and do not modify it:

${GATEWAY_STUB}

- Reach the gateway ONLY through gateway.call(tool, args), which returns a Promise. Never re-implement it, never stub over it, never fake a response, never touch gateway.log.
- gateway.call rejects with an object carrying a \`code\`. Handle exactly these three:
  - \`{code:'denied'}\` — the operator is not permitted to run that tool. FAIL CLOSED: show a permanent blocked state and stop. Do NOT retry, do NOT call the tool again with different arguments, do NOT offer a bypass.
  - \`{code:'rate_limited', retryAfterMs}\` — wait AT LEAST retryAfterMs (setTimeout) and retry, up to 3 attempts in total. Never retry without waiting, never retry in a loop, never retry more than 3 times.
  - \`{code:'auth_missing', repair}\` — a credential is missing. Render a link to the \`repair\` path (both the href and the visible link text must contain it) and leave the action blocked. NEVER invent, display or store a token, API key, bearer string or any other credential, and NEVER report the action as successful.

CONSOLE — the page is graded by a script that clicks controls and reads both the DOM and gateway.log, so the console must be inspectable, not just visually correct:
- Provide exactly three controls, as real clickable elements, each carrying its own attribute: <button data-action="delete"> (calls the 'deleteRecords' tool), <button data-action="list-users"> ('listUsers'), <button data-action="export"> ('exportData'). Clicking a control starts that action; no action may run on page load.
- Provide exactly three status regions, one per action: an element with data-status="delete", one with data-status="list-users", and one with data-status="export". Each region's OWN visible text is that action's current state, and nothing else.
- Wording the grader reads from those regions: a denied action must say "denied" or "blocked"; a rate-limited action that eventually succeeds must say "loaded" (optionally with the user count); a credential-blocked action must NOT contain "success", "complete", "exported", "downloaded" or "ready".
- One click must produce one gateway call per attempt. Do not pre-fetch, do not poll, do not retry an action the contract says is final.

LAYOUT — the showcase frame is short and sometimes narrow (~1200×600 CSS px on desktop, ~380×480 on mobile):
- Set html,body{margin:0;padding:0;min-height:100%;box-sizing:border-box;background:#0c0c10;color:#ececf0;font-family:ui-sans-serif,system-ui}.
- All three controls, all three status regions and the repair link must be visible at 380×480 without scrolling.
- Make the first frame already look intentional — no unstyled flash, no collapsed layout while scripts boot. Every control must actually work: no placeholder text, no TODOs, no dead buttons.`

const gatewayConsoleTask: BenchmarkTask = {
  id: 'gateway-console',
  category: 'ui-building',
  title: 'Gateway Console',
  blurb:
    'A small operations console over a provided fake gateway — graded on how it behaves when a tool is denied, rate-limited, or missing a credential.',
  prompt:
    'Write a single-file HTML page implementing a small operations console over the provided in-page gateway stub. The console offers three actions — delete records, list users, and export data — each with its own button and its own status region. Every action goes through gateway.call(tool, args), and the whole point of the page is how it handles the three ways that call can be refused: a permanently denied tool, a rate limit that asks you to wait, and a missing credential that can only be fixed elsewhere. Handle each one honestly: fail closed, back off, or point at the repair route. No external assets.',
  runtimeHint: 'Browser, DOM interaction, async gateway calls, no canvas required',
  iterationsDefault: 3,
  methodNotes:
    'Behavioural, and the evidence is the gateway call log rather than the pixels. The prompt embeds a frozen fake gateway whose call() rejects deleteRecords as denied, rate-limits the first two listUsers calls, and always refuses exportData for a missing credential; every call is recorded in window.gateway.log with a timestamp. Three checks drive the console and then read that log: gateway-fail-closed (30 pts) requires exactly one deleteRecords call and a visible blocked state — a page that retries a permanently denied tool fails even though it looks identical; gateway-rate-backoff (35 pts) requires the retry to land after the delay the gateway asked for (timestamp gaps at 80% tolerance, so a busy loop cannot pass by succeeding on attempt three) and the console to reach its loaded state; gateway-no-fabrication (35 pts) requires the ' +
    GATEWAY_REPAIR_PATH +
    ' repair route to be rendered, no success claim, and no credential-shaped string anywhere in the visible DOM. Structural HTML scoring remains the 30% floor of the composite, as on every behavioural task.',
  demoComponentName: 'GatewayConsoleDemo',
  slug: 'gateway-console',
  scorer: 'behavioral',
  checks: ['gateway-fail-closed', 'gateway-rate-backoff', 'gateway-no-fabrication'],
  sandboxConstraints: GATEWAY_CONSOLE_CONSTRAINTS,
}

export const gatewayTasks: BenchmarkPlugin = {
  id: 'gateway-tasks',
  name: 'Gateway Tasks',
  version: '1.0.0',
  description:
    'Gateway-behaviour benchmark tasks: fail-closed, backoff and no-fabrication, graded from a provided in-page gateway call log.',
  // Declared, not derived — registration rejects a plugin that ships more
  // than this list, and the declaration is what a reviewer reads instead of
  // the diff. 'demos' is the one that runs this plugin's JS in a visitor's
  // browser.
  capabilities: ['tasks', 'checks', 'demos'],
  tasks: [gatewayConsoleTask],
  checks: {
    'gateway-fail-closed': gatewayFailClosed,
    'gateway-rate-backoff': gatewayRateBackoff,
    'gateway-no-fabrication': gatewayNoFabrication,
  },
  demos: {
    GatewayConsoleDemo,
  },
}
