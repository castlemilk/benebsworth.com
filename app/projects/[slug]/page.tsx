import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { getAllProjects, getProject } from '@/lib/content'
import { MdxContent } from '@/components/mdx/mdx-content'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { HandUnderline } from '@/components/mdx/hand-underline'
import styles from '@/components/personal/folio.module.css'
import { JsonLd, SITE_URL, breadcrumbLd, authorLd } from '@/components/seo/json-ld'

export function generateStaticParams() {
  return getAllProjects().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const p = getProject(slug)
  const url = `/projects/${slug}/`
  return {
    title: p?.title ?? 'Project',
    description: p?.description,
    alternates: { canonical: url },
    openGraph: { type: 'article', title: p?.title, description: p?.description, url, siteName: 'Ben Ebsworth', locale: 'en_AU' },
    twitter: { card: 'summary_large_image', title: p?.title, description: p?.description },
  }
}

/**
 * A project detail is the Projects index entry opened up: the same paper,
 * serif title with its measured underline, ruled plate and quiet technology
 * list, followed by the authored writeup in the blog's reading prose. Copy
 * precedes the emblem in source so a phone reads title → description → plate,
 * and the page ends with the way back to the index rather than dropping into
 * the footer.
 */
export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const projects = getAllProjects()
  const index = projects.findIndex((candidate) => candidate.slug === slug)
  const p = index === -1 ? undefined : projects[index]
  if (!p) notFound()
  const next = projects.length > 1 ? projects[(index + 1) % projects.length] : undefined

  const url = `${SITE_URL}/projects/${slug}/`
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: p.title,
      description: p.description,
      url,
      author: authorLd,
      ...(p.technologies?.length ? { keywords: p.technologies.map((t) => t.text).join(', ') } : {}),
    },
    breadcrumbLd([
      { name: 'Home', url: `${SITE_URL}/` },
      { name: 'Projects', url: `${SITE_URL}/projects/` },
      { name: p.title, url },
    ]),
  ]

  return (
    <>
      <JsonLd data={ld} />
      <SiteNav />

      <main id="main-content" className={styles.page}>
        <Breadcrumb
          items={[{ label: 'Home', href: '/' }, { label: 'Projects', href: '/projects/' }, { label: p.title }]}
        />

        <header className={`${styles.hero} ${styles.projectHero}`}>
          <div className={styles.projectCopy}>
            <h1 className={styles.title}><HandUnderline>{p.title}</HandUnderline></h1>
            <p className={styles.intro}>{p.description}</p>
            {p.technologies.length > 0 && (
              <ul className={styles.technologies} aria-label="Built with">
                {p.technologies.map((tech) => (
                  <li key={tech.text} style={{ '--tech-color': tech.color } as CSSProperties}>{tech.text}</li>
                ))}
              </ul>
            )}
            {p.link?.url && (
              <a href={p.link.url} target="_blank" rel="noreferrer" className={styles.textLink}>
                View source <ArrowUpRight size={16} aria-hidden="true" className={styles.externalArrow} />
              </a>
            )}
          </div>
          <div className={`${styles.projectPlate} ${styles.projectDetailPlate}`}>
            <img src={p.image} alt={`${p.title} emblem`} width={160} height={160} />
          </div>
        </header>

        <article className={`research-article ${styles.projectWriteup}`}>
          <MdxContent source={p.body} />
        </article>

        <nav aria-label="More projects" className={styles.projectFooterNav}>
          <Link href="/projects/" className={styles.textLink}>
            <span aria-hidden="true">←</span> All projects
          </Link>
          {next && (
            <Link href={`/projects/${next.slug}/`} className={styles.textLink}>
              Next project: {next.title} <span aria-hidden="true">→</span>
            </Link>
          )}
        </nav>
      </main>

      <SiteFooter />
    </>
  )
}
