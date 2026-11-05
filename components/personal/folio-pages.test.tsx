// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AboutPage, { metadata as aboutMetadata } from '@/app/about/page'
import HikingPage, { metadata as hikingMetadata } from '@/app/hiking/page'
import ProjectsPage, { metadata as projectsMetadata } from '@/app/projects/page'
import { about } from '@/content/about'
import { hikeImagery } from '@/content/hiking-imagery'
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
vi.mock('@/components/blog/related-labs', () => ({ RelatedLabs: ({ intro, ...props }: { intro?: React.ReactNode }) => <div data-related-labs={JSON.stringify(props)}><h2>Try it in the lab</h2>{intro}<a href="/lab/">All effects</a></div> }))

function render(Page: () => React.JSX.Element) {
  return new DOMParser().parseFromString(renderToStaticMarkup(<Page />), 'text/html')
}
function text(node: Element | null) { return node?.textContent?.replace(/\s+/g, ' ').trim() ?? '' }
function jsonAttribute(node: Element | null, name: string) { return JSON.parse(node!.getAttribute(name)!) }
function structured(doc: Document): { '@type': string; itemListElement?: unknown[]; mainEntity?: { itemListElement: { url: string }[] } }[] { return JSON.parse(doc.querySelector('script[type="application/ld+json"]')!.textContent!) }
function link(doc: Document, href: string) { return [...doc.querySelectorAll('a')].find(a => a.getAttribute('href')?.replace(/\/$/, '') === href.replace(/\/$/, ''))! }

const cases = [
  { name: 'About', route: '/about/', Page: AboutPage, metadata: aboutMetadata },
  { name: 'Hiking', route: '/hiking/', Page: HikingPage, metadata: hikingMetadata },
  { name: 'Projects', route: '/projects/', Page: ProjectsPage, metadata: projectsMetadata },
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
    expect(text(doc.querySelector('header'))).toContain(about.bio)
    expect(doc.querySelector('h1 br')).toBeNull()
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
      expect(anchor.querySelector('img')?.getAttribute('src')).toBe(hikeImagery(hike).src)
      const paths = anchor.querySelectorAll('svg path')
      expect(paths).toHaveLength(1)
      for (const path of paths) expect(path.getAttribute('d')).toBe(smoothPath(hike.waypoints.map(project)))
      expect(text(anchor)).toContain('Schematic route')
      expect(anchor.querySelector('figure')?.getAttribute('data-image-kind')).toBe(hikeImagery(hike).kind)
    }
    const items = structured(doc).find(item => item['@type'] === 'CollectionPage')?.mainEntity?.itemListElement ?? []
    expect(items).toHaveLength(10)
    expect(items.map((item: { url: string }) => item.url)).toEqual([...completedHikes, ...plannedHikes].map(hike => `${SITE_URL}/hiking/${hike.slug}/`))
  })

  it('shows an honest empty image state while retaining route information when a hike has no hero', () => {
    const html = renderToStaticMarkup(<FolioHikeEntry hike={{ ...completedHikes[0], hero: '' }} />)
    expect(html).toContain('Image unavailable')
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
})
