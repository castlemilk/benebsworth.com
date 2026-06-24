'use client'

/**
 * EmbeddingSpace — "words become arrows" for the transformer post.
 *
 * A hand-placed 2D map of word vectors. Similar words sit close together;
 * directions carry meaning. Two things to poke:
 *   • hover/tap a word  → its three nearest neighbours light up.
 *   • "show analogy"    → the king − man + woman ≈ queen parallelogram:
 *                         the man→king vector, copied onto woman, lands on queen.
 *
 * The layout is a toy (real embeddings live in hundreds of dimensions, not two),
 * but it is laid out so the analogy is an exact parallelogram — the point is the
 * *shape* of the space, not the numbers. Static + CSS transitions, no rAF.
 */

import { useMemo, useState } from 'react'

type Word = { t: string; x: number; y: number; cluster: string }

// viewBox coordinates double as the "embedding" — king−man+woman is an exact
// parallelogram with queen by construction (king−man = queen−woman = (−110,0)).
const WORDS: Word[] = [
  { t: 'man', x: 250, y: 250, cluster: 'people' },
  { t: 'woman', x: 250, y: 320, cluster: 'people' },
  { t: 'king', x: 140, y: 250, cluster: 'royalty' },
  { t: 'queen', x: 140, y: 320, cluster: 'royalty' },
  { t: 'prince', x: 120, y: 200, cluster: 'royalty' },
  { t: 'princess', x: 120, y: 368, cluster: 'royalty' },
  { t: 'cat', x: 430, y: 92, cluster: 'animals' },
  { t: 'dog', x: 472, y: 122, cluster: 'animals' },
  { t: 'lion', x: 442, y: 60, cluster: 'animals' },
  { t: 'mouse', x: 482, y: 96, cluster: 'animals' },
  { t: 'one', x: 442, y: 360, cluster: 'numbers' },
  { t: 'two', x: 478, y: 386, cluster: 'numbers' },
  { t: 'three', x: 456, y: 410, cluster: 'numbers' },
  { t: 'apple', x: 492, y: 238, cluster: 'food' },
  { t: 'bread', x: 492, y: 282, cluster: 'food' },
]

const idx = (t: string) => WORDS.findIndex((w) => w.t === t)
const dist = (a: Word, b: Word) => Math.hypot(a.x - b.x, a.y - b.y)

export function EmbeddingSpace() {
  const [hover, setHover] = useState<number | null>(null)
  const [analogy, setAnalogy] = useState(false)

  const neighbours = useMemo(() => {
    if (hover == null) return new Set<number>()
    const me = WORDS[hover]
    const ranked = WORDS.map((w, i) => ({ i, d: dist(me, w) }))
      .filter((r) => r.i !== hover)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .map((r) => r.i)
    return new Set(ranked)
  }, [hover])

  const man = WORDS[idx('man')]
  const king = WORDS[idx('king')]
  const woman = WORDS[idx('woman')]
  const queen = WORDS[idx('queen')]
  const accent = 'var(--color-blog)'

  return (
    <figure className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          embedding space · meaning is geometry
        </span>
        <button
          type="button"
          onClick={() => setAnalogy((v) => !v)}
          aria-pressed={analogy}
          className={`rounded-md px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider transition-colors ${
            analogy ? 'bg-blog/15 text-blog ring-1 ring-blog/40' : 'border border-[var(--color-border)] text-muted hover:text-fg'
          }`}
        >
          king − man + woman
        </button>
      </div>

      <div className="px-2 py-4 sm:px-4">
        <svg
          viewBox="0 0 560 440"
          className="block h-auto w-full"
          style={{ maxWidth: 620, margin: '0 auto' }}
          role="img"
          aria-label="A 2D map of word embeddings; similar words cluster and the king-man-woman-queen analogy forms a parallelogram."
          onMouseLeave={() => setHover(null)}
        >
          {/* neighbour links */}
          {hover != null &&
            [...neighbours].map((j) => (
              <line
                key={`nb-${j}`}
                x1={WORDS[hover].x}
                y1={WORDS[hover].y}
                x2={WORDS[j].x}
                y2={WORDS[j].y}
                stroke={accent}
                strokeWidth={1.2}
                opacity={0.5}
              />
            ))}

          {/* analogy parallelogram */}
          {analogy && (
            <g>
              {[
                [man, king],
                [woman, queen],
              ].map(([a, b], k) => (
                <line key={`ax-${k}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={accent} strokeWidth={2} markerEnd="url(#es-arrow)" />
              ))}
              <line x1={man.x} y1={man.y} x2={woman.x} y2={woman.y} stroke="var(--color-muted)" strokeWidth={1} strokeDasharray="3 4" opacity={0.6} />
              <line x1={king.x} y1={king.y} x2={queen.x} y2={queen.y} stroke="var(--color-muted)" strokeWidth={1} strokeDasharray="3 4" opacity={0.6} />
              <circle cx={queen.x} cy={queen.y} r={18} fill="none" stroke={accent} strokeWidth={1.6} opacity={0.9}>
                <animate attributeName="r" values="14;20;14" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          )}

          {/* word points + labels */}
          {WORDS.map((w, i) => {
            const lit = i === hover || neighbours.has(i)
            const inAnalogy = analogy && ['man', 'king', 'woman', 'queen'].includes(w.t)
            const active = lit || inAnalogy
            return (
              <g
                key={w.t}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHover(i)}
                onClick={() => setHover((h) => (h === i ? null : i))}
              >
                <circle
                  cx={w.x}
                  cy={w.y}
                  r={active ? 5.5 : 3.5}
                  fill={active ? accent : 'var(--color-muted)'}
                  style={{ transition: 'r 160ms ease, fill 160ms ease' }}
                />
                <text
                  x={w.x + 9}
                  y={w.y + 4}
                  className="font-mono"
                  style={{
                    fontSize: active ? 13 : 11.5,
                    fontWeight: active ? 700 : 500,
                    fill: active ? accent : 'var(--color-fg)',
                    opacity: hover != null && !active ? 0.4 : 0.9,
                    transition: 'opacity 160ms ease, fill 160ms ease',
                  }}
                >
                  {w.t}
                </text>
              </g>
            )
          })}

          <defs>
            <marker id="es-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={accent} />
            </marker>
          </defs>
        </svg>
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <p className="font-mono text-[0.66rem] leading-snug text-muted">
          {analogy ? (
            <>
              The arrow from <span className="text-blog">man</span> to{' '}
              <span className="text-blog">king</span> is the same arrow as{' '}
              <span className="text-blog">woman</span> to <span className="text-blog">queen</span>:
              one direction in the space means &ldquo;royalty&rdquo;. Add it to a word and you move
              along that meaning. That regularity isn&rsquo;t built in — it falls out of training.
            </>
          ) : (
            <>
              Hover a word to see its nearest neighbours. Cats sit by dogs, numbers by numbers, kings
              by queens — because the model placed words it uses in similar ways close together. This
              map is the input the rest of the transformer actually reads.
            </>
          )}
        </p>
      </div>
    </figure>
  )
}
