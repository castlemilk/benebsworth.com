import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Orbits } from '@/components/lab/orbits'

export const metadata: Metadata = { title: 'Lab' }

export default function LabPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 px-6 py-24 sm:px-8">
        <h1 className="type-h1">Lab</h1>
        <p className="max-w-prose text-center type-body text-fg/70">
          A corner for generative experiments.
        </p>
        <Orbits size={420} />
      </main>
      <SiteFooter />
    </>
  )
}
