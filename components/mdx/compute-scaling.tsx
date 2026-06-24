'use client'

/**
 * ComputeScaling — the inference-time ("test-time") scaling plot for
 * "Why thinking longer makes models smarter".
 *
 * The idea: a SMALL model that's allowed to spend more compute at answer time —
 * by sampling many candidate answers and picking among them — climbs in accuracy
 * roughly LINEARLY in the LOG of the sample budget C. A BIGGER model that just
 * answers ONCE sits at a fixed accuracy. So there's a crossover: past some budget
 * C*, small-model-plus-search beats the bigger one-shot model.
 *
 *   acc(C) = clamp(a + b·log2(C), 0, ceiling)        (C = number of samples)
 *   baseline = constant (the bigger model answering once)
 *   crossover C* = smallest power-of-two C where acc(C) ≥ baseline
 *
 * The x-axis is C on a LOG scale (1 → 1024, gridlines at powers of two) so the
 * "linear in log-compute" trend reads as a straight rising line. Three search
 * strategies (majority vote | best-of-N | PRM beam) swap the (a, b, ceiling)
 * coefficients, moving the curve and its crossover. Best-of-N dominates majority
 * vote at every budget on these seeded coefficients.
 *
 * Everything is computed from the closed-form curve above — no fetch, no random.
 * The only animation is an optional one-shot "draw-in" the first time the figure
 * scrolls into view; it's gated on useInViewport + reduced-motion and cancels on
 * cleanup. Under reduced motion (or off-screen) the chart renders fully drawn.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInViewport } from './use-in-viewport'

// ── strategy coefficients ───────────────────────────────────────────────────
// acc(C) = clamp(a + b·log2(C), 0, ceiling). Chosen so that, at every budget C,
// best-of-N ≥ majority vote, and PRM beam ≥ best-of-N — and each curve crosses
// the fixed baseline at a different power-of-two budget.
type StrategyKey = 'majority' | 'bestof' | 'prm'

interface Strategy {
  key: StrategyKey
  label: string
  a: number
  b: number
  ceiling: number
}

const STRATEGIES: Strategy[] = [
  { key: 'majority', label: 'majority vote', a: 42, b: 3.4, ceiling: 80 },
  { key: 'bestof', label: 'best-of-N', a: 46, b: 4.0, ceiling: 86 },
  { key: 'prm', label: 'PRM beam', a: 50, b: 4.6, ceiling: 92 },
]

// The bigger model answering once: constant accuracy, no compute spent searching.
const BASELINE = 70

// Compute axis: powers of two from 2^0 = 1 to 2^MAX_LOG = 1024.
const MAX_LOG = 10
const C_MAX = 1 << MAX_LOG // 1024

const accent = 'var(--color-blog)'

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v

// acc(C) = clamp(a + b·log2(C), 0, ceiling) — the closed form the spec verifies.
function accAt(s: Strategy, c: number): number {
  return clamp(s.a + s.b * Math.log2(c), 0, s.ceiling)
}

// Smallest power-of-two budget where the strategy curve reaches the baseline.
// Returns null if it never catches up within the plotted range.
function crossoverC(s: Strategy): number | null {
  for (let k = 0; k <= MAX_LOG; k++) {
    const c = 1 << k
    if (accAt(s, c) >= BASELINE) return c
  }
  return null
}

export function ComputeScaling({
  strategy: initialStrategy = 'majority',
}: {
  strategy?: StrategyKey
}) {
  const [inViewRef, inView] = useInViewport<HTMLDivElement>('120px')
  const [stratKey, setStratKey] = useState<StrategyKey>(initialStrategy)
  // slider position is the log2 of the budget (0..10), so the slider is naturally
  // log-stepped: each notch doubles the compute.
  const [logC, setLogC] = useState(7) // C = 128
  // 0..1 draw-in progress; starts at 1 (fully drawn) so SSR + reduced motion are
  // identical, and we only animate down→up when first scrolled into view.
  const [reveal, setReveal] = useState(1)
  const rafRef = useRef<number | null>(null)
  const playedRef = useRef(false)

  const strat = useMemo(
    () => STRATEGIES.find((s) => s.key === stratKey) ?? STRATEGIES[0],
    [stratKey],
  )

  // ── plot geometry ─────────────────────────────────────────────────────────
  const VB_W = 640
  const VB_H = 400
  const ML = 52
  const MR = 96 // room for the right-edge curve labels
  const MT = 26
  const MB = 46
  const plotW = VB_W - ML - MR
  const plotH = VB_H - MT - MB

  // x maps log2(C) in [0, MAX_LOG] across the plot (this IS the log scale).
  const xOf = (c: number) => ML + (Math.log2(c) / MAX_LOG) * plotW
  // y maps accuracy 0..100% top-down.
  const yOf = (acc: number) => MT + (1 - acc / 100) * plotH

  // Smooth curve sampled across the continuous budget range (not just integers),
  // so the rising line reads cleanly between gridlines.
  const SAMPLES = 64
  const curvePts = useMemo(() => {
    const pts: Array<{ c: number; acc: number }> = []
    for (let i = 0; i <= SAMPLES; i++) {
      const lc = (i / SAMPLES) * MAX_LOG
      const c = Math.pow(2, lc)
      pts.push({ c, acc: accAt(strat, c) })
    }
    return pts
  }, [strat])

  const curvePath = useMemo(
    () =>
      curvePts
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.c)} ${yOf(p.acc)}`)
        .join(' '),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [curvePts],
  )

  const cross = useMemo(() => crossoverC(strat), [strat])

  // ── current slider readout ──────────────────────────────────────────────────
  const curC = 1 << logC
  const curAcc = accAt(strat, curC)
  const curAccRounded = Math.round(curAcc)

  // ── one-shot draw-in on first in-view ───────────────────────────────────────
  useEffect(() => {
    if (!inView || playedRef.current || reducedMotion()) {
      // off-screen, already played, or reduced motion → stay fully drawn
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      return
    }
    playedRef.current = true
    const DURATION = 850
    let start: number | null = null
    setReveal(0)
    const tick = (now: number) => {
      if (start == null) start = now
      const t = Math.min(1, (now - start) / DURATION)
      // easeOutCubic
      setReveal(1 - Math.pow(1 - t, 3))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setReveal(1)
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [inView])

  // The curve "grows" left→right during the draw-in by clipping to reveal·plotW.
  const revealW = ML + reveal * plotW

  return (
    <figure
      ref={inViewRef}
      className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          accuracy vs test-time compute · log-x
        </span>
        <div className="flex items-center gap-3 font-mono text-[0.66rem] uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="inline-block h-0.5 w-3" style={{ background: accent }} />
            small + search
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            <span
              className="inline-block h-0 w-3 border-t border-dashed"
              style={{ borderColor: 'var(--color-muted)' }}
            />
            bigger · one-shot
          </span>
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full"
          style={{ maxWidth: 680, margin: '0 auto' }}
          role="img"
          aria-label={`Accuracy versus test-time compute on a log scale. A bigger model answering once is flat at ${BASELINE} percent. A small model with ${strat.label} search rises with the sample budget and crosses the baseline at ${cross ?? 'never within range'} samples.`}
        >
          <defs>
            {/* clip that grows left→right for the draw-in */}
            <clipPath id="cs-reveal">
              <rect x={0} y={0} width={revealW} height={VB_H} />
            </clipPath>
          </defs>

          {/* ── y gridlines + labels at 0,25,50,75,100 ──────────────────── */}
          {[0, 25, 50, 75, 100].map((acc) => (
            <g key={`y-${acc}`}>
              <line
                x1={ML}
                y1={yOf(acc)}
                x2={ML + plotW}
                y2={yOf(acc)}
                stroke="color-mix(in srgb, var(--color-border) 65%, transparent)"
                strokeWidth={1}
                strokeDasharray={acc === 0 ? undefined : '3 4'}
              />
              <text
                x={ML - 8}
                y={yOf(acc) + 3.5}
                textAnchor="end"
                className="font-mono"
                style={{ fontSize: 11, fill: 'var(--color-muted)' }}
              >
                {acc}%
              </text>
            </g>
          ))}

          {/* ── x gridlines + tick labels at powers of two ──────────────── */}
          {Array.from({ length: MAX_LOG + 1 }).map((_, k) => {
            const c = 1 << k
            // thin out labels on narrow widths: only every other tick gets text,
            // but the gridlines stay. (CSS picks which set is visible by width.)
            const wide = k % 2 === 0
            return (
              <g key={`x-${k}`}>
                <line
                  x1={xOf(c)}
                  y1={MT}
                  x2={xOf(c)}
                  y2={MT + plotH}
                  stroke="color-mix(in srgb, var(--color-border) 45%, transparent)"
                  strokeWidth={1}
                />
                {/* every-other label: always visible */}
                {wide && (
                  <text
                    x={xOf(c)}
                    y={VB_H - 24}
                    textAnchor="middle"
                    className="font-mono"
                    style={{ fontSize: 10.5, fill: 'var(--color-muted)' }}
                  >
                    {c}
                  </text>
                )}
                {/* odd labels: hidden under ~520px so they don't collide */}
                {!wide && (
                  <text
                    x={xOf(c)}
                    y={VB_H - 24}
                    textAnchor="middle"
                    className="cs-fine-tick font-mono"
                    style={{ fontSize: 10.5, fill: 'var(--color-muted)' }}
                  >
                    {c}
                  </text>
                )}
              </g>
            )
          })}
          <text
            x={ML + plotW / 2}
            y={VB_H - 6}
            textAnchor="middle"
            className="font-mono"
            style={{ fontSize: 10.5, fill: 'var(--color-muted)' }}
          >
            test-time compute C (samples, log scale)
          </text>

          {/* ── baseline: bigger model, one-shot, constant ──────────────── */}
          <line
            x1={ML}
            y1={yOf(BASELINE)}
            x2={ML + plotW}
            y2={yOf(BASELINE)}
            stroke="var(--color-muted)"
            strokeWidth={1.8}
            strokeDasharray="6 5"
          />
          <text
            x={ML + plotW + 8}
            y={yOf(BASELINE) + 3.5}
            className="font-mono"
            style={{ fontSize: 10.5, fill: 'var(--color-muted)' }}
          >
            <tspan x={ML + plotW + 8} dy={0}>
              bigger
            </tspan>
            <tspan x={ML + plotW + 8} dy={12}>
              {BASELINE}%
            </tspan>
          </text>

          {/* ── small + search curve (clipped for draw-in) ──────────────── */}
          <g clipPath="url(#cs-reveal)">
            <path
              d={curvePath}
              fill="none"
              stroke={accent}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <text
            x={ML + plotW + 8}
            y={yOf(accAt(strat, C_MAX)) + 3.5}
            className="font-mono"
            style={{ fontSize: 10.5, fill: accent }}
          >
            <tspan x={ML + plotW + 8} dy={0} fontWeight={700}>
              {strat.label.split(' ')[0]}
            </tspan>
            <tspan x={ML + plotW + 8} dy={12}>
              {Math.round(accAt(strat, C_MAX))}%
            </tspan>
          </text>

          {/* ── crossover marker: smallest C where curve ≥ baseline ─────── */}
          {cross != null && reveal > Math.log2(cross) / MAX_LOG - 0.02 && (
            <g data-crossover-c={cross}>
              <line
                x1={xOf(cross)}
                y1={yOf(BASELINE)}
                x2={xOf(cross)}
                y2={MT + plotH}
                stroke={accent}
                strokeWidth={1}
                strokeDasharray="2 3"
                style={{ opacity: 0.5 }}
              />
              <circle
                cx={xOf(cross)}
                cy={yOf(accAt(strat, cross))}
                r={5.5}
                fill={accent}
                stroke="var(--color-bg)"
                strokeWidth={2}
              />
              <text
                x={xOf(cross)}
                y={yOf(BASELINE) - 12}
                textAnchor="middle"
                className="font-mono"
                style={{ fontSize: 10.5, fill: accent, fontWeight: 700 }}
              >
                crossover · C={cross}
              </text>
            </g>
          )}

          {/* ── slider readout line + dot ───────────────────────────────── */}
          <line
            x1={xOf(curC)}
            y1={MT}
            x2={xOf(curC)}
            y2={MT + plotH}
            stroke="var(--color-fg)"
            strokeWidth={1.2}
            strokeDasharray="3 3"
            style={{ opacity: 0.45 }}
          />
          <circle
            cx={xOf(curC)}
            cy={yOf(curAcc)}
            r={4}
            fill="var(--color-fg)"
            stroke="var(--color-bg)"
            strokeWidth={1.5}
          />
          {/* readout chip near the marker */}
          <g
            transform={`translate(${Math.min(xOf(curC) + 8, ML + plotW - 78)}, ${Math.max(
              yOf(curAcc) - 26,
              MT + 4,
            )})`}
          >
            <rect
              x={0}
              y={0}
              width={78}
              height={20}
              rx={6}
              fill="color-mix(in srgb, var(--color-fg) 10%, var(--color-bg))"
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={8}
              y={14}
              className="font-mono"
              style={{ fontSize: 11, fill: 'var(--color-fg)', fontWeight: 600 }}
            >
              C={curC} → {curAccRounded}%
            </text>
          </g>

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
        </svg>

        {/* hide the odd (fine) tick labels under ~520px so they don't collide */}
        <style>{`@media (max-width: 520px){.cs-fine-tick{display:none}}`}</style>
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        {/* strategy segmented control */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">
            strategy
          </span>
          <div className="inline-flex overflow-hidden rounded-md border border-[var(--color-border)]">
            {STRATEGIES.map((s, i) => {
              const active = s.key === stratKey
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStratKey(s.key)}
                  className={`px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider transition-colors ${
                    i > 0 ? 'border-l border-[var(--color-border)]' : ''
                  } ${
                    active
                      ? 'bg-[color-mix(in_srgb,var(--color-blog)_16%,transparent)] text-blog'
                      : 'bg-surface text-muted hover:text-fg'
                  }`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* compute slider (log-stepped via log2 index) */}
        <div className="flex items-center gap-4">
          <label
            htmlFor="cs-c"
            className="whitespace-nowrap font-mono text-[0.7rem] uppercase tracking-wider text-muted"
          >
            compute C
          </label>
          <input
            id="cs-c"
            type="range"
            min={0}
            max={MAX_LOG}
            step={1}
            value={logC}
            onChange={(e) => setLogC(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]"
          />
          <span
            data-acc={curAccRounded}
            data-c={curC}
            className="w-28 text-right font-mono text-[0.78rem] tabular-nums text-fg"
          >
            C={curC} → {curAccRounded}%
          </span>
        </div>

        <p className="mt-2 font-mono text-[0.66rem] leading-snug text-muted">
          The bigger model answers once and sits flat at{' '}
          <span className="tabular-nums text-fg">{BASELINE}%</span>. The small
          model with <span className="text-blog">{strat.label}</span> climbs as{' '}
          <span className="text-blog">
            acc = {strat.a} + {strat.b}·log₂C
          </span>{' '}
          (capped at <span className="tabular-nums">{strat.ceiling}%</span>), so
          doubling the sample budget adds a fixed{' '}
          <span className="tabular-nums">{strat.b}</span> points — until it
          overtakes the bigger model at{' '}
          {cross != null ? (
            <span className="tabular-nums text-blog">C={cross}</span>
          ) : (
            <span className="text-muted">no budget in range</span>
          )}
          . Best-of-N stays above majority vote at every budget; PRM beam above
          both.
        </p>
      </div>
    </figure>
  )
}
