'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { SiteFooter } from '@/components/site/site-footer'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <>
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-6 pb-32 pt-32 text-center sm:px-8"
      >
        <span className="font-mono text-[5rem] font-bold leading-none text-blog/30">500</span>
        <h1 className="type-h2 mt-6">Something went wrong</h1>
        <p className="mt-4 max-w-md font-sans text-base leading-7 text-fg/65">
          An unexpected error occurred. Please try again.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-6 py-3 font-mono text-sm uppercase tracking-wider text-fg transition-colors hover:border-[var(--color-muted)]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-6 py-3 font-mono text-sm uppercase tracking-wider text-fg transition-colors hover:border-[var(--color-muted)]"
          >
            Go home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
