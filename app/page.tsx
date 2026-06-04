import type { Metadata } from 'next'
import { GridNav } from '@/components/landing/grid-nav'
import { getLatestPost } from '@/lib/content'
import { JsonLd, personLd, websiteLd } from '@/components/seo/json-ld'

export const metadata: Metadata = { alternates: { canonical: '/' } }

export default function Home() {
  const latest = getLatestPost()
  return (
    <>
      <JsonLd data={[personLd, websiteLd]} />
      <GridNav latest={latest ? { title: latest.title, href: `/blog/${latest.slug}/` } : null} />
    </>
  )
}
