import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const dynamic = 'force-static'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'About Ben Ebsworth'

export default function Image() {
  return renderOgCard({
    eyebrow: 'About',
    title: 'Software, platform & hardware engineer',
    footer: 'Melbourne, Australia',
    accent: '#ff7a59',
  })
}
