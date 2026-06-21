'use client'
import { useState, useCallback } from 'react'
import { getEffect } from '@/lib/lab/registry'
import { useEffectModule } from '@/lib/lab/use-effect-module'
import type { EffectModule, Params, ParamValue } from '@/lib/lab/types'
import { EffectCanvas } from '@/components/lab/effect-canvas'
import { Controls } from '@/components/lab/controls'

/**
 * Inline interactive canvas for MDX knowledge articles.
 * Renders any registered lab effect with optional live controls.
 */
export function LabCanvas({
  effect: slug,
  height = 320,
  params: overrides,
  caption,
  controls = true,
}: {
  effect: string
  height?: number
  params?: Record<string, number | boolean | string>
  caption?: string
  controls?: boolean
}) {
  const entry = getEffect(slug)
  const effectModule = useEffectModule(slug)

  if (!entry) return <p className="text-red-400">Unknown effect: {slug}</p>

  if (!effectModule) {
    return (
      <figure className="not-prose my-8">
        <div
          className="w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-stage)]"
          style={{ height }}
        >
          <div className="h-full w-full animate-pulse" />
        </div>
      </figure>
    )
  }

  return (
    <LabCanvasInner
      key={slug}
      title={entry.title}
      module={effectModule}
      height={height}
      overrides={overrides}
      caption={caption}
      controls={controls}
    />
  )
}

function LabCanvasInner({
  title,
  module,
  height,
  overrides,
  caption,
  controls,
}: {
  title: string
  module: EffectModule
  height: number
  overrides?: Record<string, number | boolean | string>
  caption?: string
  controls?: boolean
}) {
  const reconcile = module.reconcileParams
  const base: Params = { ...module.defaults, ...overrides }
  const initial: Params = reconcile ? reconcile(base) : base
  const [params, setParams] = useState<Params>(initial)
  const setParam = useCallback((key: string, value: ParamValue) => {
    setParams((prev) => (reconcile ? reconcile(prev, { key, value }) : { ...prev, [key]: value }))
  }, [reconcile])

  return (
    <figure className="not-prose my-8">
      <div
        className="w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-stage)]"
        style={{ height }}
      >
        <EffectCanvas
          effect={module}
          params={params}
          quality="mini"
          ariaLabel={`${title} diagram`}
          className="h-full w-full"
        />
      </div>
      {controls && module.controls.length > 0 && (
        <div className="mt-3">
          <Controls
            specs={module.controls}
            params={params}
            onChange={setParam}
            onReset={() => setParams(initial)}
            onCopy={() => {}}
          />
        </div>
      )}
      {caption && (
        <figcaption className="mt-3 text-center text-sm text-[var(--color-muted)]">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

/**
 * Side-by-side layout: text on one side, canvas on the other.
 * On mobile, stacks vertically.
 */
export function LabSide({
  effect: slug,
  height = 320,
  params: overrides,
  controls = true,
  caption,
  reverse = false,
  children,
}: {
  effect: string
  height?: number
  params?: Record<string, number | boolean | string>
  controls?: boolean
  caption?: string
  reverse?: boolean
  children: React.ReactNode
}) {
  const entry = getEffect(slug)
  const effectModule = useEffectModule(slug)

  if (!entry) return <p className="text-red-400">Unknown effect: {slug}</p>

  if (!effectModule) {
    return (
      <section className="not-prose my-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={reverse ? 'lg:order-2' : ''}>
            <div
              className="w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-stage)]"
              style={{ height }}
            >
              <div className="h-full w-full animate-pulse" />
            </div>
          </div>
          <div className={`prose dark:prose-invert max-w-none flex flex-col justify-center ${reverse ? 'lg:order-1' : ''}`}>
            {children}
          </div>
        </div>
      </section>
    )
  }

  return (
    <LabSideInner
      key={slug}
      title={entry.title}
      module={effectModule}
      height={height}
      overrides={overrides}
      caption={caption}
      controls={controls}
      reverse={reverse}
    >
      {children}
    </LabSideInner>
  )
}

function LabSideInner({
  title,
  module,
  height,
  overrides,
  caption,
  controls,
  reverse,
  children,
}: {
  title: string
  module: EffectModule
  height: number
  overrides?: Record<string, number | boolean | string>
  caption?: string
  controls?: boolean
  reverse?: boolean
  children: React.ReactNode
}) {
  const reconcile = module.reconcileParams
  const base: Params = { ...module.defaults, ...overrides }
  const initial: Params = reconcile ? reconcile(base) : base
  const [params, setParams] = useState<Params>(initial)
  const setParam = useCallback((key: string, value: ParamValue) => {
    setParams((prev) => (reconcile ? reconcile(prev, { key, value }) : { ...prev, [key]: value }))
  }, [reconcile])

  return (
    <section className="not-prose my-10">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={reverse ? 'lg:order-2' : ''}>
          <div
            className="w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-stage)]"
            style={{ height }}
          >
            <EffectCanvas
              effect={module}
              params={params}
              quality="mini"
              ariaLabel={`${title} diagram`}
              className="h-full w-full"
            />
          </div>
          {controls && module.controls.length > 0 && (
            <div className="mt-3">
              <Controls
                specs={module.controls}
                params={params}
                onChange={setParam}
                onReset={() => setParams(initial)}
                onCopy={() => {}}
              />
            </div>
          )}
          {caption && (
            <p className="mt-2 text-center text-sm text-[var(--color-muted)]">{caption}</p>
          )}
        </div>
        <div className={`prose dark:prose-invert max-w-none flex flex-col justify-center ${reverse ? 'lg:order-1' : ''}`}>
          {children}
        </div>
      </div>
    </section>
  )
}
