import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { HandUnderline } from '@/components/mdx/hand-underline'
import styles from '@/components/personal/folio.module.css'
import { getAllProjects, type LoadedProject } from '@/lib/content'
import { Badge } from '@/components/ui/badge'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd } from '@/components/seo/json-ld'

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Selected projects by Ben Ebsworth — platforms, tools and product work spanning software, cloud infrastructure and embedded hardware, built end-to-end from data layer to interface.',
  alternates: { canonical: '/projects/' },
  openGraph: {
    type: 'website',
    title: 'Projects · Ben Ebsworth',
    description: 'Selected projects across software, cloud and hardware.',
    url: '/projects/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: { card: 'summary_large_image', title: 'Projects · Ben Ebsworth' },
}

// Use the higher-contrast black/white ink against each existing brand fill.
function readableInk(hex: string): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const rgb = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255)
  const lin = rgb.map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  const lum = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
  return (lum + 0.05) / 0.05 >= 1.05 / (lum + 0.05) ? '#000000' : '#ffffff'
}

function TechBadges({ project }: { project: LoadedProject }) {
  return <div className={styles.projectTech}>{project.technologies.map(tech =>
    <Badge key={tech.text} style={{ backgroundColor: tech.color, color: readableInk(tech.color) }}>{tech.text}</Badge>
  )}</div>
}

export default function ProjectsPage() {
  const projects = getAllProjects()
  return <>
    <JsonLd data={[
      breadcrumbLd([{ name: 'Home', url: `${SITE_URL}/` }, { name: 'Projects', url: `${SITE_URL}/projects/` }]),
      collectionPageLd({ name: 'Projects · Ben Ebsworth', description: 'Selected projects across software, cloud and hardware.', url: `${SITE_URL}/projects/`, items: projects.map(p => ({ name: p.title, url: `${SITE_URL}/projects/${p.slug}/` })) }),
    ]} />
    <SiteNav />
    <main id="main-content" className={styles.page}>
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Projects' }]} />
      <header className={styles.hero}>
        <h1 className={styles.title}>Things I’ve<br /><HandUnderline>built</HandUnderline></h1>
        <p className={styles.intro}>Side projects and experiments — places to try new ideas end-to-end, from data layer to interface.</p>
      </header>
      <ol className={styles.projectList} aria-label="Selected projects">
        {projects.map((project, i) => <li key={project.slug}>
          <Link href={`/projects/${project.slug}/`} className={styles.projectEntry}>
            <div className={styles.projectPlate}>
              <img src={project.image} alt={`${project.title} emblem`} width={160} height={160} loading={i === 0 ? 'eager' : 'lazy'} />
            </div>
            <div>
              <h2>{project.title}</h2>
              <p className={styles.projectDescription}>{project.description}</p>
              <TechBadges project={project} />
              <span className={styles.projectAction}>View project <span aria-hidden="true">→</span></span>
            </div>
          </Link>
        </li>)}
      </ol>
    </main>
    <SiteFooter />
  </>
}
