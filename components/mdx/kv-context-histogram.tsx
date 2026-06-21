'use client'

/**
 * KvContextHistogram — why the 15-problem smoke set was blind.
 *
 * Plots the measured prompt-length distribution (tokens ≈ chars/4) of the
 * 15-problem Go smoke set against the full 164-problem HumanEval-X Go set, with
 * a movable eviction-budget line. The smoke set sits entirely below 256 tokens,
 * so a 256-token budget NEVER evicted anything there — it looked free.
 *
 * The deeper point is interactive: drag the "generated so far" slider. During
 * decoding the effective context is prompt + output, so the whole distribution
 * slides right past the budget line — and the count of problems that overflow
 * the budget (and so lose their prompt mid-generation) climbs far past the
 * 4-of-164 you see at prefill.
 *
 * Deterministic synthetic samples reproduce the measured band counts
 * (82 / 68 / 12 / 2) and the four prompts > 256 tokens. SVG, theme tokens,
 * light/dark, mobile, reduced-motion ok.
 */

import { useId, useMemo, useState } from 'react'

const GREEN = '#34d399'
const AMBER = '#f5a623'
const RED = '#f87171'

// Deterministic samples reproducing the measured distribution.
function buildFull(): number[] {
  const out: number[] = []
  // 82 in [25,99]
  for (let i = 0; i < 82; i++) out.push(25 + Math.round((74 * i) / 81))
  // 68 in [100,199]
  for (let i = 0; i < 68; i++) out.push(100 + Math.round((99 * i) / 67))
  // 12 in [200,299]: 10 below 256, 2 just above (267, 276)
  for (let i = 0; i < 10; i++) out.push(200 + Math.round((54 * i) / 9))
  out.push(267, 276)
  // 2 in [300,334]
  out.push(308, 334)
  return out
}
function buildSmoke(): number[] {
  const out: number[] = []
  for (let i = 0; i < 15; i++) out.push(30 + Math.round((18 * i) / 14)) // [30,48]
  return out
}

const FULL = buildFull()
const SMOKE = buildSmoke()
const BIN = 40
const NBINS = 15 // 0..600

function bins(samples: number[], shift: number): number[] {
  const b = Array<number>(NBINS).fill(0)
  for (const s of samples) {
    const idx = Math.min(NBINS - 1, Math.floor((s + shift) / BIN))
    b[idx]++
  }
  return b
}

