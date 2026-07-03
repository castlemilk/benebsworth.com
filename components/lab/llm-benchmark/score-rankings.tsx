'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Trophy, ArrowRight } from 'lucide-react'
import { BENCHMARK_MODELS } from '@/lib/lab/llm-benchmark/registry'
import { resultsForModel } from '@/lib/lab/llm-benchmark/registry'
import { modelPath } from '@/lib/lab/llm-benchmark/nav'
import { aggregateResults } from '@/lib/lab/llm-benchmark/harness'
import { MetricCard } from './metric-card'
import { formatScore, formatRuntime, formatCost, formatTokens } from './format'
import { Reveal } from '@/components/motion/reveal'

export function ScoreRankings() {
  const ranked = useMemo(() => {
    const list = BENCHMARK_MODELS.map((model) => {
      const results = resultsForModel(model.id)
      const stats = aggregateResults(results)
      return { model, stats }
    })
    list.sort((a, b) => b.stats.avgScore - a.stats.avgScore)
    return list
  }, [])

  return (
    <section className="grid gap-6">
      {ranked.map(({ model, stats }, i) => {
        const medals = ['#f59e0b', '#9ca3af', '#b45309']
        const medal = medals[i] ?? 'var(--color-muted)'
        return (
          <Reveal key={model.id} delay={i * 60}>
            <Link
              href={modelPath(model)}
              className="group block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:bg-[var(--color-surface-2)]"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-mono text-lg"
                    style={{
                      color: medal,
                      borderColor: `color-mix(in srgb, ${medal} 35%, transparent)`,
                      backgroundColor: `color-mix(in srgb, ${medal} 10%, transparent)`,
                    }}
                  >
                    <Trophy className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <h3 className="type-h3">{model.name}</h3>
                    <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                      {model.provider} · {stats.count} result{stats.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetricCard label="Avg score" value={formatScore(stats.avgScore)} unit="/ 100" accent={medal} />
                  <MetricCard label="Avg runtime" value={formatRuntime(stats.avgRuntimeMs)} />
                  <MetricCard label="Avg cost" value={formatCost(stats.avgCostUsd)} />
                  <MetricCard label="Total tokens" value={formatTokens(stats.totalTokensIn + stats.totalTokensOut)} />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted group-hover:text-fg transition-colors">
                View per-task breakdown
                <ArrowRight className="h-3 w-3" aria-hidden />
              </div>
            </Link>
          </Reveal>
        )
      })}
    </section>
  )
}
