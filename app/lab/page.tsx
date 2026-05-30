import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Orbits } from '@/components/lab/orbits'

export const metadata: Metadata = { title: 'Lab' }

export default function LabPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 p-6 py-16">
        <h1 className="text-3xl font-bold">Lab</h1>
        <p className="max-w-prose text-center leading-7 text-fg/70">
          A corner for generative experiments.
        </p>
        <Orbits size={320} />
      </main>
      <SiteFooter />
    </>
  )
}
