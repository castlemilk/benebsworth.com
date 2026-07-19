'use client'

/**
 * AttentionCostCurve — why a million-token context can't afford full attention.
 *
 * A log–log chart of "relative work" (illustrative) against sequence length,
 * 1K → 1M tokens, for two idealised mechanisms:
 *
 *   • quadratic (full self-attention): work ∝ n² — every token scores every
 *     token, so the bill grows with the square of the context;
 *   • linear (linear attention): work ∝ n — the past is folded into a
 *     fixed-size memory, so per-token work stops depending on the past.
 *
 * On log–log axes both are straight lines, slopes 2 and 1. Markers at 128K
 * and 1M tokens carry the exact numbers: stretching the context 7.8× from
 * 128K to 1M multiplies the linear bill by 7.8 but the quadratic one by ~61,
 * and at 1M the quadratic curve sits six orders of magnitude higher.
 *
 * Pure presentational SVG (no rAF); each curve is one path built from 60
 * log-spaced samples. Hover / focus / tap a marker for an element-anchored
 * tooltip that flips when it would leave the chart. Markers are real buttons
 * with ≥44px touch targets. Theme-token styled, legible light/dark, scales
 * to container width.
 */

import { useState } from 'react'

const TEAL = '#00E0B8' // linear curve
const ORANGE = '#FF7A59' // quadratic curve

// SVG geometry
const W = 720
const H = 420
const padL = 56
const padR = 26
const padT = 24
const padB = 50
const plotW = W - padL - padR
const plotH = H - padT - padB

const X_MIN = 3 // x axis: 10^3 = 1K tokens
const X_MAX = 6 //       10^6 = 1M tokens
const Y_MIN = 3 // y axis: 10^3 relative work
const Y_MAX = 12 //      10^12

const xOf = (s: number) => padL + ((Math.log10(s) - X_MIN) / (X_MAX - X_MIN)) * plotW
const yOf = (w: number) => padT + plotH - ((Math.log10(w) - Y_MIN) / (Y_MAX - Y_MIN)) * plotH
// marker overlay positions as % of the whole viewBox (the wrapper keeps the
// SVG's aspect ratio, so % of the container maps linearly to viewBox coords)
const xPct = (s: number) => (xOf(s) / W) * 100
const yPct = (w: number) => (yOf(w) / H) * 100

// 60 log-spaced samples per curve; on log–log axes each is a straight line.
const SAMPLES = 60
function sampleCurve(fn: (s: number) => number): string {
  const pts: string[] = []
  for (let i = 0; i < SAMPLES; i++) {
    const s = 10 ** (X_MIN + (i / (SAMPLES - 1)) * (X_MAX - X_MIN))
    pts.push(`${i === 0 ? 'M' : 'L'}${xOf(s).toFixed(1)},${yOf(fn(s)).toFixed(1)}`)
  }
  return pts.join(' ')
}
const linearPath = sampleCurve((s) => s)
const quadPath = sampleCurve((s) => s * s)

// scientific-notation labels with real superscripts (10⁵, 10¹², …)
const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
}
const sup = (e: number) =>
  String(e).split('').map((c) => SUP[c] ?? c).join('')
const sci = (mantissa: string, exp: number) => `${mantissa}×10${sup(exp)}`

type Marker = {
  id: string
  curve: 'linear' | 'quadratic'
  seq: number
  work: number
  seqLabel: string
  workLabel: string
  ratioLabel: string
}

const MARKERS: Marker[] = [
  { id: 'lin-128k', curve: 'linear', seq: 128e3, work: 128e3, seqLabel: '128K', workLabel: sci('1.28', 5), ratioLabel: 'baseline (×1)' },
  { id: 'lin-1m', curve: 'linear', seq: 1e6, work: 1e6, seqLabel: '1M', workLabel: sci('1.00', 6), ratioLabel: '×7.8 vs 128K' },
  { id: 'quad-128k', curve: 'quadratic', seq: 128e3, work: 128e3 ** 2, seqLabel: '128K', workLabel: sci('1.64', 10), ratioLabel: 'baseline (×1)' },
  { id: 'quad-1m', curve: 'quadratic', seq: 1e6, work: 1e12, seqLabel: '1M', workLabel: sci('1.00', 12), ratioLabel: '×61 vs 128K' },
]

