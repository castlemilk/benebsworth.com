'use client'

/**
 * GaltonBoard — the Central Limit Theorem made visible, for the
 * "Why everything becomes a bell curve" post.
 *
 * A quincunx: balls drop through a triangular array of pegs. At each peg a ball
 * goes left or right with p = 0.5 (a fair coin). After n rows it lands in bin k,
 * where k = the number of rights — a sum of n independent ±½ steps. Stack enough
 * balls and the bin counts trace C(n,k)/2ⁿ, the binomial, whose envelope is the
 * Normal(mean = n/2, variance = n/4) curve drawn on top. That convergence of a
 * sum of independent kicks toward a Gaussian IS the CLT.
 *
 * Hit drop to rain balls down the pegs; the histogram fills and the live
 * envelope snaps to the theoretical bell. The rows slider changes n (and the
 * bin count = n+1) and resets the board.
 *
 * rAF loop is gated on in-view + running + reduced-motion (pauses off-screen).
 * Under reduced motion, drop instantly adds a batch with no animation.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInViewport } from './use-in-viewport'

const MIN_N = 6
const MAX_N = 14
const DEFAULT_N = 10

const VB_W = 600
const VB_H = 420

// vertical layout inside the viewBox
const PEG_TOP = 54 // y of the first (apex) peg row
const PEG_GAP_Y = 16 // vertical spacing between peg rows
const HIST_TOP = 268 // y where the histogram baseline area starts
const HIST_BASE = 392 // y of the histogram baseline (bars grow up from here)
const HIST_H = HIST_BASE - HIST_TOP // max bar height

const MARGIN_X = 40

const BATCH = 40 // balls added per drop press (animated trickle or instant)
const SPAWN_EVERY = 70 // ms between launching successive balls in a batch
const FALL_PER_ROW = 95 // ms a ball spends descending one peg row

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

// log C(n,k) via lgamma-free factorial logs, stable for the small n here
function logFactorial(m: number): number {
  let s = 0
  for (let i = 2; i <= m; i++) s += Math.log(i)
  return s
}
function binomProb(n: number, k: number): number {
  const logC = logFactorial(n) - logFactorial(k) - logFactorial(n - k)
  return Math.exp(logC - n * Math.LN2)
}

// one ball in flight: a precomputed left/right walk + its target bin
type Ball = {
  id: number
  steps: number[] // length n, each 0 (left) or 1 (right)
  bin: number // == sum(steps)
  start: number // ms timestamp it began falling
}

export function GaltonBoard() {
  const [inViewRef, inView] = useInViewport<HTMLDivElement>('120px')
  const [n, setN] = useState(DEFAULT_N)
  const [counts, setCounts] = useState<number[]>(() => new Array(DEFAULT_N + 1).fill(0))
  const [total, setTotal] = useState(0)
  const [running, setRunning] = useState(false)
  const [liveBalls, setLiveBalls] = useState<Ball[]>([])

  const rafRef = useRef<number | null>(null)
  const idRef = useRef(0)
  const queueRef = useRef(0) // balls still to spawn in the active batch
  const lastSpawnRef = useRef(0)

  const bins = n + 1

  // ── geometry helpers ──────────────────────────────────────────────
  // pegs span the width; bin i centre lines up with peg column i.
  const innerW = VB_W - 2 * MARGIN_X
  const colGap = innerW / n // horizontal distance between adjacent columns
  // peg in row r (0..n-1) has r+1 pegs, centred. column index c is 0..r.
  const pegX = (r: number, c: number) => VB_W / 2 + (c - r / 2) * colGap
  const pegY = (r: number) => PEG_TOP + r * PEG_GAP_Y
  // bin centre: bin k sits under the gaps, k = 0..n across the full span
  const binX = (k: number) => MARGIN_X + (innerW * k) / n
  const binW = Math.min(colGap * 0.7, innerW / bins - 2)

  // position of a ball part-way down: interpolate its column as it walks
  function ballPos(ball: Ball, now: number) {
    const elapsed = now - ball.start
    const fRow = elapsed / FALL_PER_ROW // float row index 0..n
    if (fRow >= n) return null // landed — caller commits it
    const r = Math.floor(fRow)
    const frac = fRow - r
    // column drifts: at row r the ball sits between peg-column positions.
    // rights taken so far determines horizontal column at each level.
    const rightsBefore = ball.steps.slice(0, r).reduce((s, v) => s + v, 0)
    // x at the top of this row (entering row r): centred over the peg it hits
    const x0 = VB_W / 2 + (rightsBefore - r / 2) * colGap
    // after this row's deflection it shifts by ±half a column
    const dir = ball.steps[r] // 0 left, 1 right
    const x1 = x0 + (dir === 1 ? colGap / 2 : -colGap / 2)
    const y0 = pegY(r)
    const y1 = r + 1 < n ? pegY(r + 1) : HIST_TOP
    return { x: x0 + (x1 - x0) * frac, y: y0 + (y1 - y0) * frac }
  }

  // theoretical normal curve as (binPosition k, binProbability) samples.
  // The Normal density is rescaled so its value at integer k equals the
  // binomial bin probability C(n,k)/2ⁿ — i.e. density × (binWidth = 1).
  // Scaling to pixels happens at render time with the SAME axisMax the bars use.
  const normalSamples = useMemo(() => {
    const mean = n / 2
    const variance = n / 4
    const norm = 1 / Math.sqrt(2 * Math.PI * variance) // density at the mean
    const samples = 80
    const pts: { k: number; prob: number }[] = []
    for (let s = 0; s <= samples; s++) {
      const k = (s / samples) * n // 0..n in bin units
      const prob = norm * Math.exp(-((k - mean) ** 2) / (2 * variance)) // × binWidth 1
      pts.push({ k, prob })
    }
    return pts
  }, [n])

  // the tallest the histogram is drawn to: the larger of the theoretical peak
  // probability and the observed peak fraction, so both bars AND the overlaid
  // curve share one scale and the envelope always lands on the histogram.
  const theoPeak = useMemo(() => binomProb(n, Math.round(n / 2)), [n])
  const observedMaxFrac = total > 0 ? Math.max(...counts) / total : 0
  const axisMax = Math.max(theoPeak, observedMaxFrac) * 1.08

  // pixel polyline for the curve, scaled by the shared axisMax
  const normalPath = normalSamples
    .map(({ k, prob }) => `${binX(k).toFixed(1)},${(HIST_BASE - (prob / axisMax) * HIST_H).toFixed(1)}`)
    .join(' ')

  // ── committing a landed ball into the histogram ───────────────────
  const commit = (bin: number) => {
    setCounts((c) => {
      const next = c.slice()
      next[bin] += 1
      return next
    })
    setTotal((t) => t + 1)
  }

  const makeBall = (start: number): Ball => {
    const steps: number[] = []
    let bin = 0
    for (let r = 0; r < n; r++) {
      const right = Math.random() < 0.5 ? 1 : 0
      steps.push(right)
      bin += right
    }
    return { id: idRef.current++, steps, bin, start }
  }

  // instantly add a whole batch (reduced motion, or "fill" semantics)
  const addBatchInstant = (count: number) => {
    const add = new Array(bins).fill(0)
    for (let i = 0; i < count; i++) {
      let bin = 0
      for (let r = 0; r < n; r++) bin += Math.random() < 0.5 ? 1 : 0
      add[bin] += 1
    }
    setCounts((c) => c.map((v, i) => v + add[i]))
    setTotal((t) => t + count)
  }

  // ── rAF loop: spawn + advance + land balls ────────────────────────
  useEffect(() => {
    if (!running || !inView || reducedMotion()) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      return
    }
    const tick = (now: number) => {
      // spawn from the queue
      if (queueRef.current > 0 && now - lastSpawnRef.current >= SPAWN_EVERY) {
        lastSpawnRef.current = now
        queueRef.current -= 1
        setLiveBalls((b) => [...b, makeBall(now)])
      }
      // advance / land
      setLiveBalls((b) => {
        const stillFlying: Ball[] = []
        for (const ball of b) {
          if (ballPos(ball, now) === null) {
            commit(ball.bin)
          } else {
            stillFlying.push(ball)
          }
        }
        return stillFlying
      })
      // stop once the queue is drained and nothing is in flight
      if (queueRef.current <= 0) {
        setLiveBalls((b) => {
          if (b.length === 0) {
            setRunning(false)
          }
          return b
        })
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, inView, n])

  const drop = () => {
    if (reducedMotion()) {
      addBatchInstant(BATCH)
      return
    }
    queueRef.current += BATCH
    lastSpawnRef.current = 0
    setRunning(true)
  }

  const reset = () => {
    queueRef.current = 0
    setRunning(false)
    setLiveBalls([])
    setCounts(new Array(bins).fill(0))
    setTotal(0)
  }

  // changing rows resets the board entirely
  useEffect(() => {
    queueRef.current = 0
    setRunning(false)
    setLiveBalls([])
    setCounts(new Array(n + 1).fill(0))
    setTotal(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n])

  // seed a calm batch the first time it's in view so the bell is visible on
  // arrival instead of an empty board; pressing drop adds animated balls on top.
  const seededRef = useRef(false)
  useEffect(() => {
    if (inView && !seededRef.current) {
      seededRef.current = true
      addBatchInstant(220)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView])

  const accent = 'var(--color-blog)'

  // current rAF frame timestamp for rendering live balls (read once per render)
  const now = typeof performance !== 'undefined' ? performance.now() : 0

  return (
    <figure
      ref={inViewRef}
      className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          central limit theorem
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={drop}
            aria-pressed={running}
            className={`rounded-md px-3 py-1 font-mono text-[0.68rem] uppercase tracking-wider transition-colors ${
              running
                ? 'bg-blog/15 text-blog ring-1 ring-blog/40'
                : 'border border-[var(--color-border)] text-muted hover:text-fg'
            }`}
          >
            {running ? 'dropping…' : 'drop ▾'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-[var(--color-border)] px-3 py-1 font-mono text-[0.68rem] uppercase tracking-wider text-muted transition-colors hover:text-fg"
          >
            reset
          </button>
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full"
          style={{ maxWidth: 600, margin: '0 auto' }}
          role="img"
          aria-label={`A Galton board with ${n} rows of pegs dropping balls into ${bins} bins, forming a bell-shaped histogram with the theoretical normal curve overlaid. ${total} balls dropped.`}
        >
          {/* ── pegs (triangular array) ─────────────────────────── */}
          <g fill="color-mix(in srgb, var(--color-fg) 38%, transparent)">
            {Array.from({ length: n }).map((_, r) =>
              Array.from({ length: r + 1 }).map((__, c) => (
                <circle key={`peg-${r}-${c}`} cx={pegX(r, c)} cy={pegY(r)} r={2} />
              )),
            )}
          </g>

          {/* ── balls in flight ─────────────────────────────────── */}
          <g>
            {liveBalls.map((ball) => {
              const p = ballPos(ball, now)
              if (!p) return null
              return <circle key={ball.id} cx={p.x} cy={p.y} r={3.2} fill={accent} />
            })}
          </g>

          {/* ── histogram baseline ──────────────────────────────── */}
          <line
            x1={MARGIN_X - 6}
            y1={HIST_BASE}
            x2={VB_W - MARGIN_X + 6}
            y2={HIST_BASE}
            stroke="color-mix(in srgb, var(--color-border) 90%, transparent)"
            strokeWidth={1}
          />

          {/* ── histogram bars ──────────────────────────────────── */}
          {counts.map((count, k) => {
            const frac = total > 0 ? count / total : 0
            const h = axisMax > 0 ? (frac / axisMax) * HIST_H : 0
            const x = binX(k) - binW / 2
            return (
              <g key={`bar-${k}`}>
                <rect
                  x={x}
                  y={HIST_BASE - h}
                  width={binW}
                  height={Math.max(0, h)}
                  rx={2}
                  fill="color-mix(in srgb, var(--color-blog) 22%, transparent)"
                  stroke={accent}
                  strokeWidth={count > 0 ? 1 : 0}
                  style={{ transition: 'height 160ms ease, y 160ms ease' }}
                />
              </g>
            )
          })}

          {/* ── theoretical normal curve overlay ────────────────── */}
          {total > 0 && (
            <polyline
              points={normalPath}
              fill="none"
              stroke="#d98b5f"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* ── axis labels: the two extreme bins + centre ──────── */}
          <text
            x={binX(0)}
            y={HIST_BASE + 16}
            textAnchor="middle"
            className="font-mono"
            style={{ fontSize: 9.5, fill: 'var(--color-muted)' }}
          >
            0
          </text>
          <text
            x={binX(n / 2)}
            y={HIST_BASE + 16}
            textAnchor="middle"
            className="font-mono"
            style={{ fontSize: 9.5, fill: accent }}
          >
            {n / 2}
          </text>
          <text
            x={binX(n)}
            y={HIST_BASE + 16}
            textAnchor="middle"
            className="font-mono"
            style={{ fontSize: 9.5, fill: 'var(--color-muted)' }}
          >
            {n}
          </text>

          {/* legend */}
          <text
            x={VB_W - MARGIN_X + 6}
            y={PEG_TOP - 18}
            textAnchor="end"
            className="font-mono"
            style={{ fontSize: 10.5, fill: 'var(--color-fg)', fontWeight: 600 }}
          >
            {total.toLocaleString()} balls
          </text>
          <text
            x={VB_W - MARGIN_X + 6}
            y={PEG_TOP - 4}
            textAnchor="end"
            className="font-mono"
            style={{ fontSize: 9.5, fill: '#d98b5f' }}
          >
            normal(μ={n / 2}, σ²={(n / 4).toFixed(2)})
          </text>
        </svg>
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex items-center gap-4">
          <label
            htmlFor="gb-rows"
            className="whitespace-nowrap font-mono text-[0.7rem] uppercase tracking-wider text-muted"
          >
            rows
          </label>
          <input
            id="gb-rows"
            type="range"
            min={MIN_N}
            max={MAX_N}
            step={1}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]"
          />
          <span className="w-28 text-right font-mono text-[0.78rem] tabular-nums text-fg">
            {n} rows · {bins} bins
          </span>
        </div>
        <p className="mt-2 font-mono text-[0.66rem] leading-snug text-muted">
          Each ball is a sum of {n} independent fair coin-flips — left or right at every peg. No
          single flip matters, yet stacked together they pile up into the same bell every time. That
          is the Central Limit Theorem: average enough independent kicks and a Normal curve appears,
          whatever the kicks looked like. The orange line is the exact Normal(μ&nbsp;=&nbsp;n/2,
          σ²&nbsp;=&nbsp;n/4).
        </p>
      </div>
    </figure>
  )
}
