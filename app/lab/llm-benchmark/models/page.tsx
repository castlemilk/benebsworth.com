import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd } from '@/components/seo/json-ld'
import { Reveal } from '@/components/motion/reveal'
import {
  BENCHMARK_MODELS,
  BENCHMARK_TASKS,
  resultsForModel,
} from '@/lib/lab/llm-benchmark/registry'
import { aggregateResults } from '@/lib/lab/llm-benchmark/harness'
import { modelIndexPath, modelPath } from '@/lib/lab/llm-benchmark/nav'
import { BenchmarkNav } from '@/components/lab/llm-benchmark/benchmark-nav'
import { Cpu, DollarSign, Gauge, Clock, Hash, Layers } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Models · LLM Benchmark · Lab',
  description:
    'Pricing, context windows, and aggregate benchmark results for the models in the LLM benchmark.',
  alternates: { canonical: modelIndexPath() },
  openGraph: {
    type: 'website',
    title: 'Models · LLM Benchmark · Lab · Ben Ebsworth',
    description:
      'Pricing, context windows, and aggregate benchmark results for the models in the LLM benchmark.',
    url: modelIndexPath(),
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Models · LLM Benchmark · Lab',
    creator: '@benebsworth',
    site: '@benebsworth',
  },
}

function formatScore(n: number): string {
  return n.toFixed(1)
}

function formatMs(n: number): string {
  return `${Math.round(n).toLocaleString()} ms`
}

function formatCost(n: number): string {
  return `$${n.toFixed(4)}`
}

export default function ModelsIndexPage() {
  const breadcrumb = breadcrumbLd([
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Lab', url: `${SITE_URL}/lab/` },
    { name: 'LLM Benchmark', url: `${SITE_URL}/lab/llm-benchmark/` },
    { name: 'Models', url: `${SITE_URL}${modelIndexPath()}` },
  ])

  const collection = collectionPageLd({
    name: 'Models · LLM Benchmark · Ben Ebsworth',
    description: 'Pricing, context windows, and aggregate benchmark results.',
    url: `${SITE_URL}${modelIndexPath()}`,
    items: BENCHMARK_MODELS.map((m) => ({
      name: m.name,
      url: `${SITE_URL}${modelPath(m)}`,
    })),
  })

  return (
    <>
      <JsonLd data={[breadcrumb, collection]} />
      <SiteNav />
      <BenchmarkNav />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-24 sm:px-8">
        <Breadcrumb
          className="mb-10"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Lab', href: '/lab/' },
            { label: 'LLM Benchmark', href: '/lab/llm-benchmark/' },
            { label: 'Models' },
          ]}
        />

        <section className="pb-10">
          <Reveal>
            <p className="type-label text-muted">00 · models</p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-3 type-h1">Benchmarked models</h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 max-w-prose type-body text-fg/70">
              Pricing and context-window snapshots for the frontier models in the harness, plus
              their aggregate scores across all tasks.
            </p>
          </Reveal>
        </section>

        <section className="grid gap-6">
          {BENCHMARK_MODELS.map((model, i) => {
            const stats = aggregateResults(resultsForModel(model.id))
            return (
              <Reveal key={model.id} delay={i * 60}>
                <Link
                  href={modelPath(model)}
                  className="group block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-colors hover:bg-[var(--color-surface-2)]"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-fg)]">
                          <Cpu className="h-5 w-5" aria-hidden />
                        </span>
                        <div>
                          <h2 className="type-h3">{model.name}</h2>
                          <p className="font-mono text-xs text-muted">{model.provider}</p>
                        </div>
                      </div>
                      <p className="mt-4 max-w-prose text-fg/70">{model.capabilities}</p>
                      <div className="mt-4 flex flex-wrap gap-2 font-mono text-xs text-muted">
                        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1">
                          Context: {model.contextWindow.toLocaleString()} tokens
                        </span>
                        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1">
                          In: ${(model.costPer1kInputUsd * 1000).toFixed(2)} / 1M
                        </span>
                        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1">
                          Out: ${(model.costPer1kOutputUsd * 1000).toFixed(2)} / 1M
                        </span>
                      </div>
                    </div>

                    <div className="grid shrink-0 grid-cols-2 gap-3 sm:w-80">
                      <MiniStat icon={<Gauge className="h-4 w-4" />} label="Avg score" value={formatScore(stats.avgScore)} />
                      <MiniStat icon={<Clock className="h-4 w-4" />} label="Avg runtime" value={formatMs(stats.avgRuntimeMs)} />
                      <MiniStat icon={<DollarSign className="h-4 w-4" />} label="Avg cost" value={formatCost(stats.avgCostUsd)} />
                      <MiniStat icon={<Hash className="h-4 w-4" />} label="Tasks" value={`${stats.count}`} />
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted group-hover:text-fg transition-colors">
                    Per-task breakdown
                    <span aria-hidden>→</span>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </section>

        <section className="mt-16">
          <Reveal>
            <h2 className="type-h2 mb-6 flex items-center gap-3">
              <Layers className="h-6 w-6 text-muted" aria-hidden />
              Task coverage
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="max-w-prose text-fg/70">
              Each model is run against {BENCHMARK_TASKS.length} tasks across seven categories.
              Results are averaged over multiple iterations and scored for correctness, runtime, and
              cost efficiency.
            </p>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="font-mono text-[0.65rem] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 font-mono text-lg font-semibold">{value}</p>
    </div>
  )
}
