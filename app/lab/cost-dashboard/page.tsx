import type { Metadata } from 'next';
import Link from 'next/link';
import { DollarSign, Activity, Cpu, AlertTriangle, Zap, ChevronRight } from 'lucide-react';
import { SiteNav } from '@/components/site/site-nav';
import { SiteFooter } from '@/components/site/site-footer';
import { Breadcrumb } from '@/components/site/breadcrumb';
import { JsonLd, SITE_URL, breadcrumbLd } from '@/components/seo/json-ld';
import { Reveal } from '@/components/motion/reveal';
import { ALL_SUMMARIES } from '@/lib/lab/harness-eval/results';
import {
  buildCostDashboard,
  formatCost,
  formatDuration,
  formatTokens,
  type PerModelRow,
  type PerSuiteRow,
  type PerComplexityRow,
  type ExpensiveTask,
  type BudgetAlert,
} from '@/lib/lab/cost-dashboard/analytics';

export const metadata: Metadata = {
  title: 'Cost & Model Dashboard · Lab',
  description:
    'Per-model token usage, cost, and duration across the Omega harness benchmark suites — with budget alerts for expensive runs.',
  alternates: { canonical: '/lab/cost-dashboard/' },
  openGraph: {
    type: 'website',
    title: 'Cost & Model Dashboard · Lab · Ben Ebsworth',
    description: 'Per-model token, cost, and duration across benchmark suites with budget alerts.',
    url: `${SITE_URL}/lab/cost-dashboard/`,
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cost & Model Dashboard · Lab',
    creator: '@benebsworth',
    site: '@benebsworth',
  },
};

