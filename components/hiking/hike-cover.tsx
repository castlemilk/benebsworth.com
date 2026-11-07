'use client'

import { useState } from 'react'
import type { Hike } from '@/lib/gen/content'
import { hikeImagery } from '@/content/hiking-imagery'
import { project, smoothPath } from './journey-core'
import styles from './hike-cover.module.css'

/** One image-led treatment for index thumbnails, banners and guide cross-links. */
export function HikeCover({ hike, priority = false, compact = false, banner = false }: {
  hike: Hike; priority?: boolean; compact?: boolean; banner?: boolean
}) {
  const [failedSources, setFailedSources] = useState<string[]>([])
  const primary = hikeImagery(hike)
  const media = hikeImagery(hike, failedSources.includes(primary.src))
  const failed = !media.src || failedSources.includes(media.src)
  const route = hike.waypoints.length >= 2 ? smoothPath(hike.waypoints.map(project)) : null
  return <figure className={`${styles.cover}${banner ? ` ${styles.banner}` : ''}${compact ? ` ${styles.compact}` : ''}`} data-hike-cover={hike.slug} data-image-kind={media.kind}>
    <div className={styles.image}>
      {failed ? <div className={styles.unavailable}><span>Image unavailable</span></div> : <img
        src={media.src} srcSet={media.srcSet} sizes={compact ? '128px' : banner ? '(max-width: 768px) 100vw, 1024px' : '(max-width: 650px) 100vw, (max-width: 1000px) 50vw, 640px'}
        alt={media.alt} width={media.width} height={media.height}
        loading={priority ? 'eager' : 'lazy'} decoding="async" fetchPriority={priority ? 'high' : undefined}
        style={{ objectPosition: media.position }} onError={() => setFailedSources(sources => [...sources, media.src])}
      />}
    </div>
    {!compact && <figcaption className={styles.caption}>
      <span>{failed ? 'Image unavailable' : media.caption}</span>
      {route && <span className={styles.route}><span>Schematic route</span><svg viewBox="0 0 100 74" aria-hidden="true"><path d={route} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" /></svg></span>}
    </figcaption>}
  </figure>
}
