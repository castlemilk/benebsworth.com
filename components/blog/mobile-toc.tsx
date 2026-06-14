'use client'

import { useState, useEffect } from 'react'

export function MobileToc() {
  const [headings, setHeadings] = useState<{ id: string; title: string; level: number }[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Only query within the article to avoid picking up footer/sidebar headings
    const elements = document.querySelectorAll('article h2[id], article h3[id]')
    const parsed = Array.from(elements).map((el) => ({
      id: el.id,
      title: el.textContent || '',
      level: el.tagName === 'H2' ? 2 : 3,
    }))
    setHeadings(parsed)
  }, [])

  if (headings.length === 0) return null

  return (
    <details
      className="mb-8 rounded-lg border border-[var(--color-border)] bg-surface p-4 lg:hidden"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer font-mono text-[0.7rem] uppercase tracking-[0.18em] text-fg/80 marker:text-muted">
        On this page
      </summary>
      <nav className="mt-4 flex flex-col gap-2.5 border-t border-[var(--color-border)]/50 pt-4">
        {headings.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            onClick={(e) => {
              e.preventDefault()
              const el = document.getElementById(h.id)
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' })
                setOpen(false)
              }
            }}
            className={`font-sans text-[0.9rem] leading-snug transition-colors hover:text-fg ${
              h.level === 3 ? 'ml-4 text-muted' : 'text-fg/85'
            }`}
          >
            {h.title}
          </a>
        ))}
      </nav>
    </details>
  )
}
