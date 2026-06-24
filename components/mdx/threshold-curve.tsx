'use client'

/**
 * ThresholdCurve — the error-correction threshold, made visible, for
 * "Remembering a qubit that forgets" (quantum error correction).
 *
 * A surface code stores ONE logical qubit across d² physical qubits, where d is
 * the code distance (an odd number: 3, 5, 7, …). Each physical qubit fails with
 * probability p. The magic is the THRESHOLD pTh: there is a crossover physical
 * error rate below which adding MORE qubits (bigger d) makes the logical qubit
 * EXPONENTIALLY safer, and above which more qubits make it WORSE. The standard
 * scaling for the logical error rate is
 *
 *     p_L(d) = A · (p / pTh) ^ ((d+1)/2)        clamped to [0, 1]
 *
 * with A = pTh, so every curve passes through the single crossing point
 * (pTh, pTh): there p/pTh = 1 and (anything)^k = 1, so p_L = A = pTh for ALL d.
 * That point sits exactly on the break-even diagonal p_L = p (the faint
 * reference line). BELOW pTh the exponent multiplies a number < 1, so a larger d
 * drives p_L down harder — the curves fan DOWNWARD. ABOVE pTh it multiplies a
 * number > 1, so larger d climbs faster — they fan UPWARD.
 *
 * The suppression factor Λ compares two distances two steps apart:
 *     Λ = sqrt( p_L(d) / p_L(d+2) ) = sqrt(pTh / p)
 * Each +2 in distance suppresses the logical error by a factor Λ when you are
 * below threshold (Google's Willow reported Λ ≈ 2.14). The readout exposes Λ and
 * each curve's p_L so a DOM test can read the math without pixel-peeping.
 *
 * Pure SVG on a log-log plot. The ONLY animation is an optional easing tween of
 * the draggable operating-point marker; it is paused during the drag itself and
 * gated on in-view + reduced-motion (jumps straight to the target otherwise).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInViewport } from './use-in-viewport'

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

// ── viewBox geometry ────────────────────────────────────────────────────────
const VB_W = 600
const VB_H = 430
const ML = 58
const MR = 22
const MT = 26
const MB = 46
const plotW = VB_W - ML - MR
const plotH = VB_H - MT - MB

// log-scaled axis range (decades). x = physical error rate p, y = logical p_L.
const X_MIN = 1e-3
const X_MAX = 1e-1
const Y_MIN = 1e-9
const Y_MAX = 1e0

const L10 = Math.log(10)
const log10 = (v: number) => Math.log(v) / L10

// the curve colours: primary accent (the post desk colour) plus two extra
// encoding tints so several distances stay distinguishable. The accent is
// always var(--color-blog); the extras are explicit so they read in both themes.
const ACCENT = 'var(--color-blog)'
const EXTRA_TINTS = ['#14b8a6', '#f59e0b', '#ec4899', '#38bdf8'] // teal, amber, pink, sky

// ── error model ─────────────────────────────────────────────────────────────
// p_L(d) = A·(p/pTh)^((d+1)/2), A = pTh so all curves cross at (pTh, pTh).
function plAt(p: number, d: number, pTh: number): number {
  const A = pTh
  const expo = (d + 1) / 2
  const v = A * Math.pow(p / pTh, expo)
  return v < 0 ? 0 : v > 1 ? 1 : v
}

export interface ThresholdCurveProps {
  distances?: number[]
  pTh?: number
  /** initial operating-point physical error rate */
  p0?: number
  /** show the "Willow operating point" annotation */
  willow?: boolean
}

