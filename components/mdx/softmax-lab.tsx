'use client'

/**
 * SoftmaxLab — animates a single attention row through the four stages of
 * scaled-dot-product softmax, so the reader can *see* what the equation
 * actually does:
 *
 *   raw scores  →  ÷√dₖ  →  exp(·)  →  ÷Σ  →  probabilities
 *
 * Each stage renders as a row of vertical bars (signed axis for the raw
 * scores). Clicking a stage button (or the auto-advance on first reveal)
 * drives an anime.js tween that morphs the bars to the target stage while
 * a live readout updates the numbers on each bar.
 *
 * Pedagogical payload:
 *   • ÷ √dₖ  — keeps scores in the well-gradiented softmax range
 *   • exp(·) — turns signed scores into strictly-positive weights
 *   • ÷ Σ    — the row sums to 1: a convex combination (a weighted average)
 *
 * Driven by the same `attention-data` module as the heatmap, so the "it"
 * row shown here matches the matrix in the post exactly.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { animate, createScope, type Scope } from 'animejs'
import { TOKENS, rawRow, softmaxStages, DEFAULT_SCALE } from './attention-data'
import { useInViewport } from './use-in-viewport'

const ROW_IDX = 4 // "it" — the pronoun-resolution row
const stages = softmaxStages(rawRow(ROW_IDX), DEFAULT_SCALE)

const STAGE_META = [
  { key: 'raw', label: 'raw', sub: 's = QKᵀ', caption: 'Dot products can be any real number — signed and unbounded.' },
  { key: 'scaled', label: '÷√dₖ', sub: 's / √dₖ', caption: 'Scale down so large scores don’t saturate the exponentials.' },
  { key: 'exps', label: 'exp', sub: 'e^(s/√dₖ)', caption: 'Exponentiate: every weight is now strictly positive. Order is preserved.' },
  { key: 'probs', label: '÷Σ', sub: 'softmax', caption: 'Normalise by the sum. The row sums to 1 — a probability distribution.' },
] as const

type StageKey = (typeof STAGE_META)[number]['key']
const STAGE_SEQ: StageKey[] = ['raw', 'scaled', 'exps', 'probs']

const VALUES: Record<StageKey, number[]> = {
  raw: stages.raw,
  scaled: stages.scaled,
  exps: stages.exps,
  probs: stages.probs,
}

function stageMax(k: StageKey): number {
  return Math.max(...VALUES[k].map((v) => Math.abs(v)), 0.0001)
}

// SVG layout (viewBox units)
const N = TOKENS.length
const VB_W = 560
const VB_H = 252
const PAD_L = 34
const PAD_R = 16
const PAD_T = 72
const PAD_B = 42
const plotW = VB_W - PAD_L - PAD_R
const plotH = VB_H - PAD_T - PAD_B
const bandW = plotW / N
const barW = bandW * 0.5
const zeroY = PAD_T + plotH / 2 // signed axis centred

function barX(i: number) {
  return PAD_L + bandW * i + (bandW - barW) / 2
}

function fmt(v: number, stage: StageKey): string {
  if (stage === 'raw') return (v >= 0 ? '+' : '') + v.toFixed(1)
  if (stage === 'exps') return v.toFixed(2)
  return v.toFixed(3)
}

export function SoftmaxLab() {
  const root = useRef<HTMLDivElement>(null)
  const scope = useRef<Scope | null>(null)
  const [inViewRef, inView] = useInViewport<HTMLDivElement>('120px')
  const [stage, setStage] = useState<StageKey>('raw')
  const stageRef = useRef<StageKey>('raw')
  const [autoPlayed, setAutoPlayed] = useState(false)
  const uid = useId().replace(/[:]/g, '')

  // keep stageRef in sync so the anime scope closure always reads fresh
  useEffect(() => {
    stageRef.current = stage
  }, [stage])

  /* ── anime.js scope (built once) ────────────────────────────────── */
  useEffect(() => {
    if (!root.current) return
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const s = createScope({ root })
    scope.current = s
    s.add(() => {
      s.add('morphTo', (target: StageKey) => {
        const fromStage = stageRef.current
        if (target === fromStage) return
        const fromVals = VALUES[fromStage]
        const toVals = VALUES[target]
        const fromMax = stageMax(fromStage)
        const toMax = stageMax(target)
        stageRef.current = target

        if (prefersReduced) {
          setStage(target)
          return
        }
        // tween a proxy array; onUpdate writes geometry + readout directly
        // to the SVG so the morph is smooth even though the y-axis scale
        // (fromMax → toMax) crossfades mid-flight.
        const proxy = fromVals.map((v) => ({ v }))
        animate(proxy, {
          v: (_el: unknown, i: number) => toVals[i],
          duration: 760,
          ease: 'inOut(3)',
          onUpdate: () => {
            const bars = root.current?.querySelectorAll<SVGRectElement>('.sl-bar')
            const labels = root.current?.querySelectorAll<SVGTextElement>('.sl-value')
            if (!bars || !labels) return
            proxy.forEach((p, i) => {
              const denom = toVals[i] - fromVals[i] || 1
              const t = (p.v - fromVals[i]) / denom
              const m = fromMax + (toMax - fromMax) * t
              const v = p.v
              const h = (Math.abs(v) / m) * (plotH / 2 - 8)
              const bar = bars[i]
              if (bar) {
                bar.setAttribute('height', String(h))
                bar.setAttribute('y', String(v >= 0 ? zeroY - h : zeroY))
              }
              const lab = labels[i]
              if (lab) lab.textContent = fmt(v, target)
            })
          },
          onComplete: () => setStage(target),
        })
      })
    })

    return () => s.revert()
  }, [])

  /* ── auto-advance through the stages on first scroll-in ─────────── */
  useEffect(() => {
    if (!inView || autoPlayed) return
    setAutoPlayed(true)
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setStage('probs')
      return
    }
    let i = 0
    let timer = window.setTimeout(function tick() {
      i += 1
      if (i < STAGE_SEQ.length) {
        scope.current?.methods.morphTo(STAGE_SEQ[i])
        timer = window.setTimeout(tick, 1600)
      }
    }, 800)
    return () => window.clearTimeout(timer)
  }, [inView, autoPlayed])

  const cur = VALUES[stage]
  const maxFor = stageMax(stage)
  const maxIdx = cur.indexOf(Math.max(...cur))
  const meta = STAGE_META.find((s) => s.key === stage)!

  return (
    <figure
      ref={inViewRef}
      className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
    >
      {/* header / stage buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="font-mono text-[0.72rem] text-fg/75">
          query token <span className="text-blog">“it”</span> · softmax pipeline
        </div>
        <div className="flex items-center gap-1.5">
          {STAGE_META.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted">→</span>}
              <button
                type="button"
                onClick={() => scope.current?.methods.morphTo(s.key)}
                aria-pressed={stage === s.key}
                className={`rounded-md px-2 py-1 font-mono text-[0.64rem] uppercase tracking-wider transition-colors ${
                  stage === s.key
                    ? 'bg-blog/15 text-blog ring-1 ring-blog/40'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {s.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div ref={root} className="px-2 py-4 sm:px-4">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full"
          style={{ maxWidth: 600, margin: '0 auto' }}
          role="img"
          aria-label={`Softmax pipeline for the “it” attention row. Current stage: ${meta.label}.`}
        >
          {/* zero axis */}
          <line
            x1={PAD_L}
            y1={zeroY}
            x2={VB_W - PAD_R}
            y2={zeroY}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
          <text x={PAD_L - 5} y={zeroY + 3} textAnchor="end" className="fill-muted" style={{ fontSize: 8 }}>
            0
          </text>

          {/* stage caption */}
          <text x={VB_W / 2} y={26} textAnchor="middle" className="font-mono fill-fg" style={{ fontSize: 13, fontWeight: 700 }}>
            {meta.sub}
          </text>
          <text x={VB_W / 2} y={44} textAnchor="middle" className="fill-muted" style={{ fontSize: 9.5 }}>
            {meta.caption}
          </text>

          {/* bars + token labels */}
          {TOKENS.map((t, i) => {
            const v = cur[i]
            const h = (Math.abs(v) / maxFor) * (plotH / 2 - 8)
            const isMax = i === maxIdx
            return (
              <g key={`bar-${uid}-${i}`}>
                <rect
                  className="sl-bar"
                  x={barX(i)}
                  y={v >= 0 ? zeroY - h : zeroY}
                  width={barW}
                  height={h}
                  rx={3}
                  fill={isMax ? 'var(--color-blog)' : 'color-mix(in srgb, var(--color-blog) 55%, transparent)'}
                  style={{ transition: 'fill 320ms ease' }}
                />
                <text
                  className="sl-value font-mono"
                  x={barX(i) + barW / 2}
                  y={v >= 0 ? zeroY - h - 5 : zeroY + h + 12}
                  textAnchor="middle"
                  style={{
                    fontSize: 9.5,
                    fill: isMax ? 'var(--color-blog)' : 'var(--color-fg)',
                    opacity: 0.85,
                    transition: 'fill 320ms ease',
                  }}
                >
                  {fmt(v, stage)}
                </text>
                <text
                  x={barX(i) + barW / 2}
                  y={VB_H - PAD_B + 18}
                  textAnchor="middle"
                  className={`font-mono ${isMax ? 'fill-blog' : 'fill-fg/70'}`}
                  style={{ fontSize: 10.5, fontWeight: isMax ? 700 : 500 }}
                >
                  {t}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </figure>
  )
}
