import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'

export default function BlogLoading() {
  return (
    <>
      <SiteNav />
      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl px-6 pb-32 sm:px-8"
      >
        <Breadcrumb className="pt-8 sm:pt-10" items={[{ label: 'Home', href: '/' }, { label: 'Blog' }]} />
        <div className="pt-8 pb-20 md:pt-10">
          <div className="h-4 w-48 animate-pulse rounded bg-surface-2" />
          <div className="mt-4 h-16 w-2/3 animate-pulse rounded-lg bg-surface-2" />
          <div className="mt-7 h-6 w-full max-w-xl animate-pulse rounded bg-surface-2" />
        </div>
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface-2" />
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
