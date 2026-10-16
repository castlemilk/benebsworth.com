import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/site/site-nav';
import { SiteFooter } from '@/components/site/site-footer';
import { Breadcrumb } from '@/components/site/breadcrumb';
import { JsonLd, SITE_URL, breadcrumbLd } from '@/components/seo/json-ld';
import { Reveal } from '@/components/motion/reveal';
import { ALL_SUMMARIES } from '@/lib/lab/harness-eval/results';
import { rankModels, aggregateFailures, overallStats } from '@/lib/lab/harness-eval/analytics';
import { formatModelLabel, suiteCoverage } from '@/lib/lab/harness-eval/labels';
import { HARNESS_SUITES, HARNESS_TASKS } from '@/lib/lab/harness-eval/registry';
import { loadIntroContent } from '@/lib/lab/harness-eval/content';
import { harnessModelPath } from '@/lib/lab/harness-eval/nav';

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
  // Suite names come from the task corpus rather than the suite registry so the
  // matrix columns are exactly the suites that have measured results, and the
  // tool columns are exactly the tools any agent actually called.
  const suiteNames = [...new Set(ALL_SUMMARIES.flatMap((s) => (s.tasks ?? []).map((t) => t.task.suite)))].sort();
  const coverageRows = suiteCoverage(ALL_SUMMARIES, suiteNames);
  const toolNames = [
    ...new Set(rankings.flatMap((r) => Object.keys(r.toolBreakdown))),
  ].sort();

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

        {/* Hero. The headline size is clamped here rather than edited on
            `type-h1`: the global scale is shared by every page, and six words
            at 72px needs three lines on a 390px screen, which reads as a
            paragraph wearing a headline's clothes. Body copy is set at the
            site's 16px step rather than the 14px the tables were using. */}
        <section className="pb-14">
          <Reveal>
            <h1 className="type-h1 text-balance max-[420px]:max-w-none max-[420px]:text-[36px] max-w-[22ch]">
              Which coding agent fixes the repo?
            </h1>
          </Reveal>
          <Reveal delay={80}>
            <p className="mt-5 max-w-[62ch] text-[16px] leading-relaxed text-fg/85">
              {String(stats.models)} models, {String(stats.totalTasks)} tasks, one pass rate each. Every run is an
              agent working a real checkout, from smoke tests through to live GitHub issues, and every number on
              this page is a measured run rather than an estimate.
            </p>
          </Reveal>
          <Reveal delay={160}>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2">
              <a
                href="#rankings"
                className="rounded-lg bg-[var(--color-fg)] px-4 py-2 text-[16px] font-medium text-[var(--color-bg)] transition-opacity hover:opacity-85"
              >
                See the rankings
              </a>
              <a href="#method" className="text-[16px] text-fg underline-offset-4 hover:underline">
                How it is measured
              </a>
            </div>
          </Reveal>
        </section>

        {/* Stat band — one row of figures, no cards: the numbers are the content,
            and five identical boxes read as a template rather than as data.
            Labels sit inline with their figure rather than stacked above it, so
            each pair reads as one line of data instead of a kicker over a
            number. */}
        <Reveal delay={200}>
          <section className="mb-16 border-y border-[var(--color-border)] py-6">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: 'models', value: String(stats.models) },
                { label: 'tasks run', value: String(stats.totalTasks) },
                { label: 'pass rate', value: `${String(stats.overallPassRate)}%` },
                { label: 'tokens', value: formatTokens(stats.totalTokens) },
                {
                  label: 'measured cost',
                  value: stats.totalCostUsd !== null ? `$${stats.totalCostUsd.toFixed(2)}` : '—',
                },
              ].map((stat) => (
                <div key={stat.label}>
                  <dd className="text-[26px] font-semibold leading-none text-fg">{stat.value}</dd>
                  <dt className="mt-1.5 text-[16px] text-muted">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </section>
        </Reveal>

        {/* Model rankings */}
        {rankings.length > 0 && (
          <Reveal delay={280}>
            <section id="rankings" className="mb-16 scroll-mt-24">
              <h2 className="type-h3 mb-2">Model rankings</h2>
              <p className="mb-5 max-w-[70ch] text-[16px] text-muted">
                Ranked by pass rate. A model with one task can sit at the top on a single solved run, and the task
                count is the column that says so.
              </p>
              <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                <table className="w-full min-w-[720px] text-left text-[16px]">
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
                          <Link
                            href={harnessModelPath(r.model.id)}
                            title={r.model.id}
                            className="text-fg underline-offset-2 hover:underline"
                          >
                            {formatModelLabel(r.model.id)}
                          </Link>
                        </td>
                        <td className="px-4 py-3"><PassRateBar rate={r.passRate} /></td>
                        <td className="px-4 py-3 font-mono text-fg/60">{String(r.totalTasks)}</td>
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

        {/* Coverage — what the pass rate cannot say: which model was ever run on
            which suite. Distinct from the rankings above, which collapse suites
            into one number. */}
        {coverageRows.length > 0 && (
          <Reveal delay={300}>
            <section className="mb-16">
              <h2 className="type-h3 mb-2">Coverage by suite</h2>
              <p className="mb-5 max-w-[70ch] text-[16px] text-muted">
                The suites are not interchangeable: a model that never ran a suite has no score for it, which is
                different from scoring zero. Blank means not run.
              </p>
              <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                <table className="w-full min-w-[560px] text-left text-[16px]">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                      <th className="px-4 py-3 type-label text-fg/60">Model</th>
                      {suiteNames.map((suite) => (
                        <th key={suite} className="px-4 py-3 type-label text-fg/60">{suite}</th>
                      ))}
                      <th className="px-4 py-3 type-label text-fg/60">Tasks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverageRows.map((row) => (
                      <tr key={row.model.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface)]">
                        <td className="px-4 py-3">
                          <Link
                            href={harnessModelPath(row.model.id)}
                            title={row.model.id}
                            className="text-fg underline-offset-2 hover:underline"
                          >
                            {formatModelLabel(row.model.id)}
                          </Link>
                        </td>
                        {row.cells.map((cell) => (
                          <td key={cell.suite} className="px-4 py-3 font-mono">
                            {cell.passRate === null ? (
                              <span className="text-fg/25">—</span>
                            ) : (
                              <span
                                className={cell.passRate >= 80 ? 'text-fg' : cell.passRate >= 50 ? 'text-fg/70' : 'text-fg/50'}
                                title={`${String(cell.passed)}/${String(cell.totalTasks)} passed`}
                              >
                                {String(cell.passRate)}%
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3 font-mono text-fg/60">{String(row.tasksRun)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </Reveal>
        )}

        {/* Tool usage — one row per agent, no card chrome: the shape is a
            comparison, so it reads as a table of bars. */}
        {rankings.some((r) => r.totalToolCalls !== null && r.totalToolCalls > 0) && (
          <Reveal delay={320}>
            <section className="mb-16">
              <h2 className="type-h3 mb-2">What the agents reach for</h2>
              <p className="mb-5 max-w-[70ch] text-[16px] text-muted">
                Tool calls per run, by agent. Reads and edits dominate every run here, which is the shape of real
                repair work rather than a single clever edit.
              </p>
              <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                <table className="w-full min-w-[560px] text-left text-[16px]">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                      <th className="px-4 py-3 type-label text-fg/60">Agent</th>
                      {toolNames.map((name) => (
                        <th key={name} className="px-4 py-3 type-label text-fg/60">{name}</th>
                      ))}
                      <th className="px-4 py-3 type-label text-fg/60">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings
                      .filter((r) => r.totalToolCalls !== null && r.totalToolCalls > 0)
                      .map((r) => {
                        const max = Math.max(...Object.values(r.toolBreakdown), 1);
                        return (
                          <tr key={r.model.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface)]">
                            <td className="px-4 py-3">
                              <Link
                                href={harnessModelPath(r.model.id)}
                                title={r.model.id}
                                className="text-fg underline-offset-2 hover:underline"
                              >
                                {formatModelLabel(r.model.id)}
                              </Link>
                            </td>
                            {toolNames.map((name) => {
                              const count = r.toolBreakdown[name] ?? 0;
                              return (
                                <td key={name} className="px-4 py-2">
                                  <span className="flex items-center gap-2">
                                    <span className="h-2 w-full max-w-[90px] rounded-full bg-[var(--color-border)]">
                                      <span
                                        className="block h-2 rounded-full bg-[var(--color-fg)]"
                                        style={{ width: `${String(Math.round((count / max) * 100))}%` }}
                                      />
                                    </span>
                                    <span className="font-mono text-fg/60">{String(count)}</span>
                                  </span>
                                </td>
                              );
                            })}
                            <td className="px-4 py-3 font-mono text-fg/60">{String(r.totalToolCalls ?? 0)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>
          </Reveal>
        )}

        {/* Suites */}
        <Reveal delay={360}>
          <section className="mb-16">
            <h2 className="type-h3 mb-2">The suites</h2>
            <p className="mb-5 max-w-[70ch] text-[16px] text-muted">
              Difficulty is a choice, not a constant: each suite is a different kind of work, and a score only
              means something alongside which suite it came from.
            </p>
            <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
              {HARNESS_SUITES.map((suite) => {
                const suiteTasks = ALL_SUMMARIES.flatMap((s) =>
                  (s.tasks ?? []).filter((t) => t.task.suite === suite.slug)
                );
                const solved = suiteTasks.filter((t) => t.passed).length;
                const rate = suiteTasks.length > 0 ? Math.round((solved / suiteTasks.length) * 100) : null;
                return (
                  <li key={suite.slug}>
                    <Link
                      href={`/lab/harness-eval/${suite.slug}/`}
                      className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4"
                    >
                      <span className="text-[16px] font-medium text-fg group-hover:underline">
                        {suite.label}
                      </span>
                      <span className="min-w-0 flex-1 text-[16px] text-muted">
                        {suite.description || `${String(suite.taskCount)} tasks`}
                      </span>
                      <span className="font-mono text-[16px] text-fg/60">
                        {String(suite.taskCount)} tasks
                        {rate !== null && <span className="text-muted"> · {String(rate)}% solved</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </Reveal>

        {/* Failure breakdown */}
        {failures.length > 0 && (
          <Reveal delay={380}>
            <section className="mb-16">
              <h2 className="type-h3 mb-2">How the failures break down</h2>
              <p className="mb-5 max-w-[70ch] text-[16px] text-muted">
                A failed run is a category, not an absence: the taxonomy is what turns a pass rate into something
                you can act on.
              </p>
              <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                {failures.map((f) => (
                  <li key={f.category} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3.5">
                    <span className="font-mono text-[16px] text-red-400">{f.category}</span>
                    <span className="text-[16px] text-fg">
                      {String(f.count)} failure{f.count !== 1 ? 's' : ''}
                    </span>
                    {f.examples.length > 0 && (
                      <span className="min-w-0 flex-1 truncate text-[16px] text-muted" title={f.examples.join(', ')}>
                        {f.examples.slice(0, 2).join(' · ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        )}

        {/* Methodology */}
        {intro && (
          <Reveal delay={400}>
            <section id="method" className="prose-custom mb-16 scroll-mt-24">
              <h2 className="type-h3 mb-4">Methodology</h2>
              <div className="max-w-[70ch] whitespace-pre-wrap text-[16px] leading-relaxed text-fg">{intro}</div>
            </section>
          </Reveal>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
