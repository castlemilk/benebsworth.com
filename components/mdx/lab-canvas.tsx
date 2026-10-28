'use client'
import { useState, useCallback, type ReactNode } from 'react'
import { getEffect } from '@/lib/lab/registry'
import { useEffectModule } from '@/lib/lab/use-effect-module'
import type { EffectModule, Params, ParamValue } from '@/lib/lab/types'
import { EffectCanvas } from '@/components/lab/effect-canvas'
import { Controls } from '@/components/lab/controls'
import styles from './lab-canvas.module.css'

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
      <div className="not-prose my-8">
        <LabFigure title={entry.title} height={height} caption={caption}>
          <div className="h-full w-full motion-safe:animate-pulse" />
        </LabFigure>
      </div>
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
    <div className="not-prose my-8">
      <LabFigure
        title={title}
        height={height}
        caption={caption}
        controls={controls && module.controls.length > 0 ? (
          <Controls
            variant="editorial"
            specs={module.controls}
            params={params}
            onChange={setParam}
            onReset={() => setParams(initial)}
          />
        ) : undefined}
      >
        <EffectCanvas
          effect={module}
          params={params}
          quality="mini"
          ariaLabel={`${title} diagram`}
          className="h-full w-full"
        />
      </LabFigure>
    </div>
  )
}

/**
 * Side-by-side layout: text on one side, canvas on the other.
 * Stacks whenever the containing column cannot comfortably fit both sides.
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
  children: ReactNode
}) {
  const entry = getEffect(slug)
  const effectModule = useEffectModule(slug)

  if (!entry) return <p className="text-red-400">Unknown effect: {slug}</p>

  if (!effectModule) {
    return (
      <LabSideLayout reverse={reverse} commentary={children}>
        <LabFigure title={entry.title} height={height} caption={caption}>
          <div className="h-full w-full motion-safe:animate-pulse" />
        </LabFigure>
      </LabSideLayout>
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
  children: ReactNode
}) {
  const reconcile = module.reconcileParams
  const base: Params = { ...module.defaults, ...overrides }
  const initial: Params = reconcile ? reconcile(base) : base
  const [params, setParams] = useState<Params>(initial)
  const setParam = useCallback((key: string, value: ParamValue) => {
    setParams((prev) => (reconcile ? reconcile(prev, { key, value }) : { ...prev, [key]: value }))
  }, [reconcile])

  return (
    <LabSideLayout reverse={reverse} commentary={children}>
      <LabFigure
        title={title}
        height={height}
        caption={caption}
        controls={controls && module.controls.length > 0 ? (
          <Controls
            variant="editorial"
            specs={module.controls}
            params={params}
            onChange={setParam}
            onReset={() => setParams(initial)}
          />
        ) : undefined}
      >
        <EffectCanvas
          effect={module}
          params={params}
          quality="mini"
          ariaLabel={`${title} diagram`}
          className="h-full w-full"
        />
      </LabFigure>
    </LabSideLayout>
  )
}

// Shared shells keep loading and mounted figures in the same composition.
function LabSideLayout({ reverse, commentary, children }: {
  reverse?: boolean
  commentary: ReactNode
  children: ReactNode
}) {
  return (
    <section className={`not-prose my-10 ${styles.side}`}>
      <div className={`${styles.layout}${reverse ? ` ${styles.reversed}` : ''}`}>
        {children}
        <div className={`prose dark:prose-invert max-w-none ${styles.commentary}`}>
          {commentary}
        </div>
      </div>
    </section>
  )
}

function LabFigure({ title, height, caption, controls, children }: {
  title: string
  height: number
  caption?: string
  controls?: ReactNode
  children: ReactNode
}) {
  return (
    <div className={styles.figure}>
      <figure className={styles.media} aria-label={title}>
        <div className={styles.title}>{title}</div>
        <div className={styles.stage} style={{ height }}>
          {children}
        </div>
        {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
      </figure>
      {controls && <div className={styles.actions}>{controls}</div>}
    </div>
  )
}
