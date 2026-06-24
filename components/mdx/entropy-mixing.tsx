'use client'

/**
 * EntropyMixing — the arrow of time as a counting argument, for the post
 * "Why time only runs forwards".
 *
 * A 2-D box of particles in two colours. Teal particles (var(--color-blog))
 * start in the LEFT half, warm particles ('#d98b5f') in the RIGHT half, cleanly
 * separated by a partition. Hit "release" and the partition is removed: every
 * particle moves at constant velocity and reflects elastically off the box
 * walls — perfectly time-reversible micro-rules. Yet the two colours
 * interdiffuse and the box ends up evenly mixed.
 *
 * A live entropy readout tracks a coarse-grained POSITIONAL entropy:
 *   f_L = fraction of teal particles in the left half
 *   f_R = fraction of warm particles in the right half
 *   S/k = -N_teal·[f_L·ln f_L + (1−f_L)·ln(1−f_L)]
 *         -N_warm·[f_R·ln f_R + (1−f_R)·ln(1−f_R)]      (0·ln0 ≡ 0)
 * It starts near 0 (fully separated) and climbs to ≈ N·ln2 at full mixing,
 * then plateaus — it never un-mixes, because mixed arrangements vastly
 * outnumber separated ones.
 *
 * rAF integrates positions in a ref array and writes cx/cy to the SVG circles
 * imperatively for perf; the entropy readout re-renders at a throttled rate.
 * The loop is gated on in-view + running + reduced-motion (pauses off-screen).
 * Under reduced motion it renders the mixed end-state statically with S at max.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useInViewport } from './use-in-viewport'

const MIN_N = 40
const MAX_N = 120
const DEFAULT_N = 80

// box geometry, in viewBox units
const VB_W = 600
const VB_H = 360
const BOX_X = 24
const BOX_Y = 60
const BOX_W = 552
const BOX_H = 230
const R = 4.4 // particle radius
const SPEED = 70 // units per second
const READOUT_HZ = 12 // entropy re-render throttle

const TEAL = 'var(--color-blog)'
const WARM = '#d98b5f'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  teal: boolean // true = teal (starts left), false = warm (starts right)
}

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

// deterministic pseudo-random so layouts are stable across renders for a seed
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 0·ln0 ≡ 0
const xlnx = (p: number) => (p <= 0 ? 0 : p * Math.log(p))

/**
 * Build a freshly separated population: teal left, warm right, random
 * positions inside each half and random velocity directions at fixed speed.
 * Equal counts; if n is odd the extra particle goes to teal.
 */
function makeSeparated(n: number, seed: number): Particle[] {
  const rng = mulberry32(seed)
  const nTeal = Math.ceil(n / 2)
  const mid = BOX_X + BOX_W / 2
  const ps: Particle[] = []
  for (let i = 0; i < n; i++) {
    const teal = i < nTeal
    // keep a small gutter around the partition so the start is visibly separated
    const xLo = teal ? BOX_X + R : mid + R + 4
    const xHi = teal ? mid - R - 4 : BOX_X + BOX_W - R
    const x = xLo + rng() * (xHi - xLo)
    const y = BOX_Y + R + rng() * (BOX_H - 2 * R)
    const ang = rng() * Math.PI * 2
    ps.push({ x, y, vx: Math.cos(ang) * SPEED, vy: Math.sin(ang) * SPEED, teal })
  }
  return ps
}

type Readout = { s: number; sMax: number; pct: number; leftTealPct: number }

function computeReadout(ps: Particle[]): Readout {
  const mid = BOX_X + BOX_W / 2
  let nTeal = 0
  let nWarm = 0
  let tealLeft = 0
  let warmRight = 0
  for (const p of ps) {
    if (p.teal) {
      nTeal++
      if (p.x < mid) tealLeft++
    } else {
      nWarm++
      if (p.x >= mid) warmRight++
    }
  }
  const fL = nTeal > 0 ? tealLeft / nTeal : 0
  const fR = nWarm > 0 ? warmRight / nWarm : 0
  const s =
    -nTeal * (xlnx(fL) + xlnx(1 - fL)) - nWarm * (xlnx(fR) + xlnx(1 - fR))
  const n = nTeal + nWarm
  const sMax = n * Math.log(2)
  const pct = sMax > 0 ? Math.max(0, Math.min(1, s / sMax)) : 0
  return { s, sMax, pct, leftTealPct: fL }
}

