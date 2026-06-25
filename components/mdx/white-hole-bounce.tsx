'use client'

/**
 * WhiteHoleBounce — gravitational collapse with two possible endings, for the
 * "The Universe Might Be Inside a Black Hole" flagship.
 *
 * A schematic worldline diagram: a cloud of matter falls inward, crosses its
 * Schwarzschild horizon r_s = 2GM/c², and then the story forks.
 *
 *   (1) CLASSICAL GR  — nothing halts the collapse. The matter is crushed to a
 *       point of infinite density: the singularity. The radius runs monotonically
 *       to zero and the physics ends there (a edge of spacetime).
 *
 *   (2) TORSION BOUNCE (Einstein–Cartan / Popławski) — fermion spin sources
 *       spacetime TORSION, which at enormous densities behaves as a repulsive
 *       term that overwhelms gravity at a finite minimum radius. Collapse halts,
 *       reverses, and rebounds — an expanding *new* universe whose rebound is its
 *       own Big Bang. To the parent universe this is a black hole; to the child it
 *       is a white-hole-like outpouring of expanding space. We may live in one.
 *
 * The figure animates a vertical worldline (time downward): radius R(t) shrinks
 * toward the horizon, then either → 0 (singularity) or bottoms out at R_min and
 * grows again (the new universe). A toggle flips the ending; the curve, the
 * horizon crossing, and the endpoint annotation all change with it.
 *
 * Physics shown: r_s = 2GM/c² with G = 6.674e-11, c = 2.998e8 (a one-solar-mass
 * core → ~2.95 km). The bounce radius is a schematic fraction of r_s — the real
 * Planck-density scale is far smaller, so the curve is illustrative, not metric.
 *
 * rAF loop is gated on in-view + reduced-motion (pauses off-screen). Under reduced
 * motion the worldline is drawn fully, statically, at its final state.
 */

import { useEffect, useRef, useState } from 'react'
import { useInViewport } from './use-in-viewport'

const G = 6.674e-11 // gravitational constant, m³ kg⁻¹ s⁻²
const C = 2.998e8 // speed of light, m s⁻¹
const M_SUN = 1.989e30 // solar mass, kg

// Schwarzschild radius r_s = 2GM/c² (metres)
function schwarzschild(massKg: number): number {
  return (2 * G * massKg) / (C * C)
}

function formatLength(m: number): string {
  if (m >= 9.461e15) return `${(m / 9.461e15).toFixed(2)} ly`
  if (m >= 1e3) return `${(m / 1e3).toFixed(2)} km`
  if (m >= 1) return `${m.toFixed(2)} m`
  if (m >= 1e-3) return `${(m * 1e3).toFixed(2)} mm`
  return m.toExponential(2) + ' m'
}

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

// viewBox geometry — a tall portrait panel; time runs top→bottom.
const VB_W = 360
const VB_H = 460

const CX = VB_W / 2 // collapse axis (the worldline is symmetric about it)
const TOP = 40 // y of t = 0 (start of collapse)
const HORIZON_Y = 150 // y where the worldline crosses the horizon
const FORK_Y = 250 // y where the two endings diverge (deep inside)
const BOTTOM = 430 // y of the final state

const R_MAX = 132 // pixel half-width of the matter cloud at t = 0
const R_HORIZON = 64 // pixel half-width of the horizon channel
const R_MIN = 26 // pixel half-width at the bounce floor (torsion case)

const ACCENT = 'var(--color-cosmology, #6366f1)'

type Ending = 'classical' | 'bounce'

// R(t) as a pixel half-width given a 0..1 progress along the worldline and the
// chosen ending. Both share the same infall down to the fork, then split.
function radiusAt(p: number, ending: Ending): number {
  // map progress 0..1 onto the y axis to find where we are
  if (p <= 0) return R_MAX
  if (p >= 1) return ending === 'classical' ? 0 : R_MAX * 0.86

  // phase 1: TOP → HORIZON (free-fall narrowing toward the horizon)
  const pHorizon = (HORIZON_Y - TOP) / (BOTTOM - TOP)
  const pFork = (FORK_Y - TOP) / (BOTTOM - TOP)

  if (p < pHorizon) {
    const t = p / pHorizon
    // ease-in: collapse accelerates
    return R_MAX + (R_HORIZON - R_MAX) * (t * t)
  }
  if (p < pFork) {
    const t = (p - pHorizon) / (pFork - pHorizon)
    return R_HORIZON + (R_MIN * 1.4 - R_HORIZON) * t
  }
  // phase 3: past the fork the endings diverge
  const t = (p - pFork) / (1 - pFork)
  if (ending === 'classical') {
    // crush to a point
    return (R_MIN * 1.4) * (1 - t * t)
  }
  // torsion bounce: reach R_MIN then rebound and expand
  if (t < 0.32) {
    const tt = t / 0.32
    return R_MIN * 1.4 + (R_MIN - R_MIN * 1.4) * tt // settle to the floor
  }
  const tt = (t - 0.32) / (1 - 0.32)
  // accelerating expansion of the new universe
  return R_MIN + (R_MAX * 0.86 - R_MIN) * (tt * tt)
}

