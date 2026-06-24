'use client'

/**
 * SelectiveScan — the core interactive for "The loop that beats attention"
 * (how Mamba's selective state-space model works).
 *
 * A transformer's self-attention compares every token to every other token, so
 * its cost grows like O(n²) — that's the faint web of arcs above the sentence.
 * A state-space model instead carries ONE fixed-size hidden state h and walks
 * the sequence token by token, folding each new token in with a single update.
 * That's O(n): one vector touched per step, no matter how long the sentence.
 *
 * The twist that makes Mamba competitive is SELECTIVITY: the gate Δ that decides
 * how much of the new token to write is itself a function of the token. We model
 * the real recurrence directly:
 *
 *     h_t = Δ_t · write_t  +  (1 − Δ_t) · decay · h_{t-1}
 *
 *   • Δ_t close to 1  → OVERWRITE: the token is important, so its "write" vector
 *     is stamped into the state and the old memory is pushed down (teal flash).
 *   • Δ_t close to 0  → KEEP: the token is filler, the state barely moves; the
 *     previous memory just gently decays (dim/grey).
 *
 * The write vectors and per-token gates are SCRIPTED (a fixed table, computed in
 * useMemo) so the render is deterministic and SSR-safe — no Math.random / Date.now
 * at render or module init. The play head advances on a rAF clock (~0.5s/token)
 * that is gated on in-view + running + reduced-motion + not-scrubbing, and is
 * cancelled on cleanup. Under reduced motion we jump straight to the final state.
 *
 * The state-cell magnitudes are mirrored onto data-state for DOM-level tests, so
 * a Playwright check can confirm each step equals the recurrence to within
 * rounding without pixel-peeping.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInViewport } from './use-in-viewport'

// ── the illustrative sentence ──────────────────────────────────────────────
// Two clearly "important" content tokens (high Δ) and a run of filler (low Δ).
type Tok = { word: string; delta: number }
const SENTENCE: Tok[] = [
  { word: 'the', delta: 0.08 },
  { word: 'cat', delta: 0.92 }, // important — subject
  { word: 'that', delta: 0.12 },
  { word: 'sat', delta: 0.18 },
  { word: 'on', delta: 0.06 },
  { word: 'the', delta: 0.05 },
  { word: 'warm', delta: 0.34 },
  { word: 'mat', delta: 0.88 }, // important — object
  { word: 'fell', delta: 0.22 },
  { word: 'asleep', delta: 0.4 },
]

const STATE_DIM = 7 // fixed-size hidden state h (a small column of cells)
const DECAY = 0.86 // A in the discretised SSM: how memory leaks when not written
const STEP_SECONDS = 0.5 // ~0.5s per token for the play head
const EPS = 1e-9 // "barely changed" tolerance used in the readout

const accent = 'var(--color-blog)' // teal — the post's software-desk accent
const IGNORE_COLOR = '#8a8f98' // neutral grey for an ignored token

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

// Each token gets a fixed "write" vector — what it WOULD stamp into the state if
// the gate let it through. Derived from a seeded PRNG so it's identical on the
// server and the client. Values in [0,1] so cell magnitudes stay in a nice range.
function makeWriteVectors(seed: number, n: number, dim: number): number[][] {
  const rand = mulberry32(seed)
  const out: number[][] = []
  for (let i = 0; i < n; i++) {
    const v: number[] = []
    for (let d = 0; d < dim; d++) v.push(0.2 + 0.8 * rand())
    out.push(v)
  }
  return out
}

// Roll the REAL recurrence forward and store h after every token (h[0] = zeros,
// h[k] = state after token k-1). h_t = Δ·write + (1−Δ)·decay·h_{t-1}.
function runRecurrence(
  tokens: Tok[],
  writes: number[][],
  dim: number,
): number[][] {
  const history: number[][] = [new Array(dim).fill(0)]
  let h = new Array(dim).fill(0)
  for (let i = 0; i < tokens.length; i++) {
    const g = tokens[i].delta
    const w = writes[i]
    const next: number[] = []
    for (let d = 0; d < dim; d++) {
      next.push(g * w[d] + (1 - g) * DECAY * h[d])
    }
    h = next
    history.push(h)
  }
  return history
}

export function SelectiveScan() {
  const [inViewRef, inView] = useInViewport<HTMLDivElement>('120px')
  // step is the number of tokens consumed so far: 0 = empty state, n = whole
  // sentence read. The state shown is history[step].
  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)

  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const stepRef = useRef(0)

  const n = SENTENCE.length

  const writes = useMemo(
    () => makeWriteVectors(0x5e1ec7ed, n, STATE_DIM),
    [n],
  )
  const history = useMemo(
    () => runRecurrence(SENTENCE, writes, STATE_DIM),
    [writes],
  )

  // ── geometry ──────────────────────────────────────────────────────────────
  const VB_W = 640
  const VB_H = 300
  const MARGIN = 22
  const TOKEN_Y = 196 // token row baseline
  const BOX_H = 36
  const ARC_BASE = TOKEN_Y - 4

  const avail = VB_W - 2 * MARGIN
  const slot = avail / n
  const boxW = Math.min(58, slot - 7)
  const boxX = (i: number) => MARGIN + slot * i + (slot - boxW) / 2
  const cx = (i: number) => boxX(i) + boxW / 2

  // All-pairs attention arcs are purely decorative: they make the O(n²) cost of
  // attention literal next to the O(n) single-vector update. Count = n(n-1)/2.
  const arcs = useMemo(() => {
    const a: { i: number; j: number }[] = []
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) a.push({ i, j })
    return a
  }, [n])

  // ── rAF clock: march the play head one token at a time ─────────────────────
  useEffect(() => {
    if (!running || !inView || reducedMotion() || scrubbing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      startRef.current = null
      return
    }
    const tick = (now: number) => {
      if (startRef.current == null)
        startRef.current = now - stepRef.current * STEP_SECONDS * 1000
      const elapsed = (now - startRef.current) / 1000
      const next = Math.min(n, Math.floor(elapsed / STEP_SECONDS))
      if (next !== stepRef.current) {
        stepRef.current = next
        setStep(next)
      }
      if (next >= n) {
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
  }, [running, inView, scrubbing, n])

  // keep the imperative ref in sync with committed state
  useEffect(() => {
    stepRef.current = step
  }, [step])

  const play = () => {
    if (reducedMotion()) {
      setStep(n) // jump to the fully-read state
      return
    }
    if (step >= n) {
      setStep(0)
      stepRef.current = 0
    }
    startRef.current = null
    setRunning(true)
  }
  const reset = () => {
    setRunning(false)
    setStep(0)
    stepRef.current = 0
    startRef.current = null
  }

  // ── current state + the token just consumed ────────────────────────────────
  const h = history[step] // state AFTER `step` tokens
  const hPrev = history[Math.max(0, step - 1)]
  const activeIdx = step > 0 ? step - 1 : -1 // token whose update we just applied
  const activeTok = activeIdx >= 0 ? SENTENCE[activeIdx] : null
  const delta = activeTok ? activeTok.delta : 0
  const high = delta >= 0.5

  // per-cell magnitude in [0,1] for shading (writes already live in [0,1])
  const cellMag = (v: number) => Math.max(0, Math.min(1, v))

  // caption for the step
  const caption =
    activeTok == null
      ? 'state initialised to zero — no token read yet'
      : high
        ? `Δ=${delta.toFixed(2)} → overwrite · token “${activeTok.word}” written to state`
        : `Δ=${delta.toFixed(2)} → keep old state · token “${activeTok.word}” ignored`

  // expose the live state vector for DOM-level verification
  const dataState = h.map((v) => v.toFixed(4)).join(',')

  // how much each cell moved on this step (drives the per-cell flash)
  const moved = h.map((v, d) => Math.abs(v - hPrev[d]))
  const maxMove = Math.max(EPS, ...moved)

  return (
    <figure
      ref={inViewRef}
      className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
      data-state={dataState}
      data-step={step}
      data-delta={activeTok ? delta.toFixed(2) : ''}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          selective scan · one state, gated by Δ
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={running ? reset : play}
            className="rounded-md border border-[var(--color-border)] bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider text-fg transition-colors hover:border-[var(--color-muted)]"
          >
            {running ? 'reset' : step >= n ? 'replay' : 'play ▶'}
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

      {/* ── body: SVG scan + state column ───────────────────────────────────── */}
      <div className="flex flex-col gap-3 px-2 py-4 sm:px-4 md:flex-row md:items-stretch">
        {/* the streaming token row with decorative all-pairs arcs */}
        <div className="min-w-0 flex-1 overflow-x-auto">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="block h-auto w-full"
            style={{ maxWidth: 680, minWidth: 320, margin: '0 auto' }}
            role="img"
            aria-label={`A selective state-space scan over a ${n}-token sentence. Faint all-pairs attention arcs above the tokens show attention's order n-squared cost; below, a single fixed-size state vector is updated one token at a time. The current step has gate Δ=${delta.toFixed(2)}, ${activeTok ? (high ? 'overwriting' : 'keeping') : 'idle'} the state.`}
          >
            {/* header labels */}
            <text
              x={MARGIN}
              y={26}
              className="font-mono"
              style={{ fontSize: 12, fill: 'var(--color-fg)', fontWeight: 600 }}
            >
              attention: all pairs
            </text>
            <text
              x={VB_W - MARGIN}
              y={26}
              textAnchor="end"
              className="font-mono"
              style={{ fontSize: 11, fill: IGNORE_COLOR }}
            >
              {arcs.length} arcs · O(n²)
            </text>

            {/* decorative all-pairs attention arcs (static — the O(n²) web) */}
            <g fill="none" style={{ opacity: 0.4 }}>
              {arcs.map(({ i, j }) => {
                const sx = cx(i)
                const ex = cx(j)
                const mid = (sx + ex) / 2
                const lift = 18 + Math.min(120, (j - i) * 16)
                // thin the arcs out so they stay legible on narrow screens
                const sw = j - i === 1 ? 0.9 : 0.55
                return (
                  <path
                    key={`arc-${i}-${j}`}
                    d={`M ${sx} ${ARC_BASE} Q ${mid} ${ARC_BASE - lift} ${ex} ${ARC_BASE}`}
                    stroke={IGNORE_COLOR}
                    strokeWidth={sw}
                  />
                )
              })}
            </g>

            {/* the token row */}
            {SENTENCE.map((tok, i) => {
              const consumed = i < step
              const isActive = i === activeIdx
              const tokHigh = tok.delta >= 0.5
              const fill = !consumed
                ? 'var(--color-surface-2, rgba(127,127,127,0.06))'
                : tokHigh
                  ? 'color-mix(in srgb, var(--color-blog) 18%, transparent)'
                  : 'color-mix(in srgb, #8a8f98 14%, transparent)'
              const stroke = isActive
                ? tokHigh
                  ? accent
                  : IGNORE_COLOR
                : consumed
                  ? tokHigh
                    ? 'color-mix(in srgb, var(--color-blog) 60%, transparent)'
                    : 'color-mix(in srgb, #8a8f98 60%, transparent)'
                  : 'color-mix(in srgb, var(--color-border) 80%, transparent)'
              return (
                <g
                  key={`tok-${i}`}
                  style={{ transition: 'opacity 200ms ease' }}
                >
                  <rect
                    x={boxX(i)}
                    y={TOKEN_Y - BOX_H / 2}
                    width={boxW}
                    height={BOX_H}
                    rx={8}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isActive ? 2 : 1.1}
                    style={{ transition: 'fill 200ms ease, stroke 200ms ease' }}
                  />
                  <text
                    x={cx(i)}
                    y={TOKEN_Y + 4}
                    textAnchor="middle"
                    className="font-mono"
                    style={{
                      fontSize: 11.5,
                      fill: 'var(--color-fg)',
                      opacity: consumed ? 0.95 : 0.55,
                    }}
                  >
                    {tok.word}
                  </text>
                  {/* per-token Δ chip */}
                  <text
                    x={cx(i)}
                    y={TOKEN_Y + BOX_H / 2 + 16}
                    textAnchor="middle"
                    className="font-mono"
                    style={{
                      fontSize: 9,
                      fill: tokHigh ? accent : IGNORE_COLOR,
                      opacity: consumed ? 1 : 0.5,
                    }}
                  >
                    Δ{tok.delta.toFixed(2)}
                  </text>
                </g>
              )
            })}

            {/* play head pointing at the token just consumed */}
            {activeIdx >= 0 && (
              <g
                transform={`translate(${cx(activeIdx)}, ${TOKEN_Y - BOX_H / 2 - 12})`}
                style={{ transition: 'transform 220ms ease' }}
              >
                <path
                  d="M 0 8 L -6 0 L 6 0 Z"
                  fill={high ? accent : IGNORE_COLOR}
                />
              </g>
            )}

            <text
              x={MARGIN}
              y={TOKEN_Y + BOX_H / 2 + 40}
              className="font-mono"
              style={{ fontSize: 10.5, fill: 'var(--color-muted)' }}
            >
              state update: <tspan fill={accent} fontWeight={700}>1 vector / step</tspan> · O(n)
            </text>
          </svg>
        </div>

        {/* the fixed-size state vector h, as a small column of cells */}
        <div className="flex flex-row items-center justify-center gap-3 md:w-[170px] md:flex-col md:justify-center">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted md:mb-1">
            state h <span className="tabular-nums">[{STATE_DIM}]</span>
          </span>
          <div
            className="flex flex-row gap-1 md:flex-col"
            role="img"
            aria-label={`The fixed-size hidden state, ${STATE_DIM} cells, shaded by magnitude. data-state lists the exact values.`}
          >
            {h.map((v, d) => {
              const mag = cellMag(v)
              // teal flash scales with how much THIS cell moved this step;
              // a high-gate write lights the whole column, a low gate barely glows.
              const flash = high ? moved[d] / maxMove : 0
              const bg = `color-mix(in srgb, var(--color-blog) ${(
                12 +
                mag * 70
              ).toFixed(0)}%, transparent)`
              const ring = `color-mix(in srgb, var(--color-blog) ${(
                30 +
                flash * 60
              ).toFixed(0)}%, var(--color-border))`
              return (
                <div
                  key={`cell-${d}`}
                  data-cell={d}
                  data-mag={v.toFixed(4)}
                  className="flex h-7 w-9 items-center justify-center rounded-md border md:h-6 md:w-full"
                  style={{
                    background: bg,
                    borderColor: ring,
                    borderWidth: high && flash > 0.4 ? 1.6 : 1,
                    transition:
                      'background 220ms ease, border-color 220ms ease, border-width 220ms ease',
                  }}
                >
                  <span className="font-mono text-[0.6rem] tabular-nums text-fg">
                    {v.toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
          <span
            className="font-mono text-[0.62rem] uppercase tracking-wider"
            style={{ color: activeTok ? (high ? accent : IGNORE_COLOR) : 'var(--color-muted)' }}
          >
            {activeTok == null ? 'idle' : high ? 'WRITTEN' : 'KEPT'}
          </span>
        </div>
      </div>

      {/* ── footer: scrubber + math caption ─────────────────────────────────── */}
      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex items-center gap-4">
          <label
            htmlFor="ss-step"
            className="whitespace-nowrap font-mono text-[0.7rem] uppercase tracking-wider text-muted"
          >
            scan step
          </label>
          <input
            id="ss-step"
            type="range"
            min={0}
            max={n}
            step={1}
            value={step}
            onPointerDown={() => {
              setRunning(false)
              setScrubbing(true)
            }}
            onPointerUp={() => setScrubbing(false)}
            onChange={(e) => {
              setRunning(false)
              const v = Number(e.target.value)
              stepRef.current = v
              setStep(v)
            }}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]"
          />
          <span className="w-20 text-right font-mono text-[0.78rem] tabular-nums text-fg">
            {step} / {n}
          </span>
        </div>
        <p
          className="mt-2 font-mono text-[0.66rem] leading-snug"
          style={{ color: activeTok ? (high ? accent : IGNORE_COLOR) : 'var(--color-muted)' }}
          data-caption
        >
          {caption}
        </p>
        <p className="mt-1 font-mono text-[0.66rem] leading-snug text-muted">
          Attention compares every token to every other — {arcs.length} pairs
          here, growing as <span className="text-blog">n(n−1)/2</span>. The
          state-space model carries one fixed-size{' '}
          <span className="text-blog">h</span> and folds in each token with{' '}
          <span className="text-blog">
            h<sub>t</sub> = Δ·write + (1−Δ)·{DECAY}·h<sub>t−1</sub>
          </span>
          . A high Δ overwrites the cell; a low Δ keeps the old memory (lightly
          decayed). One vector touched per step, regardless of length — that is
          the O(n) loop that beats O(n²) attention.
        </p>
      </div>
    </figure>
  )
}
