'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { useScrollActivity } from '@/components/mdx/use-scroll-activity'

export type CategoryNavItem = {
  key: string
  label: string
  glyph: string
  accent: string
  count: number
}

export function CategoryNav({
  categories,
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategoryChange,
}: {
  categories: CategoryNavItem[]
  searchQuery: string
  onSearchChange: (q: string) => void
  activeCategory: string | null
  onCategoryChange: (key: string | null) => void
}) {
  const scrolling = useScrollActivity(200)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const total = categories.reduce((s, c) => s + c.count, 0)

  return (
    <div
      className={cn(
        'sticky top-[93px] z-30 -mx-6 border-b border-[var(--color-border)]/60 px-6 sm:-mx-8 sm:px-8',
        scrolling
          ? 'bg-[var(--color-bg)]'
          : 'bg-[var(--color-bg)]/75 backdrop-blur-md backdrop-saturate-150',
      )}
    >
      <div
        ref={listRef}
        className="flex items-center gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* ── Search ──────────────────────────────────────────── */}
        <div className="group/search relative shrink-0 pl-1">
          <svg
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted transition-colors duration-200 group-focus-within/search:text-fg/60"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search effects…"
            className={cn(
              'rounded-full border bg-transparent py-1.5 pl-8 font-mono text-[0.65rem] uppercase tracking-wider outline-none transition-all duration-300 ease-out',
              'placeholder:text-muted/50',
              searchQuery
                ? 'w-44 pr-8 border-[var(--color-fg)]/30 text-fg'
                : 'w-28 pr-3 focus:w-44 border-[var(--color-border)] text-fg/80 hover:border-[var(--color-muted)] focus:border-[var(--color-fg)]/30',
            )}
          />
          <button
            onClick={() => {
              onSearchChange('')
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
            className={cn(
              'absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 transition-all duration-200',
              searchQuery
                ? 'scale-100 opacity-100 text-muted hover:text-fg'
                : 'pointer-events-none scale-75 opacity-0',
            )}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <span className="h-4 w-px shrink-0 bg-[var(--color-border)]" />

        {/* ── All pill ───────────────────────────────────────── */}
        <button
          onClick={() => onCategoryChange(null)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[0.65rem] uppercase tracking-wider transition-all',
            !activeCategory
              ? 'border-current text-fg'
              : 'border-[var(--color-border)] text-muted hover:border-[var(--color-muted)]',
          )}
          style={
            !activeCategory
              ? { borderColor: 'var(--color-muted)', color: 'var(--color-fg)' }
              : undefined
          }
        >
          <span>All</span>
          <span
            className={cn(
              'ml-0.5 rounded-full px-1.5 text-[0.55rem] leading-[1.4]',
              !activeCategory
                ? 'bg-fg/15 text-fg'
                : 'bg-[var(--color-border)] text-muted',
            )}
          >
            {total}
          </span>
        </button>

        {/* ── Category pills ──────────────────────────────────── */}
        {categories.map((cat) => {
          const isActive = activeCategory === cat.key
          return (
            <button
              key={cat.key}
              onClick={() => onCategoryChange(isActive ? null : cat.key)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[0.65rem] uppercase tracking-wider transition-all',
                isActive
                  ? 'accent-ink border-current'
                  : 'border-[var(--color-border)] text-muted hover:border-[var(--color-muted)]',
              )}
              style={
                isActive
                  ? ({ '--ink': cat.accent, borderColor: cat.accent } as React.CSSProperties)
                  : undefined
              }
            >
              <span className="text-[0.85em]">{cat.glyph}</span>
              <span>{cat.label}</span>
              <span
                className={cn(
                  'ml-0.5 rounded-full px-1.5 text-[0.55rem] leading-[1.4]',
                  isActive ? 'bg-current/15 text-current' : 'bg-[var(--color-border)] text-muted',
                )}
              >
                {cat.count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