export function EntropyMixing() {
  const [inViewRef, inView] = useInViewport<HTMLDivElement>('120px')
  const [n, setN] = useState(DEFAULT_N)
  const [running, setRunning] = useState(false)
  const [reduced, setReduced] = useState(false)

  // particle state lives in a ref so the rAF loop mutates it without re-rendering
  const particlesRef = useRef<Particle[]>([])
  const circleRefs = useRef<(SVGCircleElement | null)[]>([])
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const lastReadoutRef = useRef<number>(0)
  const seedRef = useRef<number>(1)

  // entropy readout is the only thing that re-renders during play (throttled)
  const [readout, setReadout] = useState<Readout>(() => ({
    s: 0,
    sMax: DEFAULT_N * Math.log(2),
    pct: 0,
    leftTealPct: 1,
  }))

  // detect reduced motion once on mount (so SSR renders the animated default)
  useEffect(() => {
    setReduced(reducedMotion())
  }, [])

  // write current positions to the SVG circles imperatively
  const paint = useCallback(() => {
    const ps = particlesRef.current
    for (let i = 0; i < ps.length; i++) {
      const c = circleRefs.current[i]
      if (c) {
        c.setAttribute('cx', String(ps[i].x))
        c.setAttribute('cy', String(ps[i].y))
      }
    }
  }, [])

  // (re)build the population, separated, and repaint
  const seed = useCallback(
    (count: number, mixed = false) => {
      seedRef.current += 1
      let ps = makeSeparated(count, seedRef.current)
      if (mixed) ps = stepUntilMixed(ps)
      particlesRef.current = ps
      circleRefs.current.length = ps.length
      setReadout(computeReadout(ps))
      // paint after refs settle on next frame
      requestAnimationFrame(paint)
    },
    [paint],
  )

  // initial population + rebuild whenever the count changes
  useEffect(() => {
    setRunning(false)
    seed(n, reduced)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, reduced])

  // physics: advance one timestep, reflecting off walls and clamping inside
  const integrate = useCallback((dt: number) => {
    const ps = particlesRef.current
    const left = BOX_X + R
    const right = BOX_X + BOX_W - R
    const top = BOX_Y + R
    const bottom = BOX_Y + BOX_H - R
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.x < left) {
        p.x = left + (left - p.x)
        p.vx = Math.abs(p.vx)
      } else if (p.x > right) {
        p.x = right - (p.x - right)
        p.vx = -Math.abs(p.vx)
      }
      if (p.y < top) {
        p.y = top + (top - p.y)
        p.vy = Math.abs(p.vy)
      } else if (p.y > bottom) {
        p.y = bottom - (p.y - bottom)
        p.vy = -Math.abs(p.vy)
      }
      // hard clamp as a safety net so nothing can ever escape the box
      if (p.x < left) p.x = left
      else if (p.x > right) p.x = right
      if (p.y < top) p.y = top
      else if (p.y > bottom) p.y = bottom
    }
  }, [])

  // rAF loop — gated on in-view + running + !reduced
  useEffect(() => {
    if (!running || !inView || reduced) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTimeRef.current = null
      return
    }
    const tick = (now: number) => {
      if (lastTimeRef.current == null) lastTimeRef.current = now
      // clamp dt so a backgrounded tab doesn't teleport particles through walls
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000)
      lastTimeRef.current = now
      integrate(dt)
      paint()
      if (now - lastReadoutRef.current > 1000 / READOUT_HZ) {
        lastReadoutRef.current = now
        setReadout(computeReadout(particlesRef.current))
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTimeRef.current = null
    }
  }, [running, inView, reduced, integrate, paint])

  const release = () => {
    if (reduced) {
      seed(n, true) // jump straight to the mixed end-state
      return
    }
    lastTimeRef.current = null
    setRunning((r) => !r)
  }

  const reset = () => {
    setRunning(false)
    seed(n, reduced)
  }

  const particles = particlesRef.current
  const mid = BOX_X + BOX_W / 2

  const sparkPath = useSparkline(readout.pct, running)

  return (
    <figure
      ref={inViewRef}
      className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          entropy · mixing
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={release}
            className="rounded-md border border-[var(--color-border)] bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider text-fg transition-colors hover:border-[var(--color-muted)]"
          >
            {reduced ? 'mix ▶' : running ? 'pause ❚❚' : 'release ▶'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-[var(--color-border)] bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider text-fg transition-colors hover:border-[var(--color-muted)]"
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
          aria-label="A box of teal particles starting on the left and warm particles on the right; on release they move and reflect off the walls, mixing evenly while a coarse-grained entropy readout climbs from zero to its maximum and plateaus."
        >
          {/* box */}
          <rect
            x={BOX_X}
            y={BOX_Y}
            width={BOX_W}
            height={BOX_H}
            rx={10}
            fill="var(--color-surface-2, rgba(127,127,127,0.06))"
            stroke="var(--color-border)"
            strokeWidth={1}
          />

          {/* partition line — solid when separated, dashed/faded once released */}
          <line
            x1={mid}
            y1={BOX_Y}
            x2={mid}
            y2={BOX_Y + BOX_H}
            stroke="var(--color-border)"
            strokeWidth={1.25}
            strokeDasharray={running || readout.pct > 0.02 ? '4 5' : undefined}
            style={{
              opacity: running || readout.pct > 0.02 ? 0.45 : 0.9,
              transition: 'opacity 300ms ease',
            }}
          />

          {/* half labels */}
          <text
            x={BOX_X + BOX_W / 4}
            y={BOX_Y - 12}
            textAnchor="middle"
            className="font-mono"
            style={{ fontSize: 10, fill: 'var(--color-muted)' }}
          >
            left half
          </text>
          <text
            x={BOX_X + (3 * BOX_W) / 4}
            y={BOX_Y - 12}
            textAnchor="middle"
            className="font-mono"
            style={{ fontSize: 10, fill: 'var(--color-muted)' }}
          >
            right half
          </text>

          {/* particles */}
          {particles.map((p, i) => (
            <circle
              key={i}
              ref={(el) => {
                circleRefs.current[i] = el
              }}
              cx={p.x}
              cy={p.y}
              r={R}
              fill={p.teal ? TEAL : WARM}
              fillOpacity={0.92}
            />
          ))}

          {/* ── entropy panel ─────────────────────────────────────── */}
          <g transform={`translate(${BOX_X}, ${BOX_Y + BOX_H + 28})`}>
            <text
              className="font-mono"
              style={{ fontSize: 10.5, fill: 'var(--color-fg)', fontWeight: 600 }}
            >
              entropy S/k
            </text>
            <text
              x={BOX_W}
              textAnchor="end"
              className="font-mono"
              style={{ fontSize: 10.5, fill: TEAL, fontWeight: 700 }}
            >
              {Math.round(readout.pct * 100)}% of max
              <tspan
                style={{ fill: 'var(--color-muted)', fontWeight: 400 }}
                dx={6}
              >
                ({readout.s.toFixed(1)} / {readout.sMax.toFixed(1)})
              </tspan>
            </text>

            {/* bar track + fill */}
            <rect
              y={10}
              width={BOX_W}
              height={10}
              rx={5}
              fill="var(--color-surface-2, rgba(127,127,127,0.06))"
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <rect
              y={10}
              width={Math.max(0, readout.pct * BOX_W)}
              height={10}
              rx={5}
              fill={TEAL}
              style={{ transition: 'width 90ms linear' }}
            />

            {/* tiny S(t) sparkline */}
            <g transform="translate(0, 30)">
              <line
                x1={0}
                y1={SPARK_H}
                x2={BOX_W}
                y2={SPARK_H}
                stroke="color-mix(in srgb, var(--color-border) 70%, transparent)"
                strokeWidth={1}
              />
              <path d={sparkPath} fill="none" stroke={WARM} strokeWidth={1.6} />
            </g>
          </g>
        </svg>
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex items-center gap-4">
          <label
            htmlFor="em-n"
            className="whitespace-nowrap font-mono text-[0.7rem] uppercase tracking-wider text-muted"
          >
            particles
          </label>
          <input
            id="em-n"
            type="range"
            min={MIN_N}
            max={MAX_N}
            step={2}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]"
          />
          <span className="w-40 text-right font-mono text-[0.78rem] tabular-nums text-fg">
            left half: {Math.round(readout.leftTealPct * 100)}% teal
          </span>
        </div>
        <p className="mt-2 font-mono text-[0.66rem] leading-snug text-muted">
          Every collision here is perfectly reversible — run the rules backwards
          and they are just as valid. Yet the box mixes and essentially never
          un-mixes. Nothing forbids the reverse; it is simply that mixed
          arrangements outnumber separated ones so overwhelmingly that the
          separated state never recurs. That counting asymmetry, not any law of
          motion, is the arrow of time.
        </p>
      </div>
    </figure>
  )
}