const X_TICKS = [
  { v: 1e3, t: '1K' },
  { v: 1e4, t: '10K' },
  { v: 1e5, t: '100K' },
  { v: 1e6, t: '1M' },
]
const Y_TICKS = Array.from({ length: Y_MAX - Y_MIN + 1 }, (_, i) => Y_MIN + i)

export function AttentionCostCurve() {
  const [active, setActive] = useState<string | null>(null)
  const activeMarker = MARKERS.find((m) => m.id === active) ?? null

  return (
    <figure className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-4 py-3 sm:px-5">
        <div className="font-mono text-[0.72rem] text-fg/75">
          attention work vs sequence length <span className="text-muted">· log–log, illustrative</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[0.62rem] uppercase tracking-wider text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded" style={{ background: TEAL }} />
            linear · n
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded" style={{ background: ORANGE }} />
            quadratic · n²
          </span>
        </div>
      </div>

      <div className="px-2 py-3 sm:px-4">
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="block h-auto w-full"
            role="img"
            aria-label="Log-log chart of relative work against sequence length. A quadratic curve for full self-attention climbs from 10^6 at 1K tokens to 10^12 at 1M tokens; a linear curve for linear attention climbs from 10^3 to 10^6 over the same range."
          >
            {/* decade gridlines */}
            {Y_TICKS.map((e) => (
              <line
                key={`gy-${e}`}
                x1={padL}
                x2={W - padR}
                y1={yOf(10 ** e)}
                y2={yOf(10 ** e)}
                stroke="var(--color-border)"
                strokeWidth={1}
                strokeDasharray={e % 3 === 0 ? undefined : '2 5'}
                strokeOpacity={e % 3 === 0 ? 0.9 : 0.5}
              />
            ))}
            {X_TICKS.map(({ v }) => (
              <line
                key={`gx-${v}`}
                x1={xOf(v)}
                x2={xOf(v)}
                y1={padT}
                y2={H - padB}
                stroke="var(--color-border)"
                strokeWidth={1}
                strokeDasharray="2 5"
                strokeOpacity={0.5}
              />
            ))}

            {/* axes */}
            <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="var(--color-border)" strokeWidth={1.5} />
            <line x1={padL} x2={padL} y1={padT} y2={H - padB} stroke="var(--color-border)" strokeWidth={1.5} />

            {/* axis tick labels */}
            {X_TICKS.map(({ v, t }) => (
              <text
                key={`xt-${v}`}
                x={xOf(v)}
                y={H - padB + 16}
                textAnchor="middle"
                className="fill-muted"
                style={{ fontSize: 10, fontFamily: 'monospace' }}
              >
                {t}
              </text>
            ))}
            {Y_TICKS.map((e) => (
              <text
                key={`yt-${e}`}
                x={padL - 7}
                y={yOf(10 ** e) + 3}
                textAnchor="end"
                className="fill-muted"
                style={{ fontSize: 9, fontFamily: 'monospace' }}
              >
                {`10${sup(e)}`}
              </text>
            ))}

            {/* axis titles */}
            <text
              x={padL + plotW / 2}
              y={H - 8}
              textAnchor="middle"
              className="fill-muted"
              style={{ fontSize: 10, fontFamily: 'monospace' }}
            >
              sequence length (tokens)
            </text>
            <text
              x={14}
              y={padT + plotH / 2}
              textAnchor="middle"
              className="fill-muted"
              style={{ fontSize: 10, fontFamily: 'monospace' }}
              transform={`rotate(-90 14 ${padT + plotH / 2})`}
            >
              relative work (illustrative)
            </text>

            {/* the two curves */}
            <path d={quadPath} fill="none" stroke={ORANGE} strokeWidth={2.5} strokeLinejoin="round" />
            <path d={linearPath} fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinejoin="round" />

            {/* static ratio labels at the 1M markers */}
            <text
              x={xOf(1e6) - 12}
              y={yOf(1e12) + 18}
              textAnchor="end"
              style={{ fontSize: 11, fontFamily: 'monospace', fill: ORANGE, fontWeight: 600 }}
            >
              ≈61×
            </text>
            <text
              x={xOf(1e6) - 12}
              y={yOf(1e6) + 4}
              textAnchor="end"
              style={{ fontSize: 11, fontFamily: 'monospace', fill: TEAL, fontWeight: 600 }}
            >
              7.8×
            </text>
            <text
              x={xOf(1e6) - 12}
              y={yOf(1e6) + 17}
              textAnchor="end"
              className="fill-muted"
              style={{ fontSize: 9, fontFamily: 'monospace' }}
            >
              vs 128K
            </text>
          </svg>

          {/* interactive markers — HTML buttons overlaid on the SVG so touch
              targets stay ≥44px whatever the container width */}
          {MARKERS.map((m) => {
            const accent = m.curve === 'linear' ? TEAL : ORANGE
            const isActive = active === m.id
            return (
              <button
                key={m.id}
                type="button"
                aria-label={`${m.curve} curve at ${m.seqLabel} tokens: relative work ${m.workLabel}, ${m.ratioLabel}`}
                aria-expanded={isActive}
                className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none"
                style={{ left: `${xPct(m.seq)}%`, top: `${yPct(m.work)}%` }}
                onPointerEnter={(e) => { if (e.pointerType !== 'touch') setActive(m.id) }}
                onPointerLeave={(e) => { if (e.pointerType !== 'touch') setActive(null) }}
                onClick={() => setActive((cur) => (cur === m.id ? null : m.id))}
                onFocus={() => setActive(m.id)}
                onBlur={() => setActive(null)}
                onKeyDown={(e) => { if (e.key === 'Escape') setActive(null) }}
              >
                <span
                  className="block h-3 w-3 rounded-full transition-transform"
                  style={{
                    background: accent,
                    boxShadow: `0 0 0 2px var(--color-bg), 0 0 0 ${isActive ? 5 : 3.5}px ${accent}${isActive ? '66' : '33'}`,
                    transform: isActive ? 'scale(1.25)' : undefined,
                  }}
                />
              </button>
            )
          })}

          {/* element-anchored tooltip; flips below / left when it would leave the chart */}
          {activeMarker && (
            <div
              role="status"
              className="pointer-events-none absolute z-10 w-52 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 shadow-lg"
              style={tooltipStyle(activeMarker)}
            >
              <div
                className="font-mono text-[0.6rem] uppercase tracking-wider"
                style={{ color: activeMarker.curve === 'linear' ? TEAL : ORANGE }}
              >
                {activeMarker.curve} · {activeMarker.seqLabel} tokens
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-2 font-mono text-[0.72rem] text-fg">
                <span className="text-muted">work</span>
                <span className="tabular-nums">{activeMarker.workLabel}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2 font-mono text-[0.72rem] text-fg">
                <span className="text-muted">growth</span>
                <span className="tabular-nums">{activeMarker.ratioLabel}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] px-4 py-2.5 sm:px-5">
        <p className="font-mono text-[0.68rem] leading-snug text-fg/80">
          <span className="text-blog">›</span>{' '}
          128K → 1M tokens is a 7.8× longer context: the linear bill grows 7.8×, the quadratic one ≈61× — and at 1M the two curves sit six orders of magnitude apart. Hover or tap a marker for the exact numbers.
        </p>
      </div>
    </figure>
  )
}

/** Place the tooltip above the marker; flip below near the top edge and
 *  right-anchor near the right edge so it never leaves the chart. */
function tooltipStyle(m: Marker): React.CSSProperties {
  const yFrac = (Math.log10(m.work) - Y_MIN) / (Y_MAX - Y_MIN) // 0 bottom → 1 top
  const xFrac = xOf(m.seq) / W
  const above = yFrac <= 0.55
  const xShift = xFrac > 0.62 ? 'calc(-100% + 22px)' : xFrac < 0.2 ? '-22px' : '-50%'
  return {
    left: `${xPct(m.seq)}%`,
    top: `${yPct(m.work)}%`,
    transform: `translate(${xShift}, ${above ? 'calc(-100% - 12px)' : '12px'})`,
  }
}
