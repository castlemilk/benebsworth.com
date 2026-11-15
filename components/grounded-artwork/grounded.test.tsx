// @vitest-environment jsdom
import React from 'react'
import { gzipSync } from 'node:zlib'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { GroundedCollection } from './collection'
import { GroundedDetail } from './detail'
import { GROUNDED_ARTWORK, groundedCards } from '@/lib/grounded-artwork/registry'

import { partitionGroundedDiscovery } from '@/lib/grounded-artwork/partitions'

const cards = groundedCards()
const { bootstrap, files } = partitionGroundedDiscovery(cards)
beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(files.get(url), { status: files.has(url) ? 200 : 404 }))) })
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/vectors/grounded/') })
it('bounds initial HTML to 24 lightweight thumbnails with stable detail links', async () => {
  const html = renderToString(<GroundedCollection bootstrap={bootstrap} />)
  expect((html.match(/data-grounded-card=/g) || []).length).toBe(24)
  expect(html).not.toContain('.svg')
  render(<GroundedCollection bootstrap={bootstrap} />)
  expect(screen.getAllByRole('link', { name: /^Open / })).toHaveLength(24)
  expect(document.querySelector('[data-grounded-card] img')?.getAttribute('loading')).toBe('lazy')
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
  await waitFor(() => expect(screen.getAllByRole('link', { name: /^Open / })).toHaveLength(Math.min(24, cards.length - 24)))
  expect(window.location.search).toBe('?page=2')
})
it('gives selects explicit concise labels that exclude their option text', () => {
  render(<GroundedCollection bootstrap={bootstrap} />)
  for (const name of ['Subject', 'Tag']) {
    const select = screen.getByRole('combobox', { name }) as HTMLSelectElement
    expect(screen.getByLabelText(name, { exact: true })).toBe(select)
    expect(select.labels).toHaveLength(1)
    expect(select.labels![0].textContent).toBe(name)
    expect(select.labels![0].htmlFor).toBe(select.id)
  }
})
it('intersects filters, resets page, clears with focus and restores URL state', async () => {
  render(<GroundedCollection bootstrap={bootstrap} />)
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
  fireEvent.change(screen.getByLabelText('Find grounded artwork'), { target: { value: cards[0].title } })
  expect(window.location.search).not.toContain('page=')
  expect(await screen.findByRole('link', { name: `Open ${cards[0].title}` })).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Subject'), { target: { value: cards.find(c => c.subject !== cards[0].subject)!.subject } })
  expect(await screen.findByText('No matching artwork')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Show all artwork' }))
  expect(document.activeElement).toBe(screen.getByLabelText('Find grounded artwork'))
  expect(window.location.search).toBe('')
  act(() => { window.history.replaceState(null, '', '?page=2'); window.dispatchEvent(new PopStateEvent('popstate')) })
  await waitFor(() => expect(screen.getAllByRole('link', { name: /^Open / })).toHaveLength(Math.min(24, cards.length - 24)))
})
it('uses only the selected authored preview and byte-exact master URL on its intended matte', () => {
  const artwork = GROUNDED_ARTWORK[0]
  render(<GroundedDetail artwork={artwork} />)
  for (const palette of ['Light', 'Dark', 'Monochrome']) {
    fireEvent.click(screen.getByLabelText(palette))
    const key = palette === 'Monochrome' ? 'mono' : palette.toLowerCase() as 'light' | 'dark'
    expect(screen.getByAltText(artwork.title).getAttribute('src')).toBe(artwork.variants[key].preview)
    expect(screen.getByAltText(artwork.title).parentElement?.getAttribute('data-palette')).toBe(key)
    const link = screen.getByRole('link', { name: `Download ${palette.toLowerCase()} SVG` })
    expect(link.getAttribute('href')).toBe(artwork.variants[key].master)
    expect(screen.getByRole('link', { name: 'Open full-size preview' }).getAttribute('href')).toBe(artwork.variants[key].preview)
    expect(link.getAttribute('download')).toBe(artwork.variants[key].master.split('/').pop())
  }
  expect(screen.queryByRole('slider')).toBeNull()
  expect(screen.getByText(artwork.basis)).toBeTruthy()
  expect(screen.getByText(artwork.limitations)).toBeTruthy()
})
it('loads shared alias and tag URLs, intersects tag filtering, and clamps malformed pages', async () => {
  const card = cards.find(c => c.aliases.length && c.tags.length)!
  const query = new URLSearchParams({ q: card.aliases[0], subject: card.subject, tag: card.tags[0], page: 'NaN' })
  window.history.replaceState(null, '', `?${query}`)
  render(<GroundedCollection bootstrap={bootstrap} />)
  expect(await screen.findByRole('link', { name: `Open ${card.title}` })).toBeTruthy()
  expect((screen.getByLabelText('Tag') as HTMLSelectElement).value).toBe(card.tags[0])
  const unrelatedTag = cards.flatMap(c => c.tags).find(tag => !card.tags.includes(tag))!
  fireEvent.change(screen.getByLabelText('Tag'), { target: { value: unrelatedTag } })
  expect(screen.queryByRole('link', { name: `Open ${card.title}` })).toBeNull()
  expect(window.location.search).not.toContain('page=')
})

it('keeps the complete reviewed scientific notes available from Set05 detail pages', () => {
  render(<GroundedDetail artwork={GROUNDED_ARTWORK.find(a => a.slug === 'floating-prism')!} />)
  expect(screen.getByRole('link', { name: 'Read complete Set05 scientific notes and limitations' }).getAttribute('href')).toContain('/artwork/grounded-notes/set05.')
})

it('shows Set06 rights qualifications and the correct full scientific notes', () => {
  const artwork = GROUNDED_ARTWORK.find(a => a.slug === 'horseshoe-carapace')!
  render(<GroundedDetail artwork={artwork} />)
  expect(screen.getByRole('link', { name: 'Read complete Set06 scientific notes and limitations' }).getAttribute('href')).toContain('/artwork/grounded-notes/set06.')
  expect(screen.queryByRole('link', { name: 'Read complete Set05 scientific notes and limitations' })).toBeNull()
  expect(document.querySelector('[data-grounded-provenance]')?.textContent).toBe(artwork.provenance)
  expect(screen.getByText(/current media license not fully verified/)).toBeTruthy()
  expect(screen.getByRole('link', { name: /Smithsonian NMNH/ }).getAttribute('href')).toBe('https://qrius.si.edu/browse/object/10795203')
})
it('keeps the final ten artworks discoverable with a bounded sixth page', async () => {
  window.history.replaceState(null, '', '?page=6')
  render(<GroundedCollection bootstrap={bootstrap} />)
  await waitFor(() => expect(screen.getAllByRole('link', { name: /^Open / })).toHaveLength(10))
  expect(screen.getByRole('button', { name: 'Next page' }).hasAttribute('disabled')).toBe(true)
  expect(screen.getByRole('link', { name: `Open ${cards[120].title}` })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Previous page' }))
  await waitFor(() => expect(screen.getAllByRole('link', { name: /^Open / })).toHaveLength(24))
  expect(window.location.search).toBe('?page=5')
})

it('shows Set07 access qualifications, corroborating sources and its own notes', () => {
  const artwork = GROUNDED_ARTWORK.find(a => a.slug === 'motile-cilium')!
  render(<GroundedDetail artwork={artwork} />)
  expect(screen.getByRole('link', { name: 'Read complete Set07 scientific notes and limitations' }).getAttribute('href')).toContain('/artwork/grounded-notes/set07.')
  expect(screen.queryByRole('link', { name: 'Read complete Set06 scientific notes and limitations' })).toBeNull()
  expect(screen.getByText(/direct full-text access to the original PMC references was limited/)).toBeTruthy()
  expect(screen.getByRole('link', { name: /PLOS Biology: primary research/ }).getAttribute('href')).toBe('https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3003442')
})
it('keeps the broad 320px minimum and the finer 640px Archimedes guidance distinct', () => {
  const artwork = GROUNDED_ARTWORK.find(a => a.slug === 'archimedean-bounds')!
  expect(artwork.minimumDisplayWidth).toBe(320)
  render(<GroundedDetail artwork={artwork} />)
  expect(screen.getByText(/fine twelve-gon and circle separation is clearest at 640px/)).toBeTruthy()
})

it('does not fetch discovery metadata on arrival and exposes all facets immediately', () => {
  render(<GroundedCollection bootstrap={bootstrap} />)
  expect(fetch).not.toHaveBeenCalled()
  expect(screen.getByRole('combobox', { name: 'Tag' }).querySelectorAll('option')).toHaveLength(bootstrap.tags.length + 1)
})
it('shows truthful deep-link loading, explicit retry, and no false empty state', async () => {
  window.history.replaceState(null, '', '?page=6')
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })))
  render(<GroundedCollection bootstrap={bootstrap} />)
  expect(screen.getByRole('status').textContent).toBe('Loading artwork…')
  expect(screen.queryAllByRole('link', { name: /^Open / })).toHaveLength(0)
  expect(screen.queryByText('No matching artwork')).toBeNull()
  await screen.findByRole('button', { name: 'Retry loading artwork' })
  expect(fetch).toHaveBeenCalledTimes(1)
  vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(files.get(url))))
  fireEvent.click(screen.getByRole('button', { name: 'Retry loading artwork' }))
  await waitFor(() => expect(screen.getAllByRole('link', { name: /^Open / })).toHaveLength(10))
  expect(screen.queryByRole('button', { name: 'Retry loading artwork' })).toBeNull()
})
it('never restores delayed results after clear, newer query, or history navigation', async () => {
  let finish!: (response: Response) => void
  const fetcher = vi.fn((url: string) => url === bootstrap.manifest
    ? new Promise<Response>(resolve => { finish = resolve })
    : Promise.resolve(new Response(files.get(url))))
  vi.stubGlobal('fetch', fetcher)
  render(<GroundedCollection bootstrap={bootstrap} />)
  const input = screen.getByRole('searchbox')
  fireEvent.change(input, { target: { value: 'missing' } })
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
  fireEvent.change(input, { target: { value: cards[129].title } })
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(document.activeElement).toBe(input)
  await act(async () => { finish(new Response(files.get(bootstrap.manifest))) })
  expect(screen.getAllByRole('link', { name: /^Open / })).toHaveLength(24)
  expect(fetcher).toHaveBeenCalledTimes(1)
  act(() => { window.history.pushState(null, '', '?page=6'); window.dispatchEvent(new PopStateEvent('popstate')) })
  await waitFor(() => expect(screen.getAllByRole('link', { name: /^Open / })).toHaveLength(10))
  fireEvent.change(input, { target: { value: 'missing' } })
  act(() => { window.history.replaceState(null, '', '/vectors/grounded/'); window.dispatchEvent(new PopStateEvent('popstate')) })
  await act(async () => {})
  expect(screen.getAllByRole('link', { name: /^Open / })).toHaveLength(24)
  expect(screen.queryByText('No matching artwork')).toBeNull()
})
it('cannot replace a newer successful search with an older delayed partition', async () => {
  const manifest = JSON.parse(files.get(bootstrap.manifest)!)
  let finish!: (response: Response) => void
  const fetcher = vi.fn((url: string) => url === manifest.partitions[5]
    ? new Promise<Response>(resolve => { finish = resolve })
    : Promise.resolve(new Response(files.get(url))))
  vi.stubGlobal('fetch', fetcher)
  window.history.replaceState(null, '', '?page=6')
  render(<GroundedCollection bootstrap={bootstrap} />)
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: cards[0].title } })
  await screen.findByRole('link', { name: `Open ${cards[0].title}` })
  await act(async () => { finish(new Response(files.get(manifest.partitions[5]))) })
  expect(screen.getAllByRole('link', { name: /^Open / })).toHaveLength(1)
  expect(screen.queryByRole('link', { name: `Open ${cards[129].title}` })).toBeNull()
})
it('renders only 24 cards for a diverse 1,000-work catalogue with complete facets', () => {
  const thousand = Array.from({ length: 1000 }, (_, i) => ({ ...cards[i % cards.length], slug: `scaled-work-${i}`, title: `Distant study ${i}`, aliases: [`Distant alias ${i}`], tags: [`unique-tag-${i}`, 'shared-tag'] }))
  const { bootstrap: scaled } = partitionGroundedDiscovery(thousand)
  const html = renderToString(<GroundedCollection bootstrap={scaled} />)
  expect((html.match(/data-grounded-card=/g) || []).length).toBe(24)
  expect(html).not.toContain('Distant study 999')
  expect(html).not.toContain('Distant alias 999')
  expect(html).toContain('unique-tag-999')
  expect(Buffer.byteLength(JSON.stringify(scaled))).toBeLessThan(70000)
  const measurements = [bootstrap, scaled].map(data => {
    const markup = renderToString(<GroundedCollection bootstrap={data} />)
    return { works: data.total, bootstrapBytes: Buffer.byteLength(JSON.stringify(data)), componentHtmlBytes: Buffer.byteLength(markup), componentHtmlGzipBytes: gzipSync(markup).length, subjectOptions: data.subjects.length + 1, tagOptions: data.tags.length + 1 }
  })
  process.stdout.write(`Grounded component markup metrics (not full built HTML or browser transfers): ${JSON.stringify(measurements)}\n`)
})
