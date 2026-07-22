import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/site/site-nav';
import { SiteFooter } from '@/components/site/site-footer';
import { Breadcrumb } from '@/components/site/breadcrumb';
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd } from '@/components/seo/json-ld';
import { Reveal } from '@/components/motion/reveal';
import { suiteForSlug, tasksForSuite, HARNESS_SUITES } from '@/lib/lab/harness-eval/registry';
import { ALL_SUMMARIES } from '@/lib/lab/harness-eval/results';
import { loadSuiteContent } from '@/lib/lab/harness-eval/content';
import { Terminal, ArrowRight } from 'lucide-react';

export function generateStaticParams() {
  return HARNESS_SUITES.map((s) => ({ suite: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ suite: string }>;
}): Promise<Metadata> {
  const { suite } = await params;
  const s = suiteForSlug(suite);
  const url = `/lab/harness-eval/${suite}/`;
  return {
    title: s ? `${s.label} · Harness Eval` : 'Harness Eval',
    description: s?.description || `Benchmark suite: ${suite}`,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title: s ? `${s.label} · Harness Eval · Ben Ebsworth` : 'Harness Eval',
      description: s?.description || `Benchmark suite: ${suite}`,
      url,
      siteName: 'Ben Ebsworth',
      locale: 'en_AU',
    },
    twitter: { card: 'summary_large_image', title: s?.label, creator: '@benebsworth', site: '@benebsworth' },
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${String(Math.round(ms))}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s - m * 60)}s`;
}

export default async function SuiteDetailPage({
  params,
}: {
  params: Promise<{ suite: string }>;
}) {
  const { suite } = await params;
  const s = suiteForSlug(suite);
  if (!s) notFound();

  const tasks = tasksForSuite(suite);
  const body = loadSuiteContent(suite);

  // Build per-task aggregate stats across all models
  const taskStats = tasks.map((task) => {
    let passed = 0;
    let total = 0;
    let totalDurationMs = 0;
    for (const summary of ALL_SUMMARIES) {
      const result = summary.tasks.find((t) => t.task.id === task.id);
      if (result) {
        total++;
        if (result.passed) passed++;
        totalDurationMs += result.durationMs;
      }
    }
    return {
      task,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      avgDurationMs: total > 0 ? Math.round(totalDurationMs / total) : 0,
      modelsRun: total,
    };
  });

  const breadcrumb = breadcrumbLd([
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Lab', url: `${SITE_URL}/lab/` },
    { name: 'Harness Eval', url: `${SITE_URL}/lab/harness-eval/` },
    { name: s.label, url: `${SITE_URL}/lab/harness-eval/${suite}/` },
  ]);

  const collection = collectionPageLd({
    name: `${s.label} · Harness Eval · Ben Ebsworth`,
    description: s.description,
    url: `${SITE_URL}/lab/harness-eval/${suite}/`,
    items: tasks.map((t) => ({
      name: t.title,
      url: `${SITE_URL}/lab/harness-eval/${suite}/${t.id}/`,
    })),
  });

  return (
    <>
      <JsonLd data={[breadcrumb, collection]} />
      <SiteNav />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-20 sm:px-8">
        <Breadcrumb
          className="mb-10"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Lab', href: '/lab/' },
            { label: 'Harness Eval', href: '/lab/harness-eval/' },
            { label: s.label },
          ]}
        />

        <section className="pb-10">
          <Reveal>
            <div className="flex items-center gap-3">
              <Terminal className="h-5 w-5 text-fg/40" />
              <span className="type-label text-fg/60">benchmark suite</span>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-3 type-h1">{s.label}</h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 max-w-prose type-body text-fg/70">
              {s.description || `${String(s.taskCount)} tasks evaluated across all models.`}
            </p>
          </Reveal>
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
            <h2 className="type-h3 mb-6">Tasks</h2>
          </Reveal>

          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  <th className="px-4 py-3 type-label text-fg/60">Task</th>
                  <th className="px-4 py-3 type-label text-fg/60">Complexity</th>
                  <th className="px-4 py-3 type-label text-fg/60">Pass rate</th>
                  <th className="px-4 py-3 type-label text-fg/60">Avg duration</th>
                  <th className="px-4 py-3 type-label text-fg/60">Models</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {taskStats.map((ts) => (
                  <tr key={ts.task.id} className="group hover:bg-[var(--color-surface)]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/lab/harness-eval/${suite}/${ts.task.id}/`}
                        className="font-medium text-fg underline-offset-2 hover:underline"
                      >
                        {ts.task.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-0.5 font-mono text-xs text-fg/60">
                        {ts.task.complexity || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-[var(--color-border)]">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${String(ts.passRate)}%`,
                              backgroundColor: ts.passRate >= 80 ? '#22c55e' : ts.passRate >= 50 ? '#eab308' : '#ef4444',
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs text-fg/70">{String(ts.passRate)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-fg/60">{formatDuration(ts.avgDurationMs)}</td>
                    <td className="px-4 py-3 font-mono text-fg/60">{String(ts.modelsRun)}</td>
                  </tr>
                ))}
                {taskStats.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-fg/40">No tasks in this suite.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
