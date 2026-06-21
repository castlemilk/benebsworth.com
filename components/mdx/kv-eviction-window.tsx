'use client'

/**
 * KvEvictionWindow — the StreamingLLM / H2O eviction failure mode, made visible.
 *
 * A transformer's KV cache grows one entry per token. Eviction caps it at a
 * fixed budget B by keeping only:
 *   • a few "attention sinks" — the first `sink` tokens, which the softmax
 *     leans on heavily (the StreamingLLM finding); and
 *   • a "recent window" of the last B − sink tokens.
 * H2O additionally pins a handful of high-attention "heavy hitters" from the
 * middle, but the budget is the same.
 *
 * The widget plots the sequence (prompt + generated) along a token axis and
 * shades what the cache keeps vs evicts as generation advances. The whole point
 * lands when the budget is smaller than the prompt: the prompt's body scrolls
 * out of the recent window and is evicted *before generation finishes* — the
 * model is now writing code for a problem it can no longer see.
 *
 * Controls: budget (64 / 256 / 512), prompt length, a generation scrubber + play,
 * and a streaming/H2O policy toggle. Read-out states whether the full prompt is
 * still visible. SVG, theme-token styled, light/dark, mobile, reduced-motion safe.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

const GREEN = '#34d399'
const AMBER = '#f5a623'
const RED = '#f87171'
const SINK = 4 // attention-sink tokens kept at the head
const AXIS_MAX = 600 // fixed token axis so budget lines don't jump
const MAX_GEN = 256

type Policy = 'streaming' | 'h2o'

export function KvEvictionWindow() {
  const uid = useId().replace(/[:]/g, '')
  const [budget, setBudget] = useState(256)
  const [promptLen, setPromptLen] = useState(220)
  const [gen, setGen] = useState(120)
  const [policy, setPolicy] = useState<Policy>('streaming')
  const [playing, setPlaying] = useState(false)
  const timer = useRef<number | null>(null)

  const prefersReduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current) }, [])

  const play = useCallback(() => {
    if (timer.current) window.clearInterval(timer.current)
    if (prefersReduced) { setGen(MAX_GEN); return }
    setPlaying(true)
    setGen(0)
    timer.current = window.setInterval(() => {
      setGen((g) => {
        if (g >= MAX_GEN) {
          if (timer.current) window.clearInterval(timer.current)
          timer.current = null
          setPlaying(false)
          return MAX_GEN
        }
        return g + 4
      })
    }, 40)
  }, [prefersReduced])

  const stop = useCallback(() => {
    if (timer.current) window.clearInterval(timer.current)
    timer.current = null
    setPlaying(false)
  }, [])

  const frontier = promptLen + gen // current sequence length
  const recent = budget - SINK // recent-window size
  const windowStart = Math.max(SINK, frontier - recent)
  // prompt body [SINK, promptLen) is visible iff windowStart <= SINK
  const promptVisible = frontier <= budget
  const lostFrom = Math.min(promptLen, Math.max(SINK, windowStart))
  const promptLostTokens = Math.max(0, lostFrom - SINK)

  // H2O keeps a few heavy hitters scattered in the evicted middle.
  const heavyHitters = useMemo(() => {
    if (policy !== 'h2o') return []
    const mid: number[] = []
    const span = windowStart - SINK
    if (span <= 0) return []
    for (let i = 1; i <= 3; i++) mid.push(SINK + Math.round((span * i) / 4))
    return mid
  }, [policy, windowStart])

  // geometry
  const W = 720
  const H = 150
  const padL = 12
  const padR = 12
  const trackY = 46
  const trackH = 34
  const plotW = W - padL - padR
  const xOf = (t: number) => padL + (Math.min(t, AXIS_MAX) / AXIS_MAX) * plotW
  const xWid = (a: number, b: number) => xOf(b) - xOf(a)

  const budgets = [64, 256, 512]

  return (
    <figure className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-4 py-3 sm:px-5">
        <div className="font-mono text-[0.72rem] text-fg/75">
          KV eviction <span className="text-muted">·</span>{' '}
          <span className="text-muted">keep {SINK} sinks + the last {recent} tokens</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Eviction policy" className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
            {(['streaming', 'h2o'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPolicy(p)}
                aria-pressed={policy === p}
                className={`px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-wider transition-colors ${
                  policy === p ? 'bg-[var(--color-fg)]/10 text-fg' : 'text-muted hover:text-fg'
                }`}
              >
                {p === 'h2o' ? 'H2O' : 'streaming'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={playing ? stop : play}
            className="rounded-lg border border-[var(--color-border)] bg-surface px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-wider text-fg transition-colors hover:border-blog hover:text-blog"
          >
            {playing ? 'stop' : 'generate ▶'}
          </button>
        </div>
      </div>

      <div className="px-2 py-2 sm:px-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Token sequence with the kept and evicted regions of the KV cache.">
          {/* budget brackets */}
          {budgets.map((b) => (
            <g key={`bk-${uid}-${b}`} opacity={b === budget ? 1 : 0.25}>
              <line x1={xOf(b)} x2={xOf(b)} y1={trackY - 10} y2={trackY + trackH + 14} stroke={b === budget ? AMBER : 'var(--color-border)'} strokeWidth={b === budget ? 1.4 : 1} strokeDasharray="3 3" />
              <text x={xOf(b)} y={trackY - 14} textAnchor="middle" className="fill-muted" style={{ fontSize: 9, fontFamily: 'monospace' }}>
                {b}
              </text>
            </g>
          ))}

          {/* base sequence track (prompt + generated outline) */}
          <rect x={xOf(0)} y={trackY} width={xWid(0, frontier)} height={trackH} rx={4} fill="var(--color-surface-2)" stroke="var(--color-border)" />

          {/* evicted middle (hatched grey) */}
          {windowStart > SINK && (
            <rect x={xOf(SINK)} y={trackY} width={xWid(SINK, windowStart)} height={trackH} fill={`url(#evhatch-${uid})`} opacity={0.9} style={{ transition: 'width 120ms linear, x 120ms linear' }} />
          )}
          {/* lost prompt region (red) — the part of the PROMPT that got evicted */}
          {promptLostTokens > 0 && (
            <rect x={xOf(SINK)} y={trackY} width={xWid(SINK, lostFrom)} height={trackH} fill={RED} opacity={0.28} style={{ transition: 'width 120ms linear' }} />
          )}

          {/* kept: sinks */}
          <rect x={xOf(0)} y={trackY} width={xWid(0, SINK)} height={trackH} rx={3} fill={GREEN} opacity={0.85} />
          {/* kept: recent window */}
          <rect x={xOf(windowStart)} y={trackY} width={xWid(windowStart, frontier)} height={trackH} rx={3} fill={GREEN} opacity={0.55} style={{ transition: 'x 120ms linear, width 120ms linear' }} />

          {/* H2O heavy hitters */}
          {heavyHitters.map((t, i) => (
            <rect key={`hh-${uid}-${i}`} x={xOf(t) - 2} y={trackY} width={4} height={trackH} fill={AMBER} opacity={0.9} />
          ))}

          {/* prompt-end marker */}
          <line x1={xOf(promptLen)} x2={xOf(promptLen)} y1={trackY - 4} y2={trackY + trackH + 4} stroke="var(--color-fg)" strokeWidth={1.4} />
          <text x={xOf(promptLen)} y={trackY + trackH + 24} textAnchor="middle" className="fill-fg/70" style={{ fontSize: 9, fontFamily: 'monospace' }}>
            prompt ends
          </text>

          {/* region labels */}
          <text x={xOf(0) + 2} y={trackY - 4} className="fill-fg/70" style={{ fontSize: 9, fontFamily: 'monospace' }}>sinks</text>
          <text x={(xOf(windowStart) + xOf(frontier)) / 2} y={trackY + trackH + 24} textAnchor="middle" className="fill-fg/70" style={{ fontSize: 9, fontFamily: 'monospace' }}>recent window</text>

          {/* hatch pattern for evicted region */}
          <defs>
            <pattern id={`evhatch-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="var(--color-surface-2)" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-muted)" strokeWidth="1.4" opacity="0.5" />
            </pattern>
          </defs>
        </svg>
      </div>

      {/* sliders */}
      <div className="grid grid-cols-1 gap-3 border-t border-[var(--color-border)] px-4 py-3 sm:grid-cols-2 sm:px-5">
        <SliderRow label="budget" value={budget}>
          <div className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
            {budgets.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBudget(b)}
                aria-pressed={budget === b}
                className={`px-2.5 py-1 font-mono text-[0.62rem] tabular-nums transition-colors ${
                  budget === b ? 'bg-[var(--color-fg)]/10 text-fg' : 'text-muted hover:text-fg'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </SliderRow>
        <SliderRow label="prompt length" value={`${promptLen} tok`}>
          <input
            type="range"
            min={80}
            max={320}
            step={10}
            value={promptLen}
            onChange={(e) => setPromptLen(Number(e.target.value))}
            className="w-full accent-[var(--color-blog)]"
            aria-label="Prompt length in tokens"
          />
        </SliderRow>
      </div>

      <div className="border-t border-[var(--color-border)] px-4 py-2 sm:px-5">
        <SliderRow label={`generated`} value={`${gen} / ${MAX_GEN} tok`}>
          <input
            type="range"
            min={0}
            max={MAX_GEN}
            step={4}
            value={gen}
            onChange={(e) => { stop(); setGen(Number(e.target.value)) }}
            className="w-full accent-[var(--color-blog)]"
            aria-label="Tokens generated so far"
          />
        </SliderRow>
      </div>

      {/* verdict */}
      <div
        className="flex items-center gap-2 border-t px-4 py-2.5 sm:px-5"
        style={{
          borderColor: 'var(--color-border)',
          background: promptVisible ? `color-mix(in srgb, ${GREEN} 10%, transparent)` : `color-mix(in srgb, ${RED} 12%, transparent)`,
        }}
      >
        <span className="font-mono text-[0.68rem] leading-snug text-fg/85">
          context = <span className="tabular-nums text-fg">{frontier}</span> tok, budget ={' '}
          <span className="tabular-nums text-fg">{budget}</span> ·{' '}
          {promptVisible ? (
            <span style={{ color: GREEN }}>✓ the whole prompt is still in the cache</span>
          ) : (
            <span style={{ color: RED }}>
              ⚠ {promptLostTokens} prompt tokens evicted — the model can no longer see the problem statement
            </span>
          )}
        </span>
      </div>
    </figure>
  )
}

function SliderRow({ label, value, children }: { label: string; value: string | number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[5.5rem] shrink-0 font-mono text-[0.6rem] uppercase tracking-wider text-muted">{label}</span>
      <div className="flex-1">{children}</div>
      <span className="w-[4.5rem] shrink-0 text-right font-mono text-[0.62rem] tabular-nums text-fg/80">{value}</span>
    </div>
  )
}
