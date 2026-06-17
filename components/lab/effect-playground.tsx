'use client'
import { getEffect } from '@/lib/lab/registry'
import { useEffectModule } from '@/lib/lab/use-effect-module'
import type { EffectModule } from '@/lib/lab/types'
import { EffectCanvas } from './effect-canvas'
import { Controls } from './controls'
import { useUrlParams } from './use-url-params'

export function EffectPlayground({ slug }: { slug: string }) {
  const entry = getEffect(slug)!
  const effectModule = useEffectModule(slug)

  if (!effectModule) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="aspect-[16/10] w-full min-w-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-stage)] animate-pulse" />
        <div className="space-y-3">
          <div className="h-10 rounded-lg bg-[var(--color-border)]/30 animate-pulse" />
          <div className="h-10 rounded-lg bg-[var(--color-border)]/30 animate-pulse" />
          <div className="h-10 rounded-lg bg-[var(--color-border)]/30 animate-pulse" />
        </div>
      </div>
    )
  }

  return <EffectPlaygroundInner key={slug} slug={slug} title={entry.title} module={effectModule} />
}

function EffectPlaygroundInner({ slug, title, module }: { slug: string; title: string; module: EffectModule }) {
  void slug
  const { params, setParam, reset, permalink } = useUrlParams(module.defaults, module.controls)
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <EffectCanvas effect={module} params={params} quality="full"
        ariaLabel={`${title} animation`}
        className="aspect-[16/10] w-full min-w-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-stage)]" />
      <Controls specs={module.controls} params={params} onChange={setParam} onReset={reset}
        onCopy={() => navigator.clipboard?.writeText(permalink()).catch(() => {})} />
    </div>
  )
}
