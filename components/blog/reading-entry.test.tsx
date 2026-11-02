import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { LoadedPost } from '@/lib/content'
import { getPublishedPosts } from '@/lib/content'
import { fmtDate } from '@/lib/format'
import { ReadingEntry } from './reading-entry'
import { RelatedPosts } from './related-posts'
import Home from '@/app/page'

vi.mock('@/lib/content', () => ({ getPublishedPosts: vi.fn() }))
vi.mock('@/components/landing/grid-nav', () => ({ GridNav: () => <div data-testid="grid-nav" /> }))
vi.mock('@/components/landing/lab-matrix', () => ({ LabMatrix: () => <div data-testid="lab-matrix" /> }))

function post(slug: string, date = '2026-10-22', tags = ['Kubernetes']): LoadedPost {
  return {
    slug, title: `Title for ${slug}`, description: `Summary for ${slug}.`, date, tags,
    readingTime: 4, heroImage: '/images/example.jpg', body: '', wordCount: 920, draft: false, release: true,
  }
}

beforeEach(() => vi.mocked(getPublishedPosts).mockReturnValue([]))

describe('shared reading entry', () => {
  it.each(['h2', 'h3'] as const)('uses explicit %s hierarchy and preserves summary metadata and link', headingLevel => {
    const html = renderToStaticMarkup(<ReadingEntry post={post('example')} headingLevel={headingLevel} />)
    expect(html).toContain('<article')
    expect(html).toContain(`<${headingLevel} class="reading-entry__title">Title for example</${headingLevel}>`)
    expect(html).toMatch(/href="\/blog\/example\/?"/)
    expect(html).toContain('Summary for example.')
    expect(html).toContain('Kubernetes')
    expect(html).toContain('dateTime="2026-10-22"')
    expect(html).toContain(fmtDate('2026-10-22'))
    expect(html).toContain('· 4 min read')
    expect(html.match(/<a /g)).toHaveLength(1)
    expect(html).not.toContain('<button')
    expect(html).not.toContain('<img')
  })

  it('keeps optional thumbnail decorative beside its visible title', () => {
    const html = renderToStaticMarkup(<ReadingEntry post={post('image')} headingLevel="h3" showImage />)
    expect(html).toContain('src="/images/example.jpg"')
    expect(html).toContain('alt=""')
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('width="160" height="112"')
  })

  it('does not invent missing descriptions or thumbnails', () => {
    const html = renderToStaticMarkup(<ReadingEntry post={{ ...post('minimal'), description: '', heroImage: '' }} headingLevel="h3" showImage />)
    expect(html).not.toContain('reading-entry__description')
    expect(html).not.toContain('<img')
    expect(html).toContain('aria-hidden="true" class="reading-entry__arrow"')
  })
})

describe('reading contexts', () => {
  it('keeps the homepage latest three in their input order and leaves the other sections intact', () => {
    vi.mocked(getPublishedPosts).mockReturnValue(['first', 'second', 'third', 'fourth'].map(slug => post(slug)))
    const html = renderToStaticMarkup(<Home />)
    expect(html).toContain('<h2 id="latest-writing-heading"')
    expect(html.match(/<h3 class="reading-entry__title">/g)).toHaveLength(3)
    expect(html).toMatch(/href="\/blog\/?"/)
    expect(html.indexOf('Title for first')).toBeLessThan(html.indexOf('Title for second'))
    expect(html.indexOf('Title for second')).toBeLessThan(html.indexOf('Title for third'))
    expect(html).not.toContain('Title for fourth')
    expect(html).toContain('data-testid="grid-nav"')
    expect(html).toContain('data-testid="lab-matrix"')
    expect(html).toContain('From the lab')
  })

  it('keeps related ranking, exclusion, limits and h2/h3 hierarchy', () => {
    vi.mocked(getPublishedPosts).mockReturnValue([
      post('current'), post('unrelated-new', '2026-10-27', ['React']),
      post('overlap-old', '2026-10-20'), post('overlap-new', '2026-10-23'),
    ])
    const html = renderToStaticMarkup(<RelatedPosts currentSlug="current" tags={['Kubernetes']} limit={2} />)
    expect(html).toContain('<h2 id="related-writing-heading"')
    expect(html.match(/<h3 class="reading-entry__title">/g)).toHaveLength(2)
    expect(html.indexOf('Title for overlap-new')).toBeLessThan(html.indexOf('Title for overlap-old'))
    expect(html).toMatch(/href="\/blog\/overlap-new\/?"/)
    expect(html).toMatch(/href="\/blog\/overlap-old\/?"/)
    expect(html).not.toContain('Title for current')
    expect(html).not.toContain('Title for unrelated-new')
    expect(html).not.toContain('<img')
  })

  it('renders nothing when no related entries remain', () => {
    vi.mocked(getPublishedPosts).mockReturnValue([post('current')])
    expect(renderToStaticMarkup(<RelatedPosts currentSlug="current" tags={[]} />)).toBe('')
    expect(renderToStaticMarkup(<RelatedPosts currentSlug="other" tags={[]} limit={0} />)).toBe('')
  })
})
