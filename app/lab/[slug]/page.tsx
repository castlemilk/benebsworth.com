import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import fs from 'node:fs'
import path from 'node:path'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { LAB_EFFECTS, getEffect } from '@/lib/lab/registry'
import { EffectPlayground } from '@/components/lab/effect-playground'
import { MdxContent } from '@/components/mdx/mdx-content'
import { JsonLd, SITE_URL, breadcrumbLd } from '@/components/seo/json-ld'

export function generateStaticParams() {
  return LAB_EFFECTS.map((e) => ({ slug: e.slug }))
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const e = getEffect(slug)
  const url = `/lab/${slug}/`
  return {
    title: e ? `${e.title} · Lab` : 'Lab',
    description: e?.blurb,
    alternates: { canonical: url },
    openGraph: { type: 'article', title: e ? `${e.title} · Lab` : 'Lab', description: e?.blurb, url },
    twitter: { card: 'summary_large_image', title: e?.title, description: e?.blurb },
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
  const breadcrumb = breadcrumbLd([
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Lab', url: `${SITE_URL}/lab/` },
    { name: e.title, url: `${SITE_URL}/lab/${slug}/` },
  ])
  return (
    <>
      <JsonLd data={breadcrumb} />
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8">
        {/* Breadcrumb back to Home / the lab hub — the home doodle tile links
            straight here, so this is the way back to the rest of the experiments. */}
        <Breadcrumb
          items={[{ label: 'Home', href: '/' }, { label: 'Lab', href: '/lab/' }, { label: e.title }]}
        />
        <p className="mt-6 type-label text-muted">experiment</p>
        <h1 className="mt-3 type-h1">{e.title}</h1>
        <p className="mt-3 max-w-prose type-body text-fg/70">{e.blurb}</p>
        <div className="mt-10"><EffectPlayground slug={slug} /></div>
        {body && <article className="mt-14 max-w-[44rem]"><MdxContent source={body} /></article>}
      </main>
      <SiteFooter />
    </>
  )
}
