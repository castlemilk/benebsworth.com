import { Brain, Coins, Maximize2, ArrowRight, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { BENCHMARK_MODELS } from '@/lib/lab/llm-benchmark/registry'
import { modelPath } from '@/lib/lab/llm-benchmark/nav'
import { formatContextWindow, isFreeModel } from './format'
import { Reveal } from '@/components/motion/reveal'

const MODEL_BRAND: Record<string, string> = {
  Anthropic: '#d97757',
  OpenAI: '#10a37f',
  Google: '#4285f4',
  OpenRouter: '#7c5cff',
}

export function ModelList() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {BENCHMARK_MODELS.map((model, i) => {
        const brand = MODEL_BRAND[model.provider] ?? '#7c5cff'
        const free = isFreeModel(model)
        return (
          <Reveal key={model.id} delay={i * 60}>
            <div className="group relative flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:bg-[var(--color-surface-2)]">
              <Link
                href={modelPath(model)}
                aria-label={`${model.name} — per-task results`}
                className="absolute inset-0 z-[5]"
              />

              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                  style={{
                    color: brand,
                    borderColor: `color-mix(in srgb, ${brand} 35%, transparent)`,
                    backgroundColor: `color-mix(in srgb, ${brand} 10%, transparent)`,
                  }}
                >
                  <Brain className="h-4 w-4" aria-hidden />
                </span>
                <div className="flex-1">
                  <h3 className="type-h3">{model.name}</h3>
                  <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                    {model.company ? `${model.company} · ${model.provider}` : model.provider}
                  </p>
                </div>
                {free && (
                  <span className="rounded-full border border-emerald-600/40 bg-emerald-600/10 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Free
                  </span>
                )}
              </div>

              <p className="mt-3 type-body text-fg/65">{model.blurb ?? model.capabilities}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-4">
                <div className="flex items-center gap-2">
                  <Coins className="h-3.5 w-3.5 text-muted" aria-hidden />
                  <span className="font-mono text-[0.7rem] text-fg/80">
                    {free ? 'Free' : `$${(model.costPer1kInputUsd * 1000).toFixed(2)}/1M in`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[0.7rem] text-fg/80">
                    {free ? 'tier' : `$${(model.costPer1kOutputUsd * 1000).toFixed(2)}/1M out`}
                  </span>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Maximize2 className="h-3.5 w-3.5 text-muted" aria-hidden />
                  <span className="font-mono text-[0.7rem] text-fg/80">
                    {formatContextWindow(model.contextWindow)} context window
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted transition-colors group-hover:text-fg">
                  Per-task results
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </span>
                {model.modelCardUrl && (
                  <a
                    href={model.modelCardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative z-10 inline-flex items-center gap-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted transition-colors hover:text-fg"
                  >
                    Card
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                )}
              </div>
            </div>
          </Reveal>
        )
      })}
    </section>
  )
}
