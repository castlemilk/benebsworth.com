'use client'

import { useMemo, useRef, useState } from 'react'
import type { VectorBatchManifest, VectorItem } from '@/lib/vectors/registry'
import { VECTOR_CATEGORIES } from '@/lib/vectors/registry'
import { VectorCard, type CardScale, type StageBg } from '@/components/vectors/vector-card'
import { VectorStudioModal } from '@/components/vectors/vector-studio-modal'
import { cn } from '@/lib/utils'

interface VectorGalleryViewProps {
  batches: VectorBatchManifest[]
  allVectors: VectorItem[]
}

/** Category and free-text filters intersect; the query matches name, role, description, category and prompt. */
export function filterVectors(all: VectorItem[], category: string, query: string): VectorItem[] {
  const q = query.trim().toLowerCase()
  return all.filter((item) => {
    if (category !== 'all' && item.categoryKey !== category) return false
    if (!q) return true
    return [item.name, item.semantic_role, item.description, item.category, item.generation_prompt].some((field) =>
      field.toLowerCase().includes(q),
    )
  })
}

const GRID_COLUMNS: Record<CardScale, string> = {
  sm: 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6',
  md: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
  lg: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
}

// Compact on phones so six categories wrap into three rows rather than six; counts return from `sm` up.
const pill =
  'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-h-11 sm:px-3.5 sm:text-sm forced-colors:aria-pressed:border-2 forced-colors:aria-pressed:border-[color:Highlight]'
const pillOff = 'border-[var(--color-border)] text-muted hover:border-[var(--color-fg)] hover:text-[var(--color-fg)]'
const pillOn = 'border-[var(--color-fg)] bg-[var(--color-fg)] text-[var(--color-bg)]'

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex flex-wrap rounded-md border border-[var(--color-border)] p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-9 rounded px-2.5 text-xs transition-colors forced-colors:aria-pressed:bg-[color:Highlight] forced-colors:aria-pressed:text-[color:HighlightText]',
              option.value === value
                ? 'bg-[var(--color-fg)] font-medium text-[var(--color-bg)]'
                : 'text-muted hover:text-[var(--color-fg)]',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * The marks are the subject. Controls are one ruled toolbar — category
 * toggles, a labelled search, matte and size — with no card shell, sticky
 * overlay or accent tints competing with the artwork. Filters intersect,
 * the result count is announced, and the empty state names what was asked
 * for and offers one honest way back that returns focus to the search field.
 */
export function VectorGalleryView({ batches, allVectors }: VectorGalleryViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [stageBg, setStageBg] = useState<StageBg>('dark')
  const [cardScale, setCardScale] = useState<CardScale>('md')
  const [inspectingItem, setInspectingItem] = useState<VectorItem | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const filteredVectors = useMemo(
    () => filterVectors(allVectors, selectedCategory, searchQuery),
    [allVectors, selectedCategory, searchQuery],
  )
  const activeCategory = VECTOR_CATEGORIES.find((category) => category.key === selectedCategory)
  const activeBatch = inspectingItem ? batches.find((batch) => batch.id === inspectingItem.batchId) : undefined
  const trimmedQuery = searchQuery.trim()

  const clearSearch = () => {
    setSearchQuery('')
    searchRef.current?.focus()
  }
  const resetFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    searchRef.current?.focus()
  }

  const scope = (
    <>
      {activeCategory && <> in {activeCategory.label}</>}
      {trimmedQuery && <> matching &ldquo;{trimmedQuery}&rdquo;</>}
    </>
  )

  return (
    <div className="w-full">
      <div className="border-y border-[var(--color-border)] py-4" role="region" aria-label="Gallery controls">
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
            className={cn(pill, selectedCategory === 'all' ? pillOn : pillOff)}
          >
            All <span className="hidden font-mono text-xs tabular-nums sm:inline">{allVectors.length}</span>
          </button>
          {VECTOR_CATEGORIES.map((category) => {
            const count = allVectors.filter((item) => item.categoryKey === category.key).length
            const pressed = selectedCategory === category.key
            return (
              <button
                key={category.key}
                type="button"
                aria-pressed={pressed}
                onClick={() => setSelectedCategory(category.key)}
                className={cn(pill, pressed ? pillOn : pillOff)}
              >
                <span aria-hidden="true" className="font-mono text-xs">{category.glyph}</span>
                {category.label}
                <span className="hidden font-mono text-xs tabular-nums sm:inline">{count}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="relative min-w-0 flex-1 basis-64">
            <label htmlFor="vector-search" className="sr-only">Search vectors</label>
            <input
              id="vector-search"
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, role or concept"
              autoComplete="off"
              className="h-11 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 pr-16 text-sm text-[var(--color-fg)] placeholder:text-muted focus:border-[var(--color-fg)] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute top-1/2 right-1.5 min-h-8 -translate-y-1/2 rounded px-2 text-xs text-muted underline underline-offset-4 hover:text-[var(--color-fg)]"
              >
                Clear
              </button>
            )}
          </div>
          <Segmented
            label="Matte"
            value={stageBg}
            onChange={setStageBg}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'blueprint', label: 'Blueprint' },
              { value: 'light', label: 'Light' },
              { value: 'checker', label: 'Checker' },
            ]}
          />
          <Segmented
            label="Size"
            value={cardScale}
            onChange={setCardScale}
            options={[
              { value: 'sm', label: 'S' },
              { value: 'md', label: 'M' },
              { value: 'lg', label: 'L' },
            ]}
          />
        </div>
      </div>

      <div className="my-5 text-sm text-muted">
        {/* Only the count is announced; the category description is read in place, not on every keystroke. */}
        <p role="status" aria-live="polite" data-vector-count>
          Showing <strong className="font-medium text-[var(--color-fg)]">{filteredVectors.length}</strong> of {allVectors.length}{' '}
          vectors{scope}.
        </p>
        {activeCategory && <p className="mt-1">{activeCategory.description}</p>}
      </div>

      {filteredVectors.length > 0 ? (
        <div className={cn('grid gap-x-4 gap-y-6 sm:gap-x-6', GRID_COLUMNS[cardScale])}>
          {filteredVectors.map((item) => (
            <VectorCard
              key={item.id}
              item={item}
              previewBg={stageBg}
              scaleSize={cardScale}
              onInspect={(vector) => setInspectingItem(vector)}
            />
          ))}
        </div>
      ) : (
        <div className="border-t border-[var(--color-border)] py-10" data-vector-empty>
          <h3 className="font-display text-lg font-semibold text-[var(--color-fg)]">No vectors match</h3>
          <p className="mt-1 max-w-prose text-sm text-muted">
            Nothing{scope}. Try another word, or clear the search and category.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex min-h-11 items-center rounded-md border border-[var(--color-border)] px-4 text-sm text-[var(--color-fg)] hover:border-[var(--color-fg)]"
          >
            Clear search and filters
          </button>
        </div>
      )}

      <VectorStudioModal item={inspectingItem} batch={activeBatch} onClose={() => setInspectingItem(null)} />
    </div>
  )
}
