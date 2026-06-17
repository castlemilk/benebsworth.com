import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'

export default function LabDetailLoading() {
  return (
    <>
      <SiteNav />
      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8"
      >
        <Breadcrumb className="mb-12" items={[{ label: 'Home', href: '/' }, { label: 'Lab', href: '/lab/' }, { label: '…' }]} />
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
          <div className="h-14 w-2/3 animate-pulse rounded-lg bg-surface-2" />
          <div className="h-5 w-full animate-pulse rounded bg-surface-2" />
          <div className="h-96 animate-pulse rounded-xl bg-surface-2" />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
