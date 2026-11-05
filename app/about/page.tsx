import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import styles from '@/components/personal/folio.module.css'
import { about } from '@/content/about'
import { SkillMarquee } from '@/components/motion/skill-marquee'
import { RelatedLabs } from '@/components/blog/related-labs'
import { HalftoneHero } from '@/components/about/halftone-hero'
import { YouTube } from '@/components/media/youtube'
import { youtubeId } from '@/lib/youtube'
import { techColor } from '@/lib/tech-colors'
import { JsonLd, SITE_URL, profilePageLd, breadcrumbLd } from '@/components/seo/json-ld'
import type { CSSProperties } from 'react'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Ben Ebsworth — software, platform & hardware engineer in Melbourne. Building across the stack from electrical/embedded hardware to distributed platforms, AI-native. Timeline, talks, certifications and skills.',
  alternates: { canonical: '/about/' },
  openGraph: {
    type: 'profile',
    title: 'About · Ben Ebsworth',
    description: 'Software, platform & hardware engineer · AI-native · Melbourne, Australia.',
    url: '/about/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: { card: 'summary_large_image', title: 'About · Ben Ebsworth', creator: '@benebsworth', site: '@benebsworth' },
}

const ISSUERS = [
  { name: 'Amazon Web Services', label: 'Amazon Web Services', tag: 'AWS' },
  { name: 'Google Cloud', label: 'Google Cloud', tag: 'GCP' },
  { name: 'CNCF', label: 'Cloud Native Computing Foundation', tag: 'CNCF' },
] as const

export default function AboutPage() {
  const recordings = about.speaking.flatMap(talk => {
    const id = youtubeId(talk.url)
    return id ? [{ talk, id }] : []
  })
  const otherTalks = about.speaking.filter(talk => !youtubeId(talk.url))
  return <>
    <JsonLd data={[profilePageLd, breadcrumbLd([
      { name: 'Home', url: `${SITE_URL}/` },
      { name: 'About', url: `${SITE_URL}/about/` },
    ])]} />
    <SiteNav />
      <main id="main-content" className={`${styles.page} ${styles.aboutPage}`}>
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />
      <header className={`${styles.hero} ${styles.aboutHero}`}>
        <div className={styles.aboutCopy}>
          <h1 className={styles.title}>Ben<br />Ebsworth</h1>
          <p className={styles.role}>Software, platform &amp; hardware engineer · AI-native · Melbourne, Australia</p>
          <p className={styles.intro}>{about.bio}</p>
          <dl className={styles.facts}>
            <div><dt>10+</dt><dd>years building</dd></div>
            <div><dt>{about.certifications.length}</dt><dd>certifications</dd></div>
            <div><dt>{about.speaking.length}</dt><dd>talks given</dd></div>
          </dl>
        </div>
        <div className={styles.portrait}>
          <HalftoneHero accent="var(--fg)" variant="folio" />
        </div>
      </header>
      <nav aria-label="About sections" className={styles.jumpLinks}>
        <a href="#resume">Career &amp; education</a>
        <a href="#certifications">Certifications</a>
        <a href="#speaking">Talks &amp; speaking</a>
        <a href="#skills">Toolkit</a>
        <a href="#lab">The lab</a>
      </nav>
      <section id="resume" className={styles.section}>
        <div className={styles.sectionHead}><h2>Career &amp; education</h2></div>
        <ol className={styles.timeline}>
          {about.timeline.map((entry, i) => <li key={i}>
            <p className={styles.timelineDate}>{entry.when}</p>
            <div>
              <div className={styles.timelineHeading}>
                <img src={entry.logo} alt={`${entry.company} logo`} width={40} height={40} className={styles.companyLogo} />
                <div><p className={styles.label}>{entry.kind === 'education' ? 'Education' : 'Work'} · {entry.company}</p><h3>{entry.title}</h3></div>
              </div>
              <p className={styles.timelineDetail}>{entry.detail}</p>
              {entry.tech.length > 0 && <ul className={styles.technologies} aria-label="Technologies">
                {entry.tech.map(tech => <li key={tech} style={{ '--tech-color': techColor(tech) } as CSSProperties}>{tech}</li>)}
              </ul>}
            </div>
          </li>)}
        </ol>
      </section>
      <section id="certifications" className={styles.section}>
        <div className={styles.sectionHead}><h2>Certifications</h2><p>{about.certifications.length} active certifications across the three clouds &amp; the cloud-native ecosystem.</p></div>
        {ISSUERS.map(issuer => {
          const items = about.certifications.filter(cert => cert.issuer === issuer.name)
          return items.length > 0 && <div className={styles.credentialGroup} key={issuer.name}>
            <h3 className={styles.label}>{issuer.label} · {items.length} {items.length === 1 ? 'cert' : 'certs'}</h3>
            <ul className={styles.credentials}>
              {items.map(cert => <li key={cert.title}>
                <a href={cert.url || '#'} target="_blank" rel="noreferrer" className={styles.credential}>
                  <img src={cert.badge} alt={`${cert.title} badge`} width={88} height={88} loading="lazy" />
                  <div><p className={styles.credentialTitle}>{cert.title}</p><p className={styles.label}>{issuer.tag} <ArrowUpRight size={14} aria-hidden="true" /></p></div>
                </a>
              </li>)}
            </ul>
          </div>
        })}
      </section>
      <section id="speaking" className={styles.section}>
        <div className={styles.sectionHead}><h2>Talks &amp; speaking</h2><p>On the record</p></div>
        <div className={styles.talks}>
          {recordings.map(({ talk, id }) => <article key={id} className={styles.talk}>
            <YouTube id={id} title={talk.title} accent="var(--profile-action)" />
            <div className={styles.talkCaption}>
              <img src={talk.image} alt={`${talk.title} logo`} width={32} height={32} loading="lazy" />
              <div><h3>{talk.title}</h3><p className={styles.talkDate}>{talk.date} · Recording</p><p className={styles.talkDescription}>{talk.description}</p></div>
            </div>
          </article>)}
          {otherTalks.map(talk => <a href={talk.url || '#'} key={`${talk.title}-${talk.date}-${talk.url}`} target="_blank" rel="noreferrer" className={`${styles.talk} ${styles.talkLink}`}>
            <div className={styles.talkCaption}>
              <img src={talk.image} alt={`${talk.title} logo`} width={40} height={40} loading="lazy" />
              <div><h3>{talk.title} <ArrowUpRight size={18} aria-hidden="true" className={styles.externalArrow} /></h3><p className={styles.talkDate}>{talk.date}</p><p className={styles.talkDescription}>{talk.description}</p></div>
            </div>
          </a>)}
        </div>
      </section>
      <section id="skills" className={styles.section}>
        <div className={styles.sectionHead}><h2>Toolkit</h2></div>
        <SkillMarquee skills={about.skills} />
      </section>
      <section id="lab" className={styles.section}>
        <div className={styles.sectionHead}><h2>The lab</h2></div>
        <p className={styles.labIntro}>I keep an <Link href="/lab/" className={styles.textLink}>interactive lab</Link> of small visual essays — each effect is a working simulation, parameterised, playable, and shareable. They are the working sketches behind many of my posts: oscillators, attractors, filters, modulation, signal integrity. Drop in, drag the controls, watch what happens.</p>
        <div className={styles.labContent}><RelatedLabs tags={['electrical', 'engineering', 'physics', 'algorithms', 'signal']} labels={['physics', 'engineering', 'algorithms', 'simulation']} limit={4} /></div>
      </section>
    </main>
    <SiteFooter />
  </>
}
