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
import { formatRuntime, formatCost } from '@/components/lab/llm-benchmark/format'
import { Cpu, ArrowRight } from 'lucide-react'
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

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ model: string }>
}) {
  const { model: modelId } = await params
  const model = getModel(modelId)
  if (!model) notFound()

  const results = resultsForModel(model.id)

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
            <p className="mt-4 max-w-prose type-body text-fg/70">{model.capabilities}</p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-6 flex flex-wrap gap-3 font-mono text-xs text-muted">
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1">
                Context: {model.contextWindow.toLocaleString()} tokens
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1">
                In: ${(model.costPer1kInputUsd * 1000).toFixed(2)} / 1M tokens
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1">
                Out: ${(model.costPer1kOutputUsd * 1000).toFixed(2)} / 1M tokens
              </span>
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
                      return (
                        <tr key={result.taskId} className="hover:bg-[var(--color-surface-2)]/50 transition-colors">
                          <td className="whitespace-nowrap px-5 py-3">
                            <Link
                              href={taskPath(task)}
                              className="font-medium transition-colors hover:text-[var(--color-project)]"
                            >
                              {task.title}
                            </Link>
                          </td>
                          <td className="px-5 py-3">
                            <ScoreBar score={result.score} width="w-20" />
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
