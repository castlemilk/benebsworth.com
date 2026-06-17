'use client'

/**
 * AttentionHeatmap — the centerpiece interactive for the
 * "Attention, From the Inside Out" post.
 *
 * A real, computed self-attention matrix over the toy sentence
 * "the cat sat because it napped". The reader picks a query token and
 * watches its attention weights (a) light up across the key tokens and
 * (b) draw in as SVG connection arcs whose thickness ∝ weight.
 *
 * Three knobs expose the mechanism:
 *   • hover/click a query token (left) → recompute + re-draw its row
 *   • toggle "raw scores ↔ softmax"     → see the normalisation sharpen
 *   • drag the √dₖ slider              → under-scale (one-hot, gradients
 *                                        vanish) vs over-scale (uniform)
 *
 * Animation is driven by anime.js v4:
 *   • `createScope({ root })` scopes every instance to this figure so
 *     `revert()` on unmount leaves no orphaned rAF loops.
 *   • `svg.createDrawable` draws the connection arcs in (the signature
 *     line-drawing effect — staggered by key index).
 *   • `stagger({ grid })` reveals the matrix cell-by-cell on scroll-in.
 *
 * Cell colour morphs use a plain CSS `transition: fill` (React owns the
 * fill as a function of state; anime only borrows opacity/transform/draw
 * transiently, which avoids React/anime write conflicts).
 *
 * Honours prefers-reduced-motion (skips anime; data still renders).
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { animate, createScope, stagger, svg, type Scope } from 'animejs'
import {
  TOKENS,
  DEFAULT_SCALE,
  SCALE_MIN,
  SCALE_MAX,
  attentionMatrix,
  scaledScores,
  attendsTo,
} from './attention-data'
import { useInViewport } from './use-in-viewport'

const N = TOKENS.length

// SVG layout (viewBox units). Chosen so the figure reads at ~520px and
// scales down gracefully on mobile.
const VB_W = 540
const VB_H = 408
const GRID_X = 84 // left edge of the cell grid
const GRID_Y = 48 // top edge of the cell grid
const CELL_W = 72
const CELL_H = 50
const LABEL_X = 76 // right edge of the query-label column

const colCenter = (j: number) => GRID_X + CELL_W * j + CELL_W / 2
const rowCenter = (i: number) => GRID_Y + CELL_H * i + CELL_H / 2

/** Map a probability/score in [0,1] to a fill via color-mix on the blog
 *  accent — theme-aware (resolves to teal in dark, deep-teal in light). */
function heat(intensity: number): string {
  const k = Math.max(0, Math.min(1, intensity))
  const pct = Math.round(k * 100)
  return `color-mix(in srgb, var(--color-blog) ${pct}%, transparent)`
}

/** Cubic-bezier arc from a query node (left, at the row) up to a key node
 *  (top, at the column). Bows out to the upper-left for a fan of curves. */
