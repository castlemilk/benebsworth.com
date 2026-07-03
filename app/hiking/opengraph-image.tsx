import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const dynamic = 'force-static'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'Hiking · Ben Ebsworth'

export default function Image() {
  return renderOgCard({
    eyebrow: 'Hiking',
    title: 'Long-distance hikes & treks',
    footer: 'Journey maps · stats · galleries',
    accent: '#5b9e6f',
  })
}
