'use client'

/**
 * PositionalEncoder — "knowing order without reading in order".
 *
 * Attention is permutation-blind: shuffle the tokens and the maths is identical.
 * So we stamp each position with a fingerprint and ADD it to the embedding. Two views:
 *   • sinusoidal — the classic heatmap. Each position (row) gets a unique pattern of
 *     fast-and-slow sine/cosine waves across the dimensions (columns). Drag the position
 *     slider; nearby rows look alike, far rows look different.
 *   • RoPE — instead of adding, rotate each pair of dimensions by an angle ∝ position.
 *     The angle *between* two tokens then depends only on how far apart they are, which is
 *     why rotary models stretch to longer contexts than they were trained on.
 *
 * Static render + CSS transitions; the only animation is the RoPE ghost-arrow pulse.
 */

import { useState } from 'react'

const D = 16 // dimensions shown
const P = 32 // positions shown
const HM_X = 70
const HM_Y = 40
const CW = 26
const CH = 7.5

function peValue(pos: number, dim: number): number {
  const pair = Math.floor(dim / 2)
  const freq = 1 / Math.pow(10000, (2 * pair) / D)
  return dim % 2 === 0 ? Math.sin(pos * freq) : Math.cos(pos * freq)
}

function cellFill(v: number): string {
  const m = Math.round(Math.abs(v) * 100)
  return v >= 0
    ? `color-mix(in srgb, var(--color-blog) ${m}%, transparent)`
    : `color-mix(in srgb, #d98b5f ${m}%, transparent)`
}

