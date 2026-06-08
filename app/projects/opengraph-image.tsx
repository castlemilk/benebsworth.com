import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const dynamic = 'force-static'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'Projects · Ben Ebsworth'

export default function Image() {
  return renderOgCard({
    eyebrow: 'Projects',
    title: "Things I've built",
    footer: 'Selected work',
    accent: '#7c5cff',
  })
}
