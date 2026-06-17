import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'

export const metadata: Metadata = { title: 'Page not found' }

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-6 pb-32 pt-32 text-center sm:px-8"
      >
        <span className="font-mono text-[5rem] font-bold leading-none text-blog/30">404</span>
        <h1 className="type-h2 mt-6">Page not found</h1>
        <p className="mt-4 max-w-md font-sans text-base leading-7 text-fg/65">
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-6 py-3 font-mono text-sm uppercase tracking-wider text-fg transition-colors hover:border-[var(--color-muted)]"
        >
          Go home
        </Link>
      </main>
      <SiteFooter />
    </>
  )
}
