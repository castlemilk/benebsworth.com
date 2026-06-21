'use client'

/**
 * KvQuantDial — an explainer for TurboQuant-style KV-cache quantisation.
 *
 * The KV cache is normally stored in fp16 (16 bits per number). Quantisation
 * keeps every token but stores each number in fewer bits by snapping it to one
 * of 2^bits evenly-spaced levels across a small group's range. This widget
 * shows a single 16-value group:
 *
 *   • a "bits" selector (16 / 8 / 4) draws the quantisation grid and snaps each
 *     value to its nearest level, drawing the residual error as a red stub;
 *   • a "rotate" toggle applies a fixed orthogonal (sign-mixing) rotation that
 *     spreads a lone outlier across the group, shrinking the range so the same
 *     number of levels lands far closer to every value — the core TurboQuant
 *     trick that makes 4-bit essentially lossless.
 *
 * Read-outs: bits/element (incl. the per-group scale overhead at group_size 32),
 * the resulting memory ratio, and the mean absolute reconstruction error.
 *
 * Self-contained SVG, theme-token styled, light/dark, mobile-responsive,
 * honours prefers-reduced-motion (transitions collapse to none globally).
 */

import { useId, useMemo, useState } from 'react'

const GREEN = '#34d399' // software-desk accent
const AMBER = '#f5a623'
const RED = '#f87171'

// A deterministic 16-value group with one dominant outlier (index 6). These
// stand in for the per-group key/value activations the cache stores.
const BASE: number[] = [
  0.18, -0.22, 0.31, -0.12, 0.08, 0.27, 0.96, -0.19, 0.14, -0.07, 0.21, -0.28,
  0.11, 0.05, -0.16, 0.24,
]

// A fixed 16×16 orthogonal sign-mixing rotation (normalised Hadamard rows).
// Applying it spreads the outlier's energy across the group without changing
// the vector's length — exactly what a random orthogonal rotation does before
// uniform quantisation.
function hadamard16(): number[][] {
  // Build H_16 by Sylvester's construction, then normalise rows to unit length.
  let H = [[1]]
  while (H.length < 16) {
    const n = H.length
    const next: number[][] = Array.from({ length: 2 * n }, () => Array(2 * n).fill(0))
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        next[i][j] = H[i][j]
        next[i][j + n] = H[i][j]
        next[i + n][j] = H[i][j]
        next[i + n][j + n] = -H[i][j]
      }
    H = next
  }
  const inv = 1 / Math.sqrt(16)
  return H.map((row) => row.map((v) => v * inv))
}

function rotate(vec: number[], R: number[][]): number[] {
  return R.map((row) => row.reduce((s, r, j) => s + r * vec[j], 0))
}

type QuantResult = {
  values: number[]
  quant: number[]
  levels: number[]
  lo: number
  hi: number
  meanErr: number
  maxErr: number
}

function quantise(values: number[], bits: number): QuantResult {
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  if (bits >= 16) {
    return { values, quant: [...values], levels: [], lo, hi, meanErr: 0, maxErr: 0 }
  }
  const n = (1 << bits) - 1 // 2^bits levels => n steps
  const step = span / n
  const levels = Array.from({ length: n + 1 }, (_, i) => lo + i * step)
  const quant = values.map((v) => {
    const idx = Math.round((v - lo) / step)
    return lo + idx * step
  })
  const errs = values.map((v, i) => Math.abs(v - quant[i]))
  const meanErr = errs.reduce((a, b) => a + b, 0) / errs.length
  const maxErr = Math.max(...errs)
  return { values, quant, levels, lo, hi, meanErr, maxErr }
}

