'use client'

import { useRef, type CSSProperties } from 'react'
import { GammaButton } from '@/components/gamma/GammaButton'
import styles from '@/components/blog/blog-filter.module.css'
import { CategoryIcon } from './category-icon'

export type CategoryNavItem = {
  key: string
  label: string
  glyph: string
  accent: string
  count: number
}

/** Reuses the reviewed archive discovery treatment and maintained controls. */
export function CategoryNav({ categories, searchQuery, onSearchChange, activeCategory, onCategoryChange }: {
  categories: CategoryNavItem[]
  searchQuery: string
  onSearchChange: (q: string) => void
  activeCategory: string | null
  onCategoryChange: (key: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const total = categories.reduce((sum, category) => sum + category.count, 0)
  return <section className={`lab-discovery ${styles.discovery}`} aria-label="Find an experiment">
    <div className={styles.labelRow}>
      <label htmlFor="lab-search">Search the lab</label>
      <span className={styles.note} aria-hidden="true">Follow your curiosity.
        <svg viewBox="0 0 52 35" fill="none"><path d="M48 3C27 2 12 10 7 30m-3-9 3 9 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </span>
    </div>
    <div className={styles.search}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></svg>
      <input id="lab-search" ref={inputRef} type="search" aria-label="Search lab experiments" placeholder="Search experiments or topics…" value={searchQuery} onChange={e => onSearchChange(e.target.value)}/>
      {searchQuery && <GammaButton type="button" variant="quiet" className={styles.clear} aria-label="Clear search" onClick={() => { onSearchChange(''); inputRef.current?.focus() }}><span aria-hidden="true">×</span></GammaButton>}
    </div>
    <div className={styles.topics} role="group" aria-label="Filter experiments by category">
      <GammaButton type="button" variant="quiet" className={styles.topic} aria-pressed={!activeCategory} onClick={() => onCategoryChange(null)}><span>All experiments</span><span className={styles.count}>{total}</span></GammaButton>
      {categories.map(category => <GammaButton key={category.key} type="button" variant="quiet" className={styles.topic} aria-pressed={activeCategory === category.key} style={{ '--ink': category.accent } as CSSProperties} onClick={() => onCategoryChange(activeCategory === category.key ? null : category.key)}>
        <CategoryIcon category={category.key} fallback={category.glyph} size={18}/>
        <span>{category.label}</span><span className={styles.count}>{category.count}</span>
      </GammaButton>)}
    </div>
  </section>
}
