import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/site/site-nav';
import { SiteFooter } from '@/components/site/site-footer';
import { Breadcrumb } from '@/components/site/breadcrumb';
import { JsonLd, SITE_URL, breadcrumbLd } from '@/components/seo/json-ld';
import { Reveal } from '@/components/motion/reveal';
import { HARNESS_TASKS, suiteForSlug } from '@/lib/lab/harness-eval/registry';
import { resultsForTask } from '@/lib/lab/harness-eval/results';
import { loadTaskContent } from '@/lib/lab/harness-eval/content';
import { ArrowRight, Terminal } from 'lucide-react';

export function generateStaticParams() {
  return HARNESS_TASKS.map((t) => ({ suite: t.suite, task: t.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ suite: string; task: string }>;
}): Promise<Metadata> {
  const { suite, task: taskId } = await params;
  const task = HARNESS_TASKS.find((t) => t.id === taskId && t.suite === suite);
  const url = `/lab/harness-eval/${suite}/${taskId}/`;
  return {
    title: task ? `${task.title} · Harness Eval` : 'Harness Eval',
    description: task?.description || task?.title || 'Harness eval task detail',
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: task ? `${task.title} · Harness Eval · Ben Ebsworth` : 'Harness Eval',
      description: task?.description || '',
      url,
      siteName: 'Ben Ebsworth',
      locale: 'en_AU',
    },
    twitter: { card: 'summary_large_image', title: task?.title, creator: '@benebsworth', site: '@benebsworth' },
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

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ suite: string; task: string }>;
}) {
  const { suite, task: taskId } = await params;
  const task = HARNESS_TASKS.find((t) => t.id === taskId && t.suite === suite);
  if (!task) notFound();

  const suiteInfo = suiteForSlug(suite);
  const results = resultsForTask(taskId);
  const body = loadTaskContent(taskId);

  const breadcrumb = breadcrumbLd([
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Lab', url: `${SITE_URL}/lab/` },
    { name: 'Harness Eval', url: `${SITE_URL}/lab/harness-eval/` },
    { name: suiteInfo?.label || suite, url: `${SITE_URL}/lab/harness-eval/${suite}/` },
    { name: task.title, url: `${SITE_URL}/lab/harness-eval/${suite}/${taskId}/` },
  ]);

  const sorted = [...results].sort((a, b) => {
    if (a.result.passed !== b.result.passed) return a.result.passed ? -1 : 1;
    return a.result.durationMs - b.result.durationMs;
  });

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
            { label: suiteInfo?.label || suite, href: `/lab/harness-eval/${suite}/` },
            { label: task.title },
          ]}
        />

        <section className="pb-10">
          <Reveal>
            <div className="flex items-center gap-3">
              <Terminal className="h-5 w-5 text-fg/40" />
              <span className="type-label text-fg/60">task</span>
              {task.complexity && (
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-0.5 font-mono text-xs text-fg/50">
                  {task.complexity}
                </span>
              )}
            </div>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-3 type-h1">{task.title}</h1>
          </Reveal>
          {task.description && (
            <Reveal delay={160}>
              <p className="mt-4 max-w-prose type-body text-fg/70">{task.description}</p>
            </Reveal>
          )}
        </section>

        {body && (
          <Reveal delay={200}>
            <article className="mx-auto mb-16 max-w-3xl text-sm text-fg/70 whitespace-pre-wrap">
              {body}
            </article>
          </Reveal>
        )}

        <section>
          <Reveal>
            <h2 className="type-h3 mb-6">Model results</h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                    <th className="px-4 py-3 type-label text-fg/60">#</th>
                    <th className="px-4 py-3 type-label text-fg/60">Model</th>
                    <th className="px-4 py-3 type-label text-fg/60">Status</th>
                    <th className="px-4 py-3 type-label text-fg/60">Duration</th>
                    <th className="px-4 py-3 type-label text-fg/60">Tokens</th>
                    <th className="px-4 py-3 type-label text-fg/60">Patch</th>
                    <th className="px-4 py-3 type-label text-fg/60">Failure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {sorted.map((r, i) => (
                    <tr key={r.modelId} className="group hover:bg-[var(--color-surface)]">
                      <td className="px-4 py-3 font-mono text-fg/40">{String(i + 1)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/lab/harness-eval/models/${encodeURIComponent(r.modelId)}/`}
                          className="font-medium text-fg underline-offset-2 hover:underline"
                        >
                          {r.modelId.split('/').pop()}
                        </Link>
                        <span className="ml-2 font-mono text-xs text-fg/40">{r.modelId.split('/')[0]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 font-mono text-xs ${
                            r.result.passed
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : r.result.status === 'timeout'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {r.result.passed ? 'pass' : r.result.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-fg/60">{formatDuration(r.result.durationMs)}</td>
                      <td className="px-4 py-3 font-mono text-fg/60">{formatTokens(r.result.tokens ?? 0)}</td>
                      <td className="px-4 py-3 font-mono text-fg/60">{r.result.hasPatch ? 'yes' : '-'}</td>
                      <td className="px-4 py-3">
                        {r.result.failure ? (
                          <span className="rounded-full bg-rose-500/10 px-2 py-0.5 font-mono text-xs text-rose-500">
                            {r.result.failure.category}
                          </span>
                        ) : (
                          <span className="text-fg/30">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-fg/40">No results yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        {/* Failure detail for models that failed */}
        {sorted.filter((r) => r.result.failure).length > 0 && (
          <Reveal delay={160}>
            <section className="mt-16">
              <h2 className="type-h3 mb-6">Failure details</h2>
              <div className="space-y-3">
                {sorted.filter((r) => r.result.failure).map((r) => (
                  <div key={r.modelId} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/lab/harness-eval/models/${encodeURIComponent(r.modelId)}/`}
                        className="font-medium text-fg underline-offset-2 hover:underline"
                      >
                        {r.modelId.split('/').pop()}
                      </Link>
                      <span className="rounded-full bg-rose-500/10 px-2 py-0.5 font-mono text-xs text-rose-500">
                        {r.result.failure!.category}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-fg/60">{r.result.failure!.rootCause}</p>
                    {r.result.failure!.evidence.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {r.result.failure!.evidence.map((e, i) => (
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
              href={`/lab/harness-eval/${suite}/`}
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted transition-colors hover:text-fg"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              {suiteInfo?.label || suite}
            </Link>
          </div>
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
