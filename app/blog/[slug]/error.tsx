'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'

export default function PostError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <>
      <SiteNav />
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-6 pb-32 pt-32 text-center sm:px-8"
      >
        <Breadcrumb className="mb-12" items={[{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog/' }, { label: 'Error' }]} />
        <h1 className="type-h2">Could not load post</h1>
        <p className="mt-4 max-w-md font-sans text-base leading-7 text-fg/65">
          Something went wrong loading this post.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-6 py-3 font-mono text-sm uppercase tracking-wider text-fg transition-colors hover:border-[var(--color-muted)]"
          >
            Try again
          </button>
          <Link
            href="/blog/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-6 py-3 font-mono text-sm uppercase tracking-wider text-fg transition-colors hover:border-[var(--color-muted)]"
          >
            All posts
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