export default function CostDashboardPage() {
  const data = buildCostDashboard(ALL_SUMMARIES);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Lab', url: `${SITE_URL}/lab/` },
            { name: 'Cost Dashboard', url: `${SITE_URL}/lab/cost-dashboard/` },
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
            { label: 'Cost Dashboard' },
          ]}
        />

        {/* Hero */}
        <section className="pb-12">
          <Reveal>
            <p className="type-label text-muted">cost & model</p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-3 type-h1">Cost & model dashboard</h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 max-w-prose type-body text-fg/70">
              Where tokens and dollars go across every model and suite in the harness. Cost is the
              primary efficiency signal; tokens are the budget. Budget alerts flag any model running
              over the per-task or per-run thresholds.
            </p>
          </Reveal>
        </section>

        {/* Top stats */}
        <Reveal delay={200}>
          <section className="mb-16 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <StatTile
              icon={<DollarSign className="h-4 w-4" aria-hidden />}
              label="Total cost"
              value={data.stats.totalCostUsd > 0 ? formatCost(data.stats.totalCostUsd) : '—'}
              hint={data.stats.modelsWithoutCostData > 0 ? `(${data.stats.modelsWithoutCostData} models have no cost data)` : undefined}
            />
            <StatTile
              icon={<Zap className="h-4 w-4" aria-hidden />}
              label="Total tokens"
              value={formatTokens(data.stats.totalTokens)}
            />
            <StatTile
              icon={<Activity className="h-4 w-4" aria-hidden />}
              label="Tasks run"
              value={String(data.stats.totalTasks)}
            />
            <StatTile
              icon={<Cpu className="h-4 w-4" aria-hidden />}
              label="Models"
              value={String(data.stats.totalModels)}
            />
            <StatTile
              icon={<DollarSign className="h-4 w-4" aria-hidden />}
              label="Cost / solved"
              value={data.stats.costPerSolvedTask > 0 ? formatCost(data.stats.costPerSolvedTask) : '—'}
            />
          </section>
        </Reveal>

        {/* Budget alerts */}
        {data.alerts.length > 0 && (
          <Reveal delay={240}>
            <section className="mb-16">
              <h2 className="type-h3 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
                Budget alerts
              </h2>
              <div className="space-y-2">
                {data.alerts.map((alert, i) => (
                  <AlertRow key={`${alert.modelId}-${i}`} alert={alert} />
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* Per-model table */}
        <Reveal delay={280}>
          <section className="mb-16">
            <h2 className="type-h3 mb-4">Per-model breakdown</h2>
            <PerModelTable rows={data.perModel} />
          </section>
        </Reveal>

        {/* Per-suite + per-complexity split */}
        <Reveal delay={320}>
          <section className="mb-16 grid gap-6 lg:grid-cols-2">
            <PerSuiteTable rows={data.perSuite} />
            <PerComplexityTable rows={data.perComplexity} />
          </section>
        </Reveal>

        {/* Most expensive tasks */}
        {data.expensiveTasks.length > 0 && (
          <Reveal delay={360}>
            <section className="mb-16">
              <h2 className="type-h3 mb-4">Most expensive task-runs</h2>
              <ExpensiveTasksTable rows={data.expensiveTasks} />
            </section>
          </Reveal>
        )}

        {/* Methodology note */}
        <Reveal delay={400}>
          <section className="mb-16 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm text-fg/70">
            <p className="font-medium text-fg">Methodology</p>
            <p className="mt-2">
              Cost and token data comes from the model provider responses (where the API exposes
              usage). External CLIs like agy (PTY-based, no metrics parser) and providers that don't
              return cost in the chat response (e.g. z.ai GLM) show as{' '}
              <span className="font-mono">—</span>. Pass-rate is computed from the harness server's
              own evaluation, not the model self-report.
            </p>
            <p className="mt-2">
              Budget thresholds: per-task cost &gt; $0.50 triggers a warn, &gt; $2.00 an alert. Total
              run cost &gt; $5.00 also flags as alert.
            </p>
          </section>
        </Reveal>

        {/* Link to harness-eval */}
        <Reveal delay={440}>
          <div className="flex justify-start">
            <Link
              href="/lab/harness-eval/"
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted transition-colors hover:text-fg"
            >
              See per-model code-generation benchmarks
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center gap-1.5 type-label text-fg/50">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 type-h2">{value}</p>
      {hint && <p className="mt-0.5 font-mono text-[0.65rem] text-fg/40">{hint}</p>}
    </div>
  );
}

function AlertRow({ alert }: { alert: BudgetAlert }) {
  const isAlert = alert.severity === 'alert';
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${
        isAlert
          ? 'border-rose-500/30 bg-rose-500/5'
          : 'border-amber-500/30 bg-amber-500/5'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`rounded px-2 py-0.5 font-mono text-xs ${
            isAlert
              ? 'bg-rose-500/10 text-rose-500'
              : 'bg-amber-500/10 text-amber-600'
          }`}
        >
          {alert.severity}
        </span>
        <Link
          href={`/lab/harness-eval/models/${encodeURIComponent(alert.modelId)}/`}
          className="font-medium text-fg underline-offset-2 hover:underline"
        >
          {alert.displayName}
        </Link>
        <span className="text-sm text-fg/60">{alert.reason}</span>
      </div>
      <span className="font-mono text-sm text-fg/70">
        ${alert.value.toFixed(2)} &gt; ${alert.threshold.toFixed(2)}
      </span>
    </div>
  );
}

function PerModelTable({ rows }: { rows: PerModelRow[] }) {
  if (rows.length === 0) {
    return <p className="text-fg/40">No model data yet.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <Th>Model</Th>
            <Th align="right">Tasks</Th>
            <Th align="right">Pass rate</Th>
            <Th align="right">Total cost</Th>
            <Th align="right">Total tokens</Th>
            <Th align="right">Cost / solved</Th>
            <Th align="right">Avg time</Th>
            <Th align="right">Top tools</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {rows.map((r) => {
            const topTools = Object.entries(r.toolBreakdown)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([name, n]) => `${name}:${n}`)
              .join(' ');
            return (
              <tr key={r.modelId} className="hover:bg-[var(--color-surface)]">
                <Td>
                  <Link
                    href={`/lab/harness-eval/models/${encodeURIComponent(r.modelId)}/`}
                    className="font-medium text-fg underline-offset-2 hover:underline"
                  >
                    {r.displayName}
                  </Link>
                  <span className="ml-2 font-mono text-xs text-fg/40">{r.provider}</span>
                </Td>
                <Td num>{r.tasks}</Td>
                <Td num>
                  <PassRateCell passed={r.passed} total={r.tasks} />
                </Td>
                <Td num>{r.hasCostData ? formatCost(r.totalCostUsd) : <span className="text-fg/30">—</span>}</Td>
                <Td num>
                  {r.totalTokens > 0 ? formatTokens(r.totalTokens) : <span className="text-fg/30">—</span>}
                </Td>
                <Td num>
                  {r.costPerSolvedTask !== null ? (
                    formatCost(r.costPerSolvedTask)
                  ) : (
                    <span className="text-fg/30">—</span>
                  )}
                </Td>
                <Td num>{formatDuration(r.avgDurationMs)}</Td>
                <Td mono small>
                  {topTools || <span className="text-fg/30">—</span>}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PerSuiteTable({ rows }: { rows: PerSuiteRow[] }) {
  if (rows.length === 0) {
    return (
      <div>
        <h3 className="type-h3 mb-2">By suite</h3>
        <p className="text-fg/40">No suite data.</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="type-h3 mb-4">By suite</h3>
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <Th>Suite</Th>
              <Th align="right">Models</Th>
              <Th align="right">Runs</Th>
              <Th align="right">Passed</Th>
              <Th align="right">Total cost</Th>
              <Th align="right">Total tokens</Th>
              <Th align="right">Total time</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {rows.map((r) => (
              <tr key={r.suite} className="hover:bg-[var(--color-surface)]">
                <Td mono>{r.suite}</Td>
                <Td num>{r.models}</Td>
                <Td num>{r.runs}</Td>
                <Td num>
                  {r.passed}/{r.runs}
                </Td>
                <Td num>{r.totalCostUsd > 0 ? formatCost(r.totalCostUsd) : <span className="text-fg/30">—</span>}</Td>
                <Td num>{r.totalTokens > 0 ? formatTokens(r.totalTokens) : <span className="text-fg/30">—</span>}</Td>
                <Td num>{formatDuration(r.totalDurationMs)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PerComplexityTable({ rows }: { rows: PerComplexityRow[] }) {
  if (rows.length === 0) {
    return (
      <div>
        <h3 className="type-h3 mb-2">By complexity</h3>
        <p className="text-fg/40">No complexity data.</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="type-h3 mb-4">By complexity</h3>
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <Th>Complexity</Th>
              <Th align="right">Runs</Th>
              <Th align="right">Passed</Th>
              <Th align="right">Total cost</Th>
              <Th align="right">Total tokens</Th>
              <Th align="right">Avg time</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {rows.map((r) => (
              <tr key={r.complexity} className="hover:bg-[var(--color-surface)]">
                <Td mono>{r.complexity}</Td>
                <Td num>{r.runs}</Td>
                <Td num>
                  {r.passed}/{r.runs}
                </Td>
                <Td num>{r.totalCostUsd > 0 ? formatCost(r.totalCostUsd) : <span className="text-fg/30">—</span>}</Td>
                <Td num>{r.totalTokens > 0 ? formatTokens(r.totalTokens) : <span className="text-fg/30">—</span>}</Td>
                <Td num>{formatDuration(r.avgDurationMs)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpensiveTasksTable({ rows }: { rows: ExpensiveTask[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <Th>Task</Th>
            <Th>Model</Th>
            <Th align="right">Cost</Th>
            <Th align="right">Tokens</Th>
            <Th align="right">Duration</Th>
            <Th align="right">Status</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {rows.map((r, i) => (
            <tr key={`${r.taskId}-${r.modelId}-${i}`} className="hover:bg-[var(--color-surface)]">
              <Td>
                <Link
                  href={`/lab/harness-eval/${r.suite}/${r.taskId}/`}
                  className="font-medium text-fg underline-offset-2 hover:underline"
                >
                  {r.taskTitle}
                </Link>
                <span className="ml-2 font-mono text-xs text-fg/40">{r.suite}</span>
              </Td>
              <Td>
                <Link
                  href={`/lab/harness-eval/models/${encodeURIComponent(r.modelId)}/`}
                  className="text-fg underline-offset-2 hover:underline"
                >
                  {r.modelName}
                </Link>
              </Td>
              <Td num>{formatCost(r.costUsd)}</Td>
              <Td num>{formatTokens(r.tokens)}</Td>
              <Td num>{formatDuration(r.durationMs)}</Td>
              <Td num>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-xs ${
                    r.passed
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 text-rose-500'
                  }`}
                >
                  {r.passed ? 'pass' : 'fail'}
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PassRateCell({ passed, total }: { passed: number; total: number }) {
  const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-12 rounded-full bg-[var(--color-border)]">
        <div
          className="h-1.5 rounded-full"
          style={{
            width: `${String(rate)}%`,
            backgroundColor: rate >= 80 ? '#22c55e' : rate >= 50 ? '#eab308' : '#ef4444',
          }}
        />
      </div>
      <span className="font-mono text-xs text-fg/70">
        {String(rate)}%
      </span>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th className={`px-4 py-3 type-label text-fg/60 ${align === 'right' ? 'text-right' : ''}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  num,
  mono,
  small,
}: {
  children: React.ReactNode;
  num?: boolean;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 ${num ? 'text-right font-mono' : ''} ${mono ? 'font-mono' : ''} ${
        small ? 'text-xs text-fg/60' : 'text-fg/80'
      }`}
    >
      {children}
    </td>
  );
}
