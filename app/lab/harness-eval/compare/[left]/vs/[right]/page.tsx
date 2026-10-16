import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteNav } from '@/components/site/site-nav';
import { SiteFooter } from '@/components/site/site-footer';
import { Breadcrumb } from '@/components/site/breadcrumb';
import { JsonLd, SITE_URL, breadcrumbLd } from '@/components/seo/json-ld';
import { Reveal } from '@/components/motion/reveal';
import { ALL_SUMMARIES } from '@/lib/lab/harness-eval/results';
import { buildComparison, type ComparisonRun } from '@/lib/lab/harness-eval/compare';
import { formatModelLabel } from '@/lib/lab/harness-eval/labels';
import {
  harnessComparePath,
  harnessModelIdFromSlug,
  harnessModelIndexPath,
  harnessModelPath,
  harnessModelSlug,
  harnessTaskPath,
} from '@/lib/lab/harness-eval/nav';

/**
 * Two models, task by task.
 *
 * A ranked list tells you who scored higher; it cannot tell you whether that
 * was breadth or a lucky single task. This view pairs the two on the same
 * tasks, so the contested rows are the interesting ones and a task only one
 * model ran is shown as a gap rather than quietly dropped.
 */

/** Every ordered pair, deduplicated by the canonical path order. */
function pairs(): [string, string][] {
  const slugs = ALL_SUMMARIES.map((s) => harnessModelSlug(s.model.id));
  const out: [string, string][] = [];
  for (let i = 0; i < slugs.length; i += 1) {
    for (let j = i + 1; j < slugs.length; j += 1) {
      const [a, b] = slugs[i]! <= slugs[j]! ? [slugs[i]!, slugs[j]!] : [slugs[j]!, slugs[i]!];
      out.push([a, b]);
    }
  }
  return out;
}

