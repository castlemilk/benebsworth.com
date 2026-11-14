'use client'

import { useRef, useSyncExternalStore } from 'react'
import Image from 'next/image'
import { GROUNDED_PAGE_SIZE, searchGroundedCards, groundedArtworkUrl } from '@/lib/grounded-artwork/discovery'
import type { GroundedCard } from '@/lib/grounded-artwork/types'
import styles from './grounded.module.css'

const eventName = 'grounded-filter-change'
function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback)
  window.addEventListener(eventName, callback)
  return () => { window.removeEventListener('popstate', callback); window.removeEventListener(eventName, callback) }
}
const snapshot = () => window.location.search
const serverSnapshot = () => ''
export function GroundedCollection({ cards }: { cards: readonly GroundedCard[] }) {
  const queryString = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  const params = new URLSearchParams(queryString)
  const query = params.get('q') || ''
  const subject = params.get('subject') || ''
  const tag = params.get('tag') || ''
  const searchRef = useRef<HTMLInputElement>(null)
  const results = searchGroundedCards(cards, query, { subject, tag })
  const pages = Math.max(1, Math.ceil(results.length / GROUNDED_PAGE_SIZE))
  const rawPage = Number(params.get('page') || 1)
  const page = Math.max(1, Math.min(pages, Number.isSafeInteger(rawPage) ? rawPage : 1))
  const visible = results.slice((page - 1) * GROUNDED_PAGE_SIZE, page * GROUNDED_PAGE_SIZE)
  function change(key: string, value: string) {
    const next = new URLSearchParams(queryString)
    if (value) next.set(key, value); else next.delete(key)
    if (key !== 'page') next.delete('page')
    window.history.pushState(null, '', `${window.location.pathname}${next.size ? `?${next}` : ''}`)
    window.dispatchEvent(new Event(eventName))
  }
  function clear() {
    window.history.pushState(null, '', window.location.pathname)
    window.dispatchEvent(new Event(eventName))
    searchRef.current?.focus()
  }
  return <section className={styles.collection} data-pagefind-ignore aria-labelledby="grounded-title">
    <p className={styles.eyebrow}>Grounded forms / authored collection</p>
    <h1 id="grounded-title">Fixed authored SVG plates</h1>
    <p>{cards.length} transparent, square artworks with three authored palettes: light, dark and monochrome. Each is a fixed composition, independent of the <a href="/vectors/">tunable Study lab</a>.</p>
    <p>Cards are recognition thumbnails, not detail proofs. Open an artwork to inspect its preview, minimum display size, scientific basis and limitations.</p>
    <div className={styles.filters}>
      <label>Find grounded artwork<input ref={searchRef} type="search" value={query} onChange={e => change('q', e.target.value)} placeholder="Title, tag or alias" /></label>
      <label>Subject<select value={subject} onChange={e => change('subject', e.target.value)}><option value="">All subjects</option>{[...new Set(cards.map(a => a.subject))].sort().map(value => <option key={value} value={value}>{value.replaceAll('-', ' ')}</option>)}</select></label>
      <label>Tag<select value={tag} onChange={e => change('tag', e.target.value)}><option value="">All tags</option>{[...new Set(cards.flatMap(a => a.tags))].sort().map(value => <option key={value} value={value}>{value.replaceAll('-', ' ')}</option>)}</select></label>
      <button type="button" onClick={clear}>Clear filters</button>
    </div>
    <p role="status">{results.length} artworks · Page {page} of {pages}</p>
    <div className={styles.grid}>{visible.map(artwork => <article className={styles.card} key={artwork.slug} data-grounded-card={artwork.slug}>
      <a href={groundedArtworkUrl(artwork)} aria-label={`Open ${artwork.title}`}>
        <div className={styles.matte} data-palette="light"><Image src={artwork.thumbnails.light} alt="" width={480} height={480} unoptimized loading="lazy" decoding="async" /></div>
        <h2>{artwork.title}</h2>
      </a>
      <p>{artwork.subject} · 900 × 900 SVG</p><p>Inspect at {artwork.minimumDisplayWidth}px or wider.</p>
    </article>)}</div>
    {!results.length && <div><h2>No matching artwork</h2><p>Try another title, subject or tag.</p><button type="button" onClick={clear}>Show all artwork</button></div>}
    <nav className={styles.pagination} aria-label="Artwork pages">
      <button type="button" disabled={page <= 1} onClick={() => change('page', String(page - 1))}>Previous page</button>
      <span>Page {page} of {pages}</span>
      <button type="button" disabled={page >= pages} onClick={() => change('page', String(page + 1))}>Next page</button>
    </nav>
  </section>
}
