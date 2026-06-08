import type { Metadata } from 'next'
import { GridNav } from '@/components/landing/grid-nav'
import { getLatestPost } from '@/lib/content'
import { JsonLd, personLd, websiteLd } from '@/components/seo/json-ld'

export const metadata: Metadata = {
  description:
    'Ben Ebsworth — software, platform & hardware engineer in Melbourne, Australia. Writing, projects and generative experiments across Kubernetes, distributed systems, embedded hardware and AI.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    title: 'Ben Ebsworth — Software, Platform & Hardware Engineer',
    description: 'Software, platform & hardware engineer · AI-native · Melbourne, Australia.',
    url: '/',
  },
  twitter: { card: 'summary_large_image' },
}

export default function Home() {
  const latest = getLatestPost()
  return (
    <>
      <JsonLd data={[personLd, websiteLd]} />
      <GridNav latest={latest ? { title: latest.title, href: `/blog/${latest.slug}/` } : null} />
    </>
  )
}
