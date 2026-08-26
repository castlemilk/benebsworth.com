import { Coins, Maximize2, ArrowRight, ExternalLink, Layers, Cpu } from 'lucide-react'
import Link from 'next/link'
import { BENCHMARK_MODELS } from '@/lib/lab/llm-benchmark/registry'
import { resultsForModel } from '@/lib/lab/llm-benchmark/results'
import { modelCompletion } from '@/lib/lab/llm-benchmark/analytics'
import { modelPath } from '@/lib/lab/llm-benchmark/nav'
import { formatContextWindow, isFreeModel } from './format'
import { StatStrip } from './stat-strip'
import { Reveal } from '@/components/motion/reveal'
import { ModelLogoBadge, getModelLogo } from './model-logo'

export function ModelList() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {BENCHMARK_MODELS.map((model, i) => {
        const logo = getModelLogo(model)
        const free = isFreeModel(model)
        const stats = modelCompletion(resultsForModel(model.id))
        const isLocal = model.provider === 'Ollama' || model.tags?.includes('local')
        return (
          <Reveal key={model.id} delay={i * 40}>
            <div
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-[var(--color-surface)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--color-border)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:bg-[var(--color-surface-2)]"
              style={{ borderColor: 'color-mix(in srgb, var(--color-border) 100%, transparent)' }}
            >
              {/* Accent top bar */}
              <div
                className="absolute inset-x-0 top-0 h-[3px] opacity-80 transition-opacity group-hover:opacity-100"
                style={{ background: logo.accent }}
                aria-hidden
              />
              <Link
                href={modelPath(model)}
                aria-label={`${model.name} — per-task results`}
                className="absolute inset-0 z-[5]"
              />

              {/* Header */}
              <div className="flex items-start gap-3">
                <ModelLogoBadge model={model} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="type-h3 truncate leading-tight">{model.name}</h3>
                    {isLocal && (
                      <span className="shrink-0 rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[0.5rem] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                        Local
                      </span>
                    )}
                  </div>
                  <p className="truncate font-mono text-[0.6rem] uppercase tracking-wider text-muted">
                    {model.company ? `${model.company}` : model.provider}
                    <span className="mx-1 opacity-40">·</span>
                    <span style={{ color: logo.accent }}>{model.family ?? model.provider}</span>
                  </p>
                  {model.params && (
                    <p className="mt-0.5 font-mono text-[0.6rem] text-muted">
                      {model.params} · {model.license ?? '—'}
                    </p>
                  )}
                </div>
                {free && !isLocal && (
                  <span className="shrink-0 rounded-full border border-emerald-600/25 bg-emerald-600/10 px-2 py-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Free
                  </span>
                )}
                {free && isLocal && (
                  <span className="shrink-0 rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-wider text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                    $0
                  </span>
                )}
              </div>

              {/* Tags */}
              {model.tags && model.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {model.tags.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-wide text-muted"
                    >
                      {t}
                    </span>
                  ))}
                  {model.released && (
                    <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 font-mono text-[0.55rem] text-muted">
                      {model.released}
                    </span>
                  )}
                </div>
              )}

              <p className="mt-3 line-clamp-3 min-h-[3.3rem] type-body text-sm leading-relaxed text-fg/70">
                {model.blurb ?? model.capabilities}
              </p>

              <StatStrip stats={stats} className="mt-3" />

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--color-border)] pt-4">
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-wider text-muted">
                    <Coins className="h-3 w-3" /> In
                  </span>
                  <span className="font-mono text-[0.7rem] font-medium tabular-nums text-fg/90">
                    {free ? 'Free' : `$${(model.costPer1kInputUsd * 1000).toFixed(2)}`}
                  </span>
                  <span className="font-mono text-[0.6rem] text-muted">/1M in</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-wider text-muted">
                    <Layers className="h-3 w-3" /> Out
                  </span>
                  <span className="font-mono text-[0.7rem] font-medium tabular-nums text-fg/90">
                    {free ? '—' : `$${(model.costPer1kOutputUsd * 1000).toFixed(2)}`}
                  </span>
                  <span className="font-mono text-[0.6rem] text-muted">/1M out</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-wider text-muted">
                    <Maximize2 className="h-3 w-3" /> Ctx
                  </span>
                  <span className="font-mono text-[0.7rem] font-medium tabular-nums text-fg/90">
                    {formatContextWindow(model.contextWindow)}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[0.6rem] text-muted">
                    <Cpu className="h-2.5 w-2.5" /> {model.contextWindow >= 1000000 ? '1M' : model.contextWindow >= 256000 ? '256K' : '41K'}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--color-border)]/50 pt-3">
                <span className="flex items-center gap-1.5 font-mono text-[0.65rem] font-medium uppercase tracking-wider text-muted transition-colors group-hover:text-fg">
                  Per-task results
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
                {model.modelCardUrl ? (
                  <a
                    href={model.modelCardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative z-10 inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 font-mono text-[0.6rem] font-medium uppercase tracking-wider text-muted transition-colors hover:border-fg/20 hover:text-fg"
                  >
                    Card
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : (
                  <span className="font-mono text-[0.6rem] text-muted/50">{model.provider}</span>
                )}
              </div>
            </div>
          </Reveal>
        )
      })}
    </section>
  )
}