function yAt(p: number): number {
  return TOP + p * (BOTTOM - TOP)
}

export function WhiteHoleBounce() {
  const [inViewRef, inView] = useInViewport<HTMLDivElement>('120px')
  const [ending, setEnding] = useState<Ending>('bounce')
  const [progress, setProgress] = useState(1) // 0..1 along the worldline
  const [playing, setPlaying] = useState(false)

  const rafRef = useRef<number | null>(null)
  const startRef = useRef(0)

  const r_s = schwarzschild(M_SUN)

  // build the left + right worldline edges as polyline point strings
  const STEPS = 96
  const edges = (() => {
    const pMax = playing || reducedMotion() ? progress : progress
    const left: string[] = []
    const right: string[] = []
    for (let i = 0; i <= STEPS; i++) {
      const p = (i / STEPS) * pMax
      const r = radiusAt(p, ending)
      const y = yAt(p)
      left.push(`${(CX - r).toFixed(1)},${y.toFixed(1)}`)
      right.push(`${(CX + r).toFixed(1)},${y.toFixed(1)}`)
    }
    return { left, right }
  })()

  // the filled worldsheet: left edge down, right edge back up
  const sheetPath = `M ${edges.left.join(' L ')} L ${edges.right
    .slice()
    .reverse()
    .join(' L ')} Z`

  const currentY = yAt(progress)
  const currentR = radiusAt(progress, ending)

  // ── rAF animation of the collapse ──────────────────────────────────
  useEffect(() => {
    if (!playing) return
    if (!inView || reducedMotion()) {
      // can't animate — snap to the end so the diagram is complete
      setProgress(1)
      setPlaying(false)
      return
    }
    const DURATION = 3200 // ms for the full collapse-and-bounce
    startRef.current = 0
    const tick = (now: number) => {
      if (!startRef.current) startRef.current = now
      const t = Math.min(1, (now - startRef.current) / DURATION)
      setProgress(t)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setPlaying(false)
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [playing, inView, ending])

  const play = () => {
    if (reducedMotion()) {
      setProgress(1)
      return
    }
    setProgress(0)
    setPlaying(true)
  }

  // switching the ending mid-flight restarts so the new fork is honest
  const setEndingAndReset = (e: Ending) => {
    setEnding(e)
    if (playing) {
      setProgress(0)
      startRef.current = 0
    }
  }

  const isBounce = ending === 'bounce'

  return (
    <figure
      ref={inViewRef}
      className="not-prose my-7 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
    >
      {/* header: title + ending toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          gravitational collapse
        </span>
        <div
          role="group"
          aria-label="Choose the ending"
          className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] p-0.5"
        >
          <button
            type="button"
            onClick={() => setEndingAndReset('classical')}
            aria-pressed={!isBounce}
            className={`rounded-md px-2.5 py-1 font-mono text-[0.64rem] uppercase tracking-wider transition-colors ${
              !isBounce
                ? 'bg-[var(--color-fg)]/[0.08] text-fg ring-1 ring-[var(--color-border)]'
                : 'text-muted hover:text-fg'
            }`}
          >
            singularity
          </button>
          <button
            type="button"
            onClick={() => setEndingAndReset('bounce')}
            aria-pressed={isBounce}
            className={`rounded-md px-2.5 py-1 font-mono text-[0.64rem] uppercase tracking-wider transition-colors ${
              isBounce
                ? 'text-[var(--color-cosmology,#6366f1)] ring-1'
                : 'text-muted hover:text-fg'
            }`}
            style={
              isBounce
                ? {
                    backgroundColor:
                      'color-mix(in srgb, var(--color-cosmology, #6366f1) 14%, transparent)',
                    boxShadow:
                      'inset 0 0 0 1px color-mix(in srgb, var(--color-cosmology, #6366f1) 40%, transparent)',
                  }
                : undefined
            }
          >
            torsion bounce
          </button>
        </div>
      </div>

      {/* the diagram */}
      <div className="px-2 py-4 sm:px-4">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full"
          style={{ maxWidth: 360, margin: '0 auto' }}
          role="img"
          aria-label={
            isBounce
              ? `Worldline of gravitational collapse: matter falls in, crosses the Schwarzschild horizon, and instead of forming a singularity it halts at a minimum radius via Einstein–Cartan torsion and rebounds into an expanding new universe — a white-hole-like Big Bang.`
              : `Worldline of gravitational collapse under classical general relativity: matter falls in, crosses the Schwarzschild horizon, and is crushed to a point of infinite density — the singularity.`
          }
        >
          <defs>
            <linearGradient id="whb-sheet" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="color-mix(in srgb, var(--color-fg) 14%, transparent)"
              />
              <stop
                offset="58%"
                stopColor="color-mix(in srgb, var(--color-cosmology, #6366f1) 22%, transparent)"
              />
              <stop
                offset="100%"
                stopColor="color-mix(in srgb, var(--color-cosmology, #6366f1) 30%, transparent)"
              />
            </linearGradient>
          </defs>

          {/* time axis arrow (downward) */}
          <line
            x1={20}
            y1={TOP - 8}
            x2={20}
            y2={BOTTOM + 6}
            stroke="color-mix(in srgb, var(--color-border) 90%, transparent)"
            strokeWidth={1}
          />
          <path
            d={`M 16 ${BOTTOM + 2} L 20 ${BOTTOM + 10} L 24 ${BOTTOM + 2}`}
            fill="none"
            stroke="color-mix(in srgb, var(--color-border) 90%, transparent)"
            strokeWidth={1}
          />
          <text
            x={20}
            y={TOP - 16}
            textAnchor="middle"
            className="font-mono"
            style={{ fontSize: 8.5, fill: 'var(--color-muted)' }}
          >
            t
          </text>

          {/* the Schwarzschild horizon: a dashed channel the matter crosses */}
          <g>
            <line
              x1={CX - R_HORIZON}
              y1={HORIZON_Y}
              x2={CX + R_HORIZON}
              y2={HORIZON_Y}
              stroke="color-mix(in srgb, var(--color-fg) 45%, transparent)"
              strokeWidth={1.2}
              strokeDasharray="4 3"
            />
            <text
              x={CX + R_HORIZON + 6}
              y={HORIZON_Y + 3}
              textAnchor="start"
              className="font-mono"
              style={{ fontSize: 8.5, fill: 'var(--color-muted)' }}
            >
              horizon r
              <tspan dy={2} style={{ fontSize: 6.5 }}>
                s
              </tspan>
            </text>
          </g>

          {/* the bounce floor (torsion ending only): minimum radius line */}
          {isBounce && (
            <line
              x1={CX - R_MIN * 1.6}
              y1={yAt((FORK_Y - TOP) / (BOTTOM - TOP) + 0.105)}
              x2={CX + R_MIN * 1.6}
              y2={yAt((FORK_Y - TOP) / (BOTTOM - TOP) + 0.105)}
              stroke={ACCENT}
              strokeWidth={1}
              strokeDasharray="2 3"
              opacity={0.7}
            />
          )}

          {/* the collapsing / bouncing worldsheet */}
          <path
            d={sheetPath}
            fill="url(#whb-sheet)"
            stroke={isBounce ? ACCENT : 'color-mix(in srgb, var(--color-fg) 55%, transparent)'}
            strokeWidth={1.4}
            strokeLinejoin="round"
          />

          {/* the leading edge (current matter front) marker */}
          <line
            x1={CX - currentR}
            y1={currentY}
            x2={CX + currentR}
            y2={currentY}
            stroke={isBounce ? ACCENT : 'var(--color-fg)'}
            strokeWidth={1.6}
            opacity={0.85}
          />

          {/* ENDING annotation */}
          {!isBounce ? (
            // classical: the singularity point
            <g>
              <circle cx={CX} cy={BOTTOM} r={3.6} fill="var(--color-fg)" />
              <circle
                cx={CX}
                cy={BOTTOM}
                r={9}
                fill="none"
                stroke="var(--color-fg)"
                strokeWidth={0.8}
                opacity={0.4}
              />
              <text
                x={CX}
                y={BOTTOM + 22}
                textAnchor="middle"
                className="font-mono"
                style={{ fontSize: 9, fill: 'var(--color-fg)', fontWeight: 600 }}
              >
                singularity · ρ → ∞
              </text>
              <text
                x={CX}
                y={BOTTOM + 34}
                textAnchor="middle"
                className="font-mono"
                style={{ fontSize: 7.5, fill: 'var(--color-muted)' }}
              >
                spacetime ends
              </text>
            </g>
          ) : (
            // bounce: an expanding new universe (white-hole-like output)
            <g>
              {/* radiating "Big Bang" rays at the rebound */}
              <g
                stroke={ACCENT}
                strokeWidth={0.9}
                opacity={0.55}
                strokeLinecap="round"
              >
                {Array.from({ length: 9 }).map((_, i) => {
                  const a = (-90 + (i - 4) * 18) * (Math.PI / 180)
                  const yFloor = yAt((FORK_Y - TOP) / (BOTTOM - TOP) + 0.105)
                  return (
                    <line
                      key={i}
                      x1={CX}
                      y1={yFloor}
                      x2={CX + Math.cos(a) * 16}
                      y2={yFloor + Math.sin(a) * 16}
                    />
                  )
                })}
              </g>
              <text
                x={CX}
                y={BOTTOM + 22}
                textAnchor="middle"
                className="font-mono"
                style={{
                  fontSize: 9,
                  fill: 'var(--color-cosmology, #6366f1)',
                  fontWeight: 600,
                }}
              >
                new universe expands
              </text>
              <text
                x={CX}
                y={BOTTOM + 34}
                textAnchor="middle"
                className="font-mono"
                style={{ fontSize: 7.5, fill: 'var(--color-muted)' }}
              >
                the rebound is its Big Bang
              </text>
            </g>
          )}

          {/* stage label (top) */}
          <text
            x={CX}
            y={TOP - 14}
            textAnchor="middle"
            className="font-mono"
            style={{ fontSize: 8.5, fill: 'var(--color-muted)' }}
          >
            collapsing matter (mass M)
          </text>
        </svg>
      </div>

      {/* controls + readout */}
      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={play}
            aria-pressed={playing}
            className={`rounded-md px-3 py-1 font-mono text-[0.68rem] uppercase tracking-wider transition-colors ${
              playing
                ? 'text-[var(--color-cosmology,#6366f1)] ring-1 ring-[var(--color-cosmology,#6366f1)]/40'
                : 'border border-[var(--color-border)] text-muted hover:text-fg'
            }`}
            style={
              playing
                ? {
                    backgroundColor:
                      'color-mix(in srgb, var(--color-cosmology, #6366f1) 14%, transparent)',
                  }
                : undefined
            }
          >
            {playing ? 'collapsing…' : 'play collapse ▸'}
          </button>
          <span className="font-mono text-[0.66rem] tabular-nums text-muted">
            r<sub>s</sub> = 2GM/c² ={' '}
            <span className="text-fg">{formatLength(r_s)}</span>{' '}
            <span className="text-fg/50">(M = 1 M☉)</span>
          </span>
        </div>

        <p className="mt-2 font-mono text-[0.66rem] leading-snug text-muted">
          {isBounce ? (
            <>
              In Einstein–Cartan gravity the spin of fermions sources spacetime{' '}
              <span className="text-fg/80">torsion</span>, an effective repulsion
              that overwhelms gravity at a finite density. Collapse halts at a
              minimum radius and rebounds (Popławski): an expanding new universe
              whose rebound is its own <span className="text-fg/80">Big Bang</span>.
              From outside it is a black hole; from inside, a white-hole-like
              outpouring of space. We may be living in one. The curve is a
              schematic — the real bounce sits near Planck density, far below{' '}
              r<sub>s</sub>.
            </>
          ) : (
            <>
              In classical general relativity nothing stops the collapse. Once the
              matter is inside its Schwarzschild radius{' '}
              r<sub>s</sub> = 2GM/c² (with G = 6.674×10⁻¹¹, c = 2.998×10⁸), every
              path leads inward and the density runs to infinity at a{' '}
              <span className="text-fg/80">singularity</span> — an edge where the
              theory itself breaks down and spacetime ends.
            </>
          )}
        </p>
      </div>
    </figure>
  )
}
