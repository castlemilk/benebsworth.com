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
} from '@/lib/lab/llm-benchmark/registry'
import { resultsForModel } from '@/lib/lab/llm-benchmark/results'
import { aggregateResults } from '@/lib/lab/llm-benchmark/harness'
import { modelIndexPath, modelPath } from '@/lib/lab/llm-benchmark/nav'
import { BenchmarkNav } from '@/components/lab/llm-benchmark/benchmark-nav'
import {
  formatScore,
  formatRuntime,
  formatCost,
  formatPricingPer1M,
  formatReleaseDate,
  isFreeModel,
} from '@/components/lab/llm-benchmark/format'
import { Cpu, Gauge, Clock, DollarSign, Hash, ExternalLink, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Models · LLM Benchmark · Lab',
  description:
    'Frontier paid models and the OpenRouter free tier — pricing, context windows, release metadata, and aggregate benchmark results.',
  alternates: { canonical: modelIndexPath() },
  openGraph: {
    type: 'website',
    title: 'Models · LLM Benchmark · Lab · Ben Ebsworth',
    description:
      'Frontier paid models and the OpenRouter free tier — pricing, context windows, release metadata, and aggregate benchmark results.',
    url: modelIndexPath(),
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
    images: [{ url: '/lab/llm-benchmark/opengraph-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Models · LLM Benchmark · Lab',
    creator: '@benebsworth',
    site: '@benebsworth',
    images: ['/lab/llm-benchmark/opengraph-image.png'],
  },
}

const frontierModels = BENCHMARK_MODELS.filter((m) => !isFreeModel(m))
const freeModels = BENCHMARK_MODELS.filter(isFreeModel)

const FREE_COMPANIES: { company: string; url?: string }[] = []
for (const m of freeModels) {
  if (!FREE_COMPANIES.some((c) => c.company === m.company)) {
    FREE_COMPANIES.push({ company: m.company ?? m.provider, url: m.vendorUrl })
  }
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
      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-24 pt-16 sm:px-8">
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
              {frontierModels.length} frontier models and {freeModels.length} free open-weight
              models served via the OpenRouter free tier, with pricing, release metadata, and
              aggregate scores across all tasks. Each model card links to the provider model page
              and the vendor website.
            </p>
          </Reveal>
        </section>

        <section className="pb-14">
          <Reveal>
            <h2 className="type-h2 mb-2">Frontier</h2>
          </Reveal>
          <Reveal delay={60}>
            <p className="mb-6 max-w-prose text-sm text-fg/60">
              Paid, hosted frontier models run directly against their vendor APIs.
            </p>
          </Reveal>
          <div className="grid gap-6">
            {frontierModels.map((model, i) => (
              <ModelCard key={model.id} model={model} index={i} />
            ))}
          </div>
        </section>

        <section className="pb-14">
          <Reveal>
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-muted" aria-hidden />
              <h2 className="type-h2">OpenRouter free tier</h2>
            </div>
          </Reveal>
          <Reveal delay={60}>
            <p className="mb-6 max-w-prose text-sm text-fg/60">
              Cost-0 open-weight models routed through OpenRouter. Served by community providers —
              availability and throughput vary, and results are subject to free-tier rate limits.
            </p>
          </Reveal>

          {FREE_COMPANIES.map((group) => {
            const groupModels = freeModels.filter((m) => (m.company ?? m.provider) === group.company)
            return (
              <div key={group.company} className="mb-10">
                <div className="mb-4 flex items-center gap-2">
                  <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                    {group.company}
                  </h3>
                  {group.url && (
                    <a
                      href={group.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs text-muted transition-colors hover:text-fg"
                    >
                      <ExternalLink className="h-3 w-3" aria-hidden />
                      site
                    </a>
                  )}
                </div>
                <div className="grid gap-6">
                  {groupModels.map((model, i) => (
                    <ModelCard key={model.id} model={model} index={i} />
                  ))}
                </div>
              </div>
            )
          })}
        </section>

        <section>
          <Reveal>
            <h2 className="type-h2 mb-6 flex items-center gap-3">
              <Cpu className="h-6 w-6 text-muted" aria-hidden />
              Task coverage
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="max-w-prose text-fg/70">
              Every model is run against {BENCHMARK_TASKS.length} tasks across seven categories.
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

function ModelCard({
  model,
  index,
}: {
  model: (typeof BENCHMARK_MODELS)[number]
  index: number
}) {
  const stats = aggregateResults(resultsForModel(model.id))
  const free = isFreeModel(model)
  const runHref = modelPath(model)

  return (
    <Reveal delay={index * 60}>
      <div className="group relative block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-colors hover:bg-[var(--color-surface-2)]">
        {/* Stretched link: whole card → model detail. z-[5] covers card
            content; the external links below sit above it at z-10. */}
        <Link
          href={runHref}
          aria-label={`${model.name} — per-task results`}
          className="absolute inset-0 z-[5]"
        />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-fg)]">
                <Cpu className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="type-h3">{model.name}</h2>
                <p className="font-mono text-xs text-muted">
                  {model.company ? `${model.company} · ${model.provider}` : model.provider}
                </p>
              </div>
              {free && (
                <span className="rounded-full border border-emerald-600/40 bg-emerald-600/10 px-2.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Free
                </span>
              )}
            </div>

            <p className="mt-4 max-w-prose text-fg/70">{model.blurb ?? model.capabilities}</p>

            <div className="mt-4 flex flex-wrap gap-2 font-mono text-xs text-muted">
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1">
                Context: {model.contextWindow.toLocaleString()} tokens
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1">
                {formatPricingPer1M(model)}
              </span>
              {model.params && (
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1">
                  {model.params}
                </span>
              )}
              {model.released && (
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1">
                  {formatReleaseDate(model.released)}
                </span>
              )}
            </div>

            {model.tags && model.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {model.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[0.65rem] uppercase tracking-wider text-muted"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-3 sm:w-80">
            <MiniStat icon={<Gauge className="h-4 w-4" />} label="Avg score" value={formatScore(stats.avgScore)} />
            <MiniStat icon={<Clock className="h-4 w-4" />} label="Avg runtime" value={formatRuntime(stats.avgRuntimeMs)} />
            <MiniStat icon={<DollarSign className="h-4 w-4" />} label="Avg cost" value={formatCost(stats.avgCostUsd)} />
            <MiniStat icon={<Hash className="h-4 w-4" />} label="Tasks" value={`${stats.count}`} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted transition-colors group-hover:text-fg">
            Per-task breakdown
            <span aria-hidden>→</span>
          </span>

          <div className="relative z-10 flex items-center gap-4 font-mono text-xs">
            {model.modelCardUrl && (
              <a
                href={model.modelCardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-fg"
              >
                Model card
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            )}
            {model.license && (
              <span className="text-muted" title={`License: ${model.license}`}>
                {model.license}
              </span>
            )}
          </div>
        </div>
      </div>
    </Reveal>
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
