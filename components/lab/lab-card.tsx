'use client'
import { getEffect } from '@/lib/lab/registry'
import { useEffectModule } from '@/lib/lab/use-effect-module'
import { EffectCanvas } from './effect-canvas'

export function LabCard({ slug }: { slug: string }) {
  const e = getEffect(slug)!
  const effectModule = useEffectModule(slug)

  if (!effectModule) {
    return (
      <div className="aspect-[16/9] w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-stage)] animate-pulse" />
    )
  }

  return (
    <EffectCanvas effect={effectModule} params={effectModule.defaults} quality="mini"
      ariaLabel={`${e.title} preview`}
      className="aspect-[16/9] w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-stage)]" />
  )
}
