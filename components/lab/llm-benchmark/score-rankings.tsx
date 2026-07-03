import Link from 'next/link'
import { Trophy, ArrowRight } from 'lucide-react'
import type { ModelRanking } from '@/lib/lab/llm-benchmark/analytics'
import { modelPath } from '@/lib/lab/llm-benchmark/nav'
import { MetricCard } from './metric-card'
import { ScoreBar } from './score-bar'
import { formatRuntime, formatCost, formatTokens } from './format'
import { medalColor } from './bench-theme'
import { Reveal } from '@/components/motion/reveal'
import { cn } from '@/lib/utils'

/**
 * Model leaderboard. Rankings are computed server-side (analytics.rankModels)
 * and passed in, so this ships no results data to the client. Each row carries
 * a rank numeral, a full-width score bar (the one comparison visualization),
 * and a seeded-data flag where applicable.
 */
export function ScoreRankings({ rankings }: { rankings: ModelRanking[] }) {
  return (
    <div className="grid gap-4">
      {rankings.map(({ model, stats, seededOnly }, i) => {
        const medal = medalColor(i)
        const isPodium = i < 3
        return (
          <Reveal key={model.id} delay={i * 60}>
            <Link
              href={modelPath(model)}
              className="group block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:bg-[var(--color-surface-2)]"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <span
                    className="w-7 shrink-0 text-right font-mono text-sm tabular-nums text-muted"
                    aria-hidden
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-mono text-lg',
                      !isPodium && 'opacity-70',
                    )}
                    style={{
                      color: medal,
                      borderColor: `color-mix(in srgb, ${medal} 35%, transparent)`,
                      backgroundColor: `color-mix(in srgb, ${medal} 10%, transparent)`,
                    }}
                  >
                    {isPodium ? <Trophy className="h-4 w-4" aria-hidden /> : <span>{i + 1}</span>}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="type-h3 truncate">{model.name}</h3>
                      {seededOnly && (
                        <span
                          className="shrink-0 rounded-full border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-muted"
                          title="Hand-authored sample data — not a live API run"
                        >
                          sample
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                      {model.provider} · {stats.count} result{stats.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 lg:w-[440px] lg:shrink-0">
                  {/* Score bar — the leaderboard's one comparison visualization */}
                  <div className="flex items-center gap-3">
                    <span className="w-16 shrink-0 font-mono text-[0.6rem] uppercase tracking-wider text-muted">
                      Avg score
                    </span>
                    <ScoreBar score={stats.avgScore} className="flex-1" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <MetricCard label="Avg runtime" value={formatRuntime(stats.avgRuntimeMs)} />
                    <MetricCard label="Avg cost" value={formatCost(stats.avgCostUsd)} />
                    <MetricCard label="Tokens" value={formatTokens(stats.totalTokensIn + stats.totalTokensOut)} />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted transition-colors group-hover:text-fg">
                View per-task breakdown
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </div>
            </Link>
          </Reveal>
        )
      })}
      <span className="sr-only">
        Models ranked by mean score across all benchmark tasks, highest first.
        {rankings.some((r) => r.seededOnly) && ' Rows marked “sample” use hand-authored data, not live API runs.'}
      </span>
    </div>
  )
}
