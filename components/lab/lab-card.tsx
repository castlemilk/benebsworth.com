'use client'
import { getEffect, EFFECT_LOADERS } from '@/lib/lab/registry'
import { useEffectModule } from '@/lib/lab/use-effect-module'
import { labPosterFor } from '@/lib/lab/posters'
import { EffectCanvas } from './effect-canvas'

// Some entries get a static poster instead of a live mini-canvas: bespoke labs
// without EffectModules, and explainers where an editorial thumbnail reads
// better in a dense grid.
const CARD_CLASS =
  'aspect-[16/9] w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-stage)]'

export function LabCard({ slug }: { slug: string }) {
  const e = getEffect(slug)!
  const effectModule = useEffectModule(slug)

  const poster = labPosterFor(slug)
  if (poster) {
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
