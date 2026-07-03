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
  resultsForModel,
} from '@/lib/lab/llm-benchmark/registry'
import { modelIndexPath, modelPath, taskPath } from '@/lib/lab/llm-benchmark/nav'
import { BenchmarkNav } from '@/components/lab/llm-benchmark/benchmark-nav'
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
    },
    twitter: {
      card: 'summary_large_image',
      title: m?.name,
      description: m?.capabilities,
      creator: '@benebsworth',
      site: '@benebsworth',
    },
  }
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

function statusClass(status: string): string {
  return status === 'success'
    ? 'text-emerald-600 dark:text-emerald-400'
    : status === 'timeout'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400'
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
            <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--color-surface-2)] font-mono text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-5 py-3">Task</th>
                    <th className="px-5 py-3 text-right">Score</th>
                    <th className="px-5 py-3 text-right">Status</th>
                    <th className="px-5 py-3 text-right">Runtime</th>
                    <th className="px-5 py-3 text-right">Tokens in</th>
                    <th className="px-5 py-3 text-right">Tokens out</th>
                    <th className="px-5 py-3 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {results.map((result) => {
                    const task = getTask(result.taskId)
                    if (!task) return null
                    return (
                      <tr key={result.taskId} className="hover:bg-[var(--color-surface-2)]/50 transition-colors">
                        <td className="px-5 py-3">
                          <Link
                            href={taskPath(task)}
                            className="font-medium transition-colors hover:text-[var(--color-project)]"
                          >
                            {task.title}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-right font-mono">{formatScore(result.score)}</td>
                        <td className={`px-5 py-3 text-right font-mono ${statusClass(result.status)}`}>
                          {result.status}
                        </td>
                        <td className="px-5 py-3 text-right font-mono">{formatMs(result.runtimeMs)}</td>
                        <td className="px-5 py-3 text-right font-mono">{result.tokensIn.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right font-mono">{result.tokensOut.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right font-mono">{formatCost(result.costUsd)}</td>
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
