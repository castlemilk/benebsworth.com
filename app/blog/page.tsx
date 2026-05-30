import Link from 'next/link'
import type { Metadata } from 'next'
import { getPublishedPosts } from '@/lib/content'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'

export const metadata: Metadata = { title: 'Blog' }

export default function BlogPage() {
  const posts = getPublishedPosts()
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl p-6">
        <h1 className="mb-8 text-3xl font-bold">Blog</h1>
        <ul className="space-y-6">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}/`} className="group block">
                <time className="text-xs uppercase tracking-wider text-muted">{p.date.slice(0, 10)}</time>
                <h2 className="text-xl font-semibold group-hover:text-blog">{p.title}</h2>
                <p className="mt-1 text-sm text-fg/70">{p.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  )
}
