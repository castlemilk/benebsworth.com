import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import fs from 'node:fs'
import path from 'node:path'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { LAB_EFFECTS, getEffect, CATEGORIES } from '@/lib/lab/registry'
import { EffectPlayground } from '@/components/lab/effect-playground'
import { MdxContent } from '@/components/mdx/mdx-content'
import { JsonLd, SITE_URL, breadcrumbLd, authorLd } from '@/components/seo/json-ld'

const CATEGORY_ACCENT: Record<string, string> = {
  art: '#00e0b8',
  maths: '#7c5cff',
  physics: '#ff7a59',
  engineering: '#00b4d8',
  cosmology: '#6366f1',
}

export function generateStaticParams() {
  const dedicated = new Set(['circuit-sim', 'universe-scale'])
  return LAB_EFFECTS.filter(e => !dedicated.has(e.slug)).map((e) => ({ slug: e.slug }))
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const e = getEffect(slug)
  const url = `/lab/${slug}/`
  // Expand the blurb into a longer, more keyword-rich description. The
  // blurb is the on-page intro; for search/social we add the category
  // and 1-2 tags to give the OG card more text and a stronger signal.
  const description = e
    ? `${e.blurb} — ${e.title}, an interactive ${e.category} simulation in the lab. Drag the controls; watch the math.`
    : 'Lab effect'
  return {
    title: e ? `${e.title} · Lab` : 'Lab',
    description,
    keywords: e?.tags,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: e ? `${e.title} · Lab` : 'Lab',
      description,
      url,
      siteName: 'Ben Ebsworth',
      locale: 'en_AU',
    },
    twitter: {
      card: 'summary_large_image',
      title: e?.title,
      description: e?.blurb,
      creator: '@benebsworth',
      site: '@benebsworth',
    },
  }
}

function explainer(slug: string): string {
  const p = path.join(process.cwd(), 'content/lab', `${slug}.mdx`)
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''
}

export default async function LabEffectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const e = getEffect(slug)
  if (!e) notFound()
  const body = explainer(slug)
  const catMeta = CATEGORIES.find((c) => c.key === e.category)
  const accent = CATEGORY_ACCENT[e.category] ?? '#7c5cff'
  const breadcrumb = breadcrumbLd([
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Lab', url: `${SITE_URL}/lab/` },
    { name: e.title, url: `${SITE_URL}/lab/${slug}/` },
  ])
  // SoftwareApplication schema: the lab effect is a runnable canvas-based
  // simulator. `applicationCategory: EducationalApplication` and
  // `applicationSubCategory` carry the topic signal. `featureList`
  // surfaces the effect's tags as a Google-readable list. `browserRequirements`
  // says "any modern browser with canvas" so crawlers can sanity-check
  // the platform.
  const appLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: e.title,
    description: e.blurb,
    url: `${SITE_URL}/lab/${slug}/`,
    applicationCategory: 'EducationalApplication',
    applicationSubCategory: catMeta?.label ?? e.category,
    operatingSystem: 'Any (browser-based)',
    inLanguage: 'en-AU',
    isAccessibleForFree: true,
    image: `${SITE_URL}/lab/${slug}/opengraph-image`,
    featureList: e.tags.join(', '),
    keywords: e.tags.join(', '),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: authorLd,
  }
  return (
    <>
      <JsonLd data={[breadcrumb, appLd]} />
      <SiteNav />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Lab', href: '/lab/' },
            { label: e.title },
          ]}
        />
        <div className="mt-6 flex items-center gap-3">
          <span
            className="inline-block font-mono text-lg"
            style={{ color: accent }}
          >
            {catMeta?.glyph}
          </span>
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            {catMeta?.label ?? e.category}
          </span>
        </div>
        <h1 className="mt-3 type-h1">{e.title}</h1>
        <p className="mt-3 max-w-prose type-body text-fg/70">{e.blurb}</p>
        <div className="mt-10"><EffectPlayground slug={slug} /></div>
        {body && <article className="mt-14 mx-auto max-w-3xl px-4"><MdxContent source={body} /></article>}
      </main>
      <SiteFooter />
    </>
  )
}
