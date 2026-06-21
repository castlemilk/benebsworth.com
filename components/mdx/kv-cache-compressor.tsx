'use client'

/**
 * KvCacheCompressor — the unifying centrepiece for a post comparing KV-cache
 * compression methods. It frames the cache as a 4-D tensor
 *
 *     2 (K,V) · L layers · H_kv heads · T tokens · d head_dim   (in fp16)
 *
 * and shows that every compression family is an attack on ONE axis of it:
 *
 *   • TurboQuant       → precision  (16-bit → 4-bit per number)
 *   • StreamingLLM     → sequence   (drop middle tokens; keep sinks + recent)
 *   • H2O              → sequence   (same, but keep attention "heavy hitters")
 *   • Cross-layer (CLA)→ layers     (share one layer's K/V with its neighbours)
 *   • Linear attn (GLA)→ sequence   (collapse it: a fixed-size recurrent state)
 *
 * Selecting a method morphs a schematic of one layer's KV slab (3 KV heads ×
 * tokens), shows the layer-stack depth and precision, a relative-footprint bar,
 * and a card with the axis attacked, the keep/drop rule, the cost class
 * (zero-shot / needs-retraining), and the method's measured HumanEval-X Go
 * pass@1 from the experiment.
 *
 * SVG + React, theme-token styled, light/dark, mobile (card drops below the
 * schematic), reduced-motion safe (CSS transitions collapse globally).
 */

import { useId, useState } from 'react'

const GREEN = '#34d399' // lossless / good
const AMBER = '#f5a623' // caution
const RED = '#f87171' // breaks / needs training
const MUTED = 'var(--color-muted)'

type CostClass = 'reference' | 'lossless' | 'lossy' | 'retrain'

type Mech = {
  id: string
  tab: string
  name: string
  axis: string
  axisKey: 'none' | 'precision' | 'sequence' | 'layers' | 'collapse'
  rule: string
  cost: CostClass
  costLabel: string
  footprint: number // relative to fp16 baseline (illustrative for seq-dependent ones)
  pass1: string
  pass1note: string
  bits: 16 | 4
  layers: number // unique layers stored
  keepCols: 'all' | 'window' | 'window+heavy' | 'state'
}

const MECHS: Mech[] = [
  {
    id: 'fp16', tab: 'fp16', name: 'Full cache (fp16)', axis: 'nothing — the baseline',
    axisKey: 'none', rule: 'Store every token, every layer, in 16-bit.',
    cost: 'reference', costLabel: 'reference', footprint: 1, pass1: '57.9%', pass1note: '95 / 164',
    bits: 16, layers: 16, keepCols: 'all',
  },
  {
    id: 'tq4', tab: 'TurboQuant 4-bit', name: 'TurboQuant (4-bit)', axis: 'precision',
    axisKey: 'precision', rule: 'Keep every token; store each number in 4 bits instead of 16 (rotate, then quantise per group of 32).',
    cost: 'lossless', costLabel: 'zero-shot · lossless', footprint: 0.28, pass1: '58.5%', pass1note: '96 / 164 — within noise of baseline',
    bits: 4, layers: 16, keepCols: 'all',
  },
  {
    id: 'stream', tab: 'StreamingLLM', name: 'StreamingLLM (budget 256)', axis: 'sequence',
    axisKey: 'sequence', rule: 'Keep 4 attention-sink tokens + a recent window; drop everything in the middle.',
    cost: 'lossy', costLabel: 'zero-shot · lossy if budget < context', footprint: 0.5, pass1: '37.8%', pass1note: '62 / 164 — budget too small',
    bits: 16, layers: 16, keepCols: 'window',
  },
  {
    id: 'h2o', tab: 'H2O', name: 'H2O (budget 256)', axis: 'sequence',
    axisKey: 'sequence', rule: 'Like streaming, but also pin a few high-attention "heavy hitters" from the middle.',
    cost: 'lossy', costLabel: 'zero-shot · same budget, same cliff', footprint: 0.5, pass1: '37.8%', pass1note: '62 / 164 — identical to streaming',
    bits: 16, layers: 16, keepCols: 'window+heavy',
  },
  {
    id: 'cla', tab: 'Cross-layer', name: 'Cross-layer sharing (CLA)', axis: 'layers',
    axisKey: 'layers', rule: 'Compute K/V once and reuse it across neighbouring layers — store half as many.',
    cost: 'retrain', costLabel: 'needs retraining', footprint: 0.5, pass1: '0%', pass1note: 'zero-shot collapses; SFT didn’t recover',
    bits: 16, layers: 8, keepCols: 'all',
  },
  {
    id: 'gla', tab: 'Linear attn', name: 'Linear attention (GLA)', axis: 'sequence → collapsed',
    axisKey: 'collapse', rule: 'Replace attention with a fixed-size recurrent state — no per-token cache at all.',
    cost: 'retrain', costLabel: 'needs training from scratch', footprint: 0.25, pass1: '0%', pass1note: 'random GLA weights; must be trained in',
    bits: 16, layers: 16, keepCols: 'state',
  },
]

