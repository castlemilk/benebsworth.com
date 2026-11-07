import type { Metadata } from 'next'
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
  { name: 'Amazon Web Services', label: 'Amazon Web Services' },
  { name: 'Google Cloud', label: 'Google Cloud' },
  { name: 'CNCF', label: 'Cloud Native Computing Foundation' },
] as const

function TimelineGroups({ kind }: { kind: 'work' | 'education' }) {
  const entries = about.timeline.filter(entry => entry.kind === kind)
  const companies = [...new Set(entries.map(entry => entry.company))]
  return <div className={styles.timelineGroups}>
    {companies.map(company => {
      const roles = entries.filter(entry => entry.company === company)
      return <article key={company} className={styles.timelineGroup} data-timeline-group={company}>
        <div className={styles.employer}>
          <img src={roles[0].logo} alt={`${company} logo`} width={40} height={40} className={styles.companyLogo} />
          <h3>{company}</h3>
        </div>
        <ol className={styles.timeline}>
          {roles.map(entry => <li key={`${entry.when}-${entry.title}`} data-timeline-entry>
            <p className={styles.timelineDate}>{entry.when}</p>
            <div>
              <h4>{entry.title.endsWith(` · ${company}`) ? entry.title.slice(0, -(` · ${company}`).length) : entry.title}</h4>
              <p className={styles.timelineDetail}>{entry.detail}</p>
              {entry.tech.length > 0 && <details className={styles.technologyDetails}>
                <summary>{kind === 'education' ? 'Areas of study' : 'Technologies used'}</summary>
                <ul className={styles.technologies}>
                  {entry.tech.map(tech => <li key={tech} style={{ '--tech-color': techColor(tech) } as CSSProperties}>{tech}</li>)}
                </ul>
              </details>}
            </div>
          </li>)}
        </ol>
      </article>
    })}
  </div>
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <div className={styles.sectionHead}><h2>{children}</h2></div>
}

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
          <h1 className={styles.title}>Ben Ebsworth</h1>
          <p className={styles.role}>Software, platform &amp; hardware engineer · AI-native · Melbourne, Australia</p>
          <p className={styles.profileMeta}>10+ years building</p>
          <nav aria-label="About sections" className={styles.jumpLinks}>
            <a href="#resume">Career</a>
            <a href="#skills">Technical practice</a>
            <a href="#certifications">Education &amp; credentials</a>
            <a href="#speaking">Talks</a>
            <a href="#lab">Simulations</a>
          </nav>
        </div>
        <div className={styles.portrait}>
          <HalftoneHero accent="var(--fg)" variant="profile" />
        </div>
        <p className={styles.profileBio}>{about.bio}</p>
      </header>
      <section id="resume" className={styles.section}>
        <SectionHeading>Career</SectionHeading>
        <TimelineGroups kind="work" />
      </section>
      <section id="skills" className={styles.section}>
        <SectionHeading>Technical practice</SectionHeading>
        <SkillMarquee skills={about.skills} layout="grouped" />
      </section>
      <section id="certifications" className={styles.section}>
        <SectionHeading>Education &amp; credentials</SectionHeading>
        <TimelineGroups kind="education" />
        <div className={styles.certificationGroups} aria-label="Professional certifications">
        {ISSUERS.map(issuer => {
          const items = about.certifications.filter(cert => cert.issuer === issuer.name)
          return items.length > 0 && <div className={styles.credentialGroup} key={issuer.name}>
            <h3 className={styles.label}>{issuer.label}</h3>
            <ul className={styles.credentials}>
              {items.map(cert => <li key={cert.title}>
                <a href={cert.url || '#'} target="_blank" rel="noreferrer" className={styles.credential}>
                  <img src={cert.badge} alt={`${cert.title} badge`} width={88} height={88} loading="lazy" />
                  <p className={styles.credentialTitle}>{cert.title} <ArrowUpRight size={14} aria-hidden="true" className={styles.externalArrow} /></p>
                </a>
              </li>)}
            </ul>
          </div>
        })}
        </div>
      </section>
      <section id="speaking" className={styles.section}>
        <SectionHeading>Talks</SectionHeading>
        <div className={styles.recordings}>
          {recordings.map(({ talk, id }) => <article key={id} className={styles.talk}>
            <YouTube id={id} title={talk.title} accent="var(--profile-action)" />
            <div className={styles.talkCaption}>
              <img src={talk.image} alt={`${talk.title} logo`} width={32} height={32} loading="lazy" />
              <div><h3>{talk.title}</h3><p className={styles.talkDate}>{talk.date} · Recording</p><p className={styles.talkDescription}>{talk.description}</p></div>
            </div>
          </article>)}
        </div>
        <div className={styles.talkLinks}>
          {otherTalks.map(talk => <a href={talk.url || '#'} key={`${talk.title}-${talk.date}-${talk.url}`} target="_blank" rel="noreferrer" className={`${styles.talk} ${styles.talkLink}`}>
            <div className={styles.talkCaption}>
              <img src={talk.image} alt={`${talk.title} logo`} width={40} height={40} loading="lazy" />
              <div><h3>{talk.title} <ArrowUpRight size={18} aria-hidden="true" className={styles.externalArrow} /></h3><p className={styles.talkDate}>{talk.date}</p><p className={styles.talkDescription}>{talk.description}</p></div>
            </div>
          </a>)}
        </div>
      </section>
      <section id="lab" className={styles.section}>
        <div className={styles.labContent}><RelatedLabs tags={['electrical', 'engineering', 'physics', 'algorithms', 'signal']} labels={['physics', 'engineering', 'algorithms', 'simulation']} limit={4} intro={<p className={styles.labIntro}>I keep an interactive lab of small visual essays — each effect is a working simulation, parameterised, playable, and shareable. They are the working sketches behind many of my posts: oscillators, attractors, filters, modulation, signal integrity. Drop in, drag the controls, watch what happens.</p>} /></div>
      </section>
    </main>
    <SiteFooter />
  </>
}
