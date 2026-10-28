'use client'

import type { ReactNode } from 'react'
import { InteractiveStudy } from '@/components/mdx/interactive-study'

export interface DemoFrameProps {
  title: string
  accent: string
  blurb?: string
  children: ReactNode
  className?: string
  controls?: ReactNode
  /** Only supply a hint for a real interaction inside this frame. */
  hint?: string
  targetSelector?: string
}

export function DemoFrame({ title, accent, blurb, children, className = '', controls, hint, targetSelector }: DemoFrameProps) {
  return (
    <InteractiveStudy
      title={title}
      className={className}
      hint={hint}
      targetSelector={targetSelector}
      controls={controls ? <div data-study-target className="flex flex-wrap items-center gap-2">{controls}</div> : undefined}
    >
      <div className="flex items-center gap-2.5 px-4 py-2">
        <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
        {blurb && <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[var(--color-muted)]">{blurb}</p>}
      </div>
      <div className="relative min-h-[220px] bg-[var(--color-stage)]">{children}</div>
    </InteractiveStudy>
  )
}