export function KvQuantDial() {
  const uid = useId().replace(/[:]/g, '')
  const [bits, setBits] = useState(4)
  const [rotated, setRotated] = useState(false)

  const R = useMemo(() => hadamard16(), [])
  const display = useMemo(
    () => (rotated ? rotate(BASE, R) : BASE),
    [rotated, R],
  )
  const q = useMemo(() => quantise(display, bits), [display, bits])

  // memory accounting at group_size 32: each group stores one fp16 scale +
  // one fp16 zero-point shared across 32 values => 32/32 = 1 extra bit/value
  // for the (scale, zero) pair amortised. fp16 baseline = 16 bits/value.
  const overheadBits = 32 / 32 // 32 bits (scale+zero) over 32 values = 1 bit/value
  const effBits = bits >= 16 ? 16 : bits + overheadBits
  const ratio = effBits / 16

  // SVG geometry
  const W = 720
  const H = 300
  const padL = 44
  const padR = 16
  const padT = 18
  const padB = 40
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  // shared value range across rotated/un-rotated so the axis is comparable
  const allLo = Math.min(...BASE, ...rotate(BASE, R))
  const allHi = Math.max(...BASE, ...rotate(BASE, R))
  const vSpan = allHi - allLo || 1
  const yOf = (v: number) =>
    padT + plotH - ((v - allLo) / vSpan) * plotH
  const xOf = (i: number) =>
    padL + (plotW / display.length) * (i + 0.5)
  const barW = (plotW / display.length) * 0.5

  return (
    <figure className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-4 py-3 sm:px-5">
        <div className="font-mono text-[0.72rem] text-fg/75">
          TurboQuant <span className="text-muted">·</span>{' '}
          <span className="text-muted">snap each cached number to {bits >= 16 ? 'full precision' : `${1 << bits} levels`}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Bit width" className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
            {[16, 8, 4].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBits(b)}
                aria-pressed={bits === b}
                className={`px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-wider transition-colors ${
                  bits === b ? 'bg-[var(--color-fg)]/10 text-fg' : 'text-muted hover:text-fg'
                }`}
              >
                {b === 16 ? 'fp16' : `${b}-bit`}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRotated((r) => !r)}
            aria-pressed={rotated}
            className={`rounded-lg border px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-wider transition-colors ${
              rotated
                ? 'border-transparent text-[#0a0a0a]'
                : 'border-[var(--color-border)] text-muted hover:text-fg'
            }`}
            style={rotated ? { background: AMBER } : undefined}
          >
            rotate
          </button>
        </div>
      </div>

      <div className="px-2 py-3 sm:px-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`16-value group quantised to ${bits >= 16 ? 'full precision' : bits + ' bits'}${rotated ? ', after an orthogonal rotation' : ''}.`}
        >
          {/* zero axis */}
          <line x1={padL} x2={W - padR} y1={yOf(0)} y2={yOf(0)} stroke="var(--color-border)" strokeWidth={1} />
          <text x={padL - 6} y={yOf(0) + 3} textAnchor="end" className="fill-muted" style={{ fontSize: 9, fontFamily: 'monospace' }}>0</text>

          {/* quantisation grid lines */}
          {q.levels.map((lv, i) => (
            <line
              key={`lv-${uid}-${i}`}
              x1={padL}
              x2={W - padR}
              y1={yOf(lv)}
              y2={yOf(lv)}
              stroke={GREEN}
              strokeOpacity={0.18}
              strokeWidth={1}
              strokeDasharray="2 4"
            />
          ))}

          {/* bars: original (faint) + quantised (solid) + error stub */}
          {display.map((v, i) => {
            const x = xOf(i)
            const yV = yOf(v)
            const yQ = yOf(q.quant[i])
            const y0 = yOf(0)
            const err = Math.abs(v - q.quant[i])
            return (
              <g key={`b-${uid}-${i}`}>
                {/* original value bar (faint) */}
                <rect
                  x={x - barW / 2}
                  y={Math.min(yV, y0)}
                  width={barW}
                  height={Math.abs(yV - y0)}
                  fill="var(--color-fg)"
                  opacity={0.12}
                  rx={1.5}
                />
                {/* quantised dot on its grid line */}
                <circle cx={x} cy={yQ} r={3.2} fill={GREEN} style={{ transition: 'cy 360ms ease' }} />
                {/* original dot */}
                <circle cx={x} cy={yV} r={2.2} fill="var(--color-fg)" opacity={0.55} style={{ transition: 'cy 360ms ease' }} />
                {/* error stub between original and quantised */}
                {bits < 16 && err > 0.001 && (
                  <line
                    x1={x}
                    x2={x}
                    y1={yV}
                    y2={yQ}
                    stroke={RED}
                    strokeWidth={2}
                    style={{ transition: 'y1 360ms ease, y2 360ms ease' }}
                  />
                )}
              </g>
            )
          })}

          {/* outlier marker before rotation */}
          {!rotated && (
            <text
              x={xOf(6)}
              y={yOf(BASE[6]) - 8}
              textAnchor="middle"
              className="fill-muted"
              style={{ fontSize: 9, fontFamily: 'monospace' }}
            >
              outlier
            </text>
          )}
        </svg>
      </div>

      {/* read-outs */}
      <div className="grid grid-cols-3 gap-px border-t border-[var(--color-border)] bg-[var(--color-border)] text-center">
        <Readout label="bits / value" value={bits >= 16 ? '16.0' : effBits.toFixed(1)} sub={bits >= 16 ? 'fp16' : `${bits}-bit + scale`} />
        <Readout label="memory" value={`${ratio.toFixed(2)}×`} sub={bits >= 16 ? 'baseline' : `${(1 / ratio).toFixed(1)}× smaller`} accent={bits < 16 ? GREEN : undefined} />
        <Readout
          label="mean error"
          value={q.meanErr < 0.0005 ? '0' : q.meanErr.toFixed(3)}
          sub={bits >= 16 ? 'exact' : `max ${q.maxErr.toFixed(2)}`}
          accent={bits < 16 && q.meanErr > 0.06 ? RED : bits < 16 ? GREEN : undefined}
        />
      </div>

      <div className="border-t border-[var(--color-border)] px-4 py-2.5 sm:px-5">
        <p className="font-mono text-[0.68rem] leading-snug text-fg/80">
          <span className="text-blog">›</span>{' '}
          {bits >= 16
            ? 'Full precision — every number stored in 16 bits, no error, no saving.'
            : rotated
              ? `Rotated first: the outlier's energy is spread across the group, so the ${1 << bits} levels sit close to every value. This is why 4-bit is essentially lossless.`
              : `One outlier stretches the range, so the ${1 << bits} evenly-spaced levels are coarse and the small values quantise badly. Toggle "rotate" to fix it.`}
        </p>
      </div>
    </figure>
  )
}

function Readout({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="bg-surface px-3 py-3">
      <div className="font-mono text-[0.58rem] uppercase tracking-wider text-muted">{label}</div>
      <div
        className="font-display mt-1 text-2xl font-semibold tabular-nums leading-none"
        style={accent ? { color: accent } : { color: 'var(--color-fg)' }}
      >
        {value}
      </div>
      {sub && <div className="mt-1 font-mono text-[0.58rem] text-muted">{sub}</div>}
    </div>
  )
}
