'use client'

/**
 * ResidualStream — the mental model the other AI posts skip.
 *
 * Each token rides its own lane straight up the page: the residual stream. A block
 * never overwrites the lane; it READS the current vector, computes something, and ADDS
 * the result back at a ⊕ junction. Two sublayers per block:
 *   • self-attention — mixes ACROSS lanes (the only place tokens talk).
 *   • feed-forward    — works on each lane ALONE (where most knowledge lives).
 * Drag the depth slider to stack more blocks; press play to watch every token's vector
 * rise through the stack at once. Highlight one sublayer type to see what each does.
 *
 * The diagram is correct and legible without motion; the rising markers are a bonus and
 * pause off-screen / under reduced-motion.
 */

import { useEffect, useRef, useState } from 'react'
import { useInViewport } from './use-in-viewport'

const N_LANES = 4
const LANE_X0 = 120
const LANE_GAP = 92
const BAND_H = 76
const Y_TOP = 64
const VB_W = 520

const laneX = (i: number) => LANE_X0 + i * LANE_GAP
const TOKENS = ['the', 'cat', 'sat', 'down']

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function ResidualStream() {
  const [inViewRef, inView] = useInViewport<HTMLDivElement>('120px')
  const [depth, setDepth] = useState(3)
  const [highlight, setHighlight] = useState<'both' | 'attn' | 'ffn'>('both')
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(1) // 0 = bottom, 1 = top (start fully risen)

  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  const inputY = Y_TOP + depth * BAND_H + 26
  const outputY = 44
  const totalH = inputY + 56
  const markerY = inputY - t * (inputY - outputY)
  const riseSeconds = Math.max(2.2, depth * 0.85)

  useEffect(() => {
    if (!playing || !inView || reducedMotion()) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      startRef.current = null
      return
    }
    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now
      const p = Math.min(1, (now - startRef.current) / 1000 / riseSeconds)
      setT(p)
      if (p >= 1) {
        setPlaying(false)
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
  }, [playing, inView, depth])

  const play = () => {
    if (reducedMotion()) {
      setT(1)
      return
    }
    setT(0)
    startRef.current = null
    setPlaying(true)
  }

  const accent = 'var(--color-blog)'
  const dimAttn = highlight === 'ffn'
  const dimFfn = highlight === 'attn'

  // sublayer row y within band b (0 = top block)
  const attnY = (b: number) => Y_TOP + b * BAND_H + 52 // lower → hit first when rising
  const ffnY = (b: number) => Y_TOP + b * BAND_H + 22 // upper

  const near = (y: number) => playing && Math.abs(markerY - y) < 15

  return (
    <figure ref={inViewRef} className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          the residual stream
        </span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-surface p-0.5">
            {(['both', 'attn', 'ffn'] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHighlight(h)}
                aria-pressed={highlight === h}
                className={`rounded-md px-2 py-1 font-mono text-[0.64rem] uppercase tracking-wider transition-colors ${
                  highlight === h ? 'bg-blog/15 text-blog ring-1 ring-blog/40' : 'text-muted hover:text-fg'
                }`}
              >
                {h === 'both' ? 'all' : h === 'attn' ? 'attention' : 'FFN'}
              </button>
            ))}
          </div>
          <button type="button" onClick={play} className="rounded-md border border-[var(--color-border)] bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider text-fg transition-colors hover:border-[var(--color-muted)]">
            play ▶
          </button>
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        <svg viewBox={`0 0 ${VB_W} ${totalH}`} className="block h-auto w-full" style={{ maxWidth: 560, margin: '0 auto' }} role="img" aria-label="The residual stream: each token rides a vertical lane; blocks read and add back via attention and feed-forward sublayers.">
          {/* output label */}
          <text x={VB_W / 2} y={20} textAnchor="middle" className="font-mono" style={{ fontSize: 11, fill: 'var(--color-fg)', fontWeight: 600 }}>
            ↑ next-token prediction
          </text>

          {/* the lanes (residual streams) run through everything */}
          {Array.from({ length: N_LANES }).map((_, i) => (
            <line key={`lane-${i}`} x1={laneX(i)} y1={outputY} x2={laneX(i)} y2={inputY} stroke="color-mix(in srgb, var(--color-blog) 45%, transparent)" strokeWidth={2.5} />
          ))}

          {/* blocks, top (b=0) to bottom */}
          {Array.from({ length: depth }).map((_, b) => {
            const bandTop = Y_TOP + b * BAND_H
            return (
              <g key={`blk-${b}`}>
                <rect x={LANE_X0 - 44} y={bandTop + 4} width={(N_LANES - 1) * LANE_GAP + 88} height={BAND_H - 8} rx={10} fill="color-mix(in srgb, var(--color-fg) 4%, transparent)" stroke="color-mix(in srgb, var(--color-border) 70%, transparent)" strokeWidth={1} />
                <text x={LANE_X0 - 50} y={bandTop + BAND_H / 2} textAnchor="end" className="font-mono" style={{ fontSize: 9.5, fill: 'var(--color-muted)' }}>
                  block {depth - b}
                </text>

                {/* FFN sublayer (upper) — per lane, no cross talk */}
                {Array.from({ length: N_LANES }).map((_, i) => {
                  const active = near(ffnY(b))
                  return (
                    <g key={`ffn-${b}-${i}`} opacity={dimFfn ? 0.18 : 1} style={{ transition: 'opacity 200ms ease' }}>
                      <rect x={laneX(i) - 13} y={ffnY(b) - 10} width={26} height={20} rx={5} fill={active ? accent : 'var(--color-surface-2, rgba(127,127,127,0.08))'} stroke="color-mix(in srgb, var(--color-blog) 60%, transparent)" strokeWidth={1.2} style={{ transition: 'fill 160ms ease' }} />
                      <text x={laneX(i)} y={ffnY(b) + 3.5} textAnchor="middle" className="font-mono" style={{ fontSize: 8.5, fill: active ? 'var(--color-bg)' : 'var(--color-fg)', opacity: 0.85 }}>
                        ffn
                      </text>
                      <text x={laneX(i) + 17} y={ffnY(b) - 9} className="font-mono" style={{ fontSize: 11, fill: accent }}>⊕</text>
                    </g>
                  )
                })}

                {/* attention sublayer (lower) — cross-lane mixing */}
                <g opacity={dimAttn ? 0.16 : 1} style={{ transition: 'opacity 200ms ease' }}>
                  {Array.from({ length: N_LANES }).flatMap((_, i) =>
                    Array.from({ length: N_LANES }).map((__, j) => {
                      if (j <= i) return null
                      const y = attnY(b)
                      const mid = (laneX(i) + laneX(j)) / 2
                      return <path key={`mix-${b}-${i}-${j}`} d={`M ${laneX(i)} ${y} Q ${mid} ${y + 16} ${laneX(j)} ${y}`} fill="none" stroke={near(y) ? accent : 'color-mix(in srgb, var(--color-blog) 40%, transparent)'} strokeWidth={1.1} style={{ transition: 'stroke 160ms ease' }} />
                    }),
                  )}
                  {Array.from({ length: N_LANES }).map((_, i) => {
                    const active = near(attnY(b))
                    return (
                      <g key={`attn-${b}-${i}`}>
                        <circle cx={laneX(i)} cy={attnY(b)} r={6} fill={active ? accent : 'var(--color-surface-2, rgba(127,127,127,0.08))'} stroke="color-mix(in srgb, var(--color-blog) 60%, transparent)" strokeWidth={1.2} style={{ transition: 'fill 160ms ease' }} />
                        <text x={laneX(i) + 14} y={attnY(b) + 3} className="font-mono" style={{ fontSize: 11, fill: accent }}>⊕</text>
                      </g>
                    )
                  })}
                </g>
              </g>
            )
          })}

          {/* input row */}
          {Array.from({ length: N_LANES }).map((_, i) => (
            <g key={`in-${i}`}>
              <rect x={laneX(i) - 22} y={inputY - 2} width={44} height={22} rx={6} fill="color-mix(in srgb, var(--color-blog) 12%, transparent)" stroke="color-mix(in srgb, var(--color-blog) 55%, transparent)" strokeWidth={1} />
              <text x={laneX(i)} y={inputY + 12.5} textAnchor="middle" className="font-mono" style={{ fontSize: 10.5, fill: 'var(--color-fg)', opacity: 0.9 }}>
                {TOKENS[i]}
              </text>
            </g>
          ))}
          <text x={VB_W / 2} y={inputY + 42} textAnchor="middle" className="font-mono" style={{ fontSize: 9.5, fill: 'var(--color-muted)' }}>
            embedding + positional encoding
          </text>

          {/* rising markers — one per token, in parallel */}
          {playing &&
            Array.from({ length: N_LANES }).map((_, i) => (
              <circle key={`mk-${i}`} cx={laneX(i)} cy={markerY} r={4.5} fill={accent}>
                <animate attributeName="opacity" values="0.5;1;0.5" dur="0.9s" repeatCount="indefinite" />
              </circle>
            ))}
        </svg>
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex items-center gap-4">
          <label htmlFor="rs-depth" className="font-mono text-[0.7rem] uppercase tracking-wider text-muted whitespace-nowrap">
            depth
          </label>
          <input id="rs-depth" type="range" min={1} max={8} step={1} value={depth} onChange={(e) => setDepth(Number(e.target.value))} className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]" />
          <span className="w-24 text-right font-mono text-[0.78rem] tabular-nums text-fg">{depth} block{depth > 1 ? 's' : ''}</span>
        </div>
        <p className="mt-2 font-mono text-[0.66rem] leading-snug text-muted">
          Nothing is overwritten. Each block reads the lane, computes attention (mixing across
          tokens) then a feed-forward step (each token alone), and adds the result back at a ⊕.
          Stack a few dozen of these and the stream is gradually refined from raw embeddings into a
          prediction. GPT-3 stacks 96.
        </p>
      </div>
    </figure>
  )
}
