'use client'
import { HOME_EMBED_EFFECTS } from '@/lib/lab/registry'
import { EffectCanvas } from './effect-canvas'

/** Tiny landing embed. `index` is chosen by the caller (client-side) so SSR/CSR match. */
export function HomeEmbed({ index, px }: { index: number; px: number }) {
  void px
  const e = HOME_EMBED_EFFECTS[index % HOME_EMBED_EFFECTS.length]
  return (
    <EffectCanvas
      effect={e.module}
      params={e.defaults}
      quality="mini"
      ariaLabel={`${e.title} preview`}
      className="h-full w-full"
    />
  )
}

export function homeEmbedSlug(index: number): string {
  return HOME_EMBED_EFFECTS[index % HOME_EMBED_EFFECTS.length].slug
}
