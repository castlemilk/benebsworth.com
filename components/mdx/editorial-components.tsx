import React from 'react'
import { cn } from '@/lib/utils'

export function StatGroup({ children }: { children: React.ReactNode }) {
  return (
    <dl className="not-prose my-10 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </dl>
  )
}

export function Stat({ label, value, context }: { label: React.ReactNode; value: React.ReactNode; context?: React.ReactNode }) {
  return (
    <div className="flex flex-col border-l-[3px] border-[var(--color-blog)]/60 pl-4 transition-colors hover:border-[var(--color-blog)]">
      <dt className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted">{label}</dt>
      <dd className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg">{value}</dd>
      {context && <dd className="mt-1.5 font-sans text-[0.85rem] leading-snug text-fg/60">{context}</dd>}
    </div>
  )
}

export function PullQuote({ children }: { children: React.ReactNode }) {
  // The quote styling lives on the blockquote and is force-applied to any
  // paragraph MDX wraps the children in. This lets authors write the quote on
  // its own lines (which MDX turns into a <p>) WITHOUT producing a <p> nested
  // inside a component <p> — the invalid nesting that triggers a hydration
  // mismatch. `blockquote > p` is valid; `p > p` is not.
  return (
    <blockquote className="not-prose my-14 border-l-[3px] border-[var(--color-blog)] pl-6 font-display text-[1.45rem] font-medium italic leading-[1.35] tracking-[-0.015em] text-fg/90 sm:pl-8 [&_p]:!m-0 [&_p]:!font-display [&_p]:!text-[1.45rem] [&_p]:!font-medium [&_p]:!italic [&_p]:!leading-[1.35] [&_p]:!tracking-[-0.015em] [&_p]:!text-fg/90">
      {children}
    </blockquote>
  )
}

export function Figure({ 
  src, 
  caption, 
  credit,
  placement = 'full' 
}: { 
  src: string; 
  caption?: React.ReactNode; 
  credit?: React.ReactNode;
  placement?: 'full' | 'left' | 'right' | 'inset' 
}) {
  const wrapperClasses = {
    full: 'my-14 w-full',
    left: 'my-10 w-full sm:float-left sm:mr-10 sm:w-[45%]',
    right: 'my-10 w-full sm:float-right sm:ml-10 sm:w-[45%]',
    inset: 'my-12 mx-auto w-full sm:w-3/4'
  }[placement]

  return (
    <figure className={cn("not-prose relative clear-both", wrapperClasses)}>
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-fg)_3%,transparent)] shadow-sm">
        { }
        <img src={src} alt={typeof caption === 'string' ? caption : ''} className="h-auto w-full object-cover" />
      </div>
      {(caption || credit) && (
        <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-2 px-1 font-mono text-[0.75rem] text-muted">
          {caption && <span className="flex-1 leading-relaxed text-fg/70">{caption}</span>}
          {credit && <span className="uppercase tracking-[0.1em] text-fg/40">{credit}</span>}
        </figcaption>
      )}
    </figure>
  )
}
