import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublishedPosts, getPost, isPublished } from '@/lib/content'
import { topicFor } from '@/lib/topics'
import { MdxContent } from '@/components/mdx/mdx-content'
import { TopicMarker } from '@/components/blog/topic-marker'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { JsonLd, SITE_URL } from '@/components/seo/json-ld'

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d
    .toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase()
}

export function generateStaticParams() {
  return getPublishedPosts().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const p = getPost(slug)
  if (!p || !isPublished(p)) return { title: 'Not found' }
  const url = `/blog/${slug}/`
  return {
    title: p.title,
    description: p.description,
    keywords: p.tags,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: p.title,
      description: p.description,
      url,
      publishedTime: new Date(p.date).toISOString(),
      authors: ['Ben Ebsworth'],
      tags: p.tags,
    },
    twitter: { card: 'summary_large_image', title: p.title, description: p.description },
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = getPost(slug)
  if (!p || !isPublished(p)) notFound()
  const topic = topicFor(p)
  const url = `${SITE_URL}/blog/${slug}/`
  const published = new Date(p.date).toISOString()
  const blogPostingLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.description,
    datePublished: published,
    dateModified: published,
    author: { '@type': 'Person', name: 'Ben Ebsworth', url: `${SITE_URL}/about/` },
    publisher: { '@type': 'Person', name: 'Ben Ebsworth' },
    image: `${url}opengraph-image`,
    mainEntityOfPage: url,
    url,
    ...(p.tags.length ? { keywords: p.tags.join(', ') } : {}),
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Blog', item: `${SITE_URL}/blog/` },
      { '@type': 'ListItem', position: 2, name: p.title, item: url },
    ],
  }
  return (
    <>
      <JsonLd data={[blogPostingLd, breadcrumbLd]} />
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl px-6 pb-32 pt-14 sm:px-8 md:pt-20">
        {/* ── Post header spans the full (wide) page frame — editorial title +
            accent rule fill the screen. Only the long-form prose below is capped
            to a comfortable reading measure (~44rem ≈ 74ch). ── */}
        <header className="relative">
          {/* soft topic-tinted wash behind the title */}
          <span
            aria-hidden
            className="pointer-events-none absolute -top-12 left-0 -z-10 h-40 w-full opacity-70 blur-3xl"
            style={{
              background: `radial-gradient(60% 100% at 0% 0%, color-mix(in srgb, ${topic.accent} 16%, transparent), transparent 70%)`,
            }}
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <TopicMarker topic={topic} />
            <time className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted">
              {fmtDate(p.date)}
            </time>
          </div>
          <h1 className="type-h1 mt-5">
            {p.title}
          </h1>
          {p.description && (
            <p className="mt-4 max-w-2xl font-sans text-lg leading-8 text-fg/65">
              {p.description}
            </p>
          )}
          {p.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
              {p.tags.slice(0, 6).map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </div>
          )}
          {/* accent rule keyed to the topic */}
          <div
            className="mt-7 h-px w-full"
            style={{
              background: `linear-gradient(to right, ${topic.accent}, color-mix(in srgb, ${topic.accent} 8%, transparent) 60%, transparent)`,
            }}
          />
        </header>
        <article className="mt-10 max-w-[44rem]"><MdxContent source={p.body} slug={p.slug} /></article>
      </main>
      <SiteFooter />
    </>
  )
}
