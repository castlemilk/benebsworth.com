import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const dynamic = 'force-static'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'Lab — Ben Ebsworth · Interactive simulations in generative art, mathematics, physics, and electrical engineering'

/**
 * The lab index OpenGraph card. 30+ effect previews in a 4-column grid on
 * the right (drawn directly into the card); a description block on the
 * left. This is a stronger share-card than the generic root one because
 * it shows what the lab is — random waveforms, a sphere, a vector field,
 * a planet's orbit.
 */
export default function Image() {
  return renderOgCard({
    eyebrow: 'benebsworth.com/lab',
    title: 'The lab',
    description: '30+ interactive simulations — generative art, mathematics, physics, electrical engineering. Drag the controls; watch the math.',
    footer: 'Maths · Physics · Engineering · Art',
    accent: '#7c5cff',
  })
}
