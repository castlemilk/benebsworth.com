import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'

export default function LabLoading() {
  return (
    <>
      <SiteNav />
      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl px-6 pb-20 sm:px-8"
      >
        <Breadcrumb className="mb-10" items={[{ label: 'Home', href: '/' }, { label: 'Lab' }]} />
        <div className="pb-20">
          <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
          <div className="mt-3 h-14 w-1/2 animate-pulse rounded-lg bg-surface-2" />
          <div className="mt-4 h-5 w-full max-w-xl animate-pulse rounded bg-surface-2" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
