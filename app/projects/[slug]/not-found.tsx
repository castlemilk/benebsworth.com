import Link from 'next/link'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'

export default function ProjectNotFound() {
  return (
    <>
      <SiteNav />
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-6 pb-32 pt-32 text-center sm:px-8"
      >
        <Breadcrumb className="mb-12" items={[{ label: 'Home', href: '/' }, { label: 'Projects', href: '/projects/' }, { label: 'Not found' }]} />
        <h1 className="type-h2">Project not found</h1>
        <p className="mt-4 max-w-md font-sans text-base leading-7 text-fg/65">
          This project doesn't exist or may have been removed.
        </p>
        <Link
          href="/projects/"
          className="mt-10 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-6 py-3 font-mono text-sm uppercase tracking-wider text-fg transition-colors hover:border-[var(--color-muted)]"
        >
          All projects
        </Link>
      </main>
      <SiteFooter />
    </>
  )
}
