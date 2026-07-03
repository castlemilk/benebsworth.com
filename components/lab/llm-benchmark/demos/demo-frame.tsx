'use client'

import type { ReactNode } from 'react'

export interface DemoFrameProps {
  title: string
  accent: string
  blurb?: string
  children: ReactNode
  className?: string
  controls?: ReactNode
}

export function DemoFrame({ title, accent, blurb, children, className = '', controls }: DemoFrameProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
          <h3 className="type-h3 text-sm">{title}</h3>
        </div>
        {controls && <div className="flex items-center gap-2">{controls}</div>}
      </div>
      {blurb && <p className="px-4 py-2 font-mono text-[0.65rem] uppercase tracking-wider text-[var(--color-muted)]">{blurb}</p>}
      <div className="relative min-h-[220px] bg-[var(--color-stage)]">{children}</div>
    </div>
  )
}
