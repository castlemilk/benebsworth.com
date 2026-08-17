import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { JsonLd, SITE_URL, breadcrumbLd } from '@/components/seo/json-ld'
import { Reveal } from '@/components/motion/reveal'
import {
  BENCHMARK_MODELS,
  getModel,
  getTask,
} from '@/lib/lab/llm-benchmark/registry'
import { resultsForModel } from '@/lib/lab/llm-benchmark/results'
import { modelIndexPath, modelPath, taskPath } from '@/lib/lab/llm-benchmark/nav'
import { BenchmarkNav } from '@/components/lab/llm-benchmark/benchmark-nav'
import { ScoreBar } from '@/components/lab/llm-benchmark/score-bar'
import { StatStrip } from '@/components/lab/llm-benchmark/stat-strip'
import { modelCompletion } from '@/lib/lab/llm-benchmark/analytics'
import { aggregateFeedback } from '@/lib/lab/llm-benchmark/feedback'
import { CURATOR_FEEDBACK } from '@/lib/lab/llm-benchmark/feedback-data'
import { CuratorTally } from '@/components/lab/llm-benchmark/curator-note'
import { IterationChecks } from '@/components/lab/llm-benchmark/iteration-checks'
import {
  formatRuntime,
  formatCost,
  formatPricingPer1M,
  formatReleaseDate,
  isFreeModel,
} from '@/components/lab/llm-benchmark/format'
import {
  Cpu,
  ArrowRight,
  ExternalLink,
  CalendarDays,
  Building2,
  GitBranch,
  Scale,
  Package,
  Layers,
} from 'lucide-react'
import Link from 'next/link'

