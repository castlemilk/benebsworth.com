'use client'

import { cn } from '@/lib/utils'
import { arriveAtArticleHeading, isPlainAnchorActivation, useArticleNavigation } from './use-article-navigation'

/** Authored sections; shared active state with the native mobile disclosure. */
export function TableOfContents({ className, label = 'On this page' }: { className?: string; label?: string }) {
  const { headings, activeId } = useArticleNavigation()
  if (headings.length === 0) return null

  return (
    <nav
      aria-label="Table of contents"
      style={{ top: 'var(--article-anchor-offset, 128px)', maxHeight: 'calc(100dvh - var(--article-anchor-offset, 128px) - 16px)', overflowY: 'auto' }}
      className={cn(
        'folio-toc text-[0.78rem]',
        'sticky',
        className,
      )}
    >
      <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted mb-3">
        {label}
      </h2>
      <ul className="m-0 list-none space-y-1 p-0">
        {headings.map((h) => {
          const isActive = activeId === h.id
          return (
            <li
              key={h.id}
              className={cn(
                'relative',
                h.level === 3 && 'pl-3', // indent H3s under their H2
              )}
            >
              <a
                href={`#${encodeURIComponent(h.id)}`}
                onClick={(event) => {
                  if (!isPlainAnchorActivation(event)) return
                  event.preventDefault()
                  arriveAtArticleHeading(h.id)
                }}
                aria-current={isActive ? 'location' : undefined}
                className={cn(
                  'block [overflow-wrap:anywhere] border-l py-1 pl-3 pr-2 leading-snug transition-colors',
                  isActive
                    ? 'border-blog text-fg'
                    : 'border-transparent text-muted hover:border-fg/30 hover:text-fg/80',
                )}
              >
                {h.text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
