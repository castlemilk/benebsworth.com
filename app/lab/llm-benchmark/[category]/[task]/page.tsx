import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { Reveal } from '@/components/motion/reveal'
import { MdxContent } from '@/components/mdx/mdx-content'
import { JsonLd, SITE_URL, breadcrumbLd } from '@/components/seo/json-ld'
import {
  BENCHMARK_TASKS,
  getCategory,
  getModel,
  getTask,
  resultsForTask,
} from '@/lib/lab/llm-benchmark/registry'
import { aggregateResults } from '@/lib/lab/llm-benchmark/harness'
import { loadTaskMdx, loadTaskPostMdx } from '@/lib/lab/llm-benchmark/content'
import { Gauge, Clock, DollarSign, Hash, Terminal, Activity } from 'lucide-react'
import Link from 'next/link'
import { BenchmarkDemo } from '@/components/lab/llm-benchmark/demos/demo-registry'
import { BenchmarkNav } from '@/components/lab/llm-benchmark/benchmark-nav'
import { ModelOutputComparison } from '@/components/lab/llm-benchmark/model-output-comparison'
import { GeneratedDemo } from '@/components/lab/llm-benchmark/generated-demo'
import { modelPath } from '@/lib/lab/llm-benchmark/nav'

export function generateStaticParams() {
  return BENCHMARK_TASKS.map((task) => ({
    category: task.category,
    task: task.slug,
  }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; task: string }>
}): Promise<Metadata> {
  const { category, task } = await params
  const t = getTask(task)
  const url = `/lab/llm-benchmark/${category}/${task}/`
  const description = t ? `${t.blurb} — ${t.title} in the LLM benchmark.` : 'LLM benchmark task'
  return {
    title: t ? `${t.title} · LLM Benchmark` : 'LLM Benchmark',
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: t ? `${t.title} · LLM Benchmark · Ben Ebsworth` : 'LLM Benchmark',
      description,
      url,
      siteName: 'Ben Ebsworth',
      locale: 'en_AU',
    },
    twitter: {
      card: 'summary_large_image',
      title: t?.title,
      description: t?.blurb,
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

function formatTokens(n: number): string {
  return n.toLocaleString()
}

function statusClass(status: string): string {
  return status === 'success'
    ? 'text-emerald-600 dark:text-emerald-400'
    : status === 'timeout'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400'
}

export default async function BenchmarkTaskPage({
  params,
}: {
  params: Promise<{ category: string; task: string }>
}) {
  const { category, task } = await params
  const cat = getCategory(category)
  const t = getTask(task)
  if (!cat || !t || t.category !== category) notFound()

  const body = loadTaskMdx(task)
  const postBody = loadTaskPostMdx(task)
  const results = resultsForTask(t.id)
  const overall = aggregateResults(results)

  const breadcrumb = breadcrumbLd([
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Lab', url: `${SITE_URL}/lab/` },
    { name: 'LLM Benchmark', url: `${SITE_URL}/lab/llm-benchmark/` },
    { name: cat.label, url: `${SITE_URL}/lab/llm-benchmark/${category}/` },
    { name: t.title, url: `${SITE_URL}/lab/llm-benchmark/${category}/${task}/` },
  ])

  const appLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: t.title,
    description: t.blurb,
    url: `${SITE_URL}/lab/llm-benchmark/${category}/${task}/`,
    applicationCategory: 'EducationalApplication',
    applicationSubCategory: cat.label,
    operatingSystem: 'Any (browser-based)',
    inLanguage: 'en-AU',
    isAccessibleForFree: true,
    author: { '@type': 'Person', name: 'Ben Ebsworth', url: `${SITE_URL}/about/` },
  }

  return (
    <>
      <JsonLd data={[breadcrumb, appLd]} />
      <SiteNav />
      <BenchmarkNav />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-24 sm:px-8">
        <Breadcrumb
          className="mb-10"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Lab', href: '/lab/' },
            { label: 'LLM Benchmark', href: '/lab/llm-benchmark/' },
            { label: cat.label, href: `/lab/llm-benchmark/${category}/` },
            { label: t.title },
          ]}
        />

        {/* ── Header ──────────────────────────────────────────────────── */}
        <section className="pb-10">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl" style={{ color: cat.accent }} aria-hidden>
                {cat.glyph}
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                {cat.label}
              </span>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-3 type-h1">{t.title}</h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 max-w-prose type-body text-fg/70">{t.blurb}</p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-6 flex flex-wrap gap-3 font-mono text-xs text-muted">
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1">
                Runtime: {t.runtimeHint}
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1">
                Default iterations: {t.iterationsDefault}
              </span>
            </div>
          </Reveal>
        </section>

        {/* ── Explainer ───────────────────────────────────────────────── */}
        {body && (
          <Reveal delay={320}>
            <article className="mx-auto mb-16 max-w-3xl">
              <MdxContent source={body} />
            </article>
          </Reveal>
        )}

        {/* ── Prompt ───────────────────────────────────────────────────── */}
        <Reveal>
          <div className="mb-10 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-5 py-3 font-mono text-xs uppercase tracking-wider text-muted">
              <Terminal className="h-4 w-4" aria-hidden />
              Prompt
            </div>
            <div className="p-5">
              <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-fg/90">
                {t.prompt}
              </p>
            </div>
          </div>
        </Reveal>

        {/* ── Live demo ───────────────────────────────────────────────── */}
        <Reveal delay={80}>
          <div className="mb-16 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
            <div className="rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-bg)] p-1">
              <BenchmarkDemo task={t} />
            </div>
          </div>
        </Reveal>

        {/* ── Generated demo ───────────────────────────────────────────── */}
        <Reveal delay={120}>
          <div className="mb-16">
            <GeneratedDemo task={t} />
          </div>
        </Reveal>

        {/* ── Results ──────────────────────────────────────────────────── */}
        <section>
          <Reveal>
            <h2 className="type-h2 mb-6 flex items-center gap-3">
              <Activity className="h-6 w-6 text-muted" aria-hidden />
              Results
            </h2>
          </Reveal>

          <Reveal delay={80}>
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <ResultStat label="Runs" value={overall.count.toString()} icon={<Hash className="h-4 w-4" />} />
              <ResultStat label="Avg score" value={formatScore(overall.avgScore)} icon={<Gauge className="h-4 w-4" />} />
              <ResultStat label="Avg runtime" value={formatMs(overall.avgRuntimeMs)} icon={<Clock className="h-4 w-4" />} />
              <ResultStat label="Avg cost" value={formatCost(overall.avgCostUsd)} icon={<DollarSign className="h-4 w-4" />} />
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--color-surface-2)] font-mono text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-5 py-3">Model</th>
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
                    const model = getModel(result.modelId)
                    return (
                      <tr key={result.modelId} className="hover:bg-[var(--color-surface-2)]/50 transition-colors">
                        <td className="px-5 py-3 font-medium">
                          {model ? (
                            <Link
                              href={modelPath(model)}
                              className="transition-colors hover:text-[var(--color-project)]"
                            >
                              {model.name}
                            </Link>
                          ) : (
                            result.modelId
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-mono">{formatScore(result.score)}</td>
                        <td className={`px-5 py-3 text-right font-mono ${statusClass(result.status)}`}>
                          {result.status}
                        </td>
                        <td className="px-5 py-3 text-right font-mono">{formatMs(result.runtimeMs)}</td>
                        <td className="px-5 py-3 text-right font-mono">{formatTokens(result.tokensIn)}</td>
                        <td className="px-5 py-3 text-right font-mono">{formatTokens(result.tokensOut)}</td>
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

          <Reveal delay={240}>
            <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <h3 className="type-h3 mb-2">Method notes</h3>
              <p className="text-fg/70">{t.methodNotes}</p>
            </div>
          </Reveal>

          <Reveal delay={280}>
            <div className="mt-16">
              <h2 className="type-h2 mb-6">Generated outputs</h2>
              <ModelOutputComparison results={results} taskTitle={t.title} />
            </div>
          </Reveal>

          {postBody && (
            <Reveal delay={320}>
              <article className="mx-auto mt-16 max-w-3xl">
                <MdxContent source={postBody} />
              </article>
            </Reveal>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

function ResultStat({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="font-mono text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 font-mono text-xl font-semibold">{value}</p>
    </div>
  )
}
