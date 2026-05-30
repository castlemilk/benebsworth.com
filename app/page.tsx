import { GridNav } from '@/components/landing/grid-nav'
import { getLatestPost } from '@/lib/content'

export default function Home() {
  const latest = getLatestPost()
  return <GridNav latest={latest ? { title: latest.title, href: `/blog/${latest.slug}/` } : null} />
}
