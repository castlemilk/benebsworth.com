'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { CATEGORIES, effectsByCategory, LAB_EFFECTS } from '@/lib/lab/registry'
import type { LabEntry } from '@/lib/lab/registry'
import { tagColor } from '@/lib/tag-colors'
import { LabCard } from '@/components/lab/lab-card'
import { CategoryNav, type CategoryNavItem } from '@/components/lab/category-nav'
import { Reveal } from '@/components/motion/reveal'

const CATEGORY_ACCENT: Record<string, string> = {
  art: '#00e0b8',
  maths: '#7c5cff',
  physics: '#ff7a59',
  engineering: '#00b4d8',
}

function catMeta(key: string) {
  return CATEGORIES.find((c) => c.key === key)!
}

function LabCardLink({ e }: { e: LabEntry }) {
  const accent = CATEGORY_ACCENT[e.category] ?? '#7c5cff'
  const cat = catMeta(e.category)
  return (
    <Link
      href={`/lab/${e.slug}/`}
      className="group min-w-0 rounded-2xl border border-[var(--color-border)] bg-surface p-4 transition hover:border-[var(--color-muted)]"
    >
      <LabCard slug={e.slug} />
      <div className="mt-4 flex items-start justify-between gap-3">
        <h3 className="type-h3">{e.title}</h3>
        <span
          className="accent-ink mt-0.5 shrink-0 rounded-full border px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider"
          style={{ '--ink': accent, borderColor: accent } as React.CSSProperties}
        >
          {cat.glyph} {cat.label}
        </span>
      </div>
      <p className="mt-1 type-body text-fg/65">{e.blurb}</p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {e.tags.map((t) => {
          const c = tagColor(t)
          return (
            <li
              key={t}
              className="accent-ink rounded-full border px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider"
              style={{
                '--ink': c,
                borderColor: `color-mix(in srgb, ${c} 40%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${c} 14%, transparent)`,
              } as React.CSSProperties}
            >
              {t}
            </li>
          )
        })}
      </ul>
    </Link>
  )
}

export function LabContent({ navItems }: { navItems: CategoryNavItem[] }) {
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let results = LAB_EFFECTS
    if (q) {
      results = results.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.blurb.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    if (categoryFilter) {
      results = results.filter((e) => e.category === categoryFilter)
    }
    if (!q && !categoryFilter) return null
    return results
  }, [query, categoryFilter])

  const filterLabel = (() => {
    const parts: string[] = []
    if (query) parts.push(`"${query}"`)
    if (categoryFilter) parts.push(catMeta(categoryFilter).label)
    return parts.join(' · ')
  })()

  return (
    <>
      <CategoryNav
        categories={navItems}
        searchQuery={query}
        onSearchChange={setQuery}
        activeCategory={categoryFilter}
        onCategoryChange={setCategoryFilter}
      />

      {filtered !== null ? (
        /* ── Filtered results ───────────────────────────── */
        <section className="py-16">
          <div className="mb-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              {filterLabel && <> for {filterLabel}</>}
            </p>
          </div>
          {filtered.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {filtered.map((e) => (
                <LabCardLink key={e.slug} e={e} />
              ))}
            </div>
          ) : (
            <p className="type-body text-muted">
              No effects match your search. Try a different term.
            </p>
          )}
        </section>
      ) : (
        /* ── Category sections ───────────────────────────── */
        CATEGORIES.map((cat, ci) => {
          const effects = effectsByCategory(cat.key)
          if (effects.length === 0) return null
          const accent = CATEGORY_ACCENT[cat.key] ?? '#7c5cff'

          return (
            <Reveal key={cat.key} delay={ci * 60}>
              <section
                id={`cat-${cat.key}`}
                className="scroll-mt-36 border-l-2 py-16 pl-6 sm:pl-8"
                style={{ borderColor: accent }}
              >
                <div className="mb-8">
                  <h2 className="type-h2">
                    <span
                      className="accent-ink mr-2 inline-block text-[0.85em]"
                      style={{ '--ink': accent } as React.CSSProperties}
                    >
                      {cat.glyph}
                    </span>
                    <span className="opacity-40">·</span>
                    <span className="ml-2">{cat.label}</span>
                  </h2>
                  <p className="mt-2 max-w-prose type-body text-fg/60">{cat.blurb}</p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  {effects.map((e) => (
                    <LabCardLink key={e.slug} e={e} />
                  ))}
                </div>
              </section>
            </Reveal>
          )
        })
      )}
    </>
  )
}
