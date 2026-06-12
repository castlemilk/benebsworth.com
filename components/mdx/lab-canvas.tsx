'use client'
import { useState, useCallback } from 'react'
import { getEffect } from '@/lib/lab/registry'
import { EffectCanvas } from '@/components/lab/effect-canvas'
import { Controls } from '@/components/lab/controls'
import type { Params, ParamValue } from '@/lib/lab/types'

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
  const initial: Params = entry ? { ...entry.defaults, ...overrides } : {}
  const [params, setParams] = useState<Params>(initial)
  const setParam = useCallback((key: string, value: ParamValue) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }, [])

  if (!entry) return <p className="text-red-400">Unknown effect: {slug}</p>

  return (
    <figure className="not-prose my-8">
      <div
        className="w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-stage)]"
        style={{ height }}
      >
        <EffectCanvas
          effect={entry.module}
          params={params}
          quality="mini"
          ariaLabel={`${entry.title} diagram`}
          className="h-full w-full"
        />
      </div>
      {controls && entry.controls.length > 0 && (
        <div className="mt-3">
          <Controls
            specs={entry.controls}
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
  const initial: Params = entry ? { ...entry.defaults, ...overrides } : {}
  const [params, setParams] = useState<Params>(initial)
  const setParam = useCallback((key: string, value: ParamValue) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }, [])

  if (!entry) return <p className="text-red-400">Unknown effect: {slug}</p>

  return (
    <section className="not-prose my-10">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={reverse ? 'lg:order-2' : ''}>
          <div
            className="w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-stage)]"
            style={{ height }}
          >
            <EffectCanvas
              effect={entry.module}
              params={params}
              quality="mini"
              ariaLabel={`${entry.title} diagram`}
              className="h-full w-full"
            />
          </div>
          {controls && entry.controls.length > 0 && (
            <div className="mt-3">
              <Controls
                specs={entry.controls}
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
