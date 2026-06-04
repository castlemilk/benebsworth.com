import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const dynamic = 'force-static'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'Ben Ebsworth — Software, platform & hardware engineer'

export default function Image() {
  return renderOgCard({
    eyebrow: 'benebsworth.com',
    title: 'Software · Platform · Hardware · AI-native',
    footer: 'Melbourne, Australia',
    accent: '#7c5cff',
  })
}
