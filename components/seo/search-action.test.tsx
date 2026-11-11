// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { JsonLd, SITE_URL, websiteLd } from './json-ld'
import { SiteSearch } from '@/components/search/site-search'

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = true }) })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = false }) })
})
afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
  vi.restoreAllMocks()
})

describe('published SearchAction entry contract', () => {
  it('serializes the canonical blog search route and matching required query name', () => {
    const html = renderToStaticMarkup(<JsonLd data={websiteLd} />)
    const document = new DOMParser().parseFromString(html, 'text/html')
    const data = JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!)
    expect(data.potentialAction.target.urlTemplate).toBe(`${SITE_URL}/blog/?q={search_term_string}`)
    expect(data.potentialAction['query-input']).toBe('required name=search_term_string')
  })

  it.each(['RLC circuits', 'C++ & café #1'])('opens the actual search dialog with decoded query %s', (query) => {
    const url = new URL(websiteLd.potentialAction.target.urlTemplate.replace('{search_term_string}', encodeURIComponent(query)))
    expect(url.pathname).toBe('/blog/')
    window.history.replaceState(null, '', `${url.pathname}${url.search}`)
    render(<SiteSearch />)
    expect(screen.getByRole('dialog', { name: 'Search' })).toBeTruthy()
    expect((screen.getByRole('textbox', { name: 'Search posts and assets' }) as HTMLInputElement).value).toBe(query)
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce()
  })
})
