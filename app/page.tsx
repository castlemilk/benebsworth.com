import { GridNav } from '@/components/landing/grid-nav'

// TODO(phase3): wire getLatestPost from @/lib/content and pass real latest post.
export default function Home() {
  return <GridNav latest={null} />
}
