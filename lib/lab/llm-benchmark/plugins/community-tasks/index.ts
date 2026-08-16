import type { BenchmarkPlugin } from '../registry'
import type { BenchmarkTask } from '../../types'
import { tttGridInteracts, tttWinDetected } from './checks'
import { TicTacToeDemo } from './demo'

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
