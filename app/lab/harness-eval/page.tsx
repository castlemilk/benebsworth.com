import type { Metadata } from 'next';
import Link from 'next/link';
import { Terminal } from 'lucide-react';
import { SiteNav } from '@/components/site/site-nav';
import { SiteFooter } from '@/components/site/site-footer';
import { Breadcrumb } from '@/components/site/breadcrumb';
import { JsonLd, SITE_URL, breadcrumbLd } from '@/components/seo/json-ld';
import { Reveal } from '@/components/motion/reveal';
import { ALL_SUMMARIES } from '@/lib/lab/harness-eval/results';
import { rankModels, aggregateFailures, overallStats } from '@/lib/lab/harness-eval/analytics';
import { HARNESS_SUITES, HARNESS_TASKS } from '@/lib/lab/harness-eval/registry';
import { loadIntroContent } from '@/lib/lab/harness-eval/content';

export const metadata: Metadata = {
  title: 'Harness Eval · Lab',
  description:
    'Per-model evaluation of LLM code-generation agents across the Omega harness benchmark suites — fast, deep, and hard tasks.',
  alternates: { canonical: '/lab/harness-eval/' },
  openGraph: {
    type: 'website',
    title: 'Harness Eval · Lab · Ben Ebsworth',
    description: 'Per-model evaluation of LLM code-generation agents across benchmark suites.',
    url: '/lab/harness-eval/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: { card: 'summary_large_image', title: 'Harness Eval · Lab', creator: '@benebsworth', site: '@benebsworth' },
};

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

function PassRateBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-[var(--color-border)]">
        <div
          className="h-2 rounded-full transition-all"
          style={{
            width: `${String(rate)}%`,
            backgroundColor: rate >= 80 ? '#22c55e' : rate >= 50 ? '#eab308' : '#ef4444',
          }}
        />
      </div>
      <span className="type-label text-sm text-fg/70">{String(rate)}%</span>
    </div>
  );
}

