import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import styles from '@/components/personal/folio.module.css'
import { NOW, NOW_UPDATED, NOW_UPDATED_ISO } from '@/content/now'
import { JsonLd, SITE_URL, breadcrumbLd } from '@/components/seo/json-ld'

const link = 'underline decoration-fg/30 underline-offset-4 transition-colors hover:decoration-fg/70'

export const metadata: Metadata = {
  title: 'Now',
  description:
    "What Ben Ebsworth is focused on right now — current work at Atlassian, what he's building in the lab, going deep on, and writing. A periodically-updated snapshot.",
  alternates: { canonical: '/now/' },
  openGraph: {
    type: 'website',
    title: 'Now · Ben Ebsworth',
    description: "A snapshot of what I'm focused on right now — work, building, learning and writing.",
    url: '/now/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: { card: 'summary_large_image', title: 'Now · Ben Ebsworth', creator: '@benebsworth', site: '@benebsworth' },
}

/**
 * Now shares About's clean profile language (#129): a date-led snapshot with
 * readable section headings and one paragraph each. The authored entries and
 * their update date live in content/now.
 */
export default function NowPage() {
  const ld = [
    breadcrumbLd([
      { name: 'Home', url: `${SITE_URL}/` },
      { name: 'Now', url: `${SITE_URL}/now/` },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Now · Ben Ebsworth',
      url: `${SITE_URL}/now/`,
      description: "What Ben Ebsworth is focused on right now — work, building, learning and writing.",
      dateModified: NOW_UPDATED_ISO,
    },
  ]

  return (
    <>
      <JsonLd data={ld} />
      <SiteNav />

      <main id="main-content" className={`${styles.page} ${styles.aboutPage} ${styles.notesPage}`}>
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Now' }]} />

        <header className={`${styles.hero} ${styles.notesHero}`}>
          <h1 className={styles.title}>What I&rsquo;m doing now</h1>
          <p className={styles.intro}>
            A snapshot of where my attention is right now. Not a status feed, just the handful of
            things that are front-of-mind this season.
          </p>
          <p className={styles.profileMeta}>
            Updated <time dateTime={NOW_UPDATED_ISO}>{NOW_UPDATED}</time>
          </p>
        </header>

        {NOW.map((entry) => (
          <section key={entry.id} id={entry.id} className={styles.section}>
            <div className={styles.sectionHead}><h2>{entry.label}</h2></div>
            <p className={styles.notesBody}>{entry.body}</p>
          </section>
        ))}

        <p className={styles.notesFooter}>
          This is a{' '}
          <a href="https://nownownow.com/about" target="_blank" rel="noreferrer" className={link}>
            now page
          </a>{' '}
          — an idea from Derek Sivers. Curious what I&rsquo;m building longer-term? See{' '}
          <Link href="/projects/" className={link}>projects</Link>, or{' '}
          <Link href="/uses/" className={link}>what I use</Link> to make it.
        </p>
      </main>

      <SiteFooter />
    </>
  )
}
