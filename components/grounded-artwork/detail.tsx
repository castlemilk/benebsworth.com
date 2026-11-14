'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { GROUNDED_THEMES, type GroundedArtwork, type GroundedTheme } from '@/lib/grounded-artwork/types'
import styles from './grounded.module.css'

export function GroundedDetail({ artwork }: { artwork: GroundedArtwork }) {
  const [palette, setPalette] = useState<GroundedTheme>('light')
  const variant = artwork.variants[palette]
  return <article className={styles.detail} data-pagefind-ignore>
    <div className={styles.navigation}><Link href="/vectors/grounded/" prefetch={false}>All grounded forms</Link><a href="/vectors/">Tunable Study lab</a></div>
    <p className={styles.eyebrow}>{artwork.subject} / fixed authored SVG</p>
    <h1>{artwork.title}</h1>
    <fieldset className={styles.palettes}><legend>Authored palette</legend>{GROUNDED_THEMES.map(value => <label key={value}><input type="radio" name="palette" value={value} checked={palette === value} onChange={() => setPalette(value)} />{value === 'mono' ? 'Monochrome' : value === 'light' ? 'Light' : 'Dark'}</label>)}</fieldset>
    <figure>
      <div className={styles.matte} data-palette={palette}><Image data-grounded-preview={artwork.slug} src={variant.preview} alt={artwork.title} width={960} height={960} unoptimized priority /></div>
      <figcaption>{artwork.caption}</figcaption>
    </figure>
    <p className={styles.printPalette}>Selected palette: {palette}. {artwork.width} × {artwork.height} viewBox.</p>
    <p>True transparency is preserved in every download. The preview matte is not part of the artwork. Monochrome is dark ink for light backgrounds; each palette is authored, not recolored with CSS.</p>
    <p>Minimum intended display width: {artwork.minimumDisplayWidth}px. Smaller thumbnails are for recognition only; inspect fine details at or above this width.</p>
    <div className={styles.download}><p><a href={variant.preview}>Open full-size preview</a> · 960 × 960 WebP</p><a data-grounded-download href={variant.master} download={variant.master.split('/').pop()}>Download {palette === 'mono' ? 'monochrome' : palette} SVG</a><p>Original SVG · {variant.bytes.toLocaleString('en-AU')} bytes · revision {artwork.revision}</p></div>
    <section><h2>Scientific basis</h2><p data-grounded-basis className={styles.prose}>{artwork.basis}</p><h2>Limitations</h2><p data-grounded-limitations className={styles.prose}>{artwork.limitations}</p></section>
    <section><h2>Sources</h2><ul>{artwork.sources.map(source => <li key={source.url}><a href={source.url}>{source.title}</a></li>)}</ul></section>
    <section><h2>Provenance</h2><p className={styles.prose}>{artwork.provenance}</p><p>Source: {artwork.sourceId} · Revision: {artwork.revision} · Batch: {artwork.batchId}</p><p className={styles.hash}>SHA-256 ({palette} SVG): {variant.sha256}</p></section>
  </article>
}
