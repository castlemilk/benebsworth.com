'use client'

/**
 * TokenSampler — the interactive for the "Temperature & sampling"
 * section. Turns the model's output logits into a live probability
 * distribution the reader can shape, then *draws* from.
 *
 * The pedagogical payload: generation reuses *the exact softmax* the
 * reader just met in attention — now applied to vocabulary logits, with
 * a temperature divisor T doing the same job √dₖ did (controlling how
 * peaked the distribution is). Top-k and top-p then truncate before the
 * draw.
 *
 * Bars are HTML <div>s with a CSS `width` transition, so dragging the
 * sliders morphs the distribution smoothly for free. anime.js owns the
 * *sampling* moment: on each draw it dims the field, then pulses the
 * chosen bar — the signature choreographed moment the library is here for.
 *
 * Honours prefers-reduced-motion (skips the anime; the draw still works).
 */

import { useEffect, useId, useRef, useState } from 'react'
import { animate, createScope, type Scope } from 'animejs'
import {
  CANDIDATES,
  STEM,
  sampleDistribution,
  sampleIndex,
  tempLabel,
  TEMP_MIN,
  TEMP_MAX,
  TEMP_DEFAULT,
  TOPK_MIN,
  TOPK_MAX,
  TOPK_DEFAULT,
  TOPP_MIN,
  TOPP_MAX,
  TOPP_DEFAULT,
} from './sampling-data'

export function TokenSampler() {
  const root = useRef<HTMLDivElement>(null)
  const scope = useRef<Scope | null>(null)

  const [temp, setTemp] = useState(TEMP_DEFAULT)
  const [topK, setTopK] = useState<number>(TOPK_DEFAULT)
  const [topP, setTopP] = useState(TOPP_DEFAULT)
  const [draws, setDraws] = useState<number[]>([])
  const nonce = useRef(0)
  const uid = useId().replace(/[:]/g, '')

  const dist = sampleDistribution(temp, topK, topP)
  const argmax = dist.indexOf(Math.max(...dist))

  useEffect(() => {
    if (!root.current) return
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const s = createScope({ root })
    scope.current = s
    s.add(() => {
      s.add('draw', (picked: number) => {
        if (prefersReduced) return
        // dim the field, then pulse the chosen bar
        animate('.ts-bar-fill', {
          opacity: [1, 0.32],
          duration: 160,
          ease: 'out(2)',
        })
        animate(`.ts-row[data-idx="${picked}"] .ts-bar-fill`, {
          opacity: [0.32, 1],
          scaleX: [1, 1.05, 1],
          duration: 520,
          ease: 'inOut(3)',
          delay: 140,
        })
        animate(`.ts-row[data-idx="${picked}"] .ts-token`, {
          color: 'var(--color-blog)',
          duration: 300,
          delay: 140,
        })
      })
    })
    return () => s.revert()
  }, [])

  const handleDraw = () => {
    const picked = sampleIndex(dist, 7, nonce.current++)
    setDraws((d) => [picked, ...d].slice(0, 6))
    scope.current?.methods.draw(picked)
  }

  const truncated = (i: number) => dist[i] === 0

  return (
    <figure
      ref={root}
      className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
    >
      {/* stem + sample button */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="font-mono text-[0.78rem] leading-snug text-fg/80">
          <span className="text-muted">…</span> {STEM}{' '}
          <span className="text-blog">▍</span>
        </div>
        <button
          type="button"
          onClick={handleDraw}
          className="rounded-lg border border-[var(--color-border)] bg-surface px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-wider text-fg transition-colors hover:border-blog hover:text-blog"
        >
          sample →
        </button>
      </div>

      {/* distribution */}
      <div className="px-5 py-4">
        <div className="flex flex-col gap-1.5">
          {CANDIDATES.map((tok, i) => {
            const p = dist[i]
            const isMax = i === argmax
            const gone = truncated(i)
            return (
              <div
                key={`row-${uid}-${i}`}
                data-idx={i}
                className={`ts-row flex items-center gap-3 ${gone ? 'opacity-30' : ''}`}
              >
                <span
                  className={`ts-token w-20 shrink-0 text-right font-mono text-[0.78rem] ${isMax ? 'font-bold text-fg' : 'text-fg/75'}`}
                >
                  {tok}
                </span>
                <div className="relative h-5 flex-1 overflow-hidden rounded bg-[var(--color-surface-2)]">
                  <div
                    className="ts-bar-fill absolute left-0 top-0 h-full rounded"
                    style={{
                      width: `${Math.max(p * 100, gone ? 0 : 1.5)}%`,
                      background: isMax ? 'var(--color-blog)' : 'color-mix(in srgb, var(--color-blog) 60%, transparent)',
                      transformOrigin: 'left center',
                      transition: 'width 380ms ease, opacity 380ms ease, background 380ms ease',
                    }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right font-mono text-[0.7rem] tabular-nums text-muted">
                  {(p * 100).toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>
        <p className="mt-3 font-mono text-[0.66rem] leading-snug text-muted">
          Most likely: <span className="text-blog">{CANDIDATES[argmax]}</span> ({(dist[argmax] * 100).toFixed(1)}
          %). Dimmed rows were cut by top-k / top-p before the draw — they can no longer be sampled.
          Hit <span className="text-fg/80">sample</span> a few times at high temperature to watch a different token win.
        </p>
      </div>

      {/* controls */}
      <div className="space-y-2.5 border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3.5">
        <Slider
          id={`t-${uid}`}
          label="temperature T"
          value={temp}
          min={TEMP_MIN}
          max={TEMP_MAX}
          step={0.05}
          onChange={setTemp}
          hint={tempLabel(temp)}
        />
        <Slider
          id={`k-${uid}`}
          label="top-k"
          value={topK}
          min={TOPK_MIN}
          max={TOPK_MAX}
          step={1}
          onChange={setTopK}
          hint={topK === TOPK_MAX ? '· off' : `· ${topK} survive`}
        />
        <Slider
          id={`p-${uid}`}
          label="top-p (nucleus)"
          value={topP}
          min={TOPP_MIN}
          max={TOPP_MAX}
          step={0.05}
          onChange={setTopP}
          hint={topP >= 0.999 ? '· off' : `· ${topP.toFixed(2)} mass`}
        />
      </div>

      {/* draw history */}
      {draws.length > 0 && (
        <div className="border-t border-[var(--color-border)] px-5 py-3">
          <div className="mb-1.5 font-mono text-[0.64rem] uppercase tracking-wider text-muted">
            recent draws
          </div>
          <div className="flex flex-wrap gap-1.5">
            {draws.map((d, i) => (
              <span
                key={`d-${uid}-${i}`}
                className="rounded-md border border-[var(--color-border)] bg-surface px-2 py-0.5 font-mono text-[0.74rem] text-fg/85"
              >
                {CANDIDATES[d]}
              </span>
            ))}
          </div>
        </div>
      )}
    </figure>
  )
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  hint: string
}) {
  return (
    <div className="flex items-center gap-4">
      <label htmlFor={id} className="w-32 shrink-0 font-mono text-[0.7rem] uppercase tracking-wider text-muted whitespace-nowrap">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]"
      />
      <span className="w-24 shrink-0 text-right font-mono text-[0.74rem] tabular-nums text-fg">
        {value.toFixed(step < 1 ? 2 : 0)}
        <span className="ml-1 text-[0.62rem] text-muted">{hint}</span>
      </span>
    </div>
  )
}