export function KvContextHistogram() {
  const uid = useId().replace(/[:]/g, '')
  const [gen, setGen] = useState(0)
  const [budget, setBudget] = useState(256)

  const fullBins = useMemo(() => bins(FULL, gen), [gen])
  const smokeBins = useMemo(() => bins(SMOKE, gen), [gen])
  const overFull = useMemo(() => FULL.filter((s) => s + gen > budget).length, [gen, budget])
  const overSmoke = useMemo(() => SMOKE.filter((s) => s + gen > budget).length, [gen, budget])
  const maxBin = Math.max(...fullBins, 1)

  // geometry
  const W = 720
  const H = 240
  const padL = 16
  const padR = 16
  const padT = 16
  const padB = 36
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const xOf = (tok: number) => padL + (Math.min(tok, NBINS * BIN) / (NBINS * BIN)) * plotW
  const binW = plotW / NBINS

  return (
    <figure className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-4 py-3 sm:px-5">
        <div className="font-mono text-[0.72rem] text-fg/75">
          Context length <span className="text-muted">·</span>{' '}
          <span className="text-muted">smoke set (15) vs full set (164), tokens</span>
        </div>
        <div role="group" aria-label="Budget" className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
          {[256, 512].map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBudget(b)}
              aria-pressed={budget === b}
              className={`px-2.5 py-1 font-mono text-[0.62rem] tabular-nums transition-colors ${
                budget === b ? 'bg-[var(--color-fg)]/10 text-fg' : 'text-muted hover:text-fg'
              }`}
            >
              budget {b}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 py-2 sm:px-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Histogram of prompt lengths for the smoke and full sets with the eviction budget marked.">
          {/* baseline */}
          <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="var(--color-border)" />

          {/* full-set bars */}
          {fullBins.map((c, i) => {
            if (c === 0) return null
            const h = (c / maxBin) * plotH
            return (
              <rect
                key={`f-${uid}-${i}`}
                x={padL + i * binW + 1.5}
                y={padT + plotH - h}
                width={binW - 3}
                height={h}
                rx={2}
                fill="var(--color-fg)"
                opacity={0.2}
                style={{ transition: 'all 200ms ease' }}
              />
            )
          })}
          {/* smoke-set bars (overlay, accented) */}
          {smokeBins.map((c, i) => {
            if (c === 0) return null
            const h = (c / maxBin) * plotH
            return (
              <rect
                key={`s-${uid}-${i}`}
                x={padL + i * binW + binW * 0.28}
                y={padT + plotH - h}
                width={binW * 0.44}
                height={h}
                rx={2}
                fill={AMBER}
                opacity={0.92}
                style={{ transition: 'all 200ms ease' }}
              />
            )
          })}

          {/* budget line */}
          <line x1={xOf(budget)} x2={xOf(budget)} y1={padT - 6} y2={padT + plotH} stroke={RED} strokeWidth={1.6} strokeDasharray="4 3" />
          <rect x={xOf(budget) + 3} y={padT - 8} width={86} height={15} rx={3} fill={RED} opacity={0.14} />
          <text x={xOf(budget) + 7} y={padT + 3} className="fill-[var(--color-fg)]" style={{ fontSize: 9, fontFamily: 'monospace' }}>
            budget {budget}
          </text>

          {/* x ticks */}
          {[0, 200, 400, 600].map((t) => (
            <text key={`t-${uid}-${t}`} x={xOf(t)} y={H - 10} textAnchor="middle" className="fill-muted" style={{ fontSize: 9, fontFamily: 'monospace' }}>
              {t}
            </text>
          ))}
          <text x={W - padR} y={H - 10} textAnchor="end" className="fill-muted" style={{ fontSize: 9, fontFamily: 'monospace' }}>
            tokens →
          </text>

          {/* legend */}
          <g transform={`translate(${padL + 6}, ${padT + 6})`}>
            <rect width="9" height="9" rx="2" fill={AMBER} opacity={0.92} />
            <text x="13" y="8" className="fill-fg/70" style={{ fontSize: 9, fontFamily: 'monospace' }}>smoke (15)</text>
            <rect x="92" width="9" height="9" rx="2" fill="var(--color-fg)" opacity={0.2} />
            <text x="105" y="8" className="fill-fg/70" style={{ fontSize: 9, fontFamily: 'monospace' }}>full (164)</text>
          </g>
        </svg>
      </div>

      {/* generation slider */}
      <div className="border-t border-[var(--color-border)] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="w-[7rem] shrink-0 font-mono text-[0.6rem] uppercase tracking-wider text-muted">generated so far</span>
          <input
            type="range"
            min={0}
            max={256}
            step={8}
            value={gen}
            onChange={(e) => setGen(Number(e.target.value))}
            className="w-full accent-[var(--color-blog)]"
            aria-label="Tokens generated so far (shifts the effective context length)"
          />
          <span className="w-[5rem] shrink-0 text-right font-mono text-[0.62rem] tabular-nums text-fg/80">{gen} tok</span>
        </div>
      </div>

      {/* verdict */}
      <div className="grid grid-cols-2 gap-px border-t border-[var(--color-border)] bg-[var(--color-border)]">
        <Verdict label="smoke set over budget" value={`${overSmoke} / 15`} good={overSmoke === 0} />
        <Verdict label="full set over budget" value={`${overFull} / 164`} good={overFull === 0} />
      </div>

      <div className="border-t border-[var(--color-border)] px-4 py-2.5 sm:px-5">
        <p className="font-mono text-[0.68rem] leading-snug text-fg/80">
          <span className="text-blog">›</span>{' '}
          {gen === 0
            ? `At prefill (0 generated), only ${overFull} of 164 full-set prompts cross the ${budget} line — and ${overSmoke} of 15 smoke prompts. The smoke set never touches it.`
            : `With ${gen} tokens generated, ${overFull} of 164 full-set problems now exceed ${budget} — each one generating code with its prompt already evicted. The smoke set: still ${overSmoke} of 15.`}
        </p>
      </div>
    </figure>
  )
}

function Verdict({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="bg-surface px-4 py-2.5 text-center">
      <div className="font-mono text-[0.56rem] uppercase tracking-wider text-muted">{label}</div>
      <div className="font-display mt-0.5 text-xl font-semibold tabular-nums" style={{ color: good ? GREEN : RED }}>
        {value}
      </div>
    </div>
  )
}
