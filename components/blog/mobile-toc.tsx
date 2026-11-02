'use client'

import { arriveAtArticleHeading, isPlainAnchorActivation, useArticleNavigation } from './use-article-navigation'

export function MobileToc() {
  const { headings, activeId } = useArticleNavigation()
  if (headings.length === 0) return null

  return (
    <details
      className="mb-8 rounded-lg border border-[var(--color-border)] bg-surface p-4 lg:hidden"
    >
      <summary className="cursor-pointer font-mono text-[0.7rem] uppercase tracking-[0.18em] text-fg/80 marker:text-muted">
        On this page
      </summary>
      <nav aria-label="Table of contents" className="mt-4 flex flex-col gap-2.5 border-t border-[var(--color-border)]/50 pt-4">
        {headings.map((h) => (
          <a
            key={h.id}
            href={`#${encodeURIComponent(h.id)}`}
            aria-current={activeId === h.id ? 'location' : undefined}
            onClick={(event) => {
              if (!isPlainAnchorActivation(event)) return
              event.preventDefault()
              // Collapse synchronously before measuring the destination: the
              // disclosure is upstream of every authored section.
              const details = event.currentTarget.closest('details')
              if (details) details.open = false
              arriveAtArticleHeading(h.id)
            }}
            className={`[overflow-wrap:anywhere] font-sans text-[0.9rem] leading-snug transition-colors hover:text-fg ${
              `${h.level === 3 ? 'ml-4' : ''} ${activeId === h.id ? 'text-fg underline underline-offset-4' : h.level === 3 ? 'text-muted' : 'text-fg/85'}`
            }`}
          >
            {h.text}
          </a>
        ))}
      </nav>
    </details>
  )
}
