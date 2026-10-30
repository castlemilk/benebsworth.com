// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { BlogContent } from './blog-content'
import type { BlogPostSummary } from '@/lib/content'
vi.mock('@/components/motion/reveal', () => ({ Reveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
afterEach(cleanup)
const posts: BlogPostSummary[] = [
  { slug: 'first', title: 'Signal alpha', description: 'A shared description', tags: ['Kubernetes', 'rare-tag'], date: '2026-10-22', readingTime: 5, heroImage: '/first.webp' },
  { slug: 'second', title: 'Second note', description: 'Signal in a description', tags: ['React'], date: '2026-10-21', readingTime: 4, heroImage: '' },
  { slug: 'third', title: 'Third note', description: 'An ordinary description', tags: ['Kubernetes'], date: '2026-10-20', readingTime: 3, heroImage: '/third.webp' },
  { slug: 'fourth', title: 'Fourth note', description: 'No shared term', tags: ['Istio'], date: '2026-10-19', readingTime: 2, heroImage: '' },
]
function titles(container: HTMLElement) { return Array.from(container.querySelectorAll('h2')).map(h => h.textContent) }
describe('archive discovery interactions', () => {
  it('keeps full counts, stable topic ties, source order, dates and exact destinations', () => {
    const v = render(<BlogContent posts={posts} />)
    expect(v.getAllByRole('button').map(b => b.textContent)).toEqual(['', 'All4', 'Kubernetes2', 'Service Mesh1', 'React1'])
    expect(titles(v.container)).toEqual(posts.map(p => p.title))
    expect(v.getAllByRole('link').map(a => a.getAttribute('href')?.replace(/\/$/, ''))).toEqual(posts.map(p => `/blog/${p.slug}`))
    expect(v.container.querySelector('time')?.getAttribute('datetime')).toBe(posts[0].date)
    for (const src of ['/first.webp', '/third.webp']) expect(v.container.querySelector(`img[src="${src}"]`)?.getAttribute('alt')).toBe('')
    expect((v.getByRole('button', { name: 'Clear search' }) as HTMLButtonElement).disabled).toBe(true)
  })
  it.each([['  SIGNAL  ', ['Signal alpha', 'Second note']], ['RARE-TAG', ['Signal alpha']], ['ordinary', ['Third note']]])('matches title, description and tags for %s', (query, expected) => {
    const v = render(<BlogContent posts={posts} />)
    fireEvent.change(v.getByRole('searchbox'), { target: { value: query } })
    expect(titles(v.container)).toEqual(expected)
    expect(v.getByRole('status').textContent).toBe(`${expected.length} result${expected.length === 1 ? '' : 's'} for "${query.trim()}"`)
    expect(v.getByRole('button', { name: /All\s*4/ }).textContent).toBe('All4')
  })
  it('intersects topic/search, restores clear focus without clearing topic, and toggles topic/All', () => {
    const v = render(<BlogContent posts={posts} />)
    const input = v.getByRole('searchbox') as HTMLInputElement
    const topic = v.getByRole('button', { name: /Kubernetes\s*2/ })
    fireEvent.change(input, { target: { value: 'signal' } })
    fireEvent.click(topic)
    expect(titles(v.container)).toEqual(['Signal alpha'])
    expect(v.getByRole('status').textContent).toBe('1 result for "signal" · Kubernetes')
    const clear = v.getByRole('button', { name: 'Clear search' })
    clear.focus(); fireEvent.click(clear)
    expect(document.activeElement).toBe(input)
    expect(input.value).toBe('')
    expect(topic.getAttribute('aria-pressed')).toBe('true')
    expect(titles(v.container)).toEqual(['Signal alpha', 'Third note'])
    fireEvent.click(topic)
    expect(topic.getAttribute('aria-pressed')).toBe('false')
    expect(titles(v.container)).toEqual(posts.map(p => p.title))
    fireEvent.change(input, { target: { value: 'signal' } }); fireEvent.click(topic)
    fireEvent.click(v.getByRole('button', { name: /All\s*4/ }))
    expect(input.value).toBe('signal')
    expect(titles(v.container)).toEqual(['Signal alpha', 'Second note'])
  })
  it('announces no results and recovers without URL changes or invented links', () => {
    const v = render(<BlogContent posts={posts} />)
    const url = window.location.href
    fireEvent.change(v.getByRole('searchbox'), { target: { value: 'unmatched phrase' } })
    expect(v.getByRole('status').textContent).toBe('0 results for "unmatched phrase"')
    expect(v.getByText('No posts match your search. Try a different term or topic.')).toBeTruthy()
    expect(v.queryAllByRole('link')).toHaveLength(0)
    fireEvent.click(v.getByRole('button', { name: 'Clear search' }))
    expect(titles(v.container)).toEqual(posts.map(p => p.title))
    expect(window.location.href).toBe(url)
  })
  it('does not mislabel whitespace-only queries', () => {
    const v = render(<BlogContent posts={posts} />)
    fireEvent.change(v.getByRole('searchbox'), { target: { value: '   ' } })
    expect(v.queryByRole('status')).toBeNull()
    fireEvent.click(v.getByRole('button', { name: /React\s*1/ }))
    expect(v.getByRole('status').textContent).toBe('1 result for React')
  })
  it('distinguishes empty source data from filtered no-results', () => {
    const v = render(<BlogContent posts={[]} />)
    expect(v.getByRole('status').textContent).toBe('No posts are available yet.')
    expect(v.getByRole('button', { name: /All\s*0/ })).toBeTruthy()
    expect(v.queryAllByRole('link')).toHaveLength(0)
  })
  it('preserves long copy and existing tag limits without inventing missing thumbnails', () => {
    const long = 'LongUnbrokenToken'.repeat(20)
    const v = render(<BlogContent posts={[{ ...posts[0], title: long, description: long, heroImage: '', tags: [long, 'one', 'two', 'three', 'four', 'five'] }]} />)
    expect(v.getByRole('heading', { name: long }).textContent).toBe(long)
    expect(v.container.querySelector('article p')?.textContent).toBe(long)
    expect(v.container.querySelector('article')?.textContent).toContain(long)
    expect(v.container.querySelector('img[src=""]')).toBeNull()
    expect(v.container.querySelector('img[aria-hidden]')).toBeTruthy()
    expect(v.queryByText('five')).toBeNull()
    expect(v.getAllByRole('link')).toHaveLength(1)
  })
})
