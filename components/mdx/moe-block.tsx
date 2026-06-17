'use client'

/**
 * MoEBlock — the interactive for the "where the parameters live" section.
 * Visualises a Mixture-of-Experts transformer block: every token flows
 * through the *shared* attention, then a router picks a small number of
 * expert FFNs (here, 2 of 64) and only those run.
 *
 * The payoff is the parameter accounting: every expert holds weights
 * (≈ 1T total across all 64 here), but a single token only touches the
 * shared layers plus its 2 routed experts (≈ 46B). That is what a spec
 * like "46B active, 1T total" means — 1T of capacity, 46B of compute.
 *
 * anime.js drives: the entrance stagger of the 64 expert cells, the
 * routing-line draw-in (`svg.createDrawable`) from the gate to the two
 * selected experts, and the count-up of the active-parameter readout.
 *
 * The numbers are illustrative but calibrated (64 × 15B experts + 16B
 * shared, top-2) to reproduce the 46B-active / ≈1T-total ratio of the
 * DeepSeek-V3 / GLM / Kimi class. Real figures are cited in the prose.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { animate, createScope, stagger, svg, type Scope } from 'animejs'
import { useInViewport } from './use-in-viewport'

// ── illustrative-but-calibrated parameter accounting ──────────────────
const EXPERTS = 64 // 8 × 8 grid
const GRID_N = 8
const ACTIVE_EXPERTS = 2 // top-k routed per token
const PER_EXPERT_B = 15 // 15B per expert FFN
const SHARED_B = 16 // attention + embeddings + router + output head
const TOTAL_B = SHARED_B + EXPERTS * PER_EXPERT_B // 976 ≈ 1.0T
const ACTIVE_B = SHARED_B + ACTIVE_EXPERTS * PER_EXPERT_B // 46B

// ── SVG layout ────────────────────────────────────────────────────────
const VB_W = 640
const VB_H = 250
const GRID_X = 250
const GRID_Y = 38
const CELL = 22
const GAP = 2.5
const STEP = CELL + GAP
const gridCellCenter = (idx: number) => {
  const r = Math.floor(idx / GRID_N)
  const c = idx % GRID_N
  return { x: GRID_X + c * STEP + CELL / 2, y: GRID_Y + r * STEP + CELL / 2 }
}

// anchor points for the shared blocks
const ATTN = { x: 24, y: 92, w: 96, h: 66 }
const GATE = { x: 156, y: 92, w: 76, h: 66 }
const OUT = { x: 540, y: 92, w: 80, h: 66 }
const gateOut = { x: GATE.x + GATE.w, y: GATE.y + GATE.h / 2 }
const outIn = { x: OUT.x, y: OUT.y + OUT.h / 2 }

function fmtB(b: number): string {
  if (b >= 1000) return (b / 1000).toFixed(2) + 'T'
  return b + 'B'
}

export function MoEBlock() {
  const root = useRef<HTMLDivElement>(null)
  const scope = useRef<Scope | null>(null)
  const [inViewRef, inView] = useInViewport<HTMLDivElement>('120px')
  const [selected, setSelected] = useState<number[]>([7, 41])
  const [activeCount, setActiveCount] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [step, setStep] = useState(0)
  const uid = useId().replace(/[:]/g, '')

  useEffect(() => {
    if (!root.current) return
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const s = createScope({ root })
    scope.current = s
    s.add(() => {
      s.add('reveal', () => {
        if (prefersReduced) {
          animate('.moe-cell', { opacity: 1, duration: 0 })
          setActiveCount(ACTIVE_B)
          return
        }
        animate('.moe-cell', {
          opacity: [0, 1],
          scale: [0.4, 1],
          duration: 380,
          ease: 'out(3)',
          delay: stagger(12, { grid: [GRID_N, GRID_N], from: 'center' }),
        })
        // count the active param readout up to 46B
        const probe = { v: 0 }
        animate(probe, {
          v: ACTIVE_B,
          duration: 900,
          ease: 'out(4)',
          delay: 300,
          onUpdate: () => setActiveCount(Math.round(probe.v)),
        })
      })
      s.add('route', (_cells: number[]) => {
        if (prefersReduced) {
          animate('.moe-line', { opacity: 1, duration: 0 })
          animate('.moe-cell-active', { scale: 1, opacity: 1, duration: 0 })
          return
        }
        // draw the routing lines from gate to the two chosen experts
        animate(svg.createDrawable('.moe-line'), {
          draw: ['0 0', '0 1'],
          duration: 480,
          ease: 'inOutQuad',
          delay: stagger(90),
        })
        // pulse the selected experts
        animate('.moe-cell-active', {
          scale: [1, 1.25, 1],
          duration: 540,
          ease: 'inOut(3)',
          delay: stagger(80),
        })
      })
    })
    return () => s.revert()
  }, [])

  // entrance
  useEffect(() => {
    if (inView && !revealed) {
      setRevealed(true)
      scope.current?.methods.reveal()
      const t = window.setTimeout(() => scope.current?.methods.route(selected), 500)
      return () => window.clearTimeout(t)
    }
  }, [inView, revealed, selected])

  // auto-advance: pick a new token → new pair of experts every ~2.4s
  useEffect(() => {
    if (!revealed) return
    const id = window.setInterval(() => {
      setStep((st) => st + 1)
      setSelected(pick2())
    }, 2600)
    return () => window.clearInterval(id)
  }, [revealed])

  // re-draw routing lines whenever the selection changes
  useEffect(() => {
    if (revealed) scope.current?.methods.route(selected)
  }, [selected, revealed])

  const manualNext = () => {
    setStep((st) => st + 1)
    setSelected(pick2())
  }

  const selectedSet = new Set(selected)
  return (
    <figure
      ref={inViewRef}
      className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          mixture-of-experts · token #{step + 1}
        </div>
        <button
          type="button"
          onClick={manualNext}
          className="rounded-lg border border-[var(--color-border)] bg-surface px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-wider text-fg transition-colors hover:border-blog hover:text-blog"
        >
          next token →
        </button>
      </div>

      <div ref={root} className="px-2 py-4 sm:px-4">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full"
          style={{ maxWidth: 620, margin: '0 auto' }}
          role="img"
          aria-label="Mixture-of-experts block: a token flows through shared attention, a router selects 2 of 64 experts, and only those run."
        >
          {/* shared attention block */}
          <g>
            <rect
              x={ATTN.x}
              y={ATTN.y}
              width={ATTN.w}
              height={ATTN.h}
              rx={8}
              fill="color-mix(in srgb, var(--color-project) 14%, transparent)"
              stroke="var(--color-project)"
              strokeWidth={1.2}
            />
            <text x={ATTN.x + ATTN.w / 2} y={ATTN.y + 26} textAnchor="middle" className="font-mono fill-fg" style={{ fontSize: 11.5, fontWeight: 700 }}>
              attention
            </text>
            <text x={ATTN.x + ATTN.w / 2} y={ATTN.y + 44} textAnchor="middle" className="font-mono fill-muted" style={{ fontSize: 9 }}>
              shared · always on
            </text>
            <text x={ATTN.x + ATTN.w / 2} y={ATTN.y + 58} textAnchor="middle" className="font-mono fill-project" style={{ fontSize: 8.5 }}>
              {SHARED_B}B
            </text>
          </g>

          {/* connector attn -> gate */}
          <line x1={ATTN.x + ATTN.w} y1={ATTN.y + ATTN.h / 2} x2={GATE.x} y2={GATE.y + GATE.h / 2} stroke="var(--color-border)" strokeWidth={1.5} />

          {/* router / gate */}
          <g>
            <rect
              x={GATE.x}
              y={GATE.y}
              width={GATE.w}
              height={GATE.h}
              rx={8}
              fill="color-mix(in srgb, var(--color-blog) 12%, transparent)"
              stroke="var(--color-blog)"
              strokeWidth={1.2}
            />
            <text x={GATE.x + GATE.w / 2} y={GATE.y + 26} textAnchor="middle" className="font-mono fill-fg" style={{ fontSize: 11.5, fontWeight: 700 }}>
              router
            </text>
            <text x={GATE.x + GATE.w / 2} y={GATE.y + 44} textAnchor="middle" className="font-mono fill-muted" style={{ fontSize: 9 }}>
              top-{ACTIVE_EXPERTS} of {EXPERTS}
            </text>
            <text x={GATE.x + GATE.w / 2} y={GATE.y + 58} textAnchor="middle" className="font-mono fill-blog" style={{ fontSize: 8.5 }}>
              gate(x)
            </text>
          </g>

          {/* routing lines (drawn in by anime.js) — gate → selected experts */}
          <g fill="none" strokeLinecap="round" style={{ pointerEvents: 'none' }}>
            {selected.map((idx, k) => {
              const c = gridCellCenter(idx)
              return (
                <path
                  key={`line-${uid}-${step}-${k}`}
                  className="moe-line"
                  d={`M ${gateOut.x} ${gateOut.y} C ${gateOut.x + 36} ${gateOut.y}, ${c.x - 30} ${c.y}, ${c.x} ${c.y}`}
                  stroke="var(--color-blog)"
                  strokeWidth={2.2}
                  opacity={0.9}
                  style={{ opacity: 0 }}
                />
              )
            })}
          </g>

          {/* the 64-expert grid */}
          <g>
            {Array.from({ length: EXPERTS }, (_, idx) => {
              const r = Math.floor(idx / GRID_N)
              const c = idx % GRID_N
              const cx = GRID_X + c * STEP
              const cy = GRID_Y + r * STEP
              const on = selectedSet.has(idx)
              return (
                <rect
                  key={`cell-${uid}-${idx}`}
                  className={`moe-cell ${on ? 'moe-cell-active' : ''}`}
                  x={cx}
                  y={cy}
                  width={CELL}
                  height={CELL}
                  rx={4}
                  fill={on ? 'var(--color-blog)' : 'color-mix(in srgb, var(--color-border) 90%, transparent)'}
                  stroke={on ? 'var(--color-blog)' : 'transparent'}
                  strokeWidth={0.8}
                  style={{
                    opacity: 0,
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    transition: 'fill 300ms ease',
                  }}
                />
              )
            })}
            <text x={GRID_X + (GRID_N * STEP) / 2} y={GRID_Y - 8} textAnchor="middle" className="font-mono fill-muted" style={{ fontSize: 9.5 }}>
              {EXPERTS} experts (FFNs) · {PER_EXPERT_B}B each
            </text>
          </g>

          {/* combine → output */}
          <line x1={GRID_X + GRID_N * STEP} y1={GRID_Y + (GRID_N * STEP) / 2} x2={outIn.x} y2={outIn.y} stroke="var(--color-border)" strokeWidth={1.5} />
          <g>
            <rect x={OUT.x} y={OUT.y} width={OUT.w} height={OUT.h} rx={8} fill="color-mix(in srgb, var(--color-fg) 8%, transparent)" stroke="var(--color-border)" strokeWidth={1.2} />
            <text x={OUT.x + OUT.w / 2} y={OUT.y + OUT.h / 2 - 4} textAnchor="middle" className="font-mono fill-fg" style={{ fontSize: 11.5, fontWeight: 700 }}>
              output
            </text>
            <text x={OUT.x + OUT.w / 2} y={OUT.y + OUT.h / 2 + 12} textAnchor="middle" className="font-mono fill-muted" style={{ fontSize: 9 }}>
              Σ weights·expert
            </text>
          </g>
        </svg>
      </div>

      {/* parameter accounting */}
      <div className="grid grid-cols-3 gap-px border-t border-[var(--color-border)] bg-[var(--color-border)] text-center">
        <div className="bg-surface px-3 py-3">
          <div className="font-mono text-[0.6rem] uppercase tracking-wider text-muted">total params</div>
          <div className="mt-1 font-mono text-lg font-bold text-fg/55">≈ {fmtB(TOTAL_B)}</div>
          <div className="mt-0.5 font-mono text-[0.6rem] text-muted">all {EXPERTS} experts + shared</div>
        </div>
        <div className="bg-surface px-3 py-3">
          <div className="font-mono text-[0.6rem] uppercase tracking-wider text-blog">active per token</div>
          <div className="mt-1 font-mono text-lg font-bold text-blog">{fmtB(activeCount)}</div>
          <div className="mt-0.5 font-mono text-[0.6rem] text-muted">shared + {ACTIVE_EXPERTS} experts</div>
        </div>
        <div className="bg-surface px-3 py-3">
          <div className="font-mono text-[0.6rem] uppercase tracking-wider text-muted">sparsity</div>
          <div className="mt-1 font-mono text-lg font-bold text-fg">{((ACTIVE_B / TOTAL_B) * 100).toFixed(1)}%</div>
          <div className="mt-0.5 font-mono text-[0.6rem] text-muted">of weights touched</div>
        </div>
      </div>
      <div className="bg-surface-2/40 px-5 py-2.5">
        <p className="font-mono text-[0.64rem] leading-snug text-muted">
          Each token lights only {ACTIVE_EXPERTS} of {EXPERTS} experts. The dormant {EXPERTS - ACTIVE_EXPERTS} still occupy VRAM
          (the full ≈{fmtB(TOTAL_B)} lives in memory) but do no math. That is how you get {fmtB(TOTAL_B)} of capacity for {fmtB(ACTIVE_B)} of compute.
        </p>
      </div>
    </figure>
  )
}

/** Pick 2 distinct expert indices at random. */
function pick2(): number[] {
  const a = Math.floor(Math.random() * EXPERTS)
  let b = Math.floor(Math.random() * EXPERTS)
  while (b === a) b = Math.floor(Math.random() * EXPERTS)
  return [a, b]
}
