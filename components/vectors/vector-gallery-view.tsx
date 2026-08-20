'use client'

import { useState, useMemo } from 'react'
import { Search, SlidersHorizontal, Sparkles, Filter, Layers, Download, Check } from 'lucide-react'
import type { VectorBatchManifest, VectorCategory, VectorItem } from '@/lib/vectors/registry'
import { VECTOR_CATEGORIES } from '@/lib/vectors/registry'
import { VectorCard } from '@/components/vectors/vector-card'
import { VectorStudioModal } from '@/components/vectors/vector-studio-modal'
import { Reveal } from '@/components/motion/reveal'
import { cn } from '@/lib/utils'

interface VectorGalleryViewProps {
  batches: VectorBatchManifest[]
  allVectors: VectorItem[]
}

type StageBg = 'dark' | 'blueprint' | 'light' | 'checker' | 'tint'
type CardScale = 'sm' | 'md' | 'lg'

export function VectorGalleryView({ batches, allVectors }: VectorGalleryViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [stageBg, setStageBg] = useState<StageBg>('dark')
  const [cardScale, setCardScale] = useState<CardScale>('md')
  const [inspectingItem, setInspectingItem] = useState<VectorItem | null>(null)

  // Filter vectors by category and search term
  const filteredVectors = useMemo(() => {
    return allVectors.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.categoryKey === selectedCategory

      if (!matchesCategory) return false

      if (!searchQuery.trim()) return true

      const query = searchQuery.toLowerCase()
      return (
        item.name.toLowerCase().includes(query) ||
        item.semantic_role.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.generation_prompt.toLowerCase().includes(query)
      )
    })
  }, [allVectors, selectedCategory, searchQuery])

  const activeBatch = useMemo(() => {
    if (!inspectingItem) return undefined
    return batches.find((b) => b.id === inspectingItem.batchId)
  }, [batches, inspectingItem])

  const gridColumnsClass = {
    sm: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
    md: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    lg: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4',
  }[cardScale]

  return (
    <div className="w-full">
      {/* Control Bar: Categories, Search, Stage & Size Options */}
      <div className="sticky top-20 z-30 mb-8 rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-bg)]/85 p-4 shadow-lg backdrop-blur-md">
        <div className="flex flex-col gap-4">
          {/* Top Row: Category Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono text-xs font-medium transition-all duration-200',
                selectedCategory === 'all'
                  ? 'border-[var(--color-fg)] bg-[var(--color-fg)] text-[var(--color-bg)] shadow-sm'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-muted-foreground hover:border-[var(--color-fg)] hover:text-[var(--color-fg)]',
              )}
            >
              <span>◈</span>
              <span>All Sets</span>
              <span className="ml-1 rounded-full bg-white/15 px-1.5 py-0.2 font-mono text-[10px]">
                {allVectors.length}
              </span>
            </button>

            {VECTOR_CATEGORIES.map((cat) => {
              const count = allVectors.filter((v) => v.categoryKey === cat.key).length
              const isSelected = selectedCategory === cat.key
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono text-xs font-medium transition-all duration-200',
                    isSelected
                      ? 'shadow-sm font-semibold'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-muted-foreground hover:border-[var(--color-fg)] hover:text-[var(--color-fg)]',
                  )}
                  style={{
                    borderColor: isSelected ? cat.accent : undefined,
                    backgroundColor: isSelected ? `${cat.accent}20` : undefined,
                    color: isSelected ? cat.accent : undefined,
                  }}
                >
                  <span style={{ color: cat.accent }}>{cat.glyph}</span>
                  <span>{cat.label}</span>
                  <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.2 font-mono text-[10px]">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Bottom Row: Search Input + Stage Mode + Grid Scale */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)]/50 pt-3">
            {/* Search Bar */}
            <div className="relative min-w-[240px] flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by vector name, semantic role, or concept..."
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 py-2 pl-9 pr-4 text-xs text-[var(--color-fg)] placeholder:text-muted-foreground focus:border-cyan-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground hover:text-[var(--color-fg)]"
                >
                  clear
                </button>
              )}
            </div>

            {/* Quick Display Switches: Stage Background & Card Scale */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Background Selector */}
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-muted-foreground">Grid Matte:</span>
                <div className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-0.5">
                  {(['dark', 'blueprint', 'light', 'checker'] as StageBg[]).map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setStageBg(bg)}
                      className={cn(
                        'rounded px-2 py-1 font-mono text-[10px] capitalize transition-colors',
                        stageBg === bg
                          ? 'bg-[var(--color-surface)] text-[var(--color-fg)] font-semibold shadow-xs'
                          : 'text-muted-foreground hover:text-[var(--color-fg)]',
                      )}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Scale Selector */}
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-muted-foreground">Density:</span>
                <div className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-0.5">
                  {(['sm', 'md', 'lg'] as CardScale[]).map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => setCardScale(scale)}
                      className={cn(
                        'rounded px-2.5 py-1 font-mono text-[10px] uppercase transition-colors',
                        cardScale === scale
                          ? 'bg-[var(--color-surface)] text-[var(--color-fg)] font-semibold shadow-xs'
                          : 'text-muted-foreground hover:text-[var(--color-fg)]',
                      )}
                    >
                      {scale}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vector Results Counter & Active Category Info */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-[var(--color-fg)]">{filteredVectors.length}</strong> of{' '}
            {allVectors.length} vector icons
          </span>
          {searchQuery && (
            <span>
              matching &ldquo;<span className="text-[var(--color-fg)]">{searchQuery}</span>&rdquo;
            </span>
          )}
        </div>

        {selectedCategory !== 'all' && (
          <div className="text-xs font-mono text-muted-foreground">
            {VECTOR_CATEGORIES.find((c) => c.key === selectedCategory)?.description}
          </div>
        )}
      </div>

      {/* Vectors Grid */}
      {filteredVectors.length > 0 ? (
        <div className={cn('grid gap-4 sm:gap-6', gridColumnsClass)}>
          {filteredVectors.map((item, idx) => (
            <Reveal key={item.id} delay={Math.min(idx * 35, 300)}>
              <VectorCard
                item={item}
                previewBg={stageBg}
                scaleSize={cardScale}
                onInspect={(v) => setInspectingItem(v)}
              />
            </Reveal>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] p-12 text-center">
          <Sparkles className="mb-3 h-10 w-10 text-muted-foreground opacity-40" />
          <h3 className="font-display text-base font-semibold text-[var(--color-fg)]">
            No vectors match your search
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search query or switching to another category.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('all')
            }}
            className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-medium text-[var(--color-fg)] hover:bg-[var(--color-surface-2)]"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Studio Modal */}
      <VectorStudioModal
        item={inspectingItem}
        batch={activeBatch}
        onClose={() => setInspectingItem(null)}
      />
    </div>
  )
}
