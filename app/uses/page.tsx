import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { Reveal } from '@/components/motion/reveal'
import { AnimatedHeading } from '@/components/motion/animated-heading'
import { JsonLd, SITE_URL, breadcrumbLd } from '@/components/seo/json-ld'

// ─────────────────────────────────────────────────────────────────────────────
// A /uses page (the uses.tech convention): the tools, stack and machine behind
// the work. EDIT freely — every entry is just data. Kept honest: the stack rows
// are what this very site + my day job actually run on.
// ─────────────────────────────────────────────────────────────────────────────
const USES: { group: string; accent: string; items: { name: string; note: React.ReactNode }[] }[] = [
  {
    group: 'Languages I reach for',
    accent: 'var(--color-blog)',
    items: [
      { name: 'Go', note: 'services, CLIs, anything that should be fast and boring' },
      { name: 'TypeScript', note: 'the web — and increasingly everything else' },
      { name: 'Python', note: 'glue, data, scripting, ML' },
      { name: 'C / C++', note: 'embedded, and when the metal matters' },
    ],
  },
  {
    group: 'Platform & cloud',
    accent: 'var(--color-about)',
    items: [
      { name: 'Kubernetes', note: 'EKS & GKE, in production at scale' },
      { name: 'Istio', note: "service mesh — I shipped Australia's first prod deployment" },
      { name: 'AWS / GCP', note: 'multi-cloud, certified on both' },
      { name: 'Terraform', note: 'infrastructure as code (this site included)' },
      { name: 'Prometheus + Grafana', note: 'observability, SLIs/SLOs' },
    ],
  },
  {
    group: 'AI-native toolchain',
    accent: 'var(--color-project)',
    items: [
      { name: 'Coding agents', note: 'LLMs as a daily driver, not a bolt-on' },
      { name: 'Anthropic & OpenAI APIs', note: 'the model layer behind tools and agents' },
      { name: 'MCP', note: 'wiring real tools into agents' },
      { name: 'RAG + embeddings', note: 'retrieval and vector search' },
    ],
  },
  {
    group: 'This site is built with',
    accent: 'var(--color-blog)',
    items: [
      { name: 'Next.js 16 + React 19', note: 'statically exported — no server to run' },
      { name: 'Tailwind CSS v4', note: 'styling and the design tokens' },
      { name: 'MDX', note: 'posts are React-in-Markdown, so figures are live' },
      { name: 'Shiki + KaTeX', note: 'code highlighting and typeset math' },
      { name: 'HTML canvas', note: 'every lab simulation, hand-rolled' },
      { name: 'Cloudflare Pages', note: 'global edge CDN + DNS, Terraform-managed' },
    ],
  },
  {
    group: 'Machine',
    accent: 'var(--color-about)',
    items: [
      { name: 'macOS + zsh', note: 'the daily environment' },
      // TODO(Ben): drop in your actual laptop / keyboard / monitor / desk here.
    ],
  },
]

const link = 'underline decoration-fg/30 underline-offset-4 transition-colors hover:decoration-fg/70'

export const metadata: Metadata = {
  title: 'Uses',
  description:
    'The tools, languages, platform stack and machine Ben Ebsworth uses — plus a colophon of exactly how this site is built and deployed.',
  alternates: { canonical: '/uses/' },
  openGraph: {
    type: 'website',
    title: 'Uses · Ben Ebsworth',
    description: 'The languages, platform stack, AI toolchain and machine behind the work — and how this site is built.',
    url: '/uses/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: { card: 'summary_large_image', title: 'Uses · Ben Ebsworth', creator: '@benebsworth', site: '@benebsworth' },
}

export default function UsesPage() {
  const ld = [
    breadcrumbLd([
      { name: 'Home', url: `${SITE_URL}/` },
      { name: 'Uses', url: `${SITE_URL}/uses/` },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Uses · Ben Ebsworth',
      url: `${SITE_URL}/uses/`,
      description: 'The tools, languages, platform stack and machine Ben Ebsworth uses, and how this site is built.',
    },
  ]

  return (
    <>
      <JsonLd data={ld} />
      <SiteNav />

      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-32 sm:px-8">
        <Breadcrumb className="pt-8 sm:pt-10" items={[{ label: 'Home', href: '/' }, { label: 'Uses' }]} />

        <section className="pt-8 pb-12 md:pt-10">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-project">Uses · Tools &amp; stack</p>
          </Reveal>
          <AnimatedHeading text="What I use" as="h1" className="type-h1 mt-4" />
          <Reveal delay={160}>
            <p className="mt-7 max-w-2xl font-sans text-[1.2rem] leading-8 text-fg/70">
              The languages, platform stack and AI toolchain behind the work — and, at the bottom, a
              colophon of exactly how this site is built and shipped.
            </p>
          </Reveal>
        </section>

        <div className="max-w-2xl">
          {USES.map((g, i) => (
            <Reveal key={g.group} delay={i * 50}>
              <section className="border-t border-[var(--color-border)] py-7">
                <h2
                  className="accent-ink font-mono text-[0.7rem] uppercase tracking-[0.22em]"
                  style={{ '--ink': g.accent } as React.CSSProperties}
                >
                  {g.group}
                </h2>
                <ul className="mt-4 space-y-3">
                  {g.items.map((it) => (
                    <li key={it.name} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
                      <span className="font-mono text-sm text-fg/90 sm:w-52 sm:shrink-0">{it.name}</span>
                      <span className="font-sans text-[0.95rem] leading-7 text-fg/60">{it.note}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <p className="mt-12 max-w-2xl border-t border-[var(--color-border)] pt-7 font-sans text-sm leading-7 text-muted">
            Inspired by{' '}
            <a href="https://uses.tech" target="_blank" rel="noreferrer" className={link}>uses.tech</a>. For
            what I&rsquo;m focused on right now, see <Link href="/now/" className={link}>/now</Link>; for the
            things I&rsquo;ve built with all this, <Link href="/projects/" className={link}>projects</Link>.
          </p>
        </Reveal>
      </main>

      <SiteFooter />
    </>
  )
}
