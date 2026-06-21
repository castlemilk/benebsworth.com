'use client'

/**
 * KvAblationLedger — the attribution payoff. Plots every config from the
 * compound-compression ablation as a pass@1 bar against the fp16 baseline
 * reference line, grouped so the conclusion reads off the chart:
 *
 *   • quantisation alone (8-bit, 4-bit) → sits on the baseline (lossless)
 *   • eviction @ budget 256 (streaming / H2O / +quant) → all collapse to the
 *     SAME 37.8%, so the cause is the budget, not the policy or the quant
 *   • eviction @ budget 512 → recovers to baseline
 *
 * Toggle the metric to "cache footprint" to see the savings story instead.
 * pass@1 numbers are exact problem counts out of 164; footprints are the
 * reported relative ratios. Hover a row to emphasise it.
 *
 * SVG-free (CSS bars), theme-token styled, light/dark, mobile, reduced-motion ok.
 */

import { useState } from 'react'

const GREEN = '#34d399'
const AMBER = '#f5a623'
const RED = '#f87171'
const BLUE = '#60a5fa'
const MUTED = 'var(--color-muted)'

const BASELINE = 57.9

type Verdict = 'baseline' | 'lossless' | 'broke' | 'recovered' | 'untrained' | 'best'

type Row = {
  name: string
  group: string
  pass1: number
  count: string
  footprint: number
  verdict: Verdict
}

const ROWS: Row[] = [
  { name: 'Baseline (fp16)', group: 'reference', pass1: 57.9, count: '95 / 164', footprint: 1.0, verdict: 'baseline' },
  { name: 'TurboQuant 8-bit', group: 'quantise only', pass1: 57.9, count: '95 / 164', footprint: 0.5, verdict: 'lossless' },
  { name: 'TurboQuant 4-bit', group: 'quantise only', pass1: 58.5, count: '96 / 164', footprint: 0.28, verdict: 'lossless' },
  { name: 'Streaming · budget 256', group: 'evict @ 256', pass1: 37.8, count: '62 / 164', footprint: 0.5, verdict: 'broke' },
  { name: 'H2O · budget 256', group: 'evict @ 256', pass1: 37.8, count: '62 / 164', footprint: 0.5, verdict: 'broke' },
  { name: 'Streaming 256 + TurboQuant 4-bit', group: 'evict @ 256', pass1: 37.8, count: '62 / 164', footprint: 0.19, verdict: 'broke' },
  { name: 'Streaming · budget 512', group: 'evict @ 512', pass1: 57.9, count: '95 / 164', footprint: 1.0, verdict: 'recovered' },
  { name: 'H2O · budget 512', group: 'evict @ 512', pass1: 57.9, count: '95 / 164', footprint: 1.0, verdict: 'recovered' },
  { name: 'Streaming 512 + TurboQuant 4-bit', group: 'evict @ 512', pass1: 59.1, count: '97 / 164', footprint: 0.19, verdict: 'best' },
  { name: 'Cross-layer sharing (zero-shot)', group: 'needs training', pass1: 0, count: '0 / 164', footprint: 0.5, verdict: 'untrained' },
  { name: 'Linear attention (zero-shot)', group: 'needs training', pass1: 0, count: '0 / 164', footprint: 0.25, verdict: 'untrained' },
]

const VERDICT_COLOR: Record<Verdict, string> = {
  baseline: MUTED,
  lossless: GREEN,
  broke: RED,
  recovered: GREEN,
  untrained: BLUE,
  best: GREEN,
}

const GROUPS = ['reference', 'quantise only', 'evict @ 256', 'evict @ 512', 'needs training']

export function KvAblationLedger() {
  const [metric, setMetric] = useState<'pass1' | 'footprint'>('pass1')
  const [hover, setHover] = useState<string | null>(null)

  return (
    <figure className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-4 py-3 sm:px-5">
        <div className="font-mono text-[0.72rem] text-fg/75">
          The ablation <span className="text-muted">·</span>{' '}
          <span className="text-muted">{metric === 'pass1' ? 'HumanEval-X Go pass@1' : 'relative KV-cache footprint'}</span>
        </div>
        <div role="group" aria-label="Metric" className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
          {(['pass1', 'footprint'] as const).map((mt) => (
            <button
              key={mt}
              type="button"
              onClick={() => setMetric(mt)}
              aria-pressed={metric === mt}
              className={`px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-wider transition-colors ${
                metric === mt ? 'bg-[var(--color-fg)]/10 text-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {mt === 'pass1' ? 'pass@1' : 'footprint'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-4 sm:px-5">
        {GROUPS.map((g) => {
          const rows = ROWS.filter((r) => r.group === g)
          return (
            <div key={g} className="mb-3 last:mb-0">
              <div className="mb-1.5 font-mono text-[0.56rem] uppercase tracking-[0.15em] text-muted">{g}</div>
              <div className="space-y-1.5">
                {rows.map((r) => {
                  const color = VERDICT_COLOR[r.verdict]
                  const isPass = metric === 'pass1'
                  // pass@1: 0..70% scale; footprint: 0..1 (smaller is better)
                  const pct = isPass ? (r.pass1 / 70) * 100 : r.footprint * 100
                  const label = isPass ? `${r.pass1.toFixed(1)}%` : `${r.footprint.toFixed(2)}×`
                  const dim = hover && hover !== r.name
                  return (
                    <div
                      key={r.name}
                      onPointerEnter={() => setHover(r.name)}
                      onPointerLeave={() => setHover(null)}
                      className="flex items-center gap-2"
                      style={{ opacity: dim ? 0.4 : 1, transition: 'opacity 160ms ease' }}
                    >
                      <span className="w-[10.5rem] shrink-0 truncate font-mono text-[0.62rem] text-fg/80 sm:w-[14rem]" title={r.name}>
                        {r.verdict === 'best' && <span style={{ color: GREEN }}>★ </span>}
                        {r.name}
                      </span>
                      <div className="relative h-4 flex-1 overflow-hidden rounded-md bg-[var(--color-surface-2)]">
                        <div
                          className="absolute left-0 top-0 h-full rounded-md"
                          style={{ width: `${Math.max(pct, 1.5)}%`, background: color, opacity: 0.85, transition: 'width 420ms ease' }}
                        />
                      </div>
                      <span className="w-[5.5rem] shrink-0 text-right font-mono text-[0.62rem] tabular-nums" style={{ color }}>
                        {label}
                        {isPass && <span className="ml-1 hidden text-muted sm:inline">{r.count}</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* baseline reference line note */}
        {metric === 'pass1' && (
          <div className="mt-2 font-mono text-[0.58rem] text-muted">
            dashed target = baseline {BASELINE}% · bars at {BASELINE}% are statistically indistinguishable from it (a one- or two-problem wobble out of 164)
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] px-4 py-2.5 sm:px-5">
        <p className="font-mono text-[0.68rem] leading-snug text-fg/80">
          <span className="text-blog">›</span>{' '}
          {metric === 'pass1'
            ? 'Read down the "evict @ 256" group: streaming, H2O, and streaming+quant all land on exactly 37.8%. The policy and the quantisation make no difference — the budget does.'
            : 'Quantisation (0.28×) and the recommended streaming-512 + 4-bit (0.19×) both shrink the cache hard. The cheap-looking evict-only configs save memory too — but at 37.8% pass@1 they are not on the table.'}
        </p>
      </div>
    </figure>
  )
}
