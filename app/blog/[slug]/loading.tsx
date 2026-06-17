import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'

export default function PostLoading() {
  return (
    <>
      <SiteNav />
      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl px-6 pb-32 pt-6 sm:px-8 md:pt-8"
      >
        <Breadcrumb className="mb-8" items={[{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog/' }, { label: '…' }]} />
        <div className="mx-auto max-w-[44rem] space-y-4">
          <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
          <div className="h-12 w-5/6 animate-pulse rounded-lg bg-surface-2" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-surface-2" />
          <div className="h-5 w-full animate-pulse rounded bg-surface-2" />
          <div className="h-96 animate-pulse rounded-xl bg-surface-2" />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
