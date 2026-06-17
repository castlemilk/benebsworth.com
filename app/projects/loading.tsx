import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'

export default function ProjectsLoading() {
  return (
    <>
      <SiteNav />
      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl px-6 pb-32 sm:px-8"
      >
        <Breadcrumb className="pt-8 sm:pt-10" items={[{ label: 'Home', href: '/' }, { label: 'Projects' }]} />
        <div className="pt-8 pb-20 md:pt-10">
          <div className="h-14 w-1/2 animate-pulse rounded-lg bg-surface-2" />
          <div className="mt-4 h-5 w-full max-w-lg animate-pulse rounded bg-surface-2" />
        </div>
        <div className="space-y-6">
          <div className="h-56 animate-pulse rounded-2xl bg-surface-2" />
          <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
