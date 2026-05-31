'use client'
import { getEffect } from '@/lib/lab/registry'
import { EffectCanvas } from './effect-canvas'

export function LabCard({ slug }: { slug: string }) {
  const e = getEffect(slug)!
  return (
    <EffectCanvas effect={e.module} params={e.defaults} quality="mini"
      ariaLabel={`${e.title} preview`}
      className="aspect-[16/9] w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-stage)]" />
  )
}
