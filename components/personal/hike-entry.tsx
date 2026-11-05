import Link from 'next/link'
import type { Hike } from '@/lib/gen/content'
import { project, smoothPath } from '@/components/hiking/journey-core'
import { RangePlaceholder } from '@/components/hiking/hike-card'
import styles from './folio.module.css'

/** Existing authored trail art and stylized route, presented as a journal entry. */
export function FolioHikeEntry({ hike, featured = false }: { hike: Hike; featured?: boolean }) {
  const route = hike.waypoints.length >= 2 ? smoothPath(hike.waypoints.map(project)) : null
  return <Link href={`/hiking/${hike.slug}/`} className={`${styles.hikeEntry}${featured ? ` ${styles.hikeFeature}` : ''}`}>
    <div className={styles.hikeArt} data-annotation-anchor={featured ? '' : undefined}>
      {hike.hero ? <img src={hike.hero} alt={hike.name} width={800} height={500} loading={featured ? 'eager' : 'lazy'} decoding="async" /> : <RangePlaceholder accent={hike.accent || '#5b9e6f'} />}
      {route && <svg viewBox="0 0 100 74" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path d={route} fill="none" stroke="var(--bg)" strokeWidth={1.9} strokeLinecap="round" opacity={.7} />
        <path d={route} fill="none" stroke={hike.accent || '#5b9e6f'} strokeWidth={.9} strokeLinecap="round" strokeDasharray="1 2.6" />
      </svg>}
    </div>
    <div className={styles.hikeCopy}>
      <p className={`${styles.label} ${styles.hikeStatus}`}>{hike.region} · {hike.country}<span>{hike.status === 'planned' ? 'Planned' : hike.year}</span></p>
      <h3>{hike.name}</h3>
      <p className={styles.hikeSummary}>{hike.summary}</p>
      <dl className={styles.hikeStats}>
        <div><dt>Distance</dt><dd>{hike.distanceKm} km</dd></div>
        <div><dt>Duration</dt><dd>{hike.days} days</dd></div>
        <div><dt>Max altitude</dt><dd>{hike.maxAltitudeM.toLocaleString('en-AU')} m</dd></div>
      </dl>
    </div>
  </Link>
}
