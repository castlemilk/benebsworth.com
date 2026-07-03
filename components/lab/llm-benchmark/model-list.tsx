'use client'

import { Brain, Coins, Maximize2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { BENCHMARK_MODELS } from '@/lib/lab/llm-benchmark/registry'
import { modelPath } from '@/lib/lab/llm-benchmark/nav'
import { formatContextWindow } from './format'
import { Reveal } from '@/components/motion/reveal'

const MODEL_BRAND: Record<string, string> = {
  Anthropic: '#d97757',
  OpenAI: '#10a37f',
  Google: '#4285f4',
}

export function ModelList() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {BENCHMARK_MODELS.map((model, i) => {
        const brand = MODEL_BRAND[model.provider] ?? '#7c5cff'
        return (
          <Reveal key={model.id} delay={i * 60}>
            <Link
              href={modelPath(model)}
              className="group flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:bg-[var(--color-surface-2)]"
            >
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
                <div>
                  <h3 className="type-h3">{model.name}</h3>
                  <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                    {model.provider}
                  </p>
                </div>
              </div>

              <p className="mt-3 type-body text-fg/65">{model.capabilities}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-4">
                <div className="flex items-center gap-2">
                  <Coins className="h-3.5 w-3.5 text-muted" aria-hidden />
                  <span className="font-mono text-[0.7rem] text-fg/80">
                    ${(model.costPer1kInputUsd * 1000).toFixed(2)}/1M in
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[0.7rem] text-fg/80">
                    ${(model.costPer1kOutputUsd * 1000).toFixed(2)}/1M out
                  </span>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Maximize2 className="h-3.5 w-3.5 text-muted" aria-hidden />
                  <span className="font-mono text-[0.7rem] text-fg/80">
                    {formatContextWindow(model.contextWindow)} context window
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted group-hover:text-fg transition-colors">
                Per-task results
                <ArrowRight className="h-3 w-3" aria-hidden />
              </div>
            </Link>
          </Reveal>
        )
      })}
    </section>
  )
}
