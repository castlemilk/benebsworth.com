'use client'
import type { ReactNode } from 'react'
import { getEffect } from '@/lib/lab/registry'
import { useEffectModule } from '@/lib/lab/use-effect-module'
import type { EffectModule } from '@/lib/lab/types'
import { EffectCanvas } from './effect-canvas'
import { Controls } from './controls'
import { useUrlParams } from './use-url-params'

export function EffectPlayground({ slug, variant = 'panel', header }: { slug: string; variant?: 'panel' | 'editorial'; header?: ReactNode }) {
  const entry = getEffect(slug)!
  const effectModule = useEffectModule(slug)

  if (!effectModule) {
    return (
      <div className={variant === 'editorial' ? "lab-instrument" : "grid gap-6 lg:grid-cols-[1fr_320px]"}>
        <div>{header}<div className="aspect-[16/10] w-full min-w-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-stage)] animate-pulse" /></div>
        <div className="space-y-3">
          <div className="h-10 rounded-lg bg-[var(--color-border)]/30 animate-pulse" />
          <div className="h-10 rounded-lg bg-[var(--color-border)]/30 animate-pulse" />
          <div className="h-10 rounded-lg bg-[var(--color-border)]/30 animate-pulse" />
        </div>
      </div>
    )
  }

  return <EffectPlaygroundInner key={slug} slug={slug} title={entry.title} module={effectModule} variant={variant} header={header} />
}

function EffectPlaygroundInner({ slug, title, module, variant, header }: { slug: string; title: string; module: EffectModule; header?: ReactNode; variant: 'panel' | 'editorial' }) {
  const { params, setParam, reset, permalink } = useUrlParams(module.defaults, module.controls)
  return (
    <div className={variant === 'editorial' ? "lab-instrument" : "grid gap-6 lg:grid-cols-[1fr_320px]"}>
      <div className={variant === 'editorial' ? 'lab-instrument-stage' : ''}>
        {header}
        <EffectCanvas effect={module} params={params} quality="full"
          ariaLabel={`${title} animation`}
          className="aspect-[16/10] w-full min-w-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-stage)]" />
        {variant === 'editorial' && slug === 'wave-superposition' && <div className="lab-instrument-legend" aria-label="Wave legend">
          <span><i style={{background:String(params.color)}} />Result (sum)</span>
          {Boolean(params.showComponents) && <><span><i style={{background:'#00c8b4'}} />Wave 1 · {Number(params.freq1)} Hz</span><span><i style={{background:'#e68c3c'}} />Wave 2 · {Number(params.freq2)} Hz</span></>}
        </div>}
      </div>
      <Controls category={getEffect(slug)?.category} title={title} variant={variant} specs={module.controls} params={params} onChange={setParam} onReset={reset}
        onCopy={() => navigator.clipboard?.writeText(permalink()).catch(() => {})} />
    </div>
  )
}
