'use client'
import { getEffect, EFFECT_LOADERS } from '@/lib/lab/registry'
import { useEffectModule } from '@/lib/lab/use-effect-module'
import { EffectCanvas } from './effect-canvas'

// Bespoke labs (WebGL studios, the circuit builder) are NOT EffectModules, so
// they have no EFFECT_LOADERS entry and the live-canvas preview can't render
// them — they'd otherwise pulse forever. Those get a static poster captured
// from the studio (scripts/capture-lab-poster.mjs); without one they fall
// through to a neutral (non-pulsing) placeholder.
const POSTERS: Record<string, string> = {
  'universe-scale': '/lab/previews/universe-scale.jpg',
}

const CARD_CLASS =
  'aspect-[16/9] w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-stage)]'

export function LabCard({ slug }: { slug: string }) {
  const e = getEffect(slug)!
  const effectModule = useEffectModule(slug)

  const poster = POSTERS[slug]
  if (poster) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={poster}
        alt={`${e.title} preview`}
        loading="lazy"
        width={1280}
        height={720}
        className={`${CARD_CLASS} object-cover`}
      />
    )
  }

  if (!effectModule) {
    const pending = slug in EFFECT_LOADERS // true → still loading; false → no live preview
    return <div className={pending ? `${CARD_CLASS} animate-pulse` : CARD_CLASS} />
  }

  return (
    <EffectCanvas effect={effectModule} params={effectModule.defaults} quality="mini"
      ariaLabel={`${e.title} preview`}
      className={CARD_CLASS} />
  )
}