const SPARK_W = BOX_W
const SPARK_H = 34
const SPARK_MAX = 120 // samples kept

/**
 * useSparkline — accumulates the entropy fraction over time into a small
 * left-to-right curve. Resets to empty whenever play stops/reset (running
 * flips), so the curve always traces the current run from zero.
 */
function useSparkline(pct: number, running: boolean): string {
  const samplesRef = useRef<number[]>([])
  const [, force] = useState(0)
  const prevRunning = useRef(running)

  // clear the trace when a fresh run starts
  if (running && !prevRunning.current) samplesRef.current = []
  prevRunning.current = running

  useEffect(() => {
    const s = samplesRef.current
    s.push(pct)
    if (s.length > SPARK_MAX) s.shift()
    force((c) => c + 1)
  }, [pct])

  return useMemo(() => {
    const s = samplesRef.current
    if (s.length < 2) {
      const y = SPARK_H - (s[0] ?? 0) * SPARK_H
      return `M 0 ${y.toFixed(1)} L 2 ${y.toFixed(1)}`
    }
    const step = SPARK_W / Math.max(1, SPARK_MAX - 1)
    return s
      .map((v, i) => {
        const x = i * step
        const y = SPARK_H - v * SPARK_H
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')
    // recompute on every sample push
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct])
}

/**
 * stepUntilMixed — for reduced-motion / "mix" jump: advance the physics with a
 * coarse timestep until the population is well mixed (or a step cap is hit),
 * so the static render shows the fully-mixed end-state with S near max.
 */
function stepUntilMixed(input: Particle[]): Particle[] {
  const ps = input.map((p) => ({ ...p }))
  const left = BOX_X + R
  const right = BOX_X + BOX_W - R
  const top = BOX_Y + R
  const bottom = BOX_Y + BOX_H - R
  const dt = 0.05
  for (let s = 0; s < 600; s++) {
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.x < left) {
        p.x = left + (left - p.x)
        p.vx = Math.abs(p.vx)
      } else if (p.x > right) {
        p.x = right - (p.x - right)
        p.vx = -Math.abs(p.vx)
      }
      if (p.y < top) {
        p.y = top + (top - p.y)
        p.vy = Math.abs(p.vy)
      } else if (p.y > bottom) {
        p.y = bottom - (p.y - bottom)
        p.vy = -Math.abs(p.vy)
      }
      if (p.x < left) p.x = left
      else if (p.x > right) p.x = right
      if (p.y < top) p.y = top
      else if (p.y > bottom) p.y = bottom
    }
    if (s > 200 && computeReadout(ps).pct > 0.9) break
  }
  return ps
}
