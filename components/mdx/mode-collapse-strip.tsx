'use client'

/**
 * ModeCollapseStrip — the "why regression fails on multimodal actions"
 * picture for "Robots that act by denoising" (diffusion policy).
 *
 * A robot arm can grasp a mug two equally-good ways: approach from the LEFT
 * or from the RIGHT. So the true conditional distribution over the approach
 * angle a, given an observation o, is BIMODAL — two bumps, one per strategy:
 *
 *   p(a | o) = ½·N(a; −s, σ²) + ½·N(a; +s, σ²)
 *
 * where s is half the separation between the two grasp strategies.
 *
 * A model trained with mean-squared error learns the CONDITIONAL MEAN of that
 * distribution. With equal-weight symmetric bumps the analytic mixture mean is
 * exactly the midpoint (a = 0) — which lands in the VALLEY between the bumps,
 * an angle that grasps nothing. "Split the difference" is the one action the
 * data never recommends. That's mode collapse, drawn in 1-D.
 *
 *   regression prediction  =  E[a | o]  =  ½·(−s) + ½·(+s)  =  0
 *   density there          =  p(0 | o)   →  0   as s grows
 *
 * A diffusion policy instead SAMPLES from p(a|o), so its draws land ON the two
 * bumps (committing to one grasp or the other), never in the dead valley. The
 * slider widens s: the regression line stays pinned at 0 while the valley it
 * sits in empties — the density-at-regression readout falls toward zero.
 *
 * Everything is computed from the real mixture math (no decorative fakes).
 * Samples are drawn ONCE with a seeded mulberry32 PRNG so the render is
 * deterministic and SSR-safe — never Math.random/Date.now during render.
 * The only motion is a gentle sampling shimmer, gated on in-view + running +
 * reduced-motion and cancelled on cleanup.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInViewport } from './use-in-viewport'

// ── plot domain & mixture params ───────────────────────────────────────────
const A_MIN = -3 // scalar action (approach angle), normalised units
const A_MAX = 3
const SIGMA = 0.34 // per-bump standard deviation (fixed)
const N_SAMPLES = 14 // diffusion samples drawn from the mixture
const SHIMMER_PERIOD = 2.6 // seconds per resample cycle (cosmetic only)

// separation slider: s is HALF the gap, so bump centres are ±s. The lower
// bound keeps the centres at least 2σ apart (2s > 2σ ⇒ s > σ), which is the
// exact condition for the equal-weight mixture to stay BIMODAL — so a true
// valley always exists between the bumps and p(mean) is genuinely below the
// peak, not just on the shoulder of a single merged hump.
const SEP_MIN = 1.0
const SEP_MAX = 2.4

const accent = 'var(--color-blog)' // diffusion / desk accent (green)
const REG_COLOR = '#d4664a' // regression line — a warm "wrong" red
const HIST_COLOR = 'color-mix(in srgb, var(--color-blog) 22%, transparent)'

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

// ── deterministic PRNG (mulberry32) — never Math.random during render ───────
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Box–Muller standard normal from a uniform PRNG.
function gaussian(rand: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = rand()
  while (v === 0) v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// ── mixture density: ½·N(−s,σ²) + ½·N(+s,σ²) ────────────────────────────────
function normalPdf(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI))
}

function mixturePdf(x: number, s: number): number {
  return 0.5 * normalPdf(x, -s, SIGMA) + 0.5 * normalPdf(x, +s, SIGMA)
}

// Draw fixed "diffusion samples" from the mixture: pick a mode by a stored
// fair coin, then offset by a stored standard normal scaled by σ. The seed is
// fixed so the SAME draws are reused at every separation — only the centre ±s
// moves, which is exactly how a diffusion policy would behave as the two
// strategies spread apart. Returned in two arrays so we can read each
// cluster's mean for verification.
type Draw = { mode: -1 | 1; z: number }
function makeDraws(seed: number, n: number): Draw[] {
  const rand = mulberry32(seed)
  const out: Draw[] = []
  for (let i = 0; i < n; i++) {
    const mode: -1 | 1 = rand() < 0.5 ? -1 : 1
    const z = gaussian(rand)
    out.push({ mode, z })
  }
  return out
}

// True peak density of the mixture (the height at a mode, accounting for the
// small bump-to-bump overlap). For symmetric bumps the maximum sits just
// outside ±s; we find it by a coarse scan + refine. Used so the "× emptier"
// factor compares the valley to the ACTUAL peak, satisfying the verification
// claim p(mean) < min(peak densities).
function peakDensity(s: number): number {
  let best = 0
  for (let x = 0; x <= A_MAX; x += 0.002) {
    const p = mixturePdf(x, s)
    if (p > best) best = p
  }
  return best
}

export function ModeCollapseStrip({
  initialSep = 1.4,
}: {
  initialSep?: number
}) {
  const [inViewRef, inView] = useInViewport<HTMLDivElement>('120px')
  const [sep, setSep] = useState(() =>
    Math.min(SEP_MAX, Math.max(SEP_MIN, initialSep)),
  )
  const [running, setRunning] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [phase, setPhase] = useState(0) // 0..1 shimmer phase (cosmetic)

  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  // s = half the separation → bump centres at ±s.
  const s = sep / 2

  // fixed diffusion draws (deterministic, computed once)
  const draws = useMemo(() => makeDraws(0x5eed1d, N_SAMPLES), [])

  // ── analytic quantities (the real math the picture must match) ───────────
  // mixture mean: equal weights & symmetric centres → exactly 0.
  const regX = 0 // E[a|o] = ½(−s) + ½(+s) = 0
  const pAtReg = mixturePdf(regX, s) // density the regression line sits in
  const peak = peakDensity(s) // true peak density at a mode
  const emptyFactor = peak / Math.max(pAtReg, 1e-9) // how many× emptier

  // sample positions a_i = mode·s + σ·z_i, and per-cluster means
  const samples = useMemo(
    () => draws.map((d) => d.mode * s + SIGMA * d.z),
    [draws, s],
  )
  const leftMean = useMemo(() => {
    const xs = draws
      .map((d, i) => (d.mode === -1 ? samples[i] : null))
      .filter((v): v is number => v != null)
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : -s
  }, [draws, samples, s])
  const rightMean = useMemo(() => {
    const xs = draws
      .map((d, i) => (d.mode === 1 ? samples[i] : null))
      .filter((v): v is number => v != null)
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : s
  }, [draws, samples, s])

  // ── viewBox geometry ─────────────────────────────────────────────────────
  const VB_W = 560
  const VB_H = 300
  const ML = 16
  const MR = 16
  const MT = 18
  const MB = 46
  const plotW = VB_W - ML - MR
  const plotH = VB_H - MT - MB
  const baseY = MT + plotH // y of the a-axis

  const ax = (a: number) => ML + ((a - A_MIN) / (A_MAX - A_MIN)) * plotW

  // y-scale: normalise so the tallest the density ever gets (a single bump at
  // max separation, where the modes don't overlap) maps near the top. Keeps
  // the curve from clipping as the bumps separate.
  const yMax = 0.5 * normalPdf(0, 0, SIGMA) * 1.08
  const ay = (p: number) => baseY - (p / yMax) * plotH

  // density curve as an SVG path (sampled finely from the real pdf)
  const curve = useMemo(() => {
    const STEPS = 160
    let d = ''
    for (let i = 0; i <= STEPS; i++) {
      const a = A_MIN + ((A_MAX - A_MIN) * i) / STEPS
      const p = mixturePdf(a, s)
      d += `${i === 0 ? 'M' : 'L'} ${ax(a).toFixed(2)} ${ay(p).toFixed(2)} `
    }
    return d.trim()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s])

  // closed area path (for the soft fill under the curve)
  const area = useMemo(() => {
    return `${curve} L ${ax(A_MAX).toFixed(2)} ${baseY.toFixed(2)} L ${ax(
      A_MIN,
    ).toFixed(2)} ${baseY.toFixed(2)} Z`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curve])

  // histogram of the samples reconstructing the bimodal shape
  const BINS = 24
  const histo = useMemo(() => {
    const counts = new Array(BINS).fill(0)
    for (const x of samples) {
      const f = (x - A_MIN) / (A_MAX - A_MIN)
      const b = Math.min(BINS - 1, Math.max(0, Math.floor(f * BINS)))
      counts[b] += 1
    }
    const maxC = Math.max(1, ...counts)
    return counts.map((c, i) => ({
      x0: ax(A_MIN + ((A_MAX - A_MIN) * i) / BINS),
      x1: ax(A_MIN + ((A_MAX - A_MIN) * (i + 1)) / BINS),
      h: (c / maxC) * (plotH * 0.5),
      c,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [samples])

  // ── shimmer clock (purely cosmetic: nudges sample dots & resample pulse) ──
  useEffect(() => {
    if (!running || dragging || !inView || reducedMotion()) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      startRef.current = null
      // under reduced motion / paused, settle to a static phase
      setPhase(0)
      return
    }
    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now
      const elapsed = ((now - startRef.current) / 1000) % SHIMMER_PERIOD
      setPhase(elapsed / SHIMMER_PERIOD)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, dragging, inView])

  // small vertical bob for each sample dot (deterministic per-index, cosmetic)
  const dotBob = (i: number) => {
    if (reducedMotion()) return 0
    return Math.sin(2 * Math.PI * (phase + i / N_SAMPLES)) * 2.2
  }
  // a soft resample pulse on the bump labels
  const pulse = reducedMotion() ? 0.6 : 0.45 + 0.25 * Math.sin(2 * Math.PI * phase)

  return (
    <figure
      ref={inViewRef}
      className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
      data-density-at-regression={pAtReg.toFixed(5)}
      data-regression-x={regX.toFixed(4)}
      data-left-cluster-mean={leftMean.toFixed(4)}
      data-right-cluster-mean={rightMean.toFixed(4)}
      data-peak-density={peak.toFixed(5)}
      data-empty-factor={emptyFactor.toFixed(2)}
      data-separation={sep.toFixed(3)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          p(action | observation) · two ways to grasp
        </span>
        <div className="flex items-center gap-3 font-mono text-[0.66rem] uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-muted">
            <span
              className="inline-block h-0.5 w-3"
              style={{ background: accent }}
            />
            density
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            <span
              className="inline-block h-0.5 w-3"
              style={{ background: REG_COLOR }}
            />
            MSE
          </span>
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full"
          style={{ maxWidth: 620, margin: '0 auto' }}
          role="img"
          aria-label={
            'A one-dimensional conditional action distribution that is bimodal: two bumps for grasping from the left versus the right. ' +
            'A red vertical line marks the mean-squared-error regression prediction, which falls in the empty valley between the bumps. ' +
            'Green dots are diffusion samples that land on the two bumps instead.'
          }
        >
          {/* baseline a-axis */}
          <line
            x1={ML}
            y1={baseY}
            x2={ML + plotW}
            y2={baseY}
            stroke="var(--color-border)"
            strokeWidth={1}
          />

          {/* histogram of diffusion samples (reconstructs the bimodal shape) */}
          <g>
            {histo.map((b, i) =>
              b.c > 0 ? (
                <rect
                  key={`h-${i}`}
                  x={b.x0 + 0.6}
                  y={baseY - b.h}
                  width={Math.max(0, b.x1 - b.x0 - 1.2)}
                  height={b.h}
                  fill={HIST_COLOR}
                  rx={1}
                />
              ) : null,
            )}
          </g>

          {/* density fill + curve (the real mixture pdf) */}
          <path
            d={area}
            fill="color-mix(in srgb, var(--color-blog) 9%, transparent)"
          />
          <path d={curve} fill="none" stroke={accent} strokeWidth={2.4} />

          {/* bump labels above each mode */}
          {([-1, 1] as const).map((m) => {
            const cx = ax(m * s)
            const cyTop = ay(0.5 * normalPdf(0, 0, SIGMA))
            return (
              <text
                key={`bl-${m}`}
                x={cx}
                y={Math.max(MT + 12, cyTop - 8)}
                textAnchor="middle"
                className="font-mono"
                style={{
                  fontSize: 10.5,
                  fill: accent,
                  fontWeight: 600,
                  opacity: pulse + 0.3,
                }}
              >
                {m === -1 ? 'grasp ← left' : 'grasp right →'}
              </text>
            )
          })}

          {/* regression line: the analytic mixture mean, pinned in the valley */}
          <line
            x1={ax(regX)}
            y1={MT - 2}
            x2={ax(regX)}
            y2={baseY}
            stroke={REG_COLOR}
            strokeWidth={2.2}
            strokeDasharray="5 4"
          />
          {/* dot where the regression line meets the (near-zero) density */}
          <circle cx={ax(regX)} cy={ay(pAtReg)} r={4} fill={REG_COLOR} />
          <text
            x={ax(regX)}
            y={MT + 10}
            textAnchor="middle"
            className="font-mono"
            style={{ fontSize: 10.5, fill: REG_COLOR, fontWeight: 700 }}
          >
            MSE-optimal = useless
          </text>
          <text
            x={ax(regX)}
            y={ay(pAtReg) - 9}
            textAnchor="middle"
            className="font-mono"
            style={{ fontSize: 9, fill: REG_COLOR }}
          >
            p = {pAtReg.toFixed(3)}
          </text>

          {/* diffusion samples: dots sitting on the bumps */}
          {samples.map((x, i) => {
            const px = ax(x)
            const py = ay(mixturePdf(x, s)) + dotBob(i)
            return (
              <circle
                key={`s-${i}`}
                cx={px}
                cy={py}
                r={3.4}
                fill={accent}
                stroke="var(--color-bg)"
                strokeWidth={1}
              />
            )
          })}

          {/* cluster-mean ticks straddling the regression line */}
          {[
            { x: leftMean, label: 'left μ' },
            { x: rightMean, label: 'right μ' },
          ].map((c, i) => (
            <g key={`cm-${i}`}>
              <line
                x1={ax(c.x)}
                y1={baseY - 6}
                x2={ax(c.x)}
                y2={baseY + 6}
                stroke={accent}
                strokeWidth={2}
              />
              <text
                x={ax(c.x)}
                y={baseY + 30}
                textAnchor="middle"
                className="font-mono"
                style={{ fontSize: 9.5, fill: 'var(--color-muted)' }}
              >
                {c.label}
              </text>
            </g>
          ))}

          {/* "diffusion samples" caption near the bottom */}
          <text
            x={ML + 2}
            y={baseY + 30}
            textAnchor="start"
            className="font-mono"
            style={{ fontSize: 10, fill: accent, fontWeight: 600 }}
          >
            ◦ diffusion samples
          </text>

          {/* a-axis label */}
          <text
            x={ML + plotW}
            y={baseY + 30}
            textAnchor="end"
            className="font-mono"
            style={{ fontSize: 10, fill: 'var(--color-muted)' }}
          >
            approach angle a →
          </text>
        </svg>
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <label
            htmlFor="mcs-sep"
            className="whitespace-nowrap font-mono text-[0.7rem] uppercase tracking-wider text-muted"
          >
            mode separation
          </label>
          <input
            id="mcs-sep"
            type="range"
            min={SEP_MIN}
            max={SEP_MAX}
            step={0.01}
            value={sep}
            onChange={(e) => setSep(Number(e.target.value))}
            onPointerDown={() => setDragging(true)}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]"
          />
          <span className="w-44 text-right font-mono text-[0.78rem] tabular-nums text-fg">
            p(mean) ={' '}
            <span style={{ color: REG_COLOR }}>{pAtReg.toFixed(3)}</span>{' '}
            <span className="text-muted">
              (
              {emptyFactor >= 100
                ? '≫'
                : emptyFactor.toFixed(0) + '×'}{' '}
              emptier)
            </span>
          </span>
        </div>
        <p className="mt-2 font-mono text-[0.66rem] leading-snug text-muted">
          The true policy is <span className="text-blog">bimodal</span> — grasp
          from the left or the right, both fine. Mean-squared-error regression
          learns the <span style={{ color: REG_COLOR }}>conditional mean</span>,
          which for two equal bumps is exactly the midpoint: an angle that sits
          in the empty <span style={{ color: REG_COLOR }}>valley</span> and
          grasps nothing. Widen the separation and the regression line stays
          pinned at 0 while the density beneath it{' '}
          <span style={{ color: REG_COLOR }}>p(mean) → 0</span>. A{' '}
          <span className="text-blog">diffusion policy samples</span> instead, so
          its draws commit to one bump or the other — never the dead centre.
        </p>
      </div>
    </figure>
  )
}
