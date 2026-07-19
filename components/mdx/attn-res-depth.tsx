'use client'

/**
 * AttnResDepth — the mental-model figure for the Attention Residuals
 * section of the Kimi K3 architecture post.
 *
 * A vertical stack of 6 transformer blocks, block n at the top (the one
 * doing the reading). A segmented control switches between two ways
 * block n can inherit what came before:
 *
 *   • plain residual — one thick straight edge from block n−1 up to n.
 *     The block inherits only what the previous block handed over;
 *     everything older arrives pre-mixed inside that single vector.
 *   • attention residuals (mental model) — curved edges from block n
 *     back to blocks n−1…n−5, stroke width ∝ α (a fixed illustrative
 *     set, [0.42, 0.27, 0.16, 0.10, 0.05]). A readout row lists the
 *     mix as percentages.
 *
 * The caption states the accuracy contract plainly: the K3 blog says
 * AttnRes "selectively retrieves representations across depth rather
 * than accumulating them uniformly"; the α mechanics here are our
 * illustration of that sentence, pending the technical report.
 *
 * Pure presentational SVG (no rAF, no animation library). Theme tokens
 * throughout, legible light/dark, scales to container width.
 */

import { useState } from 'react'

// Fixed illustrative α set — NOT K3's learned weights.
const ALPHAS = [0.42, 0.27, 0.16, 0.1, 0.05]

// SVG geometry
const W = 640
const H = 600
const BLOCK_W = 240
const BLOCK_H = 58
const BLOCK_X = 280 // stack sits right of centre so the curves can bow left
const TOP = 24
const GAP = 40
const blockY = (i: number) => TOP + i * (BLOCK_H + GAP) // i = 0 → block n (top)
const CX = BLOCK_X + BLOCK_W / 2

const strokeFor = (a: number) => 1.5 + a * 19 // stroke width ∝ α

const MINUS = '−'
const blockName = (i: number) => (i === 0 ? 'block n' : `block n${MINUS}${i}`)

type Mode = 'plain' | 'attnres'

