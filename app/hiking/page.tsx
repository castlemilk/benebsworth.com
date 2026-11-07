import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import styles from '@/components/personal/folio.module.css'
import trail from '@/components/hiking/trail-journal.module.css'
import { completedHikes, plannedHikes } from '@/content/hiking'
import { FolioHikeEntry } from '@/components/personal/hike-entry'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd } from '@/components/seo/json-ld'

export const metadata: Metadata = {
  title: 'Hiking',
  description:
    'Long-distance hikes and treks by Ben Ebsworth — the Walker’s Haute Route, Tasmania’s Overland Track, the Larapinta Trail, the Dolomites, and what’s planned next. Journey maps, stats and galleries.',
  alternates: { canonical: '/hiking/' },
  openGraph: {
    type: 'website',
    title: 'Hiking · Ben Ebsworth',
    description: 'Long-distance hikes & treks — journey maps, stats and galleries.',
    url: '/hiking/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: { card: 'summary_large_image', title: 'Hiking · Ben Ebsworth' },
}

export default function HikingPage() {
  const [lead, ...otherCompleted] = completedHikes
  return <>
    <JsonLd data={[
      collectionPageLd({ name: 'Hiking', description: 'Long-distance hikes and treks by Ben Ebsworth.', url: `${SITE_URL}/hiking/`, items: [...completedHikes, ...plannedHikes].map(h => ({ name: h.name, url: `${SITE_URL}/hiking/${h.slug}/` })) }),
      breadcrumbLd([{ name: 'Home', url: `${SITE_URL}/` }, { name: 'Hiking', url: `${SITE_URL}/hiking/` }]),
    ]} />
    <SiteNav />
    <main id="main-content" data-hiking-page="index" className={`${styles.page} ${trail.page}`}>
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Hiking' }]} />
      <header className={`${styles.hero} ${styles.hikingHero} ${trail.indexHero}`}>
        <div className={styles.hikingTitle}><h1 className={`${styles.title} ${trail.title}`}>Hiking</h1><img src="/trailkit/emblem.webp" alt="" width={64} height={64} /></div>
        <div>
          <p className={styles.intro}>The long walks — multi-day traverses across alps, deserts and wilderness. Each one has a journey map, the numbers, and a gallery. A record of where my feet have taken me, and where they’re headed next.</p>
          <nav aria-label="Hiking sections" className={`${styles.jumpLinks} ${styles.hikingJumpLinks} ${trail.jumpLinks}`}><a href="#completed">Completed · {completedHikes.length}</a><a href="#planned">On the list · {plannedHikes.length}</a></nav>
        </div>
      </header>
      <section id="completed" className={styles.section}>
        <div className={styles.sectionHead}><h2>Completed</h2><p>On foot · long-distance trails</p></div>
        {lead && <div id="featured-trail" className={styles.trailFeature}><FolioHikeEntry hike={lead} featured /></div>}
        {otherCompleted.map(hike => <FolioHikeEntry key={hike.slug} hike={hike} />)}
      </section>
      <section id="planned" className={styles.section}>
        <div className={styles.sectionHead}><h2>On the list</h2><p>Where they’re headed next.</p></div>
        <div className={styles.plannedGrid}>{plannedHikes.map(hike => <FolioHikeEntry key={hike.slug} hike={hike} />)}</div>
      </section>
    </main>
    <SiteFooter />
  </>
}
