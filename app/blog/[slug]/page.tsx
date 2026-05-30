import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPublishedPosts, getPost } from '@/lib/content'
import { MdxContent } from '@/components/mdx/mdx-content'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'

export function generateStaticParams() {
  return getPublishedPosts().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const p = getPost(slug)
  return { title: p?.title ?? 'Post', description: p?.description }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = getPost(slug)
  if (!p) notFound()
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl p-6">
        <time className="text-xs uppercase tracking-wider text-muted">{p.date.slice(0, 10)}</time>
        <h1 className="mt-1 text-3xl font-bold">{p.title}</h1>
        <article className="mt-8"><MdxContent source={p.body} slug={p.slug} /></article>
      </main>
      <SiteFooter />
    </>
  )
}
