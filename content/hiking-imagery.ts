import type { Hike } from '@/lib/gen/content'

/** Verified existing guide photographs. Original artwork remains the fallback. */
const PHOTOGRAPHS: Record<string, { src: string; srcSet: string; alt: string; caption: string; width: number; height: number; position: string }> = {
  'haute-route': {
    src: '/hiking/photos/haute-route-louvie-1200.webp',
    srcSet: '/hiking/photos/haute-route-louvie-640.webp 640w, /hiking/photos/haute-route-louvie-1200.webp 1200w',
    alt: 'Snow peaks reflected in Lac de Louvie on the Walker’s Haute Route',
    caption: 'Lac de Louvie · Photograph',
    width: 1200, height: 900, position: '50% 58%',
  },
  'overland-track': {
    src: '/hiking/photos/overland-ronny-creek-1200.webp',
    srcSet: '/hiking/photos/overland-ronny-creek-640.webp 640w, /hiking/photos/overland-ronny-creek-1200.webp 1200w',
    alt: 'Hiker beside the Overland Track sign at Ronny Creek in the snow',
    caption: 'Ronny Creek · Photograph',
    width: 1200, height: 900, position: '50% 50%',
  },
}

export function hikeImagery(hike: Hike, useIllustration = false) {
  const photograph = !useIllustration && PHOTOGRAPHS[hike.slug]
  if (photograph) return { ...photograph, kind: 'photograph' as const }
  return {
    src: hike.hero, srcSet: undefined, width: 1200, height: 630,
    alt: `Illustration of ${hike.name}`, caption: 'Trail illustration',
    position: '50% 50%', kind: 'illustration' as const,
  }
}
