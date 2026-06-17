import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'

export default function ProjectDetailLoading() {
  return (
    <>
      <SiteNav />
      <main
        id="main-content"
        className="mx-auto w-full max-w-5xl px-6 pb-32 sm:px-8"
      >
        <Breadcrumb className="mb-12" items={[{ label: 'Home', href: '/' }, { label: 'Projects', href: '/projects/' }, { label: '…' }]} />
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-14 w-2/3 animate-pulse rounded-lg bg-surface-2" />
          <div className="h-5 w-full animate-pulse rounded bg-surface-2" />
          <div className="h-5 w-5/6 animate-pulse rounded bg-surface-2" />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
