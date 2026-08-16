import type { CheckContext, CheckFn } from '../../scorers/sandbox'

/**
 * Behavioral checks for the tic-tac-toe task (plugin example).
 *
 * The page is a two-player HOTSEAT game, so the check can play BOTH sides
 * deterministically — unlike a one-player game it never has to wait on or
 * outsmart the model's AI. Cells are located generically (data-cell /
 * button / td / role=button) so any reasonable implementation passes the
 * locator step; the behavioral claims are about RESPONSE (a click marks a
 * cell) and WIN DETECTION (three-in-a-row announces a winner).
 *
 * These checks are DOM-based rather than canvas-pixel-based because a
 * tic-tac-toe page need not use a canvas; the composite scorer weighs the
 * behavioral component exactly like the built-in tasks.
 */

const MAX_POINTS = { interacts: 35, win: 30 }

async function cellLocator(ctx: CheckContext): Promise<string[] | null> {
  return ctx.page.evaluate(() => {
    const cells = Array.from(
      document.querySelectorAll(
        '[data-cell], button, td, [role="button"], .cell, .square'
      )
    ) as HTMLElement[]
    // Only elements that look like board cells: non-empty clickable nodes.
    const candidates = cells.filter(
      (el) => !(el instanceof HTMLButtonElement) || el.textContent?.trim() === '' || el.getAttribute('aria-label') !== null
    )
    if (candidates.length < 9) return null
    // Prefer the first 9 distinct elements (the board), not nav buttons.
    return candidates.slice(0, 9).map((el, i) => {
      if (!el.dataset.cell) el.dataset.cell = String(i)
      return el.dataset.cell
    })
  })
}

/** Click the cell with the given data-cell index and let the page settle. */
async function clickCell(ctx: CheckContext, index: number): Promise<void> {
  await ctx.page.evaluate((idx) => {
    const el = document.querySelector<HTMLElement>(`[data-cell="${idx}"]`)
    if (!el) return
    el.click()
  }, index)
  await ctx.page.waitForTimeout(120)
}

/** Read the current board marks in data-cell order. */
async function readBoard(ctx: CheckContext): Promise<(string | null)[]> {
  return ctx.page.evaluate(() => {
    return Array.from(document.querySelectorAll<HTMLElement>('[data-cell]'))
      .slice(0, 9)
      .map((el) => {
        const t = el.textContent?.trim() ?? ''
        return t === '' ? null : t
      })
  })
}

/**
 * ttt-grid-interacts: the board has 9 clickable cells, a click marks a
 * cell, and the turn advances (the next click marks a different symbol).
 */
export const tttGridInteracts: CheckFn = async (ctx: CheckContext) => {
  const loc = await cellLocator(ctx)
  if (!loc) {
    return {
      name: 'ttt-grid-interacts',
      passed: false,
      points: 0,
      maxPoints: MAX_POINTS.interacts,
      detail: 'no 9-cell board found',
    }
  }
  const before = await readBoard(ctx)
  if (before.some((c) => c !== null)) {
    return {
      name: 'ttt-grid-interacts',
      passed: false,
      points: 0,
      maxPoints: MAX_POINTS.interacts,
      detail: 'board not empty at start',
    }
  }
  await clickCell(ctx, 0)
  const afterOne = await readBoard(ctx)
  if (!afterOne[0] || afterOne[0] === '') {
    return {
      name: 'ttt-grid-interacts',
      passed: false,
      points: 0,
      maxPoints: MAX_POINTS.interacts,
      detail: 'cell 0 not marked after click',
    }
  }
  await clickCell(ctx, 1)
  const afterTwo = await readBoard(ctx)
  const secondMark = afterTwo[1]
  const alternates = Boolean(secondMark) && secondMark !== afterOne[0]
  return {
    name: 'ttt-grid-interacts',
    passed: alternates,
    points: alternates ? MAX_POINTS.interacts : 0,
    maxPoints: MAX_POINTS.interacts,
    detail: alternates
      ? `cells marked ${afterOne[0]} then ${secondMark} (turn alternates)`
      : `turn did not alternate: cell1=${secondMark ?? 'empty'} after cell0=${afterOne[0]}`,
  }
}

/**
 * ttt-win-detected: play a forced diagonal win for X (hotseat: the check
 * plays both sides) and require the page to announce a winner in the DOM.
 */
export const tttWinDetected: CheckFn = async (ctx: CheckContext) => {
  const loc = await cellLocator(ctx)
  if (!loc) {
    return {
      name: 'ttt-win-detected',
      passed: false,
      points: 0,
      maxPoints: MAX_POINTS.win,
      detail: 'no 9-cell board found',
    }
  }
  // X plays 0,3,6 (first column); O answers 1,4 — after X's third move X
  // has three-in-a-row. Hotseat means we click both players' turns.
  for (const cell of [0, 1, 3, 4, 6]) await clickCell(ctx, cell)
  const board = await readBoard(ctx)
  const winAnnounced = await ctx.page.evaluate(() => {
    const text = document.body.innerText ?? ''
    return /(x|o).*(wins|won|winner)|winner.*(x|o)|player \d (wins|won)/i.test(text)
  })
  const xColumn = [board[0], board[3], board[6]].every((c) => c === 'X')
  const passed = winAnnounced && xColumn
  return {
    name: 'ttt-win-detected',
    passed,
    points: passed ? MAX_POINTS.win : 0,
    maxPoints: MAX_POINTS.win,
    detail: passed
      ? 'X won the first column and the page announced a winner'
      : `board=[${board.join(',')}] winAnnounced=${winAnnounced}`,
  }
}
