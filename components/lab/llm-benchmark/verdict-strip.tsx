import Link from 'next/link'
import { Trophy, Coins, Zap } from 'lucide-react'
import type { Verdict } from '@/lib/lab/llm-benchmark/analytics'
import { modelPath } from '@/lib/lab/llm-benchmark/nav'
import { getModel } from '@/lib/lab/llm-benchmark/registry'
import { Reveal } from '@/components/motion/reveal'
import { BENCH_ACCENT } from './bench-theme'

const ICONS = [Trophy, Coins, Zap]

/**
 * The headline "who wins, at what cost" strip shown directly under the hero.
 * Answers best-score / best-value / fastest at a glance and links each to
 * the winning model — so the verdict precedes the appendix tables.
 */
export function VerdictStrip({ verdicts }: { verdicts: Verdict[] }) {
  if (verdicts.length === 0) return null
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {verdicts.map((v, i) => {
        const Icon = ICONS[i] ?? Trophy
        const model = getModel(v.modelId)
        return (
          <Reveal key={v.label} delay={i * 80}>
            <Link
              href={model ? modelPath(model) : '#'}
              className="group block h-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-muted)]"
            >
              <div className="flex items-center gap-2 type-label text-muted">
                <Icon className="h-3.5 w-3.5 accent-ink" style={{ '--ink': BENCH_ACCENT } as React.CSSProperties} aria-hidden />
                {v.label}
              </div>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="type-h2 tabular-nums">{v.value}</span>
              </p>
              <p className="mt-1.5 type-body font-medium">{v.modelName}</p>
              <p className="mt-0.5 font-mono text-[0.7rem] text-muted">{v.detail}</p>
            </Link>
          </Reveal>
        )
      })}
    </div>
  )
}
