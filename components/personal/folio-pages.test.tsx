// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AboutPage, { metadata as aboutMetadata } from '@/app/about/page'
import HikingPage, { metadata as hikingMetadata } from '@/app/hiking/page'
import ProjectsPage, { metadata as projectsMetadata } from '@/app/projects/page'
import ProjectPage, { generateMetadata as projectMetadata } from '@/app/projects/[slug]/page'
import UsesPage, { metadata as usesMetadata } from '@/app/uses/page'
import NowPage, { metadata as nowMetadata } from '@/app/now/page'
import { USES } from '@/content/uses'
import { NOW, NOW_UPDATED, NOW_UPDATED_ISO } from '@/content/now'
import { about } from '@/content/about'
import { completedHikes, plannedHikes } from '@/content/hiking'
import { getAllProjects } from '@/lib/content'
import { project, smoothPath } from '@/components/hiking/journey-core'
import { SITE_URL, profilePageLd } from '@/components/seo/json-ld'
import { youtubeId } from '@/lib/youtube'
import { FolioHikeEntry } from './hike-entry'
import type { Skill } from '@/lib/gen/content'

// Keep data, JSON-LD, entry rendering and link destinations real. Stub only
// shared chrome and client interactions so this tests the server page contract.
vi.mock('@/components/site/site-nav', () => ({ SiteNav: () => <nav data-site-nav /> }))
vi.mock('@/components/site/site-footer', () => ({ SiteFooter: () => <footer /> }))
vi.mock('@/components/site/breadcrumb', () => ({ Breadcrumb: ({ items }: { items: { label: string; href?: string }[] }) => <nav aria-label="Breadcrumb">{items.map(item => item.href ? <a key={item.label} href={item.href}>{item.label}</a> : <span key={item.label}>{item.label}</span>)}</nav> }))
vi.mock('@/components/about/halftone-hero', () => ({ HalftoneHero: (props: object) => <div data-portrait-props={JSON.stringify(props)} /> }))
vi.mock('@/components/motion/skill-marquee', () => ({ SkillMarquee: ({ skills, layout }: { skills: Skill[]; layout?: string }) => <div data-skills={JSON.stringify(skills)} data-skill-layout={layout} /> }))
vi.mock('@/components/media/youtube', () => ({ YouTube: (props: object) => <div data-youtube={JSON.stringify(props)} /> }))
vi.mock('@/components/mdx/mdx-content', () => ({ MdxContent: ({ source }: { source: string }) => <div data-mdx-source={source} /> }))
vi.mock('@/components/blog/related-labs', () => ({ RelatedLabs: ({ intro, ...props }: { intro?: React.ReactNode }) => <div data-related-labs={JSON.stringify(props)}><h2>Try it in the lab</h2>{intro}<a href="/lab/">All effects</a></div> }))

function render(Page: () => React.JSX.Element) {
  return new DOMParser().parseFromString(renderToStaticMarkup(<Page />), 'text/html')
}
function text(node: Element | null) { return node?.textContent?.replace(/\s+/g, ' ').trim() ?? '' }

// Expected plain text of each Now entry, kept here so content/now.tsx holds the copy once.
const NOW_TEXT: Record<string, string> = {
  work: 'Senior Software Engineer at Atlassian, in the Micros platform team — building and operating the internal platform, developer tooling and orchestration that thousands of Atlassian services deploy and run on, on top of AWS.',
  building: 'Pouring spare cycles into this site — an interactive lab of parameterised simulations and a from-scratch circuit simulator. Each lab piece is a working model you can drag, tune and share.',
  learning: 'AI-native engineering — treating LLMs, agents and MCP as core toolchain rather than a bolt-on. Coding agents, retrieval, and evals, pointed at real production work.',
  writing: 'Long-form essays on the blog — distributed systems, signal processing, and the physics hiding inside everyday things. The lab sketches are usually where a post starts.',
}
function jsonAttribute(node: Element | null, name: string) { return JSON.parse(node!.getAttribute(name)!) }
function structured(doc: Document): { '@type': string; itemListElement?: unknown[]; mainEntity?: { itemListElement: { url: string }[] } }[] { return JSON.parse(doc.querySelector('script[type="application/ld+json"]')!.textContent!) }
function link(doc: Document, href: string) { return [...doc.querySelectorAll('a')].find(a => a.getAttribute('href')?.replace(/\/$/, '') === href.replace(/\/$/, ''))! }

