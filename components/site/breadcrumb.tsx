'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useScrollActivity } from '@/components/mdx/use-scroll-activity'

export type Crumb = { label: string; href?: string }

/**
 * Hierarchical breadcrumb trail shown at the top of every section/detail view,
 * giving a consistent way back to Home (and the parent section). Ancestors are
 * links; the final crumb is the current page (not linked, truncated so a long
 * post title can't blow out the line). Matches the site's mono / uppercase /
 * tracked label treatment.
 *
 * Sticky mode: when `sticky` is true (the default), the breadcrumb is pinned
 * to the top of the viewport (just below the sticky SiteNav) and gets a
 * backdrop-blur treatment so the page content scrolls underneath it cleanly.
 * The CSS uses a z-index of 40 so it sits below the SiteNav (z-50) but above
 * the rest of the page content.
 *
 * Performance: same pattern as SiteNav — we drop the backdrop-blur during
 * active scroll to avoid the GPU blur pass on every frame, then restore it
 * 200ms after the scroll settles. The SiteNav reads `useScrollActivity` too,
 * so both layers switch in lockstep.
 */
export function Breadcrumb({
  items,
  className = '',
  sticky = true,
}: {
  items: Crumb[]
  className?: string
  sticky?: boolean
}) {
  const scrolling = useScrollActivity(200)
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        sticky
          ? `sticky top-[57px] z-40 border-b border-[var(--color-border)]/60 ${
              scrolling
                ? // Active scroll: solid, no blur.
                  'bg-[var(--color-bg)]'
                : // Idle: frosted glass.
                  'bg-[var(--color-bg)]/70 backdrop-blur-md backdrop-saturate-150'
            }`
          : '',
        className,
      )}
    >
      <div className={sticky ? 'mx-auto w-full max-w-6xl px-6 py-2.5 sm:px-8' : ''}>
        <ol
          className={
            sticky
              ? 'flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted'
              : 'flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted'
          }
        >
          {items.map((it, i) => {
            const last = i === items.length - 1
            return (
              <li key={i} className="flex min-w-0 items-center gap-x-2.5">
                {it.href && !last ? (
                  <Link href={it.href} className="shrink-0 transition-colors hover:text-fg">
                    {it.label}
                  </Link>
                ) : (
                  <span
                    aria-current={last ? 'page' : undefined}
                    className={
                      last
                        ? 'block max-w-[55vw] truncate text-fg/80 sm:max-w-sm'
                        : 'shrink-0'
                    }
                  >
                    {it.label}
                  </span>
                )}
                {!last && (
                  <span aria-hidden className="shrink-0 text-muted/45">
                    /
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