export function generateStaticParams() {
  return pairs().map(([left, right]) => ({ left, right }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ left: string; right: string }>;
}): Promise<Metadata> {
  const { left, right } = await params;
  const leftId = harnessModelIdFromSlug(left);
  const rightId = harnessModelIdFromSlug(right);
  const url = harnessComparePath(leftId, rightId);
  const title = `${formatModelLabel(leftId)} vs ${formatModelLabel(rightId)} · Harness Eval`;
  return {
    title,
    description: `Task-by-task comparison of ${formatModelLabel(leftId)} and ${formatModelLabel(rightId)} across the harness eval suites: pass rate, tokens, cost, duration, and turns on the same tasks.`,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: `${title} · Ben Ebsworth`,
      description: `Task-by-task comparison across the harness eval suites.`,
      url,
      siteName: 'Ben Ebsworth',
      locale: 'en_AU',
    },
    twitter: { card: 'summary_large_image', title, creator: '@benebsworth', site: '@benebsworth' },
  };
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${String(Math.round(ms))}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(Math.round(s - m * 60))}s`;
}

function formatTokens(n: number | null): string {
  if (n === null) return '—';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

/** Outcome cell: the verdict, and the measurements behind it. */
function RunCell({ run, modelId }: { run: ComparisonRun | null; modelId: string }) {
  if (!run) {
    return (
      <td className="px-4 py-3 align-top text-muted">
        <span className="font-mono">not run</span>
      </td>
    );
  }
  const verdictClass = run.passed ? 'text-fg' : 'text-red-400';
  return (
    <td className="px-4 py-3 align-top">
      <span className={`font-mono ${verdictClass}`}>{run.passed ? 'pass' : 'fail'}</span>
      <span className="mt-1 block font-mono text-[14px] text-muted">
        {formatDuration(run.durationMs)} · {formatTokens(run.tokens)} tok
        {run.turns !== null && <> · {String(run.turns)} turns</>}
        {run.toolCalls !== null && <> · {String(run.toolCalls)} tools</>}
        {run.costUsd !== null && <> · ${run.costUsd.toFixed(2)}</>}
      </span>
      {run.hasPatch && (
        <span className="mt-1 block text-[14px] text-muted">
          {run.patchBytes !== null ? `${String(run.patchBytes)}B patch` : 'patch'}
        </span>
      )}
      <Link href={harnessModelPath(modelId)} className="sr-only">
        {formatModelLabel(modelId)} details
      </Link>
    </td>
  );
}

export default async function ComparePage({ params }: { params: Promise<{ left: string; right: string }> }) {
  const { left, right } = await params;
  const leftId = harnessModelIdFromSlug(left);
  const rightId = harnessModelIdFromSlug(right);
  const leftSummary = ALL_SUMMARIES.find((s) => s.model.id === leftId);
  const rightSummary = ALL_SUMMARIES.find((s) => s.model.id === rightId);
  const comparison = buildComparison(leftSummary, rightSummary);
  if (!comparison) notFound();

  const leftLabel = formatModelLabel(comparison.left.id);
  const rightLabel = formatModelLabel(comparison.right.id);
  const sharedRows = comparison.rows.filter((r) => r.left && r.right);
  const gapRows = comparison.rows.filter((r) => !r.left || !r.right);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Lab', url: `${SITE_URL}/lab/` },
            { name: 'Harness Eval', url: `${SITE_URL}/lab/harness-eval/` },
            { name: 'Compare', url: `${SITE_URL}/lab/harness-eval/compare/` },
          ]),
        ]}
      />
      <SiteNav />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-20 sm:px-8">
        <Breadcrumb
          className="mb-10"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Lab', href: '/lab/' },
            { label: 'Harness Eval', href: '/lab/harness-eval/' },
            { label: 'Compare' },
          ]}
        />

        <section className="pb-12">
          <Reveal>
            {/* Two model names make a long headline at display size, so this one
                is set a step below the section h1: the comparison is the point,
                not either model in isolation. */}
            <h1 className="text-[clamp(28px,4vw,44px)] font-semibold leading-[1.08] tracking-[-0.02em] text-fg max-w-[24ch] text-balance">
              <span className="block">{leftLabel}</span>
              <span className="mt-2 block text-muted">versus {rightLabel}</span>
            </h1>
          </Reveal>
          <Reveal delay={80}>
            <p className="mt-5 max-w-[62ch] text-[16px] leading-relaxed text-fg/85">
              {/* The count and its plural are built as one string: JSX would
                  otherwise leave a space between "task" and "s". */}
              {`${String(comparison.sharedTasks)} task${comparison.sharedTasks === 1 ? '' : 's'} both models ran, and ${String(comparison.contestedTasks)} of those they disagree on.`}{' '}
              Read the contested rows first: that is where a pass rate hides its whole story.
            </p>
          </Reveal>
          <Reveal delay={160}>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[16px]">
              <Link href={harnessModelPath(comparison.left.id)} className="text-fg underline-offset-4 hover:underline">
                {leftLabel} details
              </Link>
              <Link href={harnessModelPath(comparison.right.id)} className="text-fg underline-offset-4 hover:underline">
                {rightLabel} details
              </Link>
              <Link href={harnessModelIndexPath()} className="text-muted underline-offset-4 hover:underline">
                All models
              </Link>
            </div>
          </Reveal>
        </section>

        {/* Totals side by side */}
        <Reveal delay={200}>
          <section className="mb-14">
            <div className="grid gap-6 sm:grid-cols-2">
              {[comparison.left, comparison.right].map((side, i) => (
                <div key={side.id} className={i === 0 ? '' : 'sm:border-l sm:border-[var(--color-border)] sm:pl-6'}>
                  <p className="text-[16px] font-medium text-fg">{formatModelLabel(side.id)}</p>
                  <dl className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[16px]">
                      <dt className="text-muted">pass rate</dt>
                      <dd className="font-mono text-fg">
                        {String(side.totals.passed)}/{String(side.totals.tasks)}
                      </dd>
                    </div>
                    <div className="flex justify-between text-[16px]">
                      <dt className="text-muted">tokens</dt>
                      <dd className="font-mono text-fg">{formatTokens(side.totals.tokens)}</dd>
                    </div>
                    <div className="flex justify-between text-[16px]">
                      <dt className="text-muted">cost</dt>
                      <dd className="font-mono text-fg">
                        {side.totals.costUsd !== null ? `$${side.totals.costUsd.toFixed(2)}` : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between text-[16px]">
                      <dt className="text-muted">avg duration</dt>
                      <dd className="font-mono text-fg">{formatDuration(side.totals.avgDurationMs)}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
            {(comparison.leftOnlyTasks > 0 || comparison.rightOnlyTasks > 0) && (
              <p className="mt-6 max-w-[70ch] text-[16px] text-muted">
                {/* Counts and plurals as one string each, for the same JSX-spacing
                    reason as the hero sentence. */}
                {`Coverage differs: ${leftLabel} ran ${String(comparison.leftOnlyTasks)} task${comparison.leftOnlyTasks === 1 ? '' : 's'} ${rightLabel} never saw, and ${rightLabel} ran ${String(comparison.rightOnlyTasks)} task${comparison.rightOnlyTasks === 1 ? '' : 's'} ${leftLabel} never saw.`}{' '}
                A shared-task rate is not the same as an absolute one.
              </p>
            )}
          </section>
        </Reveal>

        {/* Shared tasks, contested first */}
        {sharedRows.length > 0 && (
          <Reveal delay={260}>
            <section className="mb-14">
              <h2 className="type-h3 mb-4">Same tasks, different answers</h2>
              <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                <table className="w-full min-w-[720px] text-left text-[16px]">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                      <th className="px-4 py-3 type-label text-fg/60">Task</th>
                      <th className="px-4 py-3 type-label text-fg/60">{leftLabel}</th>
                      <th className="px-4 py-3 type-label text-fg/60">{rightLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sharedRows.map((row) => (
                      <tr
                        key={row.key}
                        className={`border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface)] ${row.divergent ? '' : 'opacity-70'}`}
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={harnessTaskPath(row.suite, row.taskId)}
                            className="text-fg underline-offset-2 hover:underline"
                          >
                            {row.taskName}
                          </Link>
                          <span className="mt-0.5 block text-[14px] text-muted">{row.suite}</span>
                        </td>
                        <RunCell run={row.left} modelId={comparison.left.id} />
                        <RunCell run={row.right} modelId={comparison.right.id} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </Reveal>
        )}

        {/* Gaps: honest about uneven coverage */}
        {gapRows.length > 0 && (
          <Reveal delay={300}>
            <section className="mb-14">
              <h2 className="type-h3 mb-2">Only one model ran these</h2>
              <p className="mb-4 max-w-[70ch] text-[16px] text-muted">
                A gap is not a loss. It means the head-to-head is uneven there, so a shared-task pass rate is the
                only fair comparison on this page.
              </p>
              <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                {gapRows.map((row) => {
                  const ranLeft = Boolean(row.left);
                  const side = ranLeft ? comparison.left.id : comparison.right.id;
                  return (
                    <li key={row.key} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
                      <Link
                        href={harnessTaskPath(row.suite, row.taskId)}
                        className="text-[16px] text-fg underline-offset-2 hover:underline"
                      >
                        {row.taskName}
                      </Link>
                      <span className="font-mono text-[16px] text-muted">{row.suite}</span>
                      <span className="text-[16px] text-muted">
                        ran by {formatModelLabel(side)}
                        {row.left?.passed === false && <> (failed)</>}
                        {row.right?.passed === false && <> (failed)</>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </Reveal>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
