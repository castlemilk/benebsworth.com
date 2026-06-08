import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const dynamic = 'force-static'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'Lab · Ben Ebsworth'

export default function Image() {
  return renderOgCard({
    eyebrow: 'The Lab',
    title: 'Generative experiments',
    footer: 'Interactive canvas sketches',
    accent: '#00e0b8',
  })
}