export function PositionalEncoder() {
  const [mode, setMode] = useState<'sinusoidal' | 'rope'>('sinusoidal')
  const [pos, setPos] = useState(8)
  const accent = 'var(--color-blog)'

  // RoPE clocks: three dimension-pairs rotating at decreasing frequencies
  const ropeFreqs = [0.55, 0.16, 0.045]
  const offset = 5 // a token 5 positions later

  return (
    <figure className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          positional encoding
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-surface p-0.5">
          {(['sinusoidal', 'rope'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-md px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-wider transition-colors ${
                mode === m ? 'bg-blog/15 text-blog ring-1 ring-blog/40' : 'text-muted hover:text-fg'
              }`}
            >
              {m === 'rope' ? 'RoPE' : 'sinusoidal'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        {mode === 'sinusoidal' ? (
          <svg viewBox="0 0 500 330" className="block h-auto w-full" style={{ maxWidth: 560, margin: '0 auto' }} role="img" aria-label="Sinusoidal positional-encoding heatmap: positions on the vertical axis, dimensions on the horizontal.">
            <text x={HM_X} y={20} className="font-mono" style={{ fontSize: 10.5, fill: 'var(--color-muted)' }}>
              dimension →
            </text>
            <text x={20} y={HM_Y + (P * CH) / 2} className="font-mono" transform={`rotate(-90, 20, ${HM_Y + (P * CH) / 2})`} textAnchor="middle" style={{ fontSize: 10.5, fill: 'var(--color-muted)' }}>
              position ↓
            </text>

            {/* heatmap cells */}
            {Array.from({ length: P }).map((_, r) =>
              Array.from({ length: D }).map((__, c) => (
                <rect
                  key={`hm-${r}-${c}`}
                  x={HM_X + c * CW}
                  y={HM_Y + r * CH}
                  width={CW - 1}
                  height={CH - 0.5}
                  fill={cellFill(peValue(r, c))}
                  opacity={r === pos ? 1 : 0.5}
                  style={{ transition: 'opacity 160ms ease' }}
                />
              )),
            )}

            {/* selected position row outline */}
            <rect x={HM_X - 1} y={HM_Y + pos * CH - 0.5} width={D * CW + 1} height={CH + 1} fill="none" stroke={accent} strokeWidth={1.6} />
            <text x={HM_X - 8} y={HM_Y + pos * CH + CH} textAnchor="end" className="font-mono" style={{ fontSize: 10, fill: accent, fontWeight: 700 }}>
              {pos}
            </text>

            {/* the selected fingerprint, enlarged */}
            <text x={HM_X} y={HM_Y + P * CH + 30} className="font-mono" style={{ fontSize: 11, fill: 'var(--color-fg)' }}>
              fingerprint of position {pos}:
            </text>
            {Array.from({ length: D }).map((_, c) => (
              <rect
                key={`fp-${c}`}
                x={HM_X + c * CW}
                y={HM_Y + P * CH + 40}
                width={CW - 1}
                height={20}
                rx={2}
                fill={cellFill(peValue(pos, c))}
                stroke="color-mix(in srgb, var(--color-border) 60%, transparent)"
                strokeWidth={0.5}
              />
            ))}
          </svg>
        ) : (
          <svg viewBox="0 0 500 280" className="block h-auto w-full" style={{ maxWidth: 560, margin: '0 auto' }} role="img" aria-label="RoPE view: three dimension-pairs rotating by an angle proportional to position.">
            {ropeFreqs.map((f, k) => {
              const ccx = 110 + k * 150
              const ccy = 130
              const R = 56
              const a = pos * f
              const a2 = (pos + offset) * f
              const ax = ccx + R * Math.cos(-a)
              const ay = ccy + R * Math.sin(-a)
              const a2x = ccx + R * Math.cos(-a2)
              const a2y = ccy + R * Math.sin(-a2)
              return (
                <g key={`clk-${k}`}>
                  <circle cx={ccx} cy={ccy} r={R} fill="none" stroke="color-mix(in srgb, var(--color-border) 80%, transparent)" strokeWidth={1} />
                  {/* ghost: a token `offset` positions later */}
                  <line x1={ccx} y1={ccy} x2={a2x} y2={a2y} stroke="var(--color-muted)" strokeWidth={2} opacity={0.55} strokeDasharray="4 4" />
                  {/* this token */}
                  <line x1={ccx} y1={ccy} x2={ax} y2={ay} stroke={accent} strokeWidth={2.6} />
                  <circle cx={ccx} cy={ccy} r={2.5} fill="var(--color-fg)" />
                  <text x={ccx} y={ccy + R + 24} textAnchor="middle" className="font-mono" style={{ fontSize: 10.5, fill: 'var(--color-fg)' }}>
                    pair {k + 1}
                  </text>
                  <text x={ccx} y={ccy + R + 38} textAnchor="middle" className="font-mono" style={{ fontSize: 9, fill: 'var(--color-muted)' }}>
                    {f >= 0.5 ? 'fast' : f >= 0.15 ? 'medium' : 'slow'}
                  </text>
                </g>
              )
            })}
            <text x={250} y={30} textAnchor="middle" className="font-mono" style={{ fontSize: 10.5, fill: 'var(--color-muted)' }}>
              <tspan fill={accent}>token at position {pos}</tspan> · <tspan>ghost = token {offset} steps later</tspan>
            </text>
          </svg>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex items-center gap-4">
          <label htmlFor="pe-pos" className="font-mono text-[0.7rem] uppercase tracking-wider text-muted whitespace-nowrap">
            position
          </label>
          <input id="pe-pos" type="range" min={0} max={P - 1} step={1} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]" />
          <span className="w-16 text-right font-mono text-[0.78rem] tabular-nums text-fg">pos {pos}</span>
        </div>
        <p className="mt-2 font-mono text-[0.66rem] leading-snug text-muted">
          {mode === 'sinusoidal'
            ? 'Every position gets a unique stripe of fast-and-slow waves. Slide the position and watch the fingerprint shift — neighbours look alike, distant positions look different, so the model can read order back out of the sum.'
            : 'Each pair of dimensions is a little clock turning faster or slower with position. Slide it: both arrows turn, but the angle between this token and the ghost stays fixed for each clock. Relative position is all RoPE encodes — so it copes with sentences longer than any it trained on.'}
        </p>
      </div>
    </figure>
  )
}
