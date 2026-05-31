'use client'
import { getEffect } from '@/lib/lab/registry'
import { EffectCanvas } from './effect-canvas'
import { Controls } from './controls'
import { useUrlParams } from './use-url-params'

export function EffectPlayground({ slug }: { slug: string }) {
  const entry = getEffect(slug)!
  const { params, setParam, reset, permalink } = useUrlParams(entry.defaults, entry.controls)
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <EffectCanvas effect={entry.module} params={params} quality="full"
        ariaLabel={`${entry.title} animation`}
        className="aspect-[16/10] w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0c]" />
      <Controls specs={entry.controls} params={params} onChange={setParam} onReset={reset}
        onCopy={() => navigator.clipboard?.writeText(permalink()).catch(() => {})} />
    </div>
  )
}