export default function HarnessEvalPage() {
  const rankings = rankModels(ALL_SUMMARIES);
  const failures = aggregateFailures(ALL_SUMMARIES);
  const stats = overallStats(ALL_SUMMARIES);
  const intro = loadIntroContent();

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Lab', url: `${SITE_URL}/lab/` },
            { name: 'Harness Eval', url: `${SITE_URL}/lab/harness-eval/` },
          ]),
        ]}
      />
      <SiteNav />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-20 sm:px-8">
        <Breadcrumb
          className="mb-10"
          items={[{ label: 'Home', href: '/' }, { label: 'Lab', href: '/lab/' }, { label: 'Harness Eval' }]}
        />

        {/* Hero */}
        <section className="pb-16">
          <Reveal>
            <p className="type-label text-muted">harness eval</p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-3 type-h1">Code-generation benchmarks</h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 max-w-prose type-body text-fg/70">
              Per-model evaluation of LLM coding agents across the Omega harness suites — fast smoke tests,
              deep debugging tasks, and real-world GitHub issues. Pass rate, token cost, failure analysis.
            </p>
          </Reveal>
        </section>

        {/* Stats strip */}
        <Reveal delay={200}>
          <section className="mb-16 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="type-label text-fg/50">Models</p>
              <p className="mt-1 type-h2">{String(stats.models)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="type-label text-fg/50">Total tasks</p>
              <p className="mt-1 type-h2">{String(stats.totalTasks)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="type-label text-fg/50">Overall pass rate</p>
              <p className="mt-1 type-h2">{String(stats.overallPassRate)}%</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="type-label text-fg/50">Total tokens</p>
              <p className="mt-1 type-h2">{formatTokens(stats.totalTokens)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="type-label text-fg/50">Total cost</p>
              <p className="mt-1 type-h2">{stats.totalCostUsd !== null ? `$${stats.totalCostUsd.toFixed(2)}` : '—'}</p>
            </div>
          </section>
        </Reveal>

        {/* Model rankings */}
        {rankings.length > 0 && (
          <Reveal delay={280}>
            <section className="mb-16">
              <h2 className="type-h3 mb-6">Model rankings</h2>
              <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                      <th className="px-4 py-3 type-label text-fg/60">#</th>
                      <th className="px-4 py-3 type-label text-fg/60">Model</th>
                      <th className="px-4 py-3 type-label text-fg/60">Pass rate</th>
                      <th className="px-4 py-3 type-label text-fg/60">Tasks</th>
                      <th className="px-4 py-3 type-label text-fg/60">Avg time</th>
                      <th className="px-4 py-3 type-label text-fg/60">Tokens</th>
                      <th className="px-4 py-3 type-label text-fg/60">Cost</th>
                      <th className="px-4 py-3 type-label text-fg/60">Turns</th>
                      <th className="px-4 py-3 type-label text-fg/60">Tools</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((r, i) => (
                      <tr key={r.model.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface)]">
                        <td className="px-4 py-3 font-mono text-fg/40">{String(i + 1)}</td>
                        <td className="px-4 py-3">
                          <Link href={`/lab/harness-eval/models/${encodeURIComponent(r.model.id)}/`} className="text-fg underline-offset-2 hover:underline">
                            {r.model.displayName}
                          </Link>
                        </td>
                        <td className="px-4 py-3"><PassRateBar rate={r.passRate} /></td>
                        <td className="px-4 py-3 text-fg/60">{String(r.totalTasks)}</td>
                        <td className="px-4 py-3 font-mono text-fg/60">{formatDuration(r.avgDurationMs)}</td>
                        <td className="px-4 py-3 font-mono text-fg/60">{formatTokens(r.totalTokens)}</td>
                        <td className="px-4 py-3 font-mono text-fg/60">{r.totalCostUsd !== null ? `$${r.totalCostUsd.toFixed(2)}` : '—'}</td>
                        <td className="px-4 py-3 font-mono text-fg/60">{r.averageTurns !== null ? String(r.averageTurns) : '—'}</td>
                        <td className="px-4 py-3 font-mono text-fg/60">{r.totalToolCalls !== null ? String(r.totalToolCalls) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rankings.length === 0 && (
                  <p className="px-4 py-8 text-center text-fg/40">No eval data yet. Run <code>omega bench eval</code> to generate reports.</p>
                )}
              </div>
            </section>
          </Reveal>
        )}

        {/* Tool breakdown — top N agents with structured tool call data */}
        {rankings.some((r) => r.totalToolCalls !== null && r.totalToolCalls > 0) && (
          <Reveal delay={300}>
            <section className="mb-16">
              <h2 className="type-h3 mb-6">Tool usage</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rankings
                  .filter((r) => r.totalToolCalls !== null && r.totalToolCalls > 0)
                  .map((r) => {
                    const tools = Object.entries(r.toolBreakdown).sort((a, b) => b[1] - a[1]);
                    const max = tools[0]?.[1] ?? 1;
                    return (
                      <div key={r.model.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                        <div className="mb-3 flex items-baseline justify-between">
                          <Link href={`/lab/harness-eval/models/${encodeURIComponent(r.model.id)}/`} className="type-label text-fg hover:underline">
                            {r.model.displayName}
                          </Link>
                          <span className="font-mono text-xs text-fg/40">{String(r.totalToolCalls)} calls</span>
                        </div>
                        <div className="space-y-1.5">
                          {tools.map(([name, count]) => (
                            <div key={name} className="flex items-center gap-2">
                              <span className="w-20 shrink-0 font-mono text-xs text-fg/60">{name}</span>
                              <div className="h-2 flex-1 rounded-full bg-[var(--color-border)]">
                                <div className="h-2 rounded-full bg-[var(--color-fg)]" style={{ width: `${String(Math.round((count / max) * 100))}%` }} />
                              </div>
                              <span className="w-8 text-right font-mono text-xs text-fg/60">{String(count)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          </Reveal>
        )}

        {/* Suites */}
        <Reveal delay={320}>
          <section className="mb-16">
            <h2 className="type-h3 mb-6">Suites</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {HARNESS_SUITES.map((suite) => (
                <Link
                  key={suite.slug}
                  href={`/lab/harness-eval/${suite.slug}/`}
                  className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-muted)]"
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-fg/40" />
                    <span className="type-label text-fg">{suite.label}</span>
                  </div>
                  <p className="mt-2 text-sm text-fg/60">{suite.description || `${String(suite.taskCount)} tasks`}</p>
                  <p className="mt-3 font-mono text-xs text-fg/40">{String(suite.taskCount)} tasks</p>
                </Link>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Models */}
        <Reveal delay={360}>
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="type-h3">Models</h2>
              <Link href="/lab/harness-eval/models/" className="type-label text-sm text-fg/50 hover:text-fg">View all →</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {ALL_SUMMARIES.slice(0, 6).map((s) => (
                <Link
                  key={s.model.id}
                  href={`/lab/harness-eval/models/${encodeURIComponent(s.model.id)}/`}
                  className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-muted)]"
                >
                  <div>
                    <p className="type-label text-fg">{s.model.displayName}</p>
                    <p className="text-xs text-fg/50">{s.model.provider}</p>
                  </div>
                  <div className="text-right">
                    <p className="type-label text-fg">{String(s.passRate)}%</p>
                    <p className="text-xs text-fg/50">{String(s.passed)}/{String(s.totalTasks)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Failure breakdown */}
        {failures.length > 0 && (
          <Reveal delay={400}>
            <section className="mb-16">
              <h2 className="type-h3 mb-6">Failure taxonomy</h2>
              <div className="space-y-2">
                {failures.map((f) => (
                  <div key={f.category} className="flex items-start gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                    <span className="shrink-0 rounded bg-red-500/10 px-2 py-0.5 font-mono text-xs text-red-500">{f.category}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-fg/70">{String(f.count)} failure{f.count !== 1 ? 's' : ''}</p>
                      {f.examples.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {f.examples.map((ex, i) => (
                            <li key={i} className="truncate text-xs text-fg/40">{ex}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* Methodology */}
        {intro && (
          <Reveal delay={440}>
            <section className="prose-custom mb-16">
              <h2 className="type-h3 mb-4">Methodology</h2>
              <div className="text-sm text-fg/70 whitespace-pre-wrap">{intro}</div>
            </section>
          </Reveal>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
