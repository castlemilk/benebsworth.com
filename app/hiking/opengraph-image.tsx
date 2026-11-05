import { completedHikes } from '@/content/hiking'
import { hikeImagery } from '@/content/hiking-imagery'
import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE, publicOgImageDataUri } from '@/lib/og'

export const dynamic = 'force-static'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'Hiking · Ben Ebsworth'

export default async function Image() {
  return renderOgCard({
    eyebrow: 'Hiking',
    backgroundUri: await publicOgImageDataUri(hikeImagery(completedHikes[0]).src, { width: 1200, height: 630, fit: 'cover' }),
    title: 'Long-distance hikes & treks',
    footer: 'Journey maps · stats · galleries',
    accent: '#5b9e6f',
  })
}
