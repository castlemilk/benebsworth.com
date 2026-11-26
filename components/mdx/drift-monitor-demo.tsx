'use client'

/**
 * DriftMonitorDemo — the silent-degradation argument as one interactive figure.
 *
 * Top row: a familiar infrastructure dashboard (CPU, p99 latency, uptime,
 * error budget) — every tile green, with a little organic jitter, because the
 * process is genuinely healthy.
 *
 * Main panel: two Gaussians in feature space. The reference distribution the
 * model trained on (teal) stays put; the live distribution (orange) drifts
 * right as deployment age advances. Accuracy is read off the degradation
 * equation Acc(t) ≈ Acc₀ − λ·D, with D measured in units of σ, so the error
 * regions the reader sees opening between the curves *are* the accuracy loss.
 *
 * Controls: play advances deployment age (drift grows, uptime counter climbs,
 * tiles never flicker); the slider sets divergence directly for inspection;
 * reset returns to deployment day. The rAF loop runs only while playing —
 * nothing animates when idle — and prefers-reduced-motion disables autoplay.
 *
 * Self-contained: plain React + SVG. No new deps.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/* ------------------------------------------------------------------ *
 * Model
 * ------------------------------------------------------------------ */

/** Reference recall at deployment: the winter story's 95%. */
const ACC0 = 95
/** Sensitivity λ per σ of mean shift, fitted so 1.5σ lands at the winter 85%. */
const LAMBDA = (ACC0 - 85) / 1.5
/** Drift rate in σ per simulated week while playing. */
const DRIFT_PER_WEEK = 0.08
const MAX_DIVERGENCE = 2.6
const WEEK_MS = 900 // wall-clock ms per simulated week

function gaussian(x: number, mean: number, sigma: number): number {
  const z = (x - mean) / sigma
  return Math.exp(-0.5 * z * z)
}

/* ------------------------------------------------------------------ *
 * Colours (mid-luminance, legible in both themes)
 * ------------------------------------------------------------------ */

const C_REF = '#00a896' // training distribution (teal)
const C_LIVE = '#ff7a59' // live distribution (brand orange)
const C_GREEN = '#34d399' // dashboard green
const C_WARN = '#f59e0b' // accuracy warning amber
const C_BAD = '#ef4444' // accuracy critical red

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