export function ThresholdCurve({
  distances = [3, 5, 7, 9],
  pTh = 0.01,
  p0 = 0.002,
  willow = true,
}: ThresholdCurveProps) {
  const [inViewRef, inView] = useInViewport<HTMLDivElement>('120px')

  // operating point p (committed, displayed value), and a tween target.
  const [p, setP] = useState(() => clampX(p0))
  const [dragging, setDragging] = useState(false)

  const svgRef = useRef<SVGSVGElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const targetRef = useRef(clampX(p0))
  const pRef = useRef(clampX(p0))

  // colour per distance: first curve = accent, then the extra tints, cycling.
  const colourFor = useMemo(() => {
    return (i: number): string => (i === 0 ? ACCENT : EXTRA_TINTS[(i - 1) % EXTRA_TINTS.length])
  }, [])

  // ── coordinate transforms (log-scaled) ──
  const tx = (v: number) =>
    ML + ((log10(v) - log10(X_MIN)) / (log10(X_MAX) - log10(X_MIN))) * plotW
  const ty = (v: number) => {
    const vv = v < Y_MIN ? Y_MIN : v > Y_MAX ? Y_MAX : v
    return MT + (1 - (log10(vv) - log10(Y_MIN)) / (log10(Y_MAX) - log10(Y_MIN))) * plotH
  }
  // inverse of tx: pixel-x → physical error rate
  const txInv = (xpx: number) => {
    const f = (xpx - ML) / plotW
    const lg = log10(X_MIN) + f * (log10(X_MAX) - log10(X_MIN))
    return Math.pow(10, lg)
  }

  // ── sampled curve paths (sampled densely in log-x for smoothness) ──
  const curves = useMemo(() => {
    const SAMPLES = 120
    return distances.map((d) => {
      let dpath = ''
      for (let i = 0; i <= SAMPLES; i++) {
        const f = i / SAMPLES
        const lg = log10(X_MIN) + f * (log10(X_MAX) - log10(X_MIN))
        const xv = Math.pow(10, lg)
        const yv = plAt(xv, d, pTh)
        dpath += `${i === 0 ? 'M' : 'L'} ${tx(xv).toFixed(2)} ${ty(yv).toFixed(2)} `
      }
      return { d, path: dpath }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distances, pTh])

  // break-even diagonal p_L = p, clipped to the visible window.
  const diagPath = useMemo(() => {
    const x1 = Math.max(X_MIN, Y_MIN)
    const x2 = Math.min(X_MAX, Y_MAX)
    return `M ${tx(x1).toFixed(2)} ${ty(x1).toFixed(2)} L ${tx(x2).toFixed(2)} ${ty(x2).toFixed(2)}`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── marker drag → set the tween target ──
  const setFromClientX = (clientX: number) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    // map client px → viewBox px (svg is responsive width)
    const vbX = ((clientX - rect.left) / rect.width) * VB_W
    const xv = clampX(txInv(vbX))
    targetRef.current = xv
    pRef.current = xv
    setP(xv) // during drag follow the pointer 1:1, no tween
  }

  // ── easing tween toward targetRef when NOT dragging (e.g. on click jumps) ──
  useEffect(() => {
    if (dragging) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      return
    }
    if (!inView || reducedMotion()) {
      // jump straight to the target — no animation
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      pRef.current = targetRef.current
      setP(targetRef.current)
      return
    }
    const tick = () => {
      // ease in log space so it feels even across decades
      const cur = log10(pRef.current)
      const tgt = log10(targetRef.current)
      const next = cur + (tgt - cur) * 0.2
      if (Math.abs(tgt - next) < 1e-4) {
        pRef.current = targetRef.current
        setP(targetRef.current)
        rafRef.current = null
        return
      }
      const nv = Math.pow(10, next)
      pRef.current = nv
      setP(nv)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, inView, p])

  // pointer handlers on the whole plot for grabbing the marker anywhere
  useEffect(() => {
    if (!dragging) return
    const move = (e: PointerEvent) => setFromClientX(e.clientX)
    const up = () => setDragging(false)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging])

  // ── derived readout state ──
  const belowThreshold = p < pTh
  // p_L for each distance at the operating point
  const plValues = distances.map((d) => ({ d, pl: plAt(p, d, pTh) }))
  // Λ = sqrt(p_L(d) / p_L(d+2)) for the first pair available → equals sqrt(pTh/p)
  const dLo = distances[0]
  const lambda = useMemo(() => {
    const a = plAt(p, dLo, pTh)
    const b = plAt(p, dLo + 2, pTh)
    if (b <= 0) return Infinity
    return Math.sqrt(a / b)
  }, [p, dLo, pTh])
  // closed form for the caption / cross-check
  const lambdaTheory = Math.sqrt(pTh / p)

  // willow annotation point: choose p so Λ ≈ 2.14 → pTh/p = 2.14² ≈ 4.58
  const willowP = pTh / (2.14 * 2.14)

  // ── decade gridlines + tick labels ──
  const xDecades = [-3, -2, -1] // 1e-3 .. 1e-1
  const yDecades = [0, -2, -4, -6, -8] // 1e0 .. 1e-8 (every other decade labelled)

  const fmtSci = (v: number) => {
    if (v === 0) return '0'
    const e = Math.round(log10(v))
    return `10^${e}`
  }

  const markerX = tx(p)

  return (
    <figure
      ref={inViewRef}
      className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          error-correction threshold · logical vs physical
        </span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.66rem] uppercase tracking-wider">
          {distances.map((d, i) => (
            <span key={`leg-${d}`} className="flex items-center gap-1.5 text-muted">
              <span
                className="inline-block h-0.5 w-3"
                style={{ background: colourFor(i) }}
              />
              d={d}
            </span>
          ))}
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full touch-none select-none"
          style={{ maxWidth: 660, margin: '0 auto' }}
          role="img"
          aria-label={`Log-log plot of logical error rate versus physical error rate, with one curve per code distance (${distances.join(', ')}). All curves cross at the threshold p = ${pTh}, fanning downward below it (bigger codes suppress errors) and upward above it. A draggable marker sets the operating point.`}
          onPointerDown={(e) => {
            setDragging(true)
            setFromClientX(e.clientX)
          }}
        >
          {/* y decade gridlines + labels */}
          {yDecades.map((e) => {
            const v = Math.pow(10, e)
            return (
              <g key={`yg-${e}`}>
                <line
                  x1={ML}
                  y1={ty(v)}
                  x2={ML + plotW}
                  y2={ty(v)}
                  stroke="color-mix(in srgb, var(--color-border) 60%, transparent)"
                  strokeWidth={1}
                  strokeDasharray={e === 0 ? undefined : '3 4'}
                />
                <text
                  x={ML - 9}
                  y={ty(v) + 3.5}
                  textAnchor="end"
                  className="font-mono tabular-nums"
                  style={{ fontSize: 9.5, fill: 'var(--color-muted)' }}
                >
                  {fmtSci(v)}
                </text>
              </g>
            )
          })}

          {/* x decade gridlines + labels */}
          {xDecades.map((e) => {
            const v = Math.pow(10, e)
            return (
              <g key={`xg-${e}`}>
                <line
                  x1={tx(v)}
                  y1={MT}
                  x2={tx(v)}
                  y2={MT + plotH}
                  stroke="color-mix(in srgb, var(--color-border) 60%, transparent)"
                  strokeWidth={1}
                  strokeDasharray="3 4"
                />
                <text
                  x={tx(v)}
                  y={VB_H - 26}
                  textAnchor="middle"
                  className="font-mono tabular-nums"
                  style={{ fontSize: 9.5, fill: 'var(--color-muted)' }}
                >
                  {fmtSci(v)}
                </text>
              </g>
            )
          })}

          {/* axis titles */}
          <text
            x={ML + plotW / 2}
            y={VB_H - 8}
            textAnchor="middle"
            className="font-mono"
            style={{ fontSize: 10.5, fill: 'var(--color-fg)', opacity: 0.85 }}
          >
            physical error rate p
          </text>
          <text
            transform={`translate(13 ${MT + plotH / 2}) rotate(-90)`}
            textAnchor="middle"
            className="font-mono"
            style={{ fontSize: 10.5, fill: 'var(--color-fg)', opacity: 0.85 }}
          >
            logical error rate p_L
          </text>

          {/* break-even reference diagonal p_L = p */}
          <path
            d={diagPath}
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth={1}
            strokeDasharray="2 4"
            style={{ opacity: 0.5 }}
          />
          <text
            x={tx(0.04)}
            y={ty(0.04) - 5}
            className="font-mono"
            style={{ fontSize: 9, fill: 'var(--color-muted)', opacity: 0.8 }}
          >
            break-even p_L = p
          </text>

          {/* threshold vertical line at p = pTh */}
          <line
            x1={tx(pTh)}
            y1={MT}
            x2={tx(pTh)}
            y2={MT + plotH}
            stroke="var(--color-fg)"
            strokeWidth={1}
            strokeDasharray="4 4"
            style={{ opacity: 0.55 }}
          />
          <text
            x={tx(pTh) + 5}
            y={MT + 12}
            className="font-mono"
            style={{ fontSize: 9.5, fill: 'var(--color-fg)', opacity: 0.7 }}
          >
            threshold pTh = {pTh}
          </text>
          {/* the single crossing point */}
          <circle cx={tx(pTh)} cy={ty(pTh)} r={3.2} fill="var(--color-fg)" />

          {/* distance curves */}
          {curves.map((c, i) => (
            <path
              key={`curve-${c.d}`}
              d={c.path}
              fill="none"
              stroke={colourFor(i)}
              strokeWidth={2.2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* willow operating-point annotation */}
          {willow && (
            <g style={{ opacity: 0.8 }}>
              <circle
                cx={tx(willowP)}
                cy={ty(plAt(willowP, distances[0], pTh))}
                r={3}
                fill="none"
                stroke="var(--color-fg)"
                strokeWidth={1.2}
              />
              <text
                x={tx(willowP)}
                y={ty(plAt(willowP, distances[0], pTh)) + 16}
                textAnchor="middle"
                className="font-mono"
                style={{ fontSize: 8.5, fill: 'var(--color-muted)' }}
              >
                Willow · Λ≈2.14
              </text>
            </g>
          )}

          {/* operating-point markers: vertical line + a dot on each curve */}
          <line
            x1={markerX}
            y1={MT}
            x2={markerX}
            y2={MT + plotH}
            stroke={ACCENT}
            strokeWidth={1.6}
          />
          {plValues.map(({ d, pl }, i) => (
            <circle
              key={`m-${d}`}
              cx={markerX}
              cy={ty(pl)}
              r={3.6}
              fill={colourFor(i)}
              stroke="var(--color-bg)"
              strokeWidth={1}
            />
          ))}
          {/* draggable grab handle at the top of the marker */}
          <g style={{ cursor: 'ew-resize' }}>
            <rect
              x={markerX - 9}
              y={MT - 14}
              width={18}
              height={12}
              rx={3}
              fill={ACCENT}
            />
            <path
              d={`M ${markerX} ${MT} l -4 -5 l 8 0 Z`}
              fill={ACCENT}
            />
          </g>

          {/* axis frame */}
          <line x1={ML} y1={MT} x2={ML} y2={MT + plotH} stroke="var(--color-border)" strokeWidth={1} />
          <line x1={ML} y1={MT + plotH} x2={ML + plotW} y2={MT + plotH} stroke="var(--color-border)" strokeWidth={1} />
        </svg>
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        {/* readout — exposes data-* for DOM tests */}
        <div
          data-testid="threshold-readout"
          data-p={p.toExponential(3)}
          data-ptht={pTh}
          data-lambda={Number.isFinite(lambda) ? lambda.toFixed(4) : 'inf'}
          data-below={belowThreshold ? '1' : '0'}
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          <span className="font-mono text-[0.72rem] text-muted">
            p ={' '}
            <span className="tabular-nums text-fg">{p.toExponential(2)}</span>
          </span>
          {plValues.map(({ d, pl }, i) => (
            <span
              key={`r-${d}`}
              data-pl={pl.toExponential(3)}
              data-d={d}
              {...{ [`data-pl-${d}`]: pl.toExponential(3) }}
              className="font-mono text-[0.72rem] text-muted"
            >
              p_L(d={d}) ={' '}
              <span className="tabular-nums" style={{ color: colourFor(i) }}>
                {pl.toExponential(2)}
              </span>
            </span>
          ))}
          <span className="font-mono text-[0.72rem] text-muted">
            Λ ={' '}
            <span className="tabular-nums text-blog">
              {Number.isFinite(lambda) ? lambda.toFixed(2) : '∞'}
            </span>
            <span className="text-muted">
              {' '}
              (√(pTh/p) ≈ {lambdaTheory.toFixed(2)})
            </span>
          </span>
          <span
            className="rounded-md px-2 py-0.5 font-mono text-[0.68rem] uppercase tracking-wider"
            style={
              belowThreshold
                ? { color: '#14b8a6', background: 'color-mix(in srgb, #14b8a6 14%, transparent)' }
                : { color: '#ef4444', background: 'color-mix(in srgb, #ef4444 14%, transparent)' }
            }
          >
            {belowThreshold ? 'below threshold ✓' : 'above threshold ✗'}
          </span>
        </div>

        {/* slider mirrors the marker (log-scaled via 0..1000 → decade interp) */}
        <div className="mt-3 flex items-center gap-4">
          <label
            htmlFor="tc-p"
            className="whitespace-nowrap font-mono text-[0.7rem] uppercase tracking-wider text-muted"
          >
            operating p
          </label>
          <input
            id="tc-p"
            type="range"
            min={0}
            max={1000}
            step={1}
            value={Math.round(
              ((log10(p) - log10(X_MIN)) / (log10(X_MAX) - log10(X_MIN))) * 1000,
            )}
            onPointerDown={() => setDragging(true)}
            onPointerUp={() => setDragging(false)}
            onChange={(e) => {
              const f = Number(e.target.value) / 1000
              const lg = log10(X_MIN) + f * (log10(X_MAX) - log10(X_MIN))
              const xv = clampX(Math.pow(10, lg))
              targetRef.current = xv
              pRef.current = xv
              setP(xv)
            }}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]"
          />
          <span className="w-24 text-right font-mono text-[0.78rem] tabular-nums text-fg">
            {p.toExponential(1)}
          </span>
        </div>

        <p className="mt-2 font-mono text-[0.66rem] leading-snug text-muted">
          Every curve crosses at the threshold{' '}
          <span className="text-fg">pTh = {pTh}</span> where p_L = p. Drag the
          marker: <span style={{ color: '#14b8a6' }}>below</span> it, a bigger
          distance d drives the logical error{' '}
          <span className="text-blog">down</span> — each +2 in d suppresses it by
          Λ = √(pTh/p). <span style={{ color: '#ef4444' }}>Above</span> it, more
          qubits make things <em>worse</em>: the curves fan upward and Λ drops
          below 1. That sign flip at pTh is why a threshold, not just a low error
          rate, is what makes a quantum computer scalable.
        </p>
      </div>
    </figure>
  )
}

// clamp a physical error rate into the visible x-window
function clampX(v: number): number {
  return v < X_MIN ? X_MIN : v > X_MAX ? X_MAX : v
}
