// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { GroundedCollection } from './collection'
import { GroundedDetail } from './detail'
import { GROUNDED_ARTWORK, groundedCards } from '@/lib/grounded-artwork/registry'

const cards = groundedCards()
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/vectors/grounded/') })
it('bounds initial HTML to 24 lightweight thumbnails with stable detail links', () => {
  const html = renderToString(<GroundedCollection cards={cards} />)
  expect((html.match(/data-grounded-card=/g) || []).length).toBe(24)
  expect(html).not.toContain('.svg')
  render(<GroundedCollection cards={cards} />)
  expect(screen.getAllByRole('link', { name: /^Open / })).toHaveLength(24)
  expect(document.querySelector('[data-grounded-card] img')?.getAttribute('loading')).toBe('lazy')
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
  expect(screen.getAllByRole('link', { name: /^Open / })).toHaveLength(Math.min(24, cards.length - 24))
  expect(window.location.search).toBe('?page=2')
})
it('gives selects explicit concise labels that exclude their option text', () => {
  render(<GroundedCollection cards={cards} />)
  for (const name of ['Subject', 'Tag']) {
    const select = screen.getByRole('combobox', { name }) as HTMLSelectElement
    expect(screen.getByLabelText(name, { exact: true })).toBe(select)
    expect(select.labels).toHaveLength(1)
    expect(select.labels![0].textContent).toBe(name)
    expect(select.labels![0].htmlFor).toBe(select.id)
  }
})
it('intersects filters, resets page, clears with focus and restores URL state', () => {
  render(<GroundedCollection cards={cards} />)
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
  fireEvent.change(screen.getByLabelText('Find grounded artwork'), { target: { value: cards[0].title } })
  expect(window.location.search).not.toContain('page=')
  expect(screen.getByRole('link', { name: `Open ${cards[0].title}` })).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Subject'), { target: { value: cards.find(c => c.subject !== cards[0].subject)!.subject } })
  expect(screen.getByText('No matching artwork')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Show all artwork' }))
  expect(document.activeElement).toBe(screen.getByLabelText('Find grounded artwork'))
  expect(window.location.search).toBe('')
  act(() => { window.history.replaceState(null, '', '?page=2'); window.dispatchEvent(new PopStateEvent('popstate')) })
  expect(screen.getAllByRole('link', { name: /^Open / })).toHaveLength(Math.min(24, cards.length - 24))
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
it('loads shared alias and tag URLs, intersects tag filtering, and clamps malformed pages', () => {
  const card = cards.find(c => c.aliases.length && c.tags.length)!
  const query = new URLSearchParams({ q: card.aliases[0], subject: card.subject, tag: card.tags[0], page: 'NaN' })
  window.history.replaceState(null, '', `?${query}`)
  render(<GroundedCollection cards={cards} />)
  expect(screen.getByRole('link', { name: `Open ${card.title}` })).toBeTruthy()
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
