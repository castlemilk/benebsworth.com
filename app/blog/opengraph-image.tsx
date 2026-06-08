import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const dynamic = 'force-static'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'Blog · Ben Ebsworth'

export default function Image() {
  return renderOgCard({
    eyebrow: 'Blog',
    title: 'Notes from the cluster',
    footer: 'Platform & cloud-native',
    accent: '#00e0b8',
  })
}