function arcPath(qRow: number, kCol: number): string {
  const sx = GRID_X
  const sy = rowCenter(qRow)
  const ex = colCenter(kCol)
  const ey = GRID_Y
  // control 1: pull leftward out of the query node
  const c1x = sx - 34
  const c1y = sy
  // control 2: drop in from above the key node
  const c2x = ex
  const c2y = ey + Math.max(28, (sy - ey) * 0.55)
  return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`
}

export function AttentionHeatmap() {
  const root = useRef<HTMLDivElement>(null)
  const scope = useRef<Scope | null>(null)
  const [inViewRef, inView] = useInViewport<HTMLDivElement>('120px')

  const [query, setQuery] = useState(4) // default → "it" (the pronoun story)
  const [view, setView] = useState<'softmax' | 'raw'>('softmax')
  const [scale, setScale] = useState(DEFAULT_SCALE)
  const [revealed, setRevealed] = useState(false)

  const uid = useId().replace(/[:]/g, '')

  const matrix = useMemo(() => attentionMatrix(scale), [scale])
  const raw = useMemo(() => scaledScores(scale), [scale])
  const topKey = useMemo(() => attendsTo(query, scale), [query, scale])

  // intensity per cell for the active view
  const intensityAt = (i: number, j: number) =>
    view === 'softmax' ? matrix[i][j] : Math.max(0, raw[i][j]) / 4

  /* ── anime.js: scope, entrance, arc draw-in ───────────────────────── */
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
          animate('.ah-cell', { opacity: 1, scale: 1, duration: 0 })
          animate('.ah-arc', { opacity: 1, duration: 0 })
          return
        }
        animate('.ah-cell', {
          opacity: [0, 1],
          scale: [0.7, 1],
          duration: 420,
          ease: 'out(3)',
          delay: stagger(28, { grid: [N, N], from: 'first' }),
        })
        animate('.ah-label', {
          opacity: [0, 1],
          duration: 300,
          delay: stagger(30),
        })
      })

      s.add('drawArcs', () => {
        if (prefersReduced) {
          animate('.ah-arc', { opacity: 0.8, duration: 0 })
          return
        }
        // line-draw the connection arcs in, staggered across keys.
        // draw 'start end' in [0,1]: '0 1' = fully drawn (stays). Do NOT
        // use the docs' '0 0','0 1','1 1' sequence — that final '1 1' is a
        // zero-length segment (erased), intended for a draw-and-erase loop.
        animate(svg.createDrawable('.ah-arc'), {
          draw: ['0 0', '0 1'],
          duration: 620,
          ease: 'inOutQuad',
          delay: stagger(70, { from: 'last' }),
        })
        // fade the arcs in alongside the stroke draw
        animate('.ah-arc', {
          opacity: [0, 0.8],
          duration: 420,
          ease: 'out(3)',
          delay: stagger(60, { from: 'last' }),
        })
        // pulse the query node
        animate('.ah-query-active', {
          scale: [1, 1.18, 1],
          duration: 560,
          ease: 'inOut(3)',
        })
      })
    })

    return () => s.revert()
  }, [])

  // fire the entrance once the figure scrolls into view
  useEffect(() => {
    if (inView && !revealed) {
      setRevealed(true)
      scope.current?.methods.reveal()
    }
  }, [inView, revealed])

  // re-draw arcs whenever the selected query changes
  useEffect(() => {
    if (revealed) scope.current?.methods.drawArcs()
  }, [query, revealed])

  const maxArcW = 7
  const minArcW = 0.6

  return (
    <figure
      ref={inViewRef}
      className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
    >
      {/* ── header / controls ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
            self-attention
          </span>
          <span className="font-mono text-[0.7rem] text-fg/55">·</span>
          <span className="font-mono text-[0.72rem] text-fg/75">
            <span className="text-blog">“it”</span> → “{TOKENS[topKey]}”
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-surface p-0.5">
          {(['softmax', 'raw'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded-md px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-wider transition-colors ${
                view === v
                  ? 'bg-blog/15 text-blog ring-1 ring-blog/40'
                  : 'text-muted hover:text-fg'
              }`}
            >
              {v === 'softmax' ? 'softmax' : 'raw QKᵀ/√d'}
            </button>
          ))}
        </div>
      </div>

      {/* ── the diagram ─────────────────────────────────────────────── */}
      <div ref={root} className="px-2 py-4 sm:px-4">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full"
          style={{ maxWidth: 600, margin: '0 auto' }}
          role="img"
          aria-label="Self-attention matrix: hover or tap a query token on the left to see which key tokens it attends to."
        >
          {/* diagonal guide (self-attention: query i can attend to itself) */}
          <line
            x1={GRID_X}
            y1={GRID_Y}
            x2={GRID_X + CELL_W * N}
            y2={GRID_Y + CELL_H * N}
            stroke="var(--color-border)"
            strokeDasharray="2 4"
            opacity={0.5}
          />

          {/* key tokens (top row) */}
          {TOKENS.map((t, j) => {
            const isTop = j === topKey && revealed
            return (
              <g key={`k-${j}`}>
                <text
                  x={colCenter(j)}
                  y={30}
                  textAnchor="middle"
                  className={`ah-label font-mono ${isTop ? 'fill-blog' : 'fill-fg/70'}`}
                  style={{ fontSize: 12.5, fontWeight: isTop ? 700 : 500, opacity: 0 }}
                >
                  {t}
                </text>
                <text
                  x={colCenter(j)}
                  y={42}
                  textAnchor="middle"
                  className="ah-label fill-muted"
                  style={{ fontSize: 8, opacity: 0 }}
                >
                  key
                </text>
              </g>
            )
          })}

          {/* query tokens (left column) */}
          {TOKENS.map((t, i) => {
            const active = i === query
            return (
              <g
                key={`q-${i}`}
                className={`ah-label ${active ? 'ah-query-active' : ''}`}
                style={{
                  opacity: 0,
                  cursor: 'pointer',
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                }}
                onMouseEnter={() => setQuery(i)}
                onClick={() => setQuery(i)}
                role="button"
                tabIndex={0}
                aria-label={`Query token: ${t}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setQuery(i)
                  }
                }}
              >
                <rect
                  x={LABEL_X - 64}
                  y={rowCenter(i) - 14}
                  width={66}
                  height={28}
                  rx={7}
                  fill={active ? 'color-mix(in srgb, var(--color-blog) 16%, transparent)' : 'transparent'}
                  stroke={active ? 'var(--color-blog)' : 'transparent'}
                  strokeWidth={active ? 1.4 : 0}
                />
                <text
                  x={LABEL_X - 4}
                  y={rowCenter(i) + 4}
                  textAnchor="end"
                  className={`font-mono ${active ? 'fill-blog' : 'fill-fg/75'}`}
                  style={{ fontSize: 12.5, fontWeight: active ? 700 : 500 }}
                >
                  {t}
                </text>
              </g>
            )
          })}

          {/* connection arcs for the selected query (drawn in by anime.js) */}
          <g fill="none" strokeLinecap="round" style={{ pointerEvents: 'none' }}>
            {TOKENS.map((_t, j) => {
              const w = matrix[query][j]
              const sw = minArcW + w * (maxArcW - minArcW)
              return (
                <path
                  key={`arc-${uid}-${query}-${j}`}
                  className="ah-arc"
                  d={arcPath(query, j)}
                  stroke="var(--color-blog)"
                  strokeWidth={sw}
                  style={{
                    // start invisible; anime.js fades these in + draws the
                    // stroke via createDrawable. NOTE: do NOT set
                    // strokeDasharray / strokeDashoffset here — createDrawable
                    // sets those as ATTRIBUTES, which an inline style would
                    // silently override and permanently hide the arcs.
                    opacity: 0,
                    transition: 'stroke-width 250ms ease',
                  }}
                />
              )
            })}
          </g>

          {/* the cell grid */}
          {TOKENS.map((_qi, i) =>
            TOKENS.map((_kj, j) => {
              const p = matrix[i][j]
              const inten = intensityAt(i, j)
              const inRow = i === query
              const isMax = inRow && j === topKey
              return (
                <g
                  key={`c-${i}-${j}`}
                  className="ah-cell"
                  style={{
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    transition: 'opacity 200ms ease',
                    opacity: revealed ? (inRow ? 1 : 0.45) : 0,
                  }}
                  onMouseEnter={() => setQuery(i)}
                  onClick={() => setQuery(i)}
                >
                  <rect
                    x={GRID_X + CELL_W * j + 2}
                    y={GRID_Y + CELL_H * i + 2}
                    width={CELL_W - 4}
                    height={CELL_H - 4}
                    rx={6}
                    fill={heat(inten)}
                    stroke={isMax ? 'var(--color-blog)' : 'color-mix(in srgb, var(--color-border) 70%, transparent)'}
                    strokeWidth={isMax ? 1.6 : 0.8}
                    style={{ transition: 'fill 280ms ease, stroke 280ms ease' }}
                  />
                  <text
                    x={colCenter(j)}
                    y={rowCenter(i) + 4}
                    textAnchor="middle"
                    className="font-mono"
                    style={{
                      fontSize: 11,
                      fontWeight: isMax ? 700 : 500,
                      fill: inten > 0.42 ? 'var(--color-bg)' : 'var(--color-fg)',
                      opacity: 0.9,
                      transition: 'fill 280ms ease',
                    }}
                  >
                    {view === 'softmax' ? p.toFixed(2) : raw[i][j].toFixed(1)}
                  </text>
                </g>
              )
            }),
          )}
        </svg>
      </div>

      {/* ── scale slider ────────────────────────────────────────────── */}
      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex items-center gap-4">
          <label
            htmlFor={`scale-${uid}`}
            className="font-mono text-[0.7rem] uppercase tracking-wider text-muted whitespace-nowrap"
          >
            scale √dₖ
          </label>
          <input
            id={`scale-${uid}`}
            type="range"
            min={SCALE_MIN}
            max={SCALE_MAX}
            step={0.5}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]"
          />
          <span className="w-16 text-right font-mono text-[0.78rem] tabular-nums text-fg">
            {scale.toFixed(1)}
            <span className="ml-1 text-[0.62rem] text-muted">
              {scale === DEFAULT_SCALE ? '· correct' : scale < DEFAULT_SCALE ? '· sharp' : '· flat'}
            </span>
          </span>
        </div>
        <p className="mt-2 font-mono text-[0.66rem] leading-snug text-muted">
          Drag left (small √dₖ) → attention collapses to a near one-hot pick; gradients vanish in
          training. Drag right → the distribution flattens toward uniform and the signal is lost.
          The default √dₖ = 2 keeps the softmax in its useful, well-gradiented range.
        </p>
      </div>
    </figure>
  )
}
