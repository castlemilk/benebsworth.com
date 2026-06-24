'use client'

/**
 * ReasoningTree — the test-time-compute explorer for
 * "Why thinking longer makes models smarter".
 *
 * The idea: instead of asking a model ONCE, you sample N independent reasoning
 * chains for the SAME hard problem and aggregate. Two aggregation rules:
 *
 *   • majority vote (self-consistency): take the answer that the most chains
 *     land on. argmax_a Σ_i [answer_i = a].
 *   • best-of-N (verifier): score each chain 0..1 with a verifier and keep the
 *     single highest-scored chain's answer. argmax_i score_i.
 *
 * Each chain is a path of 3–5 small step nodes that fans out of one prompt node;
 * chains SHARE early steps and then diverge (a real tree — branches split). Every
 * leaf carries a final-answer value. On this deliberately HARD seed the plurality
 * of chains agrees on a WRONG answer (a shared misconception), while the chain the
 * verifier scores highest is the one that actually got it right — so best-of-N
 * beats majority vote, which is the whole point of the post.
 *
 * The library of trees is PRE-BAKED, fully deterministic data (no live model, no
 * Math.random/Date.now at render or module init). Geometry is laid out with a
 * seeded jitter only via fixed constants. The rAF loop does nothing but a gentle
 * staggered "sampling" reveal of chains as N rises; it's gated on
 * useInViewport + reduced-motion (reduced motion → instant reveal) and cancelled
 * on cleanup. The visuals are computed from the real vote/score math, and the
 * per-leaf answer, score and revealed-opacity are exposed as data-* attributes so
 * a DOM test can confirm the readout matches the leaves.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInViewport } from './use-in-viewport'

const accent = 'var(--color-blog)'
// extra encoding colours (spec allows explicit hex for non-accent encodings)
const CORRECT_COLOR = '#2f9e6b' // the known-correct answer ring (verifier pick)

const MAX_N = 8
const REVEAL_MS = 240 // stagger between chain reveals during sampling

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

type Mode = 'majority' | 'bestofn'

// ── pre-baked reasoning chains ──────────────────────────────────────────────
// Each chain: a label for its early shared branch, an array of short step texts,
// the final answer it lands on, whether it is actually correct, and the
// verifier's score in [0,1]. Ordered top→bottom as drawn.
//
// THE HARD SEED (correct answer = 42):
//   answers  → 36 36 36 42 18 36 24 42
//   counts   → 36:4 (plurality, WRONG)  42:2 (correct)  18:1  24:1
//   verifier → max score 0.93 on chain index 3, which answers 42 (correct).
// So majority vote returns 36 (wrong) but best-of-N returns 42 (right).
type Chain = {
  steps: string[] // 3–5 short reasoning steps
  answer: string
  correct: boolean
  score: number // verifier score in [0,1]
  branch: 0 | 1 | 2 // which early fork it shares (for the tree split)
}

const CORRECT_ANSWER = '42'

const CHAINS: Chain[] = [
  // branch 0 — "subtract first" misconception (lands on 36, the wrong plurality)
  { steps: ['read', 'set up', 'subtract', '= 36'], answer: '36', correct: false, score: 0.41, branch: 0 },
  { steps: ['read', 'set up', 'subtract', '= 36'], answer: '36', correct: false, score: 0.38, branch: 0 },
  { steps: ['read', 'set up', 'drop unit', '= 36'], answer: '36', correct: false, score: 0.52, branch: 0 },
  // branch 1 — "distribute then add" (the rigorous path → 42, correct)
  { steps: ['read', 'distribute', 'add back', 'check', '= 42'], answer: '42', correct: true, score: 0.93, branch: 1 },
  // branch 2 — assorted slips
  { steps: ['read', 'guess', 'round', '= 18'], answer: '18', correct: false, score: 0.22, branch: 2 },
  { steps: ['read', 'set up', 'subtract', '= 36'], answer: '36', correct: false, score: 0.47, branch: 0 },
  { steps: ['read', 'mis-add', '= 24'], answer: '24', correct: false, score: 0.31, branch: 2 },
  { steps: ['read', 'distribute', 'add back', '= 42'], answer: '42', correct: true, score: 0.74, branch: 1 },
]

// ── geometry ────────────────────────────────────────────────────────────────
const VB_W = 640
const VB_H = 360
const PROMPT_X = 56
const LEAF_X = 560
const TREE_TOP = 30
const TREE_BOT = 248 // tree occupies above the histogram band
const HIST_TOP = 268
const HIST_BOT = 344

export function ReasoningTree() {
  const [inViewRef, inView] = useInViewport<HTMLDivElement>('120px')
  const [n, setN] = useState(MAX_N)
  const [mode, setMode] = useState<Mode>('majority')
  // how many chains are currently revealed by the sampling animation (float)
  const [revealed, setRevealed] = useState(MAX_N)

  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const targetRef = useRef(MAX_N)

  // ── vote / verifier math over the first n chains ──────────────────────────
  const active = useMemo(() => CHAINS.slice(0, n), [n])

  const histogram = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of active) counts.set(c.answer, (counts.get(c.answer) ?? 0) + 1)
    // stable, deterministic order: by count desc, then answer asc
    return Array.from(counts.entries()).sort((a, b) =>
      b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0]),
    )
  }, [active])

  const majorityAnswer = histogram.length ? histogram[0][0] : ''
  const majorityCount = histogram.length ? histogram[0][1] : 0

  const bestIdx = useMemo(() => {
    let bi = -1
    let bs = -Infinity
    for (let i = 0; i < active.length; i++) {
      if (active[i].score > bs) {
        bs = active[i].score
        bi = i
      }
    }
    return bi
  }, [active])
  const bestAnswer = bestIdx >= 0 ? active[bestIdx].answer : ''

  // the answer the CURRENT mode reports + whether it's correct
  const chosenAnswer = mode === 'majority' ? majorityAnswer : bestAnswer
  const chosenCorrect = chosenAnswer === CORRECT_ANSWER

  // ── sampling reveal animation (rAF only drives `revealed`) ─────────────────
  useEffect(() => {
    targetRef.current = n
    if (reducedMotion() || !inView) {
      // jump straight to the static final state
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      startRef.current = null
      setRevealed(n)
      return
    }
    // if we're already showing >= n (slider went down), snap down instantly
    setRevealed((r) => (r > n ? n : r))
    startRef.current = null
    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now
      // reveal chains one every REVEAL_MS, easing toward the target
      setRevealed((r) => {
        if (r >= targetRef.current) return targetRef.current
        const next = Math.min(targetRef.current, r + 1 / (REVEAL_MS / 16.67))
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [n, inView])

  // stop the loop once we've reached the target (avoids a perpetual rAF)
  useEffect(() => {
    if (revealed >= n && rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [revealed, n])

  // ── layout helpers ────────────────────────────────────────────────────────
  // vertical slot for chain i, evenly spread across the tree band
  const leafY = (i: number) => {
    const span = TREE_BOT - TREE_TOP
    return TREE_TOP + (span * (i + 0.5)) / MAX_N
  }
  // the shared branch fork point: one fork per branch group, sitting at a fixed
  // x and the mean y of that branch's chains
  const branchFork = useMemo(() => {
    const groups = new Map<number, number[]>()
    CHAINS.forEach((c, i) => {
      const arr = groups.get(c.branch) ?? []
      arr.push(i)
      groups.set(c.branch, arr)
    })
    const forks = new Map<number, number>()
    groups.forEach((idxs, b) => {
      const meanY = idxs.reduce((s, i) => s + leafY(i), 0) / idxs.length
      forks.set(b, meanY)
    })
    return forks
  }, [])

  const FORK_X = 188 // where branches split off the prompt's trunk
  const TRUNK_X = 120 // common trunk from the prompt before any split

  // opacity of chain i given the (float) reveal progress: full once revealed,
  // a soft fade-in for the one currently being sampled
  const chainOpacity = (i: number) => {
    if (i >= n) return 0
    const r = revealed
    if (i + 1 <= r) return 1
    if (i >= r) return 0
    return Math.max(0, Math.min(1, r - i)) // partially-revealed leading edge
  }

  // ── readout string ────────────────────────────────────────────────────────
  const voteReadout = `vote: ${majorityCount}/${n} → ${majorityAnswer}`
  const bestReadout =
    bestIdx >= 0
      ? `best-of-${n}: chain ${bestIdx + 1} (score ${active[bestIdx].score.toFixed(2)}) → ${bestAnswer}`
      : ''

  return (
    <figure
      ref={inViewRef}
      className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          self-consistency · majority vote over N chains
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('majority')}
            aria-pressed={mode === 'majority'}
            className={`rounded-md border px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider transition-colors ${
              mode === 'majority'
                ? 'border-[var(--color-blog)] text-blog'
                : 'border-[var(--color-border)] bg-surface text-fg hover:border-[var(--color-muted)]'
            }`}
          >
            majority vote
          </button>
          <button
            type="button"
            onClick={() => setMode('bestofn')}
            aria-pressed={mode === 'bestofn'}
            className={`rounded-md border px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider transition-colors ${
              mode === 'bestofn'
                ? 'border-[var(--color-blog)] text-blog'
                : 'border-[var(--color-border)] bg-surface text-fg hover:border-[var(--color-muted)]'
            }`}
          >
            best-of-N verifier
          </button>
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full"
          style={{ maxWidth: 680, margin: '0 auto' }}
          role="img"
          aria-label={`A reasoning tree fanning ${n} chains from one prompt to answer leaves, with a histogram of answer counts. In majority-vote mode the plurality answer is ${majorityAnswer}; in best-of-N mode the verifier picks chain ${bestIdx + 1} answering ${bestAnswer}. The correct answer is ${CORRECT_ANSWER}.`}
          data-mode={mode}
          data-n={n}
          data-majority={majorityAnswer}
          data-majority-count={majorityCount}
          data-best-answer={bestAnswer}
          data-best-index={bestIdx}
          data-correct-answer={CORRECT_ANSWER}
          data-chosen={chosenAnswer}
        >
          {/* prompt node */}
          <g>
            <circle
              cx={PROMPT_X}
              cy={(TREE_TOP + TREE_BOT) / 2}
              r={16}
              fill="color-mix(in srgb, var(--color-blog) 16%, transparent)"
              stroke={accent}
              strokeWidth={1.6}
            />
            <text
              x={PROMPT_X}
              y={(TREE_TOP + TREE_BOT) / 2 + 4}
              textAnchor="middle"
              className="font-mono"
              style={{ fontSize: 11, fill: 'var(--color-fg)', fontWeight: 700 }}
            >
              Q
            </text>
            <text
              x={PROMPT_X}
              y={(TREE_TOP + TREE_BOT) / 2 + 32}
              textAnchor="middle"
              className="font-mono"
              style={{ fontSize: 9, fill: 'var(--color-muted)' }}
            >
              prompt
            </text>
          </g>

          {/* trunk from prompt to the common split point */}
          <path
            d={`M ${PROMPT_X + 16} ${(TREE_TOP + TREE_BOT) / 2} L ${TRUNK_X} ${(TREE_TOP + TREE_BOT) / 2}`}
            stroke="color-mix(in srgb, var(--color-border) 80%, transparent)"
            strokeWidth={1.6}
            fill="none"
          />

          {/* branch trunks: prompt-mid → each branch fork */}
          {Array.from(branchFork.entries()).map(([b, fy]) => {
            // a branch is visible if any of its revealed chains exist
            const anyVis = CHAINS.some(
              (c, i) => c.branch === b && i < n && chainOpacity(i) > 0,
            )
            return (
              <path
                key={`bt-${b}`}
                d={`M ${TRUNK_X} ${(TREE_TOP + TREE_BOT) / 2} C ${FORK_X - 30} ${(TREE_TOP + TREE_BOT) / 2}, ${FORK_X - 30} ${fy}, ${FORK_X} ${fy}`}
                stroke="color-mix(in srgb, var(--color-border) 75%, transparent)"
                strokeWidth={1.4}
                fill="none"
                style={{ opacity: anyVis ? 1 : 0.15, transition: 'opacity 200ms ease' }}
              />
            )
          })}

          {/* per-chain edges (branch fork → step nodes → leaf) + leaf nodes */}
          {CHAINS.map((c, i) => {
            const ly = leafY(i)
            const fy = branchFork.get(c.branch) ?? ly
            const op = chainOpacity(i)
            const isMajorityLeaf =
              mode === 'majority' && c.answer === majorityAnswer
            const isBestLeaf = mode === 'bestofn' && i === bestIdx
            const lit = isMajorityLeaf || isBestLeaf
            // the verifier's chosen chain is correct; majority's is wrong here
            const leafStroke = lit
              ? c.correct
                ? CORRECT_COLOR
                : accent
              : 'color-mix(in srgb, var(--color-border) 80%, transparent)'
            const leafFill = lit
              ? c.correct
                ? 'color-mix(in srgb, #2f9e6b 18%, transparent)'
                : 'color-mix(in srgb, var(--color-blog) 18%, transparent)'
              : 'var(--color-surface-2, rgba(127,127,127,0.05))'

            // step nodes spaced between FORK_X and LEAF_X
            const nSteps = c.steps.length
            const stepX = (k: number) =>
              FORK_X + ((LEAF_X - 40 - FORK_X) * (k + 1)) / (nSteps + 1)

            return (
              <g
                key={`chain-${i}`}
                data-chain={i}
                data-answer={c.answer}
                data-score={c.score.toFixed(2)}
                data-correct={c.correct ? '1' : '0'}
                data-revealed={op > 0.99 ? '1' : '0'}
                style={{ opacity: op, transition: 'opacity 160ms linear' }}
              >
                {/* edge from fork through step nodes to the leaf */}
                <path
                  d={`M ${FORK_X} ${fy} C ${(FORK_X + LEAF_X) / 2} ${fy}, ${(FORK_X + LEAF_X) / 2} ${ly}, ${LEAF_X - 22} ${ly}`}
                  stroke={
                    lit
                      ? leafStroke
                      : 'color-mix(in srgb, var(--color-border) 70%, transparent)'
                  }
                  strokeWidth={lit ? 2 : 1.1}
                  fill="none"
                />
                {/* small step nodes along the path */}
                {c.steps.slice(0, nSteps - 1).map((s, k) => {
                  // interpolate y along the curve roughly: blend fork→leaf
                  const tt = (k + 1) / (nSteps + 1)
                  const sy = fy + (ly - fy) * tt
                  return (
                    <g key={`s-${i}-${k}`}>
                      <circle
                        cx={stepX(k)}
                        cy={sy}
                        r={4.5}
                        fill="var(--color-surface, var(--color-bg))"
                        stroke="color-mix(in srgb, var(--color-border) 90%, transparent)"
                        strokeWidth={1}
                      />
                    </g>
                  )
                })}

                {/* leaf answer node */}
                <g data-leaf={i}>
                  <rect
                    x={LEAF_X - 22}
                    y={ly - 11}
                    width={48}
                    height={22}
                    rx={7}
                    fill={leafFill}
                    stroke={leafStroke}
                    strokeWidth={lit ? 1.8 : 1.1}
                    style={{ transition: 'fill 200ms ease, stroke 200ms ease' }}
                  />
                  <text
                    x={LEAF_X + 2}
                    y={ly + 4}
                    textAnchor="middle"
                    className="font-mono tabular-nums"
                    style={{
                      fontSize: 11.5,
                      fill: lit ? 'var(--color-fg)' : 'var(--color-muted)',
                      fontWeight: lit ? 700 : 500,
                    }}
                  >
                    {c.answer}
                  </text>
                  {/* verifier score badge, only in best-of-N mode */}
                  {mode === 'bestofn' && (
                    <text
                      x={LEAF_X + 36}
                      y={ly + 3.5}
                      textAnchor="start"
                      className="font-mono tabular-nums"
                      style={{
                        fontSize: 9,
                        fill:
                          i === bestIdx ? CORRECT_COLOR : 'var(--color-muted)',
                        fontWeight: i === bestIdx ? 700 : 500,
                      }}
                    >
                      {c.score.toFixed(2)}
                    </text>
                  )}
                </g>
              </g>
            )
          })}

          {/* ── histogram band ─────────────────────────────────────── */}
          <line
            x1={PROMPT_X}
            y1={HIST_TOP - 8}
            x2={VB_W - 24}
            y2={HIST_TOP - 8}
            stroke="color-mix(in srgb, var(--color-border) 60%, transparent)"
            strokeWidth={1}
          />
          <text
            x={PROMPT_X}
            y={HIST_TOP + 4}
            className="font-mono"
            style={{ fontSize: 9.5, fill: 'var(--color-muted)' }}
          >
            answer counts
          </text>
          {(() => {
            // draw a horizontal bar per distinct answer (deterministic order)
            const barH = 12
            const gap = 6
            const x0 = 150
            const maxBarW = VB_W - 24 - x0
            return histogram.map(([ans, count], bi) => {
              const y = HIST_TOP + bi * (barH + gap)
              if (y + barH > HIST_BOT) return null
              const w = (count / MAX_N) * maxBarW
              const isMajorityBar = mode === 'majority' && ans === majorityAnswer
              const isBestBar = mode === 'bestofn' && ans === bestAnswer
              const lit = isMajorityBar || isBestBar
              const correctBar = ans === CORRECT_ANSWER
              const fill = lit
                ? correctBar
                  ? CORRECT_COLOR
                  : accent
                : 'color-mix(in srgb, var(--color-border) 85%, transparent)'
              return (
                <g
                  key={`hist-${ans}`}
                  data-hist-answer={ans}
                  data-hist-count={count}
                  data-hist-lit={lit ? '1' : '0'}
                >
                  <text
                    x={x0 - 8}
                    y={y + barH - 2}
                    textAnchor="end"
                    className="font-mono tabular-nums"
                    style={{
                      fontSize: 10,
                      fill: lit ? 'var(--color-fg)' : 'var(--color-muted)',
                      fontWeight: lit ? 700 : 500,
                    }}
                  >
                    {ans}
                  </text>
                  <rect
                    x={x0}
                    y={y}
                    width={Math.max(2, w)}
                    height={barH}
                    rx={3}
                    fill={fill}
                    style={{ transition: 'width 220ms ease, fill 200ms ease' }}
                  />
                  <text
                    x={x0 + Math.max(2, w) + 6}
                    y={y + barH - 2}
                    className="font-mono tabular-nums"
                    style={{
                      fontSize: 10,
                      fill: 'var(--color-muted)',
                    }}
                  >
                    {count}
                  </text>
                </g>
              )
            })
          })()}
        </svg>
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <label
            htmlFor="rt-n"
            className="whitespace-nowrap font-mono text-[0.7rem] uppercase tracking-wider text-muted"
          >
            chains (N)
          </label>
          <input
            id="rt-n"
            type="range"
            min={1}
            max={MAX_N}
            step={1}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="h-1.5 min-w-[120px] flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]"
          />
          <span
            className="w-40 text-right font-mono text-[0.78rem] tabular-nums"
            data-readout={mode === 'majority' ? voteReadout : bestReadout}
          >
            {mode === 'majority' ? (
              <span className={chosenCorrect ? 'text-blog' : 'text-fg'}>
                vote: {majorityCount}/{n} →{' '}
                <span style={{ color: chosenCorrect ? CORRECT_COLOR : undefined }}>
                  {majorityAnswer}
                </span>
              </span>
            ) : (
              <span style={{ color: chosenCorrect ? CORRECT_COLOR : undefined }}>
                best → {bestAnswer}
              </span>
            )}
          </span>
        </div>
        <p className="mt-2 font-mono text-[0.66rem] leading-snug text-muted">
          {mode === 'majority' ? (
            <>
              <span className="text-blog">self-consistency</span> samples N chains
              and keeps the answer the most chains agree on. On this hard seed the
              plurality (<span className="text-fg">{majorityCount}</span> of {n})
              lands on <span className="text-fg">{majorityAnswer}</span> — a shared
              misconception, and it&rsquo;s <em>wrong</em>. More votes for the same
              mistake don&rsquo;t make it right.
            </>
          ) : (
            <>
              <span style={{ color: CORRECT_COLOR }}>best-of-N</span> scores each
              chain with a verifier and keeps only the single best one. Here the
              top-scored chain (chain {bestIdx + 1}, score{' '}
              <span className="text-fg">
                {bestIdx >= 0 ? active[bestIdx].score.toFixed(2) : '—'}
              </span>
              ) answers{' '}
              <span style={{ color: CORRECT_COLOR }}>{bestAnswer}</span> — the
              correct value of {CORRECT_ANSWER}. A good verifier beats the
              majority when the crowd is confidently wrong.
            </>
          )}
        </p>
      </div>
    </figure>
  )
}
