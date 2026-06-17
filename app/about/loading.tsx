import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'

export default function AboutLoading() {
  return (
    <>
      <SiteNav />
      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl px-6 pb-32 sm:px-8"
      >
        <Breadcrumb className="mb-12" items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="h-12 w-1/3 animate-pulse rounded-lg bg-surface-2" />
          <div className="h-5 w-full animate-pulse rounded bg-surface-2" />
          <div className="h-5 w-5/6 animate-pulse rounded bg-surface-2" />
          <div className="h-5 w-4/5 animate-pulse rounded bg-surface-2" />
          <div className="h-64 animate-pulse rounded-xl bg-surface-2" />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
