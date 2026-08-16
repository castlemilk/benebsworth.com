import type { BenchmarkPlugin } from '../registry'
import type { BenchmarkTask } from '../../types'
import { tttGridInteracts, tttWinDetected } from './checks'
import { TicTacToeDemo } from './demo'

/**
 * Tic-tac-toe's own sandbox contract (worked example of
 * `BenchmarkTask.sandboxConstraints`). It REPLACES the global
 * `SANDBOX_CONSTRAINTS`, which is written for canvas/animation tasks: the
 * global contract spends most of its budget on canvas CSS sizing, resize
 * listeners and requestAnimationFrame, none of which a DOM board needs, and
 * says nothing about the two things this task's checks actually assert —
 * that a click marks a cell whose own text content is the mark, and that a
 * three-in-a-row announces a winner in visible page text
 * (`checks.ts:tttGridInteracts` / `tttWinDetected`).
 *
 * What is kept from the global contract is the part that is about the
 * sandbox rather than about canvases: one self-contained document, no
 * network, no runtime compilation, no alert/confirm/prompt, storage
 * feature-detected, errors rendered visibly.
 */
const TIC_TAC_TOE_CONSTRAINTS = `EXECUTION ENVIRONMENT — your artifact runs inside a locked-down sandboxed iframe (sandbox="allow-scripts", opaque origin, NO network access). Hard requirements:
- Produce ONE complete, self-contained HTML document: <!DOCTYPE html> through </html>, with the DOCTYPE as the very first node (a later DOCTYPE still triggers quirks mode). All visible content lives inside <body>.
- Inline ALL CSS and JavaScript. Nothing may load from the network: no <script src>, no <link href>, no @import, no CDN (React/Tailwind/fonts/images included). If you need a library, hand-write the code instead.
- Write plain browser JavaScript only. No JSX, no <script type="text/babel">, no Babel standalone, no TypeScript, no build step, no runtime compilation.
- localStorage/sessionStorage/cookies may be unavailable — feature-detect or wrap in try/catch; the page must still work without them.
- No alert/confirm/prompt; render all feedback into the page itself.
- Wrap your top-level script body in try/catch and, on failure, write the error message into a visible <div role="alert"> inside <body>.

BOARD — the page is graded by a script that clicks cells and reads the DOM, so the board must be inspectable, not just visually correct:
- Render exactly nine cell elements, in row-major order, as real clickable elements (<button>, <td> or an element with role="button"). Nine cells and nothing else that looks like one — put any other controls outside the grid.
- A cell's mark must be that cell's OWN text content: the single character "X" or "O", nothing else. No background images, no sprites, no SVG-only marks, no extra whitespace or labels inside the cell.
- Every cell starts empty. Do not pre-fill, hint, or preview moves inside cells.
- Clicking an empty cell marks it immediately and passes the turn; clicking an occupied cell does nothing. X moves first.
- When a player completes a row, column or diagonal, announce it in visible page text containing the winner and the word "wins" (e.g. "X wins"). A draw must be announced too. After a result, further cell clicks are ignored until restart.
- Provide a restart control outside the nine cells that clears the board back to its starting state.

LAYOUT — the showcase frame is short and sometimes narrow (~1200×600 CSS px on desktop, ~380×480 on mobile):
- Set html,body{margin:0;padding:0;min-height:100%;box-sizing:border-box;background:#0c0c10;color:#ececf0;font-family:ui-sans-serif,system-ui} and centre the board.
- The whole board, the turn indicator, the announcement and the restart control must be visible at 380×480 without scrolling. Size the grid in relative units, not fixed pixels.
- Make the first frame already look intentional — no unstyled flash, no collapsed layout while scripts boot. Every control must actually work: no placeholder text, no TODOs, no dead buttons.`

const ticTacToeTask: BenchmarkTask = {
  id: 'tic-tac-toe',
  category: 'advanced-game-building',
  title: 'Tic-Tac-Toe',
  blurb: 'A two-player hotseat tic-tac-toe that tracks turns, declares winners, and can be restarted.',
  prompt:
    'Write a single-file HTML page implementing two-player hotseat tic-tac-toe. Players alternate X and O; after every move the page updates the board, tracks whose turn it is, detects three-in-a-row (including diagonals) and shows a winner announcement, and offers a restart button. No external assets.',
  runtimeHint: 'Browser, DOM interaction, no canvas required',
  iterationsDefault: 3,
  methodNotes:
    'Scores by interaction (cells respond to clicks with a mark), state tracking (turns alternate), and win detection (three-in-a-row announces a winner).',
  demoComponentName: 'TicTacToeDemo',
  slug: 'tic-tac-toe',
  scorer: 'behavioral',
  checks: ['ttt-grid-interacts', 'ttt-win-detected'],
  sandboxConstraints: TIC_TAC_TOE_CONSTRAINTS,
}

/**
 * Example plugin demonstrating every extension point: a task with its own
 * behavioral checks, a demo component, and a task-page card.
 */
export const communityTasks: BenchmarkPlugin = {
  id: 'community-tasks',
  name: 'Community Tasks',
  version: '1.0.0',
  description:
    'Community-contributed benchmark tasks with their own behavioral checks and demos.',
  tasks: [ticTacToeTask],
  checks: {
    'ttt-grid-interacts': tttGridInteracts,
    'ttt-win-detected': tttWinDetected,
  },
  demos: {
    TicTacToeDemo,
  },
}