export function generateStaticParams() {
  return BENCHMARK_MODELS.map((m) => ({ model: m.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ model: string }>
}): Promise<Metadata> {
  const { model } = await params
  const m = getModel(model)
  const url = modelPath(m!)
  const description = m
    ? `${m.name} results across the LLM benchmark — ${m.capabilities}`
    : 'LLM benchmark model'
  return {
    title: m ? `${m.name} · LLM Benchmark` : 'LLM Benchmark',
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: m ? `${m.name} · LLM Benchmark · Ben Ebsworth` : 'LLM Benchmark',
      description,
      url,
      siteName: 'Ben Ebsworth',
      locale: 'en_AU',
      images: [{ url: '/lab/llm-benchmark/opengraph-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: m?.name,
      description: m?.capabilities,
      creator: '@benebsworth',
      site: '@benebsworth',
      images: ['/lab/llm-benchmark/opengraph-image.png'],
    },
  }
}

function statusClass(status: string): string {
  return status === 'success'
    ? 'text-emerald-600 dark:text-emerald-400'
    : status === 'timeout'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400'
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <tr>
      <th
        scope="row"
        className="w-44 px-5 py-3 font-mono text-xs uppercase tracking-wider text-muted"
      >
        <span className="inline-flex items-center gap-2">
          <span className="text-fg/40">{icon}</span>
          {label}
        </span>
      </th>
      <td className="px-5 py-3 text-fg/80">{value}</td>
    </tr>
  )
}

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ model: string }>
}) {
  const { model: modelId } = await params
  const model = getModel(modelId)
  if (!model) notFound()

  const results = resultsForModel(model.id)
  const free = isFreeModel(model)

  const breadcrumb = breadcrumbLd([
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Lab', url: `${SITE_URL}/lab/` },
    { name: 'LLM Benchmark', url: `${SITE_URL}/lab/llm-benchmark/` },
    { name: 'Models', url: `${SITE_URL}${modelIndexPath()}` },
    { name: model.name, url: `${SITE_URL}${modelPath(model)}` },
  ])

  return (
    <>
      <JsonLd data={[breadcrumb]} />
      <SiteNav />
      <BenchmarkNav />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-24 pt-16 sm:px-8">
        <Breadcrumb
          className="mb-10"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Lab', href: '/lab/' },
            { label: 'LLM Benchmark', href: '/lab/llm-benchmark/' },
            { label: 'Models', href: modelIndexPath() },
            { label: model.name },
          ]}
        />

        <section className="pb-10">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-fg)]">
                <Cpu className="h-5 w-5" aria-hidden />
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                {model.provider}
              </span>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-3 type-h1">{model.name}</h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 max-w-prose type-body text-fg/70">{model.blurb ?? model.capabilities}</p>
          </Reveal>
          <Reveal delay={200}>
            <StatStrip stats={modelCompletion(results)} className="mt-4 text-xs" />
            {/* Curator ratings for this model (#14) — a sibling of the stat
                strip rather than a segment inside it: StatStrip's segments are
                all MEASURED (`ModelCompletion`), and an opinion must not sit
                inside that sentence unlabelled. */}
            <CuratorTally tally={aggregateFeedback(CURATOR_FEEDBACK, model.id)} className="mt-1.5" />
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-6 flex flex-wrap gap-3 font-mono text-xs text-muted">
              {free && (
                <span className="rounded-full border border-emerald-600/40 bg-emerald-600/10 px-3 py-1 text-emerald-600 dark:text-emerald-400">
                  Free tier
                </span>
              )}
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1">
                Context: {model.contextWindow.toLocaleString()} tokens
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1">
                {formatPricingPer1M(model)}
              </span>
            </div>
          </Reveal>
        </section>

        <section className="pb-14">
          <Reveal>
            <h2 className="type-h2 mb-6">Model metadata</h2>
          </Reveal>
          <Reveal delay={60}>
            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <table className="w-full min-w-[480px] text-left text-sm">
                <caption className="sr-only">
                  {model.name} metadata: company, family, release, license, parameters, and links.
                </caption>
                <tbody className="divide-y divide-[var(--color-border)]">
                  <MetaRow
                    icon={<Building2 className="h-4 w-4" />}
                    label="Company"
                    value={
                      model.vendorUrl ? (
                        <a
                          href={model.vendorUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--color-project)]"
                        >
                          {model.company ?? model.provider}
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      ) : (
                        model.company ?? model.provider
                      )
                    }
                  />
                  <MetaRow
                    icon={<GitBranch className="h-4 w-4" />}
                    label="Family"
                    value={model.family ?? '—'}
                  />
                  <MetaRow
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Released"
                    value={model.released ? formatReleaseDate(model.released) : '—'}
                  />
                  <MetaRow
                    icon={<Scale className="h-4 w-4" />}
                    label="License"
                    value={model.license ?? '—'}
                  />
                  <MetaRow
                    icon={<Package className="h-4 w-4" />}
                    label="Parameters"
                    value={model.params ?? '—'}
                  />
                  <MetaRow
                    icon={<Layers className="h-4 w-4" />}
                    label="Capabilities"
                    value={model.tags?.length ? model.tags.map((t) => `#${t}`).join(' · ') : model.capabilities}
                  />
                  {model.modelCardUrl && (
                    <MetaRow
                      icon={<ExternalLink className="h-4 w-4" />}
                      label="Model card"
                      value={
                        <a
                          href={model.modelCardUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--color-project)]"
                        >
                          {model.provider === 'OpenRouter' ? 'OpenRouter' : 'Provider model page'}
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      }
                    />
                  )}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        <section>
          <Reveal>
            <h2 className="type-h2 mb-6">Per-task results</h2>
          </Reveal>

          <Reveal delay={80}>
            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <table className="w-full min-w-[560px] text-left text-sm">
                <caption className="sr-only">
                  {model.name} per-task results: score, status, runtime, tokens, and cost.
                </caption>
                <thead className="bg-[var(--color-surface-2)] font-mono text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3">Task</th>
                    <th scope="col" className="px-5 py-3">Score</th>
                    <th scope="col" className="px-5 py-3 text-right">Status</th>
                    <th scope="col" className="px-5 py-3 text-right">Runtime</th>
                    <th scope="col" className="px-5 py-3 text-right">Tokens in</th>
                    <th scope="col" className="px-5 py-3 text-right">Tokens out</th>
                    <th scope="col" className="px-5 py-3 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {results
                    .slice()
                    .sort((a, b) => b.score - a.score)
                    .map((result) => {
                      const task = getTask(result.taskId)
                      if (!task) return null
                      // Whole row → this run (the task page with this model preselected).
                      const runHref = `${taskPath(task)}?model=${encodeURIComponent(result.modelId)}#run`
                      return (
                        <tr key={result.taskId} className="group relative cursor-pointer transition-colors hover:bg-[var(--color-surface-2)]/50">
                          <td className="whitespace-nowrap px-5 py-3">
                            {/* Stretched link: whole row → this run. z-[5] covers cell
                                content (score bar); the named link stays z-10. */}
                            <Link
                              href={runHref}
                              aria-label={`See ${model.name} on ${task.title}`}
                              className="absolute inset-0 z-[5]"
                            />
                            <Link
                              href={runHref}
                              className="relative z-10 font-medium transition-colors hover:text-[var(--color-project)]"
                            >
                              {task.title}
                            </Link>
                          </td>
                          <td className="px-5 py-3">
                            <ScoreBar score={result.score} width="w-20" />
                            {result.iterationScores && result.iterationScores.length > 1 && (
                              <IterationSpread scores={result.iterationScores} />
                            )}
                            {result.iterationCheckResults && (
                              <IterationChecks results={result.iterationCheckResults} />
                            )}
                          </td>
                          <td className={`whitespace-nowrap px-5 py-3 text-right font-mono ${statusClass(result.status)}`}>
                            {result.status}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-right font-mono">{formatRuntime(result.runtimeMs)}</td>
                          <td className="px-5 py-3 text-right font-mono">{result.tokensIn.toLocaleString()}</td>
                          <td className="px-5 py-3 text-right font-mono">{result.tokensOut.toLocaleString()}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-right font-mono">{formatCost(result.costUsd)}</td>
                        </tr>
                      )
                    })}
                  {results.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-muted">
                        No results yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        <Reveal delay={160}>
          <div className="mt-10 flex justify-start">
            <Link
              href={modelIndexPath()}
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted transition-colors hover:text-fg"
            >
              <ArrowRight className="h-4 w-4 rotate-180" aria-hidden />
              All models
            </Link>
          </div>
        </Reveal>
      </main>
      <SiteFooter />
    </>
  )
}

/**
 * Compact per-iteration variance indicator (Loop 3). Surfaces whether a 99.4
 * average is "five consistent runs at 99" or "one lucky 100 averaged with
 * four 74s". The tooltip carries the full distribution so the row stays
 * scannable.
 *
 * Render: "{min}–{max}" with a σ hint when the spread is non-trivial.
 * Hidden when all iterations scored the same (nothing to communicate).
 */
function IterationSpread({ scores }: { scores: number[] }) {
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  if (min === max) return null
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance =
    scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length
  const stddev = Math.sqrt(variance)
  const tooltip = `Per-iteration scores: ${scores.map((s) => s.toFixed(1)).join(', ')} (σ=${stddev.toFixed(1)})`
  return (
    <div
      title={tooltip}
      className="mt-1 font-mono text-[10px] text-muted"
      aria-label={tooltip}
    >
      {min.toFixed(0)}–{max.toFixed(0)}
      <span className="ml-1 opacity-60">σ{stddev.toFixed(1)}</span>
    </div>
  )
}
