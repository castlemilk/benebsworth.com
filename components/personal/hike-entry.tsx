import Link from 'next/link'
import type { Hike } from '@/lib/gen/content'
import { HikeCover } from '@/components/hiking/hike-cover'
import styles from './folio.module.css'
import trail from '@/components/hiking/trail-journal.module.css'

/** Existing authored trail art and stylized route, presented as a journal entry. */
export function FolioHikeEntry({ hike, featured = false }: { hike: Hike; featured?: boolean }) {
  return <Link href={`/hiking/${hike.slug}/`} className={`${styles.hikeEntry} ${trail.entry}${featured ? ` ${styles.hikeFeature}` : ''}`}>
    <div className={styles.hikeArt}>
      <HikeCover hike={hike} priority={featured} />
    </div>
    <div className={styles.hikeCopy}>
      <p className={`${styles.label} ${styles.hikeStatus} ${trail.entryMeta}`}>{hike.region} · {hike.country}<span>{hike.status === 'planned' ? 'Planned' : hike.year}</span></p>
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
