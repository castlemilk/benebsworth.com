'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import { groundedArtworkUrl } from '@/lib/grounded-artwork/discovery'
import { createGroundedLoader, initialGroundedResult, type GroundedBootstrap, type GroundedResult } from '@/lib/grounded-artwork/remote-discovery'
import styles from './grounded.module.css'

const eventName = 'grounded-filter-change'
function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback)
  window.addEventListener(eventName, callback)
  return () => { window.removeEventListener('popstate', callback); window.removeEventListener(eventName, callback) }
}
const snapshot = () => window.location.search
const serverSnapshot = () => ''
export function GroundedCollection({ bootstrap }: { bootstrap: GroundedBootstrap }) {
  const queryString = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  const params = new URLSearchParams(queryString)
  const query = params.get('q') || ''
  const subject = params.get('subject') || ''
  const tag = params.get('tag') || ''
  const searchRef = useRef<HTMLInputElement>(null)
  const load = useMemo(() => createGroundedLoader(bootstrap), [bootstrap])
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<{ key: string; attempt: number; result?: GroundedResult; error?: boolean } | null>(null)
  const initial = initialGroundedResult(bootstrap, queryString)
  const settled = loaded?.key === queryString && loaded.attempt === attempt ? loaded : null
  const result = initial || settled?.result
  const failed = !result && settled?.error
  const pending = !result && !failed
  const { page = 1, pages = 1, visible = [] } = result || {}
  useEffect(() => {
    if (initialGroundedResult(bootstrap, queryString)) return
    let current = true
    void load(queryString, () => current).then(result => {
      if (current && result) setLoaded({ key: queryString, attempt, result })
    }).catch(() => { if (current) setLoaded({ key: queryString, attempt, error: true }) })
    return () => { current = false }
  }, [bootstrap, load, queryString, attempt])
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
    <p>{bootstrap.total} transparent, square artworks with three authored palettes: light, dark and monochrome. Each is a fixed composition, independent of the <a href="/vectors/">tunable Study lab</a>.</p>
    <p>Cards are recognition thumbnails, not detail proofs. Open an artwork to inspect its preview, minimum display size, scientific basis and limitations.</p>
    <div className={styles.filters}>
      <label>Find grounded artwork<input ref={searchRef} type="search" value={query} onChange={e => change('q', e.target.value)} placeholder="Title, tag or alias" /></label>
      <div className={styles.filter}><label htmlFor="grounded-subject">Subject</label><select id="grounded-subject" value={subject} onChange={e => change('subject', e.target.value)}><option value="">All subjects</option>{bootstrap.subjects.map(value => <option key={value} value={value}>{value.replaceAll('-', ' ')}</option>)}</select></div>
      <div className={styles.filter}><label htmlFor="grounded-tag">Tag</label><select id="grounded-tag" value={tag} onChange={e => change('tag', e.target.value)}><option value="">All tags</option>{bootstrap.tags.map(value => <option key={value} value={value}>{value.replaceAll('-', ' ')}</option>)}</select></div>
      <button type="button" onClick={clear}>Clear filters</button>
    </div>
    <p role="status">{pending ? 'Loading artwork…' : failed ? 'Artwork could not be loaded. Please retry.' : `${result!.total} artworks · Page ${page} of ${pages}`}</p>
    {failed && <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry loading artwork</button>}
    <div className={styles.grid}>{visible.map(artwork => <article className={styles.card} key={artwork.slug} data-grounded-card={artwork.slug}>
      <a href={groundedArtworkUrl(artwork)} aria-label={`Open ${artwork.title}`}>
        <div className={styles.matte} data-palette="light"><Image src={artwork.thumbnail} alt="" width={480} height={480} unoptimized loading="lazy" decoding="async" /></div>
        <h2>{artwork.title}</h2>
      </a>
      <p>{artwork.subject} · 900 × 900 SVG</p><p>Inspect at {artwork.minimumDisplayWidth}px or wider.</p>
    </article>)}</div>
    {result?.total === 0 && <div><h2>No matching artwork</h2><p>Try another title, subject or tag.</p><button type="button" onClick={clear}>Show all artwork</button></div>}
    <nav className={styles.pagination} aria-label="Artwork pages">
      <button type="button" disabled={!result || page <= 1} onClick={() => change('page', String(page - 1))}>Previous page</button>
      <span>{result ? `Page ${page} of ${pages}` : pending ? 'Loading…' : 'Unavailable'}</span>
      <button type="button" disabled={!result || page >= pages} onClick={() => change('page', String(page + 1))}>Next page</button>
    </nav>
  </section>
}
