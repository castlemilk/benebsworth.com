'use client'

/**
 * ParallelismRace — the "why the transformer is novel" animation for the
 * "A transformer reads everything at once" post.
 *
 * Two rows over the same sentence:
 *   • RNN      — a hidden-state baton crawls one word at a time (sequential).
 *                The longest path between two tokens is N−1 hops.
 *   • Transformer — every token wires to every other in ONE step (parallel).
 *                The longest path between any two tokens is 1 hop.
 *
 * Hit play and the transformer is done almost instantly while the RNN baton
 * is still crawling. A length slider shows the gap widen: the RNN's step count
 * grows with N, the transformer's stays at 1. That O(n) vs O(1) path length is
 * the whole reason attention could be scaled on a GPU.
 *
 * rAF loop is gated on in-view + running + reduced-motion (pauses off-screen).
 */

import { useEffect, useRef, useState } from 'react'
import { useInViewport } from './use-in-viewport'

const WORDS = ['the', 'cat', 'sat', 'on', 'the', 'mat', 'and', 'then', 'slept']
const MIN_N = 3
const MAX_N = 9
const STEP_SECONDS = 0.6 // how long the RNN spends per token

const VB_W = 600
const MARGIN = 24
const BOX_H = 34

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

export function ParallelismRace() {
  const [inViewRef, inView] = useInViewport<HTMLDivElement>('120px')
  const [n, setN] = useState(6)
  const [running, setRunning] = useState(false)
  const [t, setT] = useState(0) // seconds since play started

  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  // geometry — center a row of N boxes inside the viewBox
  const avail = VB_W - 2 * MARGIN
  const slot = avail / n
  const boxW = Math.min(66, slot - 8)
  const boxX = (i: number) => MARGIN + slot * i + (slot - boxW) / 2
  const cx = (i: number) => boxX(i) + boxW / 2

  const RNN_Y = 96
  const TR_Y = 250

  const totalSeconds = n * STEP_SECONDS
  const rnnPos = Math.min(n, t / STEP_SECONDS) // float 0..n
  const rnnStepsDone = Math.floor(rnnPos)
  const rnnDone = rnnPos >= n
  const trProgress = Math.min(1, t / 0.55) // all-to-all fade-in
  const trDone = t >= 0.55

  // rAF clock
  useEffect(() => {
    if (!running || !inView || reducedMotion()) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      startRef.current = null
      return
    }
    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now - t * 1000
      const elapsed = (now - startRef.current) / 1000
      setT(elapsed)
      if (elapsed >= totalSeconds) {
        setT(totalSeconds)
        setRunning(false)
        return
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

  const play = () => {
    if (reducedMotion()) {
      setT(totalSeconds) // jump to the finished state
      return
    }
    setT(0)
    startRef.current = null
    setRunning(true)
  }
  const reset = () => {
    setRunning(false)
    setT(0)
    startRef.current = null
  }

  // reset the clock if the length changes mid-run
  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n])

  const word = (i: number) => WORDS[i % WORDS.length]
  const accent = 'var(--color-blog)'

  const Box = ({ i, lit }: { i: number; lit: boolean }) => (
    <g style={{ transition: 'opacity 200ms ease' }}>
      <rect
        x={boxX(i)}
        width={boxW}
        height={BOX_H}
        rx={8}
        fill={lit ? 'color-mix(in srgb, var(--color-blog) 16%, transparent)' : 'var(--color-surface-2, rgba(127,127,127,0.06))'}
        stroke={lit ? accent : 'color-mix(in srgb, var(--color-border) 80%, transparent)'}
        strokeWidth={lit ? 1.6 : 1}
        style={{ transition: 'fill 220ms ease, stroke 220ms ease' }}
      />
      <text
        x={cx(i)}
        textAnchor="middle"
        className="font-mono"
        style={{ fontSize: 12.5, fill: 'var(--color-fg)', opacity: 0.9 }}
      >
        {word(i)}
      </text>
    </g>
  )

  return (
    <figure
      ref={inViewRef}
      className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          path length · sequential vs parallel
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={running ? reset : play}
            className="rounded-md border border-[var(--color-border)] bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider text-fg transition-colors hover:border-[var(--color-muted)]"
          >
            {running ? 'reset' : rnnDone ? 'replay' : 'play ▶'}
          </button>
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        <svg
          viewBox={`0 0 ${VB_W} 320`}
          className="block h-auto w-full"
          style={{ maxWidth: 660, margin: '0 auto' }}
          role="img"
          aria-label="A race comparing an RNN processing tokens one at a time against a transformer wiring all tokens at once."
        >
          {/* ── RNN row ───────────────────────────────────────────── */}
          <text x={MARGIN} y={42} className="font-mono" style={{ fontSize: 12.5, fill: 'var(--color-fg)', fontWeight: 600 }}>
            RNN — one word at a time
          </text>
          <text x={VB_W - MARGIN} y={42} textAnchor="end" className="font-mono" style={{ fontSize: 11.5, fill: accent }}>
            {rnnDone ? `done · ${n} steps` : `step ${Math.min(rnnStepsDone + (running ? 1 : 0), n)} / ${n}`}
          </text>

          {/* recurrence arrows between adjacent boxes, lit up to the baton */}
          {Array.from({ length: n - 1 }).map((_, i) => {
            const lit = i < rnnPos - 0.5
            return (
              <path
                key={`rec-${i}`}
                d={`M ${boxX(i) + boxW} ${RNN_Y + BOX_H / 2} L ${boxX(i + 1)} ${RNN_Y + BOX_H / 2}`}
                stroke={lit ? accent : 'color-mix(in srgb, var(--color-border) 70%, transparent)'}
                strokeWidth={lit ? 2 : 1}
                markerEnd="url(#pr-arrow)"
                style={{ transition: 'stroke 200ms ease' }}
              />
            )
          })}

          <g transform={`translate(0, ${RNN_Y})`}>
            {Array.from({ length: n }).map((_, i) => (
              <g key={`rb-${i}`} transform={`translate(0, ${-BOX_H / 2 + 17})`}>
                <Box i={i} lit={i <= rnnPos - 0.5} />
              </g>
            ))}
          </g>

          {/* the hidden-state baton */}
          {!rnnDone && running && (
            <g transform={`translate(${cx(Math.min(n - 1, Math.floor(rnnPos)))}, ${RNN_Y - 26})`}>
              <rect x={-26} y={-14} width={52} height={20} rx={10} fill={accent} />
              <text textAnchor="middle" y={1} className="font-mono" style={{ fontSize: 9.5, fill: 'var(--color-bg)', fontWeight: 700 }}>
                state
              </text>
              <path d="M 0 6 L -5 0 L 5 0 Z" fill={accent} transform="translate(0, 8)" />
            </g>
          )}

          {/* longest-path annotation: 0 → last snakes through every box */}
          <text x={MARGIN} y={RNN_Y + 54} className="font-mono" style={{ fontSize: 10.5, fill: 'var(--color-muted)' }}>
            longest path token 1 → token {n}: <tspan fill={accent} fontWeight={700}>{n - 1} hops</tspan>
          </text>

          {/* ── Transformer row ───────────────────────────────────── */}
          <text x={MARGIN} y={210} className="font-mono" style={{ fontSize: 12.5, fill: 'var(--color-fg)', fontWeight: 600 }}>
            Transformer — all at once
          </text>
          <text x={VB_W - MARGIN} y={210} textAnchor="end" className="font-mono" style={{ fontSize: 11.5, fill: accent }}>
            {trDone ? 'done · 1 step' : running ? 'step 1 / 1' : 'idle'}
          </text>

          {/* all-to-all arcs above the row, faded in together */}
          <g fill="none" style={{ opacity: trProgress * 0.55, transition: 'opacity 120ms linear' }}>
            {Array.from({ length: n }).flatMap((_, i) =>
              Array.from({ length: n }).map((__, j) => {
                if (j <= i) return null
                const sx = cx(i)
                const ex = cx(j)
                const mid = (sx + ex) / 2
                const lift = 14 + Math.min(46, (j - i) * 9)
                return (
                  <path
                    key={`arc-${i}-${j}`}
                    d={`M ${sx} ${TR_Y - 4} Q ${mid} ${TR_Y - 4 - lift} ${ex} ${TR_Y - 4}`}
                    stroke={accent}
                    strokeWidth={1}
                  />
                )
              }),
            )}
          </g>

          <g transform={`translate(0, ${TR_Y})`}>
            {Array.from({ length: n }).map((_, i) => (
              <g key={`tb-${i}`} transform={`translate(0, ${-BOX_H / 2 + 17})`}>
                <Box i={i} lit={trProgress > 0.1} />
              </g>
            ))}
          </g>

          <text x={MARGIN} y={TR_Y + 54} className="font-mono" style={{ fontSize: 10.5, fill: 'var(--color-muted)' }}>
            longest path token 1 → token {n}: <tspan fill={accent} fontWeight={700}>1 hop</tspan>
          </text>

          <defs>
            <marker id="pr-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
            </marker>
          </defs>
        </svg>
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex items-center gap-4">
          <label htmlFor="pr-len" className="font-mono text-[0.7rem] uppercase tracking-wider text-muted whitespace-nowrap">
            sequence length
          </label>
          <input
            id="pr-len"
            type="range"
            min={MIN_N}
            max={MAX_N}
            step={1}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]"
          />
          <span className="w-24 text-right font-mono text-[0.78rem] tabular-nums text-fg">
            {n} tokens
          </span>
        </div>
        <p className="mt-2 font-mono text-[0.66rem] leading-snug text-muted">
          The RNN needs one step per word, so its longest path grows with the sentence. The
          transformer connects every word to every other in a single step — the same wall-clock
          whether the sentence is 3 words or 3,000. That is what makes it cheap to train on a GPU.
        </p>
      </div>
    </figure>
  )
}
