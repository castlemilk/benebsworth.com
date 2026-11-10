'use client'

import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Image from 'next/image'
import { ARTWORK, ARTWORK_TAGS, searchArtwork } from '@/lib/editorial-artwork/registry'
import { SEARCH_ANCHOR_EVENT } from '@/components/search/search-navigation'
import styles from '../generative-svg/gallery.module.css'

/** Native anchors and downloads remain useful without JavaScript. PNGs are not SVG models. */
export function ArtworkCollection() {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('')
  const [surface, setSurface] = useState('light')
  const searchRef = useRef<HTMLInputElement>(null)
  const filtered = searchArtwork(query, tag)
  const clear = () => { setQuery(''); setTag(''); searchRef.current?.focus() }
  useEffect(() => {
    const reveal = (hash: string) => {
      const asset = ARTWORK.find(asset => hash === `#artwork-${asset.id}`)
      if (asset) {
        // Reveal a filtered card before native-history navigation scrolls to it.
        flushSync(() => { setQuery(''); setTag('') })
        const target = document.getElementById(`artwork-${asset.id}`)
        target?.focus({ preventScroll: true })
        target?.scrollIntoView?.({ block: 'start' })
      }
    }
    const onHashChange = () => reveal(window.location.hash)
    const onSearchAnchor = (event: Event) => reveal((event as CustomEvent<string>).detail)
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener(SEARCH_ANCHOR_EVENT, onSearchAnchor)
    return () => { window.removeEventListener('hashchange', onHashChange); window.removeEventListener(SEARCH_ANCHOR_EVENT, onSearchAnchor) }
  }, [])
  return <section id="artwork" className={styles.collection} aria-labelledby="artwork-title">
    <div className={styles.collectionHeader}><h2 id="artwork-title">Editorial artwork</h2><p>{ARTWORK.length} transparent PNGs. Ready for article openers and thumbnails.</p></div>
    <p className={styles.artworkIntro}>Generated illustrations in graphite, ivory and red. These are raster artwork, not editable SVGs or validated scientific diagrams. The SVG styling controls above do not recolor these files.</p>
    <div className={styles.filters}>
      <label>Find artwork<input ref={searchRef} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, tag or alias…" /></label>
      <label>Artwork tag<select value={tag} onChange={e => setTag(e.target.value)}><option value="">All artwork tags</option>{ARTWORK_TAGS.map(value => <option key={value} value={value}>{value.replaceAll('-', ' ')}</option>)}</select></label>
      <label>Artwork preview surface<select value={surface} onChange={e => setSurface(e.target.value)}><option value="light">Warm paper</option><option value="dark">Charcoal</option></select></label>
      <button type="button" onClick={clear}>Clear artwork filters</button>
      <p role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'artwork' : 'artworks'}</p>
    </div>
    <div className={styles.artworkGrid}>
      {ARTWORK.map(asset => <article key={asset.id} id={`artwork-${asset.id}`} tabIndex={-1} hidden={!filtered.includes(asset)} className={styles.artworkCard}>
        <div className={styles.artworkImage} data-surface={surface}><Image src={asset.src} width={asset.width} height={asset.height} alt={asset.alt} unoptimized loading="lazy" /></div>
        <h3>{asset.title}</h3>
        <p className={styles.tags}>{asset.tags.map(value => <span key={value}>{value.replaceAll('-', ' ')}</span>)}</p>
        <p className={styles.kind}>Generated PNG · {asset.width} × {asset.height} · {(asset.bytes / 1024 / 1024).toFixed(2)} MB · Transparent</p>
        <p>{asset.use}</p><p className={styles.artworkBasis}>{asset.basis}</p>
        <div className={styles.actions}><a href={asset.src} download={asset.src.split('/').pop()} aria-label={`Download ${asset.title} PNG`}>Download PNG</a><a href={`#artwork-${asset.id}`} aria-label={`Link to ${asset.title}`}>Link to artwork</a></div>
        <details className={styles.artworkProvenance}><summary>Generation and provenance</summary><p>{asset.generator}, {asset.generatedAt}. Unmodified master; original alpha retained. A preview surface is not part of the download.</p><p>SHA-256: <span className={styles.assetHash}>{asset.sha256}</span></p><p>{asset.prompt}</p></details>
      </article>)}
    </div>
    {filtered.length === 0 && <div className={styles.empty}><h3>No matching artwork</h3><p>Try another name or tag.</p><button type="button" onClick={clear}>Show all artwork</button></div>}
    <p><a className={styles.permalink} href="/artwork/editorial/provenance.json" download="editorial-artwork-provenance.json">Download artwork metadata and prompts</a></p>
  </section>
}