const cases = [
  { name: 'About', route: '/about/', Page: AboutPage, metadata: aboutMetadata },
  { name: 'Hiking', route: '/hiking/', Page: HikingPage, metadata: hikingMetadata },
  { name: 'Projects', route: '/projects/', Page: ProjectsPage, metadata: projectsMetadata },
  { name: 'Uses', route: '/uses/', Page: UsesPage, metadata: usesMetadata },
  { name: 'Now', route: '/now/', Page: NowPage, metadata: nowMetadata },
]

describe('personal folio page preservation', () => {
  it.each(cases)('retains $name landmarks, canonical metadata and breadcrumbs', ({ name, route, Page, metadata }) => {
    const doc = render(Page)
    expect(doc.querySelectorAll('main#main-content')).toHaveLength(1)
    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(doc.querySelector('[data-site-nav]')).not.toBeNull()
    expect(doc.querySelector('footer')).not.toBeNull()
    expect(text(doc.querySelector('nav[aria-label="Breadcrumb"]'))).toContain(name)
    expect(link(doc, '/')).toBeDefined()
    expect(metadata.title).toBe(name)
    expect(metadata.alternates?.canonical).toBe(route)
    expect(metadata.openGraph).toMatchObject({ url: route, siteName: 'Ben Ebsworth', locale: 'en_AU' })
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', title: `${name} · Ben Ebsworth` })
    expect(structured(doc).find(item => item['@type'] === 'BreadcrumbList')?.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name, item: `${SITE_URL}${route}` },
    ])
  })

  it('preserves About biography, facts, all timeline entries and section anchors', () => {
    const doc = render(AboutPage)
    expect(text(doc.querySelector('main'))).toContain(about.bio)
    expect(text(doc.querySelector('header'))).toContain('10+ years building')
    expect(doc.querySelector('header dl')).toBeNull()
    for (const id of ['resume', 'certifications', 'speaking', 'skills', 'lab']) {
      expect(doc.querySelector(`section#${id}`)).not.toBeNull()
      expect(link(doc, `#${id}`)).toBeDefined()
    }
    const entries = doc.querySelectorAll('[data-timeline-entry]')
    expect(entries).toHaveLength(9)
    about.timeline.forEach((entry, i) => {
      expect(text(entries[i])).toContain(entry.when)
      const group = entries[i].closest('[data-timeline-group]')!
      expect(text(group.querySelector('h3'))).toBe(entry.company)
      expect(`${text(entries[i].querySelector('h4'))} · ${entry.company}`).toBe(entry.title)
      expect(text(entries[i])).toContain(entry.detail)
      expect(group.querySelector('img')?.getAttribute('src')).toBe(entry.logo)
      expect([...entries[i].querySelectorAll('ul li')].map(text)).toEqual(entry.tech)
    })
    expect(doc.querySelectorAll('#resume [data-timeline-entry]')).toHaveLength(7)
    expect(doc.querySelectorAll('#certifications [data-timeline-entry]')).toHaveLength(2)
    expect(doc.querySelectorAll('[data-timeline-group]')).toHaveLength(4)
    expect(doc.querySelectorAll('[data-timeline-entry] details')).toHaveLength(9)
    expect(structured(doc)).toContainEqual(profilePageLd)
    expect(doc.querySelector('.hand-underline, .annotated-block, .handwritten-note')).toBeNull()
    expect(doc.querySelector('#resume img[src*="notebook"]')).toBeNull()
    expect(doc.querySelector('a[download], form')).toBeNull()
  })

  it('preserves all credential destinations and all five talks', () => {
    const doc = render(AboutPage)
    expect(doc.querySelectorAll('#certifications a[target="_blank"]')).toHaveLength(9)
    expect([...doc.querySelectorAll('[aria-label="Professional certifications"] h3')].map(text)).toEqual([
      'Amazon Web Services', 'Google Cloud', 'Cloud Native Computing Foundation',
    ])
    for (const cert of about.certifications) {
      const anchor = link(doc, cert.url)
      expect(text(anchor)).toContain(cert.title)
      expect(anchor.getAttribute('target')).toBe('_blank')
      expect(anchor.getAttribute('rel')).toContain('noreferrer')
      expect(anchor.querySelector('img')?.getAttribute('src')).toBe(cert.badge)
    }
    expect(doc.querySelectorAll('#speaking h3')).toHaveLength(5)
    for (const talk of about.speaking) {
      expect(text(doc.querySelector('#speaking'))).toContain(talk.description)
      expect(text(doc.querySelector('#speaking'))).toContain(talk.date)
      expect(doc.querySelector(`#speaking img[src="${talk.image}"]`)).not.toBeNull()
      if (!youtubeId(talk.url)) expect(link(doc, talk.url)).toBeDefined()
    }
    expect([...doc.querySelectorAll('[data-youtube]')].map(node => jsonAttribute(node, 'data-youtube'))).toEqual(
      about.speaking.flatMap(talk => youtubeId(talk.url) ? [{ id: youtubeId(talk.url), title: talk.title, accent: 'var(--profile-action)' }] : []),
    )
  })

  it('passes complete existing content to portrait, skills and lab interactions', () => {
    const doc = render(AboutPage)
    expect(jsonAttribute(doc.querySelector('[data-portrait-props]'), 'data-portrait-props')).toEqual({ accent: 'var(--fg)', variant: 'profile' })
    const skills = jsonAttribute(doc.querySelector('[data-skills]'), 'data-skills')
    expect(skills).toHaveLength(50)
    expect(skills).toEqual(about.skills)
    expect(doc.querySelector('[data-skill-layout]')?.getAttribute('data-skill-layout')).toBe('grouped')
    expect(jsonAttribute(doc.querySelector('[data-related-labs]'), 'data-related-labs')).toEqual({ tags: ['electrical', 'engineering', 'physics', 'algorithms', 'signal'], labels: ['physics', 'engineering', 'algorithms', 'simulation'], limit: 4 })
    expect(link(doc, '/lab/')).toBeDefined()
    expect(doc.querySelectorAll('#lab h2')).toHaveLength(1)
    expect(doc.querySelectorAll('#lab a[href="/lab/"]')).toHaveLength(1)
    expect(text(doc.querySelector('#lab'))).toContain('oscillators, attractors, filters, modulation, signal integrity')
  })

  it('preserves every hike, status, stat, image, destination and authored route trace', () => {
    const doc = render(HikingPage)
    expect(doc.querySelectorAll('#completed a[href^="/hiking/"]')).toHaveLength(4)
    expect(doc.querySelectorAll('#planned a[href^="/hiking/"]')).toHaveLength(6)
    for (const hike of [...completedHikes, ...plannedHikes]) {
      const anchor = link(doc, `/hiking/${hike.slug}/`)
      for (const value of [hike.name, hike.region, hike.country, hike.summary, `${hike.distanceKm} km`, `${hike.days} days`, `${hike.maxAltitudeM.toLocaleString('en-AU')} m`, hike.status === 'planned' ? 'Planned' : hike.year]) expect(text(anchor)).toContain(value)
      expect(anchor.querySelector('img')?.getAttribute('src')).toBe(hike.hero)
      const paths = anchor.querySelectorAll('svg path')
      expect(paths).toHaveLength(2)
      for (const path of paths) expect(path.getAttribute('d')).toBe(smoothPath(hike.waypoints.map(project)))
      expect(paths[1].getAttribute('stroke')).toBe(hike.accent || '#5b9e6f')
    }
    const items = structured(doc).find(item => item['@type'] === 'CollectionPage')?.mainEntity?.itemListElement ?? []
    expect(items).toHaveLength(10)
    expect(items.map((item: { url: string }) => item.url)).toEqual([...completedHikes, ...plannedHikes].map(hike => `${SITE_URL}/hiking/${hike.slug}/`))
  })

  it('retains the existing illustration fallback when a hike has no hero', () => {
    const html = renderToStaticMarkup(<FolioHikeEntry hike={{ ...completedHikes[0], hero: '' }} />)
    expect(html).toContain('photo coming soon')
    expect(html).toContain(completedHikes[0].name)
    expect(html).toContain(smoothPath(completedHikes[0].waypoints.map(project)))
  })

  it('preserves both ordered projects, descriptions, emblems, technology badges and schema destinations', () => {
    const doc = render(ProjectsPage)
    const projects = getAllProjects()
    expect(projects.map(p => p.slug)).toEqual(['nutry', 'this-site'])
    const entries = doc.querySelectorAll('ol[aria-label="Selected projects"] > li')
    expect(entries).toHaveLength(2)
    projects.forEach((project, i) => {
      expect(text(entries[i].querySelector('h2'))).toBe(project.title)
      expect(text(entries[i])).toContain(project.description)
      expect(entries[i].querySelector('a')?.getAttribute('href')).toBe(`/projects/${project.slug}`)
      expect(entries[i].querySelector('img')?.getAttribute('src')).toBe(project.image)
      const badges = entries[i].querySelectorAll('[data-slot="badge"]')
      expect([...badges].map(text)).toEqual(project.technologies.map(tech => tech.text))
      for (const badge of badges) expect((badge as HTMLElement).style.color).toMatch(/rgb\((0, 0, 0|255, 255, 255)\)/)
    })
    const items = structured(doc).find(item => item['@type'] === 'CollectionPage')?.mainEntity?.itemListElement ?? []
    expect(items.map((item: { url: string }) => item.url)).toEqual(projects.map(project => `${SITE_URL}/projects/${project.slug}/`))
  })

  it('aligns each project detail with the index and keeps its facts, emblem, source link and return journeys', async () => {
    const projects = getAllProjects()
    for (const [i, project] of projects.entries()) {
      const doc = new DOMParser().parseFromString(renderToStaticMarkup(await ProjectPage({ params: Promise.resolve({ slug: project.slug }) })), 'text/html')
      expect(doc.querySelectorAll('main#main-content')).toHaveLength(1)
      expect(doc.querySelectorAll('h1')).toHaveLength(1)
      expect(text(doc.querySelector('h1'))).toBe(project.title)
      expect(doc.querySelector('h1 .hand-underline')).not.toBeNull()
      expect(text(doc.querySelector('header'))).toContain(project.description)
      expect(doc.querySelector('header img')?.getAttribute('src')).toBe(project.image)
      expect(doc.querySelector('header img')?.getAttribute('alt')).toBe(`${project.title} emblem`)
      // The description and technologies precede the emblem in source order, so a phone reads title → copy → plate.
      const header = doc.querySelector('header')!
      const plate = header.querySelector('img')!
      const intro = [...header.querySelectorAll('p')].find(p => text(p) === project.description)
      expect(intro).toBeDefined()
      for (const node of [intro!, header.querySelector('ul[aria-label="Built with"]')!]) {
        expect(node.compareDocumentPosition(plate) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      }
      const technologies = [...doc.querySelectorAll('header ul[aria-label="Built with"] li')]
      expect(technologies.map(text)).toEqual(project.technologies.map(tech => tech.text))
      project.technologies.forEach((tech, j) => expect((technologies[j] as HTMLElement).getAttribute('style')).toContain(tech.color))
      expect(doc.querySelector('[data-slot="badge"]')).toBeNull()
      if (project.link?.url) {
        const source = link(doc, project.link.url)
        expect(text(source)).toContain('View source')
        expect(source.getAttribute('target')).toBe('_blank')
        expect(source.getAttribute('rel')).toContain('noreferrer')
      }
      expect(doc.querySelector('[data-mdx-source]')?.getAttribute('data-mdx-source')).toBe(project.body)
      expect(text(doc.querySelector('nav[aria-label="Breadcrumb"]'))).toContain(project.title)
      const more = doc.querySelector('nav[aria-label="More projects"]')!
      const moreLink = (href: string) => [...more.querySelectorAll('a')].find(a => a.getAttribute('href')?.replace(/\/$/, '') === href.replace(/\/$/, ''))!
      expect(text(moreLink('/projects/'))).toContain('All projects')
      const other = projects[(i + 1) % projects.length]
      expect(text(moreLink(`/projects/${other.slug}/`))).toContain(other.title)
      const metadata = await projectMetadata({ params: Promise.resolve({ slug: project.slug }) })
      expect(metadata.title).toBe(project.title)
      expect(metadata.alternates?.canonical).toBe(`/projects/${project.slug}/`)
      expect(structured(doc).find(item => item['@type'] === 'BreadcrumbList')?.itemListElement).toEqual([
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Projects', item: `${SITE_URL}/projects/` },
        { '@type': 'ListItem', position: 3, name: project.title, item: `${SITE_URL}/projects/${project.slug}/` },
      ])
    }
  })

  it('keeps every Uses group and entry in order, as readable headings and a name → note ledger', () => {
    const doc = render(UsesPage)
    const sections = [...doc.querySelectorAll('main section')]
    expect(sections.map(section => text(section.querySelector('h2')))).toEqual(USES.map(group => group.group))
    USES.forEach((group, i) => {
      expect(sections[i].id).toBe(group.id)
      expect(link(doc, `#${group.id}`)).toBeDefined()
      const rows = [...sections[i].querySelectorAll('dl > div')]
      expect(rows.map(row => text(row.querySelector('dt')))).toEqual(group.items.map(item => item.name))
      expect(rows.map(row => text(row.querySelector('dd')))).toEqual(group.items.map(item => item.note))
    })
    expect(USES.flatMap(group => group.items)).toHaveLength(20)
    expect(text(doc.querySelector('header'))).toContain('colophon of exactly how this site is built and shipped')
    for (const href of ['https://uses.tech', '/now/', '/projects/']) expect(link(doc, href)).toBeDefined()
    expect(link(doc, 'https://uses.tech').getAttribute('rel')).toContain('noreferrer')
    // The clean profile family has no tracked mono labels, entrance motion or invented machine rows.
    expect(doc.querySelector('.accent-ink, [style*="translateY"], [style*="opacity:0"], .type-h1')).toBeNull()
    expect(doc.querySelectorAll('main h1, main h2')).toHaveLength(1 + USES.length)
  })

  it('keeps every Now entry, its links and the authored update date', () => {
    const doc = render(NowPage)
    const sections = [...doc.querySelectorAll('main section')]
    expect(sections.map(section => text(section.querySelector('h2')))).toEqual(NOW.map(entry => entry.label))
    NOW.forEach((entry, i) => {
      expect(sections[i].id).toBe(entry.id)
      expect(text(sections[i].querySelector('p'))).toBe(NOW_TEXT[entry.id])
    })
    const time = doc.querySelector('header time')!
    expect(time.getAttribute('dateTime')).toBe(NOW_UPDATED_ISO)
    expect(text(time)).toBe(NOW_UPDATED)
    expect(text(doc.querySelector('header'))).toContain(`Updated ${NOW_UPDATED}`)
    for (const href of ['/lab/', '/lab/circuit-sim/', '/blog/', '/projects/', '/uses/', 'https://nownownow.com/about']) expect(link(doc, href)).toBeDefined()
    expect(structured(doc)).toContainEqual(expect.objectContaining({ '@type': 'WebPage', dateModified: NOW_UPDATED_ISO }))
    expect(doc.querySelector('.accent-ink, [style*="translateY"], [style*="opacity:0"], .type-h1')).toBeNull()
  })
})
