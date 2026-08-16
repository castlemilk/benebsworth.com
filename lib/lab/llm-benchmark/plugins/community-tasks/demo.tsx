'use client'

import { useState } from 'react'

/**
 * Hotseat tic-tac-toe demo for the community-tasks plugin. Mirrors the
 * artifact contract the task prompt asks models to produce: X and O
 * alternate, three-in-a-row announces a winner, restart clears the board.
 */
type Cell = 'X' | 'O' | null

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

function winnerOf(board: Cell[]): Cell | null {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  }
  return null
}

export function TicTacToeDemo({ className = '' }: { className?: string }) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null))
  const [turn, setTurn] = useState<'X' | 'O'>('X')
  const winner = winnerOf(board)
  const draw = !winner && board.every(Boolean)

  const play = (i: number) => {
    if (board[i] || winner) return
    const next = [...board]
    next[i] = turn
    setBoard(next)
    setTurn(turn === 'X' ? 'O' : 'X')
  }

  const restart = () => {
    setBoard(Array(9).fill(null))
    setTurn('X')
  }

  return (
    <div
      className={`flex min-h-[16rem] flex-col items-center justify-center gap-4 rounded-2xl bg-[var(--color-stage)] p-6 ${className}`}
      data-plugin-demo="tic-tac-toe"
    >
      <div className="text-sm text-[var(--color-muted)]">
        {winner ? (
          <span className="font-semibold text-[var(--color-fg)]">{winner} wins!</span>
        ) : draw ? (
          <span>Draw</span>
        ) : (
          <span>
            {turn}&apos;s turn
          </span>
        )}
      </div>
      <div
        className="grid grid-cols-3 gap-1"
        role="grid"
        aria-label="Tic-tac-toe board"
      >
        {board.map((cell, i) => (
          <button
            key={i}
            data-cell={String(i)}
            onClick={() => play(i)}
            aria-label={cell ? `${cell} at cell ${i}` : `cell ${i}`}
            className="flex h-14 w-14 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xl font-semibold transition-colors hover:bg-[var(--color-surface-2)]"
          >
            {cell ?? ''}
          </button>
        ))}
      </div>
      <button
        onClick={restart}
        className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1 text-xs text-[var(--color-muted)] transition-colors hover:text-[var(--color-fg)]"
      >
        Restart
      </button>
    </div>
  )
}