export function DriftMonitorDemo() {
  const [divergence, setDivergence] = useState(0) // mean shift in units of σ
  const [weeks, setWeeks] = useState(0)
  const [playing, setPlaying] = useState(false)
  const rafRef = useRef<number>(0)
  const lastRef = useRef<number>(0)

  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  /* advance deployment age while playing; stop at max divergence */
  useEffect(() => {
    if (!playing) return
    const step = (now: number) => {
      if (!lastRef.current) lastRef.current = now
      const dt = now - lastRef.current
      if (dt >= WEEK_MS) {
        const ticks = Math.floor(dt / WEEK_MS)
        lastRef.current += ticks * WEEK_MS
        setWeeks((w) => w + ticks)
        setDivergence((d) => {
          const next = Math.min(MAX_DIVERGENCE, d + ticks * DRIFT_PER_WEEK)
          if (next >= MAX_DIVERGENCE) setPlaying(false)
          return next
        })
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(rafRef.current)
      lastRef.current = 0
    }
  }, [playing])

  const accuracy = Math.max(52, ACC0 - LAMBDA * divergence)
  const missRate = 100 - accuracy
  const accColor =
    divergence < 0.5 ? C_GREEN : divergence < 1.2 ? C_WARN : C_BAD

  /* deterministic pseudo-jitter for the infra tiles — healthy noise, never alarming */
  const jitter = (seed: number) => {
    const x = Math.sin(seed * 12.9898 + weeks * 0.7) * 43758.5453
    return x - Math.floor(x) - 0.5 // ∈ [−0.5, 0.5)
  }
  const cpu = 42 + jitter(1) * 4
  const latency = 38 + jitter(2) * 3
  const errors = 0.2 + Math.max(0, jitter(3)) * 0.4
  const uptime = 99.98 + Math.min(0, jitter(4)) * 0.01

  /* geometry: x ∈ [−4, 7] mapped into the plot */
  const W = 660
  const H = 210
  const PAD = { l: 16, r: 16, t: 18, b: 30 }
  const xMin = -4
  const xMax = 7
  const sx = (x: number) => PAD.l + ((x - xMin) / (xMax - xMin)) * (W - PAD.l - PAD.r)
  const yMax = 1.06
  const sy = (y: number) => PAD.t + (1 - y / yMax) * (H - PAD.t - PAD.b)

  const curve = useCallback(
    (mean: number) => {
      const pts: string[] = []
      for (let i = 0; i <= 120; i++) {
        const x = xMin + (i / 120) * (xMax - xMin)
        pts.push(`${i === 0 ? 'M' : 'L'}${sx(x).toFixed(1)},${sy(gaussian(x, mean, 1)).toFixed(1)}`)
      }
      return pts.join(' ')
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const refPath = useMemo(() => curve(0), [curve])
  const livePath = useMemo(() => curve(divergence), [curve, divergence])

  /* shaded error region: where live mass sits beyond the reference's right tail */
  const errPath = useMemo(() => {
    const x0 = 2.2 // rough decision-relevant tail onset
    const pts: string[] = [`M${sx(x0).toFixed(1)},${sy(0).toFixed(1)}`]
    for (let i = 0; i <= 60; i++) {
      const x = x0 + (i / 60) * (xMax - x0)
      pts.push(`L${sx(x).toFixed(1)},${sy(gaussian(x, divergence, 1)).toFixed(1)}`)
    }
    pts.push(`L${sx(xMax).toFixed(1)},${sy(0).toFixed(1)} Z`)
    return pts.join(' ')
  }, [divergence]) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setPlaying(false)
    setWeeks(0)
    setDivergence(0)
  }

  const btn =
    'rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40'

  return (
    <figure className="my-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-950/60 p-4 sm:p-5">
      {/* ---- infrastructure dashboard: always green ---- */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'CPU', value: `${cpu.toFixed(1)}%`, note: 'fleet mean' },
          { label: 'p99 latency', value: `${latency.toFixed(0)} ms`, note: 'SLO 80 ms' },
          { label: 'errors', value: `${errors.toFixed(2)}/s`, note: '5xx rate' },
          { label: 'uptime', value: `${uptime.toFixed(2)}%`, note: `week ${weeks}` },
        ].map((tile) => (
          <div
            key={tile.label}
            className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2"
          >
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: C_GREEN, boxShadow: `0 0 6px ${C_GREEN}` }}
              />
              <span className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {tile.label}
              </span>
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums" style={{ color: C_GREEN }}>
              {tile.value}
            </div>
            <div className="text-[10px] text-neutral-400 dark:text-neutral-500">{tile.note}</div>
          </div>
        ))}
      </div>

      <p className="mt-2 text-center text-[11px] text-neutral-400 dark:text-neutral-500">
        everything the dashboard measures — every tile green, the whole way through
      </p>

      {/* ---- the part the dashboard cannot see ---- */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`Reference and live feature distributions. Live mean shifted ${divergence.toFixed(
          1,
        )} standard deviations; accuracy ${accuracy.toFixed(1)} percent.`}
      >
        {/* error region under the live tail */}
        <path d={errPath} fill={C_LIVE} fillOpacity={0.16} />
        {/* reference curve */}
        <path d={refPath} fill="none" stroke={C_REF} strokeWidth={2.2} />
        {/* live curve */}
        <path d={livePath} fill="none" stroke={C_LIVE} strokeWidth={2.2} />
        {/* means */}
        <line x1={sx(0)} y1={sy(1.02)} x2={sx(0)} y2={sy(0)} stroke={C_REF} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
        <line x1={sx(divergence)} y1={sy(1.02)} x2={sx(divergence)} y2={sy(0)} stroke={C_LIVE} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
        {/* axis */}
        <line x1={PAD.l} y1={sy(0)} x2={W - PAD.r} y2={sy(0)} stroke="currentColor" strokeWidth={1} opacity={0.25} />
        {/* labels */}
        <text x={sx(xMin) + 4} y={sy(1.02)} textAnchor="start" fontSize={11} fill={C_REF} fontWeight={600}>
          training distribution P₀
        </text>
        {divergence > 0.35 && (
          <text x={sx(xMax) - 4} y={sy(1.02)} textAnchor="end" fontSize={11} fill={C_LIVE} fontWeight={600}>
            live distribution Pₜ
          </text>
        )}
        {divergence > 0.55 && (
          <text x={sx(3.6)} y={sy(0.34)} textAnchor="middle" fontSize={10.5} fill={C_LIVE} opacity={0.9}>
            errors accumulate here
          </text>
        )}
        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.55}>
          feature space →
        </text>
      </svg>

      {/* ---- accuracy readout ---- */}
      <div className="mt-1 flex flex-wrap items-baseline justify-center gap-x-6 gap-y-1">
        <div className="text-sm">
          <span className="text-neutral-500 dark:text-neutral-400">recall on live traffic: </span>
          <span className="text-xl font-bold tabular-nums" style={{ color: accColor }}>
            {accuracy.toFixed(1)}%
          </span>
        </div>
        <div className="text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
          miss rate <strong style={{ color: accColor }}>{missRate.toFixed(1)}%</strong>
          {divergence > 0.9 && accuracy <= 86 && accuracy > 84 && (
            <span className="ml-2 rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[10px]">
              the winter scenario: misses tripled
            </span>
          )}
        </div>
        <div className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
          divergence D = {divergence.toFixed(2)}σ · deployment age {weeks} wk
        </div>
      </div>

      {/* ---- controls ---- */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {!reducedMotion && (
          <button
            type="button"
            className={btn}
            disabled={playing || divergence >= MAX_DIVERGENCE}
            onClick={() => setPlaying(true)}
          >
            ▶ age the deployment
          </button>
        )}
        {playing && (
          <button type="button" className={btn} onClick={() => setPlaying(false)}>
            ⏸ pause
          </button>
        )}
        <button type="button" className={btn} onClick={reset}>
          ↺ deployment day
        </button>
        <label className="ml-1 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          divergence
          <input
            type="range"
            min={0}
            max={MAX_DIVERGENCE}
            step={0.01}
            value={divergence}
            onChange={(e) => {
              setPlaying(false)
              setDivergence(Number(e.target.value))
            }}
            className="w-36 accent-[var(--color-blog,#ff7a59)]"
            aria-label="distribution divergence in standard deviations"
          />
          <span className="w-10 tabular-nums">{divergence.toFixed(2)}σ</span>
        </label>
      </div>

      <figcaption className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
        The top row is everything a health dashboard knows. The bottom is everything that matters.
        They move independently — that is the whole problem.
      </figcaption>
    </figure>
  )
}