const COST_COLOR: Record<CostClass, string> = {
  reference: MUTED,
  lossless: GREEN,
  lossy: AMBER,
  retrain: RED,
}

const ROWS = 3 // KV heads (GQA)
const COLS = 24 // tokens (illustrative)
const SINK_COLS = 2
const RECENT_COLS = 9

function keptColumns(m: Mech): { kept: boolean[]; heavy: number[]; collapsed: boolean } {
  const kept = Array<boolean>(COLS).fill(true)
  const heavy: number[] = []
  if (m.keepCols === 'all') return { kept, heavy, collapsed: false }
  if (m.keepCols === 'state') return { kept: kept.map(() => false), heavy, collapsed: true }
  // window / window+heavy: sinks + recent
  for (let i = 0; i < COLS; i++) {
    kept[i] = i < SINK_COLS || i >= COLS - RECENT_COLS
  }
  if (m.keepCols === 'window+heavy') {
    const mids = [Math.round(COLS * 0.38), Math.round(COLS * 0.52), Math.round(COLS * 0.64)]
    for (const c of mids) { kept[c] = true; heavy.push(c) }
  }
  return { kept, heavy, collapsed: false }
}

export function KvCacheCompressor() {
  const uid = useId().replace(/[:]/g, '')
  const [sel, setSel] = useState('fp16')
  const m = MECHS.find((x) => x.id === sel)!
  const { kept, heavy, collapsed } = keptColumns(m)
  const costColor = COST_COLOR[m.cost]

  // geometry
  const W = 460
  const H = 240
  const padL = 22
  const padT = 30
  const gridW = W - padL - 22
  const gridH = 150
  const cellW = gridW / COLS
  const cellH = gridH / ROWS
  const stackOffset = 4
  const stackN = Math.min(m.layers, 5) // visual depth cue

  return (
    <figure className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      <div className="border-b border-[var(--color-border)] bg-surface-2/40 px-4 py-3 sm:px-5">
        <div className="mb-2 font-mono text-[0.72rem] text-fg/75">
          The KV cache is a tensor <span className="text-muted">·</span>{' '}
          <span className="text-muted">2 · L · H · T · d, in fp16 — every method shrinks one axis</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MECHS.map((x) => {
            const active = x.id === sel
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => setSel(x.id)}
                aria-pressed={active}
                className={`rounded-lg border px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-wider transition-colors ${
                  active
                    ? 'border-transparent text-[#0a0a0a]'
                    : 'border-[var(--color-border)] text-muted hover:text-fg'
                }`}
                style={active ? { background: COST_COLOR[x.cost] } : undefined}
              >
                {x.tab}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px bg-[var(--color-border)] md:grid-cols-[1.1fr_1fr]">
        {/* schematic */}
        <div className="bg-surface p-3 sm:p-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${m.name}: a schematic of the KV cache with the ${m.axis} axis shrunk.`}>
            {/* layer stack (depth cue) */}
            {Array.from({ length: stackN }).map((_, i) => {
              const k = stackN - 1 - i
              return (
                <rect
                  key={`st-${uid}-${i}`}
                  x={padL + k * stackOffset}
                  y={padT + k * stackOffset}
                  width={gridW}
                  height={gridH}
                  rx={6}
                  fill="var(--color-surface-2)"
                  stroke="var(--color-border)"
                  opacity={0.4 + (i / stackN) * 0.3}
                />
              )
            })}

            {/* main slab background */}
            <rect x={padL} y={padT} width={gridW} height={gridH} rx={6} fill="var(--color-surface-2)" stroke="var(--color-border)" />

            {collapsed ? (
              /* GLA: a single fixed-size recurrent state, length-independent */
              <g>
                <rect
                  x={padL + 6}
                  y={padT + 8}
                  width={cellW * 3}
                  height={gridH - 16}
                  rx={4}
                  fill={GREEN}
                  opacity={0.5}
                  style={{ transition: 'all 380ms ease' }}
                />
                <text x={padL + 6 + cellW * 1.5} y={padT + gridH / 2} textAnchor="middle" className="fill-fg" style={{ fontSize: 9, fontFamily: 'monospace' }}>
                  fixed
                </text>
                <text x={padL + 6 + cellW * 1.5} y={padT + gridH / 2 + 12} textAnchor="middle" className="fill-fg" style={{ fontSize: 9, fontFamily: 'monospace' }}>
                  state
                </text>
              </g>
            ) : (
              /* token × head grid */
              Array.from({ length: ROWS }).map((_, r) =>
                Array.from({ length: COLS }).map((_, c) => {
                  const isKept = kept[c]
                  const isHeavy = heavy.includes(c)
                  const isSink = m.keepCols !== 'all' && c < SINK_COLS
                  const x = padL + c * cellW
                  const y = padT + r * cellH
                  let fill = 'var(--color-fg)'
                  let opacity = 0.16
                  if (!isKept) { fill = MUTED; opacity = 0.06 }
                  else if (isSink) { fill = GREEN; opacity = 0.7 }
                  else if (isHeavy) { fill = AMBER; opacity = 0.8 }
                  else if (m.axisKey === 'sequence') { fill = GREEN; opacity = 0.42 }
                  else if (m.bits === 4) { fill = GREEN; opacity = 0.5 }
                  else if (m.axisKey === 'layers') { fill = '#60a5fa'; opacity = 0.4 }
                  return (
                    <rect
                      key={`c-${uid}-${r}-${c}`}
                      x={x + 0.7}
                      y={y + 0.7}
                      width={cellW - 1.4}
                      height={cellH - 1.4}
                      rx={1.5}
                      fill={fill}
                      opacity={opacity}
                      style={{ transition: 'opacity 300ms ease, fill 300ms ease' }}
                    />
                  )
                }),
              )
            )}

            {/* 4-bit hatch overlay for quantisation */}
            {m.bits === 4 && !collapsed && (
              <rect x={padL} y={padT} width={gridW} height={gridH} rx={6} fill={`url(#q4-${uid})`} opacity={0.5} />
            )}

            {/* axis annotations */}
            <text x={padL} y={padT - 10} className="fill-muted" style={{ fontSize: 9, fontFamily: 'monospace' }}>
              ◄ {collapsed ? 'tokens (collapsed)' : 'tokens (sequence) ►'}
            </text>
            <text x={padL - 8} y={padT + gridH / 2} textAnchor="middle" transform={`rotate(-90 ${padL - 8} ${padT + gridH / 2})`} className="fill-muted" style={{ fontSize: 9, fontFamily: 'monospace' }}>
              heads
            </text>

            {/* layer + precision badges */}
            <text x={W - 22} y={padT + gridH + 22} textAnchor="end" className="fill-fg/70" style={{ fontSize: 10, fontFamily: 'monospace' }}>
              × {m.layers} layers · {m.bits}-bit
            </text>

            <defs>
              <pattern id={`q4-${uid}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="5" stroke={GREEN} strokeWidth="1.2" opacity="0.6" />
              </pattern>
            </defs>
          </svg>

          {/* footprint bar */}
          <div className="mt-1 flex items-center gap-2">
            <span className="w-[4.5rem] shrink-0 font-mono text-[0.58rem] uppercase tracking-wider text-muted">footprint</span>
            <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
              <div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{ width: `${Math.max(m.footprint * 100, 4)}%`, background: costColor, transition: 'width 420ms ease' }}
              />
            </div>
            <span className="w-[3rem] shrink-0 text-right font-mono text-[0.66rem] tabular-nums" style={{ color: costColor }}>
              {m.footprint.toFixed(2)}×
            </span>
          </div>
        </div>

        {/* card */}
        <div className="flex flex-col bg-surface p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: costColor }} aria-hidden />
            <span className="font-display text-lg font-semibold text-fg">{m.name}</span>
          </div>
          <div className="mt-1 font-mono text-[0.62rem] uppercase tracking-wider" style={{ color: costColor }}>
            attacks: {m.axis}
          </div>

          <p className="mt-3 font-sans text-[0.84rem] leading-relaxed text-fg/85">{m.rule}</p>

          <div className="mt-auto grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-border)] pt-3">
            <CardStat label="cost" value={m.costLabel} color={costColor} />
            <CardStat label="pass@1 (Go)" value={m.pass1} sub={m.pass1note} color={m.cost === 'lossy' || m.cost === 'retrain' ? RED : m.cost === 'lossless' ? GREEN : undefined} />
          </div>
        </div>
      </div>
    </figure>
  )
}

function CardStat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-surface px-3 py-2.5">
      <div className="font-mono text-[0.56rem] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-0.5 font-mono text-[0.78rem] font-semibold leading-tight" style={color ? { color } : { color: 'var(--color-fg)' }}>
        {value}
      </div>
      {sub && <div className="mt-0.5 font-mono text-[0.56rem] leading-tight text-muted">{sub}</div>}
    </div>
  )
}
