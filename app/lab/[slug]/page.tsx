import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import fs from 'node:fs'
import path from 'node:path'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { LAB_EFFECTS, getEffect, CATEGORIES } from '@/lib/lab/registry'
import { LabDetailHeader } from '@/components/lab/lab-detail-header'
import '../notebook.css'
import { EffectPlayground } from '@/components/lab/effect-playground'
import { SpatialLab } from '@/components/mdx/spatial-lab'
import { isSpatialLab } from '@/lib/lab/spatial/catalog'
import { MdxContent } from '@/components/mdx/mdx-content'
import { JsonLd, SITE_URL, breadcrumbLd, authorLd } from '@/components/seo/json-ld'

export function generateStaticParams() {
  const dedicated = new Set(['circuit-sim', 'universe-scale', 'black-hole-sim'])
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
  const ogImage = `${url}opengraph-image.png`
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
      images: [{ url: ogImage, width: 1200, height: 630, alt: e ? `${e.title} lab preview` : 'Lab preview' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: e?.title,
      description: e?.blurb,
      creator: '@benebsworth',
      site: '@benebsworth',
      images: [ogImage],
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
    image: `${SITE_URL}/lab/${slug}/opengraph-image.png`,
    featureList: e.tags.join(', '),
    keywords: e.tags.join(', '),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: authorLd,
  }
  const detailHeader = <LabDetailHeader
    title={e.title}
    blurb={e.blurb}
    category={e.category}
    label={catMeta?.label ?? e.category}
    glyph={catMeta?.glyph ?? ''}
    hasExplainer={Boolean(body)}
  />
  return (
    <>
      <JsonLd data={[breadcrumb, appLd]} />
      <SiteNav />
      <main id="main-content" className="lab-notebook lab-detail mx-auto w-full max-w-6xl px-6 py-16 sm:px-8">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Lab', href: '/lab/' },
            { label: e.title },
          ]}
        />
        <section id="experiment" aria-label={`${e.title} interactive simulation`} className="lab-detail-experiment mt-10">
          {isSpatialLab(slug) ? <>
            {detailHeader}
            <SpatialLab slug={slug} />
          </> : <EffectPlayground slug={slug} variant="editorial" header={detailHeader} />}
        </section>
        {body && <article id="explanation" aria-label={`${e.title} explanation`} className="lab-detail-explanation mt-14 mx-auto max-w-3xl px-4"><MdxContent source={body} /></article>}
      </main>
      <SiteFooter />
    </>
  )
}