export function AttnResDepth() {
  const [mode, setMode] = useState<Mode>('attnres')

  return (
    <figure className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-4 py-3 sm:px-5">
        <div className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          residual connections · depth stack
        </div>
        <div
          role="group"
          aria-label="Residual mode"
          className="inline-flex rounded-lg border border-[var(--color-border)] bg-surface p-0.5"
        >
          {(
            [
              { id: 'plain', label: 'plain residual' },
              { id: 'attnres', label: 'attention residuals', hint: 'mental model' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-md px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-wider transition-colors ${
                mode === m.id
                  ? 'bg-[color-mix(in_srgb,var(--color-blog)_16%,transparent)] text-blog'
                  : 'text-muted hover:text-fg'
              }`}
            >
              {m.label}
              {'hint' in m && m.hint && (
                <span className="ml-1 hidden normal-case opacity-60 sm:inline">({m.hint})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          style={{ maxWidth: 560, margin: '0 auto' }}
          role="img"
          aria-label={
            mode === 'plain'
              ? 'Six stacked transformer blocks, block n at the top. A single thick straight edge runs from block n−1 up to block n: the block inherits only what the previous block handed over.'
              : 'Six stacked transformer blocks, block n at the top. Five curved edges run from block n back to blocks n−1 through n−5, with stroke widths proportional to the illustrative weights 42, 27, 16, 10 and 5 percent: the block reads a weighted mix of earlier blocks’ outputs.'
          }
        >
          {/* edges (drawn first, so the blocks sit on top of the anchors) */}
          {mode === 'plain' ? (
            <g className="attnres-edges-plain" strokeLinecap="round">
              <line
                x1={CX}
                y1={blockY(1)}
                x2={CX}
                y2={blockY(0) + BLOCK_H + 2}
                stroke="var(--color-fg)"
                strokeWidth={8}
                strokeOpacity={0.75}
              />
              <polygon
                points={`${CX},${blockY(0) + BLOCK_H - 8} ${CX - 7},${blockY(0) + BLOCK_H + 6} ${CX + 7},${blockY(0) + BLOCK_H + 6}`}
                fill="var(--color-fg)"
                fillOpacity={0.75}
              />
            </g>
          ) : (
            <g className="attnres-edges-curved" fill="none" strokeLinecap="round">
              {ALPHAS.map((a, k) => {
                const i = k + 1 // source block index (1 → block n−1, …, 5 → block n−5)
                const ys = blockY(i) + BLOCK_H / 2
                const yd = 30 + k * 11 // arrival point fanned down block n's left edge
                return (
                  <g key={`edge-${i}`}>
                    <path
                      className="attnres-edge"
                      data-alpha={a}
                      d={`M ${BLOCK_X} ${ys} C ${BLOCK_X - 92} ${ys}, ${BLOCK_X - 92} ${yd}, ${BLOCK_X} ${yd}`}
                      stroke="var(--color-blog)"
                      strokeWidth={strokeFor(a)}
                      strokeOpacity={0.85}
                    />
                    <polygon
                      points={`${BLOCK_X + 9},${yd} ${BLOCK_X - 3},${yd - 4.5} ${BLOCK_X - 3},${yd + 4.5}`}
                      fill="var(--color-blog)"
                      fillOpacity={0.85}
                    />
                  </g>
                )
              })}
            </g>
          )}

          {/* the six blocks */}
          {Array.from({ length: 6 }, (_, i) => {
            const y = blockY(i)
            const isReader = i === 0
            // In plain mode the older blocks fade: block n can't reach them directly.
            const dimmed = mode === 'plain' && i > 1
            return (
              <g key={`block-${i}`} className="attnres-block" opacity={dimmed ? 0.4 : 1}>
                <rect
                  x={BLOCK_X}
                  y={y}
                  width={BLOCK_W}
                  height={BLOCK_H}
                  rx={10}
                  fill={
                    isReader
                      ? 'color-mix(in srgb, var(--color-blog) 14%, transparent)'
                      : 'color-mix(in srgb, var(--color-fg) 6%, transparent)'
                  }
                  stroke={isReader ? 'var(--color-blog)' : 'var(--color-border)'}
                  strokeWidth={isReader ? 1.6 : 1.2}
                />
                <text
                  x={CX}
                  y={y + (isReader ? 25 : 34)}
                  textAnchor="middle"
                  className="font-mono fill-fg"
                  style={{ fontSize: 13, fontWeight: 700 }}
                >
                  {blockName(i)}
                </text>
                {isReader && (
                  <text
                    x={CX}
                    y={y + 43}
                    textAnchor="middle"
                    className="font-mono fill-blog"
                    style={{ fontSize: 9.5 }}
                  >
                    the reader
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* the mix readout */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--color-border)] px-4 py-3 sm:px-5">
        <span className="font-mono text-[0.66rem] uppercase tracking-wider text-muted">
          block n reads
        </span>
        {mode === 'plain' ? (
          <>
            <span className="flex items-center gap-2 font-mono text-[0.72rem] text-fg">
              <span
                className="inline-block h-1.5 rounded"
                style={{ width: 34, background: 'var(--color-fg)', opacity: 0.75 }}
              />
              n{MINUS}1 · 100%
            </span>
            <span className="font-mono text-[0.66rem] text-muted">
              everything older arrives pre-mixed inside that one vector
            </span>
          </>
        ) : (
          <>
            {ALPHAS.map((a, k) => (
              <span key={`mix-${k}`} className="flex items-center gap-2 font-mono text-[0.72rem] text-fg">
                <span
                  className="inline-block h-1.5 rounded"
                  style={{ width: Math.max(4, a * 70), background: 'var(--color-blog)', opacity: 0.85 }}
                />
                n{MINUS}{k + 1} · {Math.round(a * 100)}%
              </span>
            ))}
            <span className="font-mono text-[0.66rem] text-muted">illustrative α, sums to 1</span>
          </>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-4 py-2.5 sm:px-5">
        <p className="font-mono text-[0.64rem] leading-snug text-muted">
          The K3 blog says AttnRes “selectively retrieves representations across depth rather than
          accumulating them uniformly”. The α weights shown here are our illustration of that idea,
          not K3’s learned values; the mechanism detail arrives with the technical report.
        </p>
      </div>
    </figure>
  )
}
