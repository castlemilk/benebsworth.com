'use client'

/**
 * CostRace — the "why a linear loop beats attention" interactive for the
 * "The loop that beats attention" post (Mamba / state-space models).
 *
 * Self-attention compares every token to every other token, so its compute and
 * its memory both grow with the SQUARE of the sequence length:
 *
 *   attention work ∝ n²      (the n×n score matrix)
 *
 * A state-space model carries a fixed-size hidden state and folds one token in
 * at a time, so its work grows only LINEARLY:
 *
 *   SSM work ∝ n
 *
 * Divide the two and the gap is itself linear — attention costs ≈ k·n times more,
 * so it DOUBLES every time you double the context. We plot both as filled areas
 * under a log-scaled context slider (1 → 16384 tokens) so the n² vs n divergence
 * stays readable across four orders of magnitude, and overlay a faint linear
 * "KV cache bytes" line (∝ n) to tie back to the KV-cache post: attention's
 * memory grows without bound, the SSM's stays flat.
 *
 * A play button auto-sweeps the slider left→right (rAF). The sweep is gated on
 * in-view + running + reduced-motion and pauses during a manual drag; under
 * reduced motion it jumps straight to the right-hand (most divergent) end
 * instead of animating. The areas/counters are computed from the real n²/n
 * formulas, not faked, and the live counts are exposed as data-attn / data-ssm /
 * data-ratio so the divergence can be asserted from the DOM.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInViewport } from './use-in-viewport'

// ── model ───────────────────────────────────────────────────────────────────
const MIN_N = 1
const MAX_N = 16384 // 2^14
const LOG_MIN = Math.log2(MIN_N) // 0
const LOG_MAX = Math.log2(MAX_N) // 14
const SLIDER_STEPS = 1400 // slider resolution along the log axis
const SWEEP_SECONDS = 5.5 // left→right auto-sweep duration

// Encoding colours: SSM uses the post accent (teal/green), attention an explicit
// distinct orange so the two areas never collapse to one hue in either theme.
const SSM_COLOR = 'var(--color-blog)'
const ATTN_COLOR = '#FF7A59'
const KV_COLOR = '#FF7A59'

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

// slider index (0..SLIDER_STEPS) ↔ context length n, log-scaled
function idxToN(i: number): number {
  const frac = i / SLIDER_STEPS
  const n = Math.pow(2, LOG_MIN + frac * (LOG_MAX - LOG_MIN))
  return Math.max(MIN_N, Math.round(n))
}
function nToIdx(n: number): number {
  const clamped = Math.min(MAX_N, Math.max(MIN_N, n))
  const frac = (Math.log2(clamped) - LOG_MIN) / (LOG_MAX - LOG_MIN)
  return Math.round(frac * SLIDER_STEPS)
}

function fmt(v: number): string {
  if (v < 1000) return Math.round(v).toString()
  if (v < 1e6) return `${(v / 1e3).toFixed(v < 1e4 ? 1 : 0)}K`
  if (v < 1e9) return `${(v / 1e6).toFixed(v < 1e7 ? 1 : 0)}M`
  return `${(v / 1e9).toFixed(v < 1e10 ? 1 : 0)}B`
}

export function CostRace() {
  const [inViewRef, inView] = useInViewport<HTMLDivElement>('120px')
  const [idx, setIdx] = useState(() => nToIdx(2048)) // start mid-range
  const [running, setRunning] = useState(false)

  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const idxRef = useRef(idx)
  idxRef.current = idx

  // ── geometry ────────────────────────────────────────────────────────────
  const VB_W = 600
  const VB_H = 300
  const ML = 52
  const MR = 18
  const MT = 16
  const MB = 40
  const plotW = VB_W - ML - MR
  const plotH = VB_H - MT - MB

  // x: log-scaled sequence length 1..MAX_N. y: log-scaled work so n and n²
  // are both visible at once (a linear y would pin the SSM curve flat to zero).
  const xOf = (n: number) =>
    ML + ((Math.log2(Math.max(MIN_N, n)) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * plotW

  // work units are normalised so n=MAX_N hits the top of the plot for attention.
  // attention ∝ n², SSM ∝ n, KV cache ∝ n (memory, distinct constant).
  const ATTN_K = 1
  const SSM_K = 1
  const KV_K = 1
  const attnWork = (n: number) => ATTN_K * n * n
  const ssmWork = (n: number) => SSM_K * n
  const kvBytes = (n: number) => KV_K * n

  const WORK_MAX = attnWork(MAX_N) // largest value on the chart
  const LOG_WORK_MAX = Math.log2(WORK_MAX)
  // map a work value → y (log scale, clamped to the plot). 1 unit sits on the floor.
  const yOf = (w: number) => {
    if (w <= 1) return MT + plotH
    const frac = Math.log2(w) / LOG_WORK_MAX
    return MT + (1 - Math.min(1, Math.max(0, frac))) * plotH
  }

  // ── current readouts (the real formulas) ─────────────────────────────────
  const n = idxToN(idx)
  const attn = attnWork(n)
  const ssm = ssmWork(n)
  const ratio = ssm > 0 ? attn / ssm : 0 // == ATTN_K/SSM_K · n  ⇒ linear in n

  // ── filled-area + line paths up to the current n ──────────────────────────
  const { attnArea, ssmArea, kvLine } = useMemo(() => {
    const SAMPLES = 120
    const attnPts: Array<[number, number]> = []
    const ssmPts: Array<[number, number]> = []
    const kvPts: Array<[number, number]> = []
    for (let s = 0; s <= SAMPLES; s++) {
      const logN = LOG_MIN + (s / SAMPLES) * (Math.log2(Math.max(MIN_N, n)) - LOG_MIN)
      const nn = Math.pow(2, logN)
      attnPts.push([xOf(nn), yOf(attnWork(nn))])
      ssmPts.push([xOf(nn), yOf(ssmWork(nn))])
      kvPts.push([xOf(nn), yOf(kvBytes(nn))])
    }
    const floor = MT + plotH
    const areaPath = (pts: Array<[number, number]>) => {
      if (pts.length === 0) return ''
      const top = pts
        .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
        .join(' ')
      const x0 = pts[0][0]
      const x1 = pts[pts.length - 1][0]
      return `${top} L ${x1.toFixed(2)} ${floor} L ${x0.toFixed(2)} ${floor} Z`
    }
    const linePath = (pts: Array<[number, number]>) =>
      pts
        .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
        .join(' ')
    return {
      attnArea: areaPath(attnPts),
      ssmArea: areaPath(ssmPts),
      kvLine: linePath(kvPts),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n])

  // ── auto-sweep clock ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!running || !inView || reducedMotion()) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      startRef.current = null
      return
    }
    const tick = (now: number) => {
      if (startRef.current == null) {
        // resume from the current position rather than snapping to 0
        const frac0 = idxRef.current / SLIDER_STEPS
        startRef.current = now - frac0 * SWEEP_SECONDS * 1000
      }
      const elapsed = (now - startRef.current) / 1000
      const frac = elapsed / SWEEP_SECONDS
      const nextIdx = Math.round(Math.min(1, frac) * SLIDER_STEPS)
      idxRef.current = nextIdx
      setIdx(nextIdx)
      if (frac >= 1) {
        setRunning(false)
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, inView])

  const onPlay = () => {
    if (running) {
      setRunning(false)
      return
    }
    if (reducedMotion()) {
      setIdx(SLIDER_STEPS) // jump to the most-divergent end
      return
    }
    // if we're already at (or near) the right end, restart from the left
    if (idx >= SLIDER_STEPS - 1) {
      setIdx(0)
      idxRef.current = 0
    }
    startRef.current = null
    setRunning(true)
  }

  // x-axis ticks at powers of two we can label cleanly
  const xTicks = [1, 16, 256, 4096, 16384]

  return (
    <figure
      ref={inViewRef}
      className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          cost of context · n² vs n
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPlay}
            className="rounded-md border border-[var(--color-border)] bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider text-fg transition-colors hover:border-[var(--color-muted)]"
          >
            {running ? 'pause' : idx >= SLIDER_STEPS - 1 ? 'replay ▶' : 'sweep ▶'}
          </button>
        </div>
      </div>

      <div className="px-3 py-4 sm:px-5">
        {/* live counters — stack above the chart, wrap on narrow widths */}
        <div className="mx-auto mb-4 grid max-w-[640px] grid-cols-1 gap-2 sm:grid-cols-3">
          <div
            data-attn={Math.round(attn)}
            className="rounded-lg border border-[var(--color-border)] bg-surface-2/40 px-3 py-2"
          >
            <div className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted">
              attention work ∝ n²
            </div>
            <div
              className="mt-0.5 font-mono text-[1.15rem] tabular-nums"
              style={{ color: ATTN_COLOR }}
            >
              {fmt(attn)}
            </div>
          </div>

          <div
            data-ssm={Math.round(ssm)}
            className="rounded-lg border border-[var(--color-border)] bg-surface-2/40 px-3 py-2"
          >
            <div className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted">
              SSM work ∝ n
            </div>
            <div className="mt-0.5 font-mono text-[1.15rem] tabular-nums text-blog">
              {fmt(ssm)}
            </div>
          </div>

          <div
            data-ratio={Math.round(ratio)}
            className="rounded-lg border border-[var(--color-border)] bg-surface-2/40 px-3 py-2"
          >
            <div className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted">
              attention costs
            </div>
            <div className="mt-0.5 font-mono text-[1.15rem] tabular-nums text-fg">
              {ratio >= 1 ? fmt(ratio) : ratio.toFixed(1)}×<span className="text-muted"> more</span>
            </div>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full"
          style={{ maxWidth: 660, margin: '0 auto' }}
          role="img"
          aria-label={`Two filled areas under a log-scaled context-length axis: attention compute growing as n squared, and a state-space model growing only linearly with n. At ${n} tokens, attention does about ${fmt(attn)} units of work versus ${fmt(ssm)} for the SSM — roughly ${Math.round(ratio)} times more.`}
        >
          {/* horizontal gridlines at decade-ish powers of the work axis */}
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={`grid-${f}`}
              x1={ML}
              y1={MT + (1 - f) * plotH}
              x2={ML + plotW}
              y2={MT + (1 - f) * plotH}
              stroke="color-mix(in srgb, var(--color-border) 60%, transparent)"
              strokeWidth={1}
              strokeDasharray={f === 1 ? undefined : '3 4'}
            />
          ))}

          {/* attention area (orange) under the SSM so the SSM stays legible */}
          <path
            d={attnArea}
            fill={`color-mix(in srgb, ${ATTN_COLOR} 26%, transparent)`}
            stroke="none"
          />
          {/* SSM area (teal accent) */}
          <path
            d={ssmArea}
            fill={`color-mix(in srgb, ${SSM_COLOR} 30%, transparent)`}
            stroke="none"
          />

          {/* faint linear KV-cache bytes overlay (memory ∝ n) */}
          <path
            d={kvLine}
            fill="none"
            stroke={KV_COLOR}
            strokeWidth={1.4}
            strokeDasharray="2 4"
            style={{ opacity: 0.55 }}
          />

          {/* curve outlines on top */}
          <path
            d={attnArea}
            fill="none"
            stroke={ATTN_COLOR}
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          <path
            d={ssmArea}
            fill="none"
            stroke={SSM_COLOR}
            strokeWidth={2.2}
            strokeLinejoin="round"
          />

          {/* current-n marker */}
          <line
            x1={xOf(n)}
            y1={MT}
            x2={xOf(n)}
            y2={MT + plotH}
            stroke="var(--color-fg)"
            strokeWidth={1}
            strokeDasharray="2 3"
            style={{ opacity: 0.45 }}
          />
          <circle cx={xOf(n)} cy={yOf(attn)} r={3.4} fill={ATTN_COLOR} />
          <circle cx={xOf(n)} cy={yOf(ssm)} r={3.4} fill={SSM_COLOR} />

          {/* axis frame */}
          <line
            x1={ML}
            y1={MT}
            x2={ML}
            y2={MT + plotH}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
          <line
            x1={ML}
            y1={MT + plotH}
            x2={ML + plotW}
            y2={MT + plotH}
            stroke="var(--color-border)"
            strokeWidth={1}
          />

          {/* x-axis ticks + labels */}
          {xTicks.map((tk) => (
            <g key={`xt-${tk}`}>
              <line
                x1={xOf(tk)}
                y1={MT + plotH}
                x2={xOf(tk)}
                y2={MT + plotH + 4}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              <text
                x={xOf(tk)}
                y={MT + plotH + 16}
                textAnchor="middle"
                className="font-mono"
                style={{ fontSize: 9.5, fill: 'var(--color-muted)' }}
              >
                {tk >= 1024 ? `${tk / 1024}K` : tk}
              </text>
            </g>
          ))}

          {/* axis titles */}
          <text
            x={ML + plotW / 2}
            y={VB_H - 4}
            textAnchor="middle"
            className="font-mono"
            style={{ fontSize: 10, fill: 'var(--color-muted)' }}
          >
            sequence length (tokens, log)
          </text>
          <text
            x={14}
            y={MT + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 14 ${MT + plotH / 2})`}
            className="font-mono"
            style={{ fontSize: 10, fill: 'var(--color-muted)' }}
          >
            work / memory (log)
          </text>

          {/* inline legend, top-left of the plot */}
          <g transform={`translate(${ML + 10}, ${MT + 14})`}>
            <rect width={10} height={10} rx={2} y={-9} fill={ATTN_COLOR} />
            <text
              x={15}
              y={0}
              className="font-mono"
              style={{ fontSize: 10, fill: 'var(--color-fg)' }}
            >
              attention · n²
            </text>
            <g transform="translate(0, 16)">
              <rect width={10} height={10} rx={2} y={-9} fill={SSM_COLOR} />
              <text
                x={15}
                y={0}
                className="font-mono"
                style={{ fontSize: 10, fill: 'var(--color-fg)' }}
              >
                SSM · n
              </text>
            </g>
          </g>
        </svg>
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <label
            htmlFor="cr-n"
            className="whitespace-nowrap font-mono text-[0.7rem] uppercase tracking-wider text-muted"
          >
            context length
          </label>
          <input
            id="cr-n"
            type="range"
            min={0}
            max={SLIDER_STEPS}
            step={1}
            value={idx}
            onChange={(e) => {
              setRunning(false) // pause the sweep while dragging
              setIdx(Number(e.target.value))
            }}
            className="h-1.5 w-full flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]"
          />
          <span className="w-24 text-right font-mono text-[0.78rem] tabular-nums text-fg">
            {n.toLocaleString()} tok
          </span>
        </div>
        <p className="mt-2 font-mono text-[0.66rem] leading-snug text-muted">
          Attention compares every token to every other, so its work and its KV
          cache grow as{' '}
          <span style={{ color: ATTN_COLOR }}>n²</span> — double the context and
          it quadruples. A state-space model folds tokens into a fixed-size hidden
          state one at a time, so its work grows only as{' '}
          <span className="text-blog">n</span>. The ratio is therefore itself
          linear: attention costs ≈{' '}
          <span className="tabular-nums text-fg">{Math.round(ratio).toLocaleString()}</span>
          × more here, and that multiple <em>doubles</em> every time the context
          does.
        </p>
      </div>
    </figure>
  )
}
