import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import styles from '@/components/personal/folio.module.css'
import { USES } from '@/content/uses'
import { JsonLd, SITE_URL, breadcrumbLd } from '@/components/seo/json-ld'

const link = 'underline decoration-fg/30 underline-offset-4 transition-colors hover:decoration-fg/70'

export const metadata: Metadata = {
  title: 'Uses',
  description:
    'The tools, languages, platform stack and machine Ben Ebsworth uses — plus a colophon of exactly how this site is built and deployed.',
  alternates: { canonical: '/uses/' },
  openGraph: {
    type: 'website',
    title: 'Uses · Ben Ebsworth',
    description: 'The languages, platform stack, AI toolchain and machine behind the work — and how this site is built.',
    url: '/uses/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: { card: 'summary_large_image', title: 'Uses · Ben Ebsworth', creator: '@benebsworth', site: '@benebsworth' },
}

/**
 * Uses shares About's clean profile language (#129): the same type pair, cool
 * neutral surfaces, readable section headings instead of tracked mono labels,
 * and a ledger of name → note rows. The authored entries live in content/uses.
 */
export default function UsesPage() {
  const ld = [
    breadcrumbLd([
      { name: 'Home', url: `${SITE_URL}/` },
      { name: 'Uses', url: `${SITE_URL}/uses/` },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Uses · Ben Ebsworth',
      url: `${SITE_URL}/uses/`,
      description: 'The tools, languages, platform stack and machine Ben Ebsworth uses, and how this site is built.',
    },
  ]

  return (
    <>
      <JsonLd data={ld} />
      <SiteNav />

      <main id="main-content" className={`${styles.page} ${styles.aboutPage} ${styles.notesPage}`}>
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Uses' }]} />

        <header className={`${styles.hero} ${styles.notesHero}`}>
          <h1 className={styles.title}>What I use</h1>
          <p className={styles.intro}>
            The languages, platform stack and AI toolchain behind the work — and, at the bottom, a
            colophon of exactly how this site is built and shipped.
          </p>
          <nav aria-label="Uses sections" className={styles.jumpLinks}>
            {USES.map((group) => <a key={group.id} href={`#${group.id}`}>{group.group}</a>)}
          </nav>
        </header>

        {USES.map((group) => (
          <section key={group.id} id={group.id} className={styles.section}>
            <div className={styles.sectionHead}><h2>{group.group}</h2></div>
            <dl className={styles.notesList}>
              {group.items.map((item) => (
                <div key={item.name}>
                  <dt>{item.name}</dt>
                  <dd>{item.note}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <p className={styles.notesFooter}>
          Inspired by{' '}
          <a href="https://uses.tech" target="_blank" rel="noreferrer" className={link}>uses.tech</a>. For
          what I&rsquo;m focused on right now, see <Link href="/now/" className={link}>/now</Link>; for the
          things I&rsquo;ve built with all this, <Link href="/projects/" className={link}>projects</Link>.
        </p>
      </main>

      <SiteFooter />
    </>
  )
}
