import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/site/site-nav';
import { SiteFooter } from '@/components/site/site-footer';
import { Breadcrumb } from '@/components/site/breadcrumb';
import { JsonLd, SITE_URL, breadcrumbLd } from '@/components/seo/json-ld';
import { Reveal } from '@/components/motion/reveal';
import { ALL_SUMMARIES, resultsForModel } from '@/lib/lab/harness-eval/results';
import { ArrowRight, Cpu } from 'lucide-react';

export function generateStaticParams() {
  return ALL_SUMMARIES.map((s) => ({ model: s.model.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ model: string }>;
}): Promise<Metadata> {
  const { model: modelId } = await params;
  const decoded = decodeURIComponent(modelId);
  const summary = ALL_SUMMARIES.find((s) => s.model.id === decoded);
  const url = `/lab/harness-eval/models/${encodeURIComponent(decoded)}/`;
  return {
    title: summary ? `${summary.model.displayName} · Harness Eval` : 'Harness Eval',
    description: summary
      ? `${summary.model.displayName} (${summary.model.provider}) — ${String(summary.passRate)}% pass rate across ${String(summary.totalTasks)} tasks.`
      : 'Harness eval model detail',
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: summary ? `${summary.model.displayName} · Harness Eval · Ben Ebsworth` : 'Harness Eval',
      description: summary?.model.provider || '',
      url,
      siteName: 'Ben Ebsworth',
      locale: 'en_AU',
    },
    twitter: { card: 'summary_large_image', title: summary?.model.displayName, creator: '@benebsworth', site: '@benebsworth' },
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${String(Math.round(ms))}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s - m * 60)}s`;
}

function formatTokens(n: number): string {
  if (n === 0) return '-';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ model: string }>;
}) {
  const { model: modelId } = await params;
  const decoded = decodeURIComponent(modelId);
  const summary = ALL_SUMMARIES.find((s) => s.model.id === decoded);
  if (!summary) notFound();

  const tasks = resultsForModel(decoded);

  const breadcrumb = breadcrumbLd([
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Lab', url: `${SITE_URL}/lab/` },
    { name: 'Harness Eval', url: `${SITE_URL}/lab/harness-eval/` },
    { name: 'Models', url: `${SITE_URL}/lab/harness-eval/models/` },
    { name: summary.model.displayName, url: `${SITE_URL}/lab/harness-eval/models/${encodeURIComponent(decoded)}/` },
  ]);

  return (
    <>
      <JsonLd data={[breadcrumb]} />
      <SiteNav />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-20 sm:px-8">
        <Breadcrumb
          className="mb-10"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Lab', href: '/lab/' },
            { label: 'Harness Eval', href: '/lab/harness-eval/' },
            { label: 'Models', href: '/lab/harness-eval/models/' },
            { label: summary.model.displayName },
          ]}
        />

        <section className="pb-10">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-fg)]">
                <Cpu className="h-5 w-5" />
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                {summary.model.provider}
              </span>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-3 type-h1">{summary.model.displayName}</h1>
          </Reveal>
          <Reveal delay={160}>
            <div className="mt-6 flex flex-wrap gap-3 font-mono text-xs text-muted">
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1">
                Pass rate: {String(summary.passRate)}%
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1">
                {String(summary.passed)}/{String(summary.totalTasks)} passed
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1">
                Avg: {formatDuration(summary.avgDurationMs)}
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1">
                Tokens: {formatTokens(summary.totalTokens)}
              </span>
              {(summary.totalCostUsd ?? 0) > 0 && (
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1">
                  Cost: ${(summary.totalCostUsd ?? 0).toFixed(2)}
                </span>
              )}
              {(summary.averageTurns ?? 0) > 0 && (
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1">
                  Avg turns: {String(summary.averageTurns)}
                </span>
              )}
              {(summary.totalToolCalls ?? 0) > 0 && (
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1">
                  Tools: {String(summary.totalToolCalls)}
                </span>
              )}
            </div>
          </Reveal>
        </section>

        <section>
          <Reveal>
            <h2 className="type-h3 mb-6">Per-task results</h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                    <th className="px-4 py-3 type-label text-fg/60">Task</th>
                    <th className="px-4 py-3 type-label text-fg/60">Suite</th>
                    <th className="px-4 py-3 type-label text-fg/60">Status</th>
                    <th className="px-4 py-3 type-label text-fg/60">Duration</th>
                    <th className="px-4 py-3 type-label text-fg/60">Tokens</th>
                    <th className="px-4 py-3 type-label text-fg/60">Cost</th>
                    <th className="px-4 py-3 type-label text-fg/60">Turns</th>
                    <th className="px-4 py-3 type-label text-fg/60">Patch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {tasks.map((t) => (
                    <tr key={t.task.id} className="group hover:bg-[var(--color-surface)]">
                      <td className="px-4 py-3">
                        <Link
                          href={`/lab/harness-eval/${t.task.suite}/${t.task.id}/`}
                          className="font-medium text-fg underline-offset-2 hover:underline"
                        >
                          {t.task.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/lab/harness-eval/${t.task.suite}/`}
                          className="font-mono text-xs text-fg/50 hover:text-fg"
                        >
                          {t.task.suite}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 font-mono text-xs ${
                            t.passed
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : t.status === 'timeout'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {t.passed ? 'pass' : t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-fg/60">{formatDuration(t.durationMs)}</td>
                      <td className="px-4 py-3 font-mono text-fg/60">{formatTokens(t.tokens ?? 0)}</td>
                      <td className="px-4 py-3 font-mono text-fg/60">{t.costUsd !== null && t.costUsd !== undefined ? `$${t.costUsd.toFixed(3)}` : '—'}</td>
                      <td className="px-4 py-3 font-mono text-fg/60">{t.turns !== null && t.turns !== undefined ? String(t.turns) : '—'}</td>
                      <td className="px-4 py-3 font-mono text-fg/60">{t.hasPatch ? 'yes' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        {/* Failure detail */}
        {tasks.filter((t) => t.failure).length > 0 && (
          <Reveal delay={160}>
            <section className="mt-16">
              <h2 className="type-h3 mb-6">Failures</h2>
              <div className="space-y-3">
                {tasks.filter((t) => t.failure).map((t) => (
                  <div key={t.task.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          href={`/lab/harness-eval/${t.task.suite}/${t.task.id}/`}
                          className="font-medium text-fg underline-offset-2 hover:underline"
                        >
                          {t.task.title}
                        </Link>
                        <span className="ml-2 rounded-full bg-rose-500/10 px-2 py-0.5 font-mono text-xs text-rose-500">
                          {t.failure!.category}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-fg/60">{t.failure!.rootCause}</p>
                    {t.failure!.evidence.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {t.failure!.evidence.map((e, i) => (
                          <li key={i} className="font-mono text-xs text-fg/40">{e}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        <Reveal delay={200}>
          <div className="mt-10 flex justify-start">
            <Link
              href="/lab/harness-eval/models/"
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted transition-colors hover:text-fg"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              All models
            </Link>
          </div>
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
