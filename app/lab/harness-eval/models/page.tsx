import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/site/site-nav';
import { SiteFooter } from '@/components/site/site-footer';
import { Breadcrumb } from '@/components/site/breadcrumb';
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd } from '@/components/seo/json-ld';
import { Reveal } from '@/components/motion/reveal';
import { ALL_SUMMARIES } from '@/lib/lab/harness-eval/results';
import { rankModels } from '@/lib/lab/harness-eval/analytics';
import { ArrowRight, Cpu } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Models · Harness Eval · Lab',
  description: 'All models evaluated by the Omega harness, ranked by pass rate.',
  alternates: { canonical: '/lab/harness-eval/models/' },
  openGraph: {
    type: 'website',
    title: 'Models · Harness Eval · Lab · Ben Ebsworth',
    description: 'All models evaluated by the Omega harness, ranked by pass rate.',
    url: '/lab/harness-eval/models/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: { card: 'summary_large_image', title: 'Models · Harness Eval', creator: '@benebsworth', site: '@benebsworth' },
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

export default function ModelsIndexPage() {
  const rankings = rankModels(ALL_SUMMARIES);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Lab', url: `${SITE_URL}/lab/` },
            { name: 'Harness Eval', url: `${SITE_URL}/lab/harness-eval/` },
            { name: 'Models', url: `${SITE_URL}/lab/harness-eval/models/` },
          ]),
          collectionPageLd({
            name: 'Models · Harness Eval · Ben Ebsworth',
            description: 'All models evaluated by the Omega harness.',
            url: `${SITE_URL}/lab/harness-eval/models/`,
            items: rankings.map((r) => ({
              name: r.model.displayName,
              url: `${SITE_URL}/lab/harness-eval/models/${encodeURIComponent(r.model.id)}/`,
            })),
          }),
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
            { label: 'Models' },
          ]}
        />

        <section className="pb-10">
          <Reveal>
            <p className="type-label text-muted">models</p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-3 type-h1">Evaluated models</h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 max-w-prose type-body text-fg/70">
              Every model tested by the Omega harness, ranked by pass rate across all suites.
            </p>
          </Reveal>
        </section>

        <section className="grid gap-4">
          {rankings.map((r, i) => (
            <Reveal key={r.model.id} delay={i * 60}>
              <Link
                href={`/lab/harness-eval/models/${encodeURIComponent(r.model.id)}/`}
                className="group flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-muted)]"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-fg)]">
                    <Cpu className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="type-h3">{r.model.displayName}</p>
                    <p className="font-mono text-xs text-fg/50">{r.model.provider}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="type-label text-fg">{String(r.passRate)}%</p>
                    <p className="text-xs text-fg/50">{String(r.totalTasks)} tasks</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs text-fg/50">{formatDuration(r.avgDurationMs)}</p>
                    <p className="font-mono text-xs text-fg/50">{formatTokens(r.totalTokens)} tokens</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-fg/30 transition-transform group-hover:translate-x-1 group-hover:text-fg/60" />
                </div>
              </Link>
            </Reveal>
          ))}
          {rankings.length === 0 && (
            <Reveal>
              <p className="text-center text-fg/40 py-12">No eval data yet. Run <code>omega bench eval</code> to generate reports.</p>
            </Reveal>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
