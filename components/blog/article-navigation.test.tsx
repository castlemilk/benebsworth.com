// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { TableOfContents } from './table-of-contents'
import { MobileToc } from './mobile-toc'
import { arriveAtArticleHeading, currentArticleHeading } from './use-article-navigation'

const rect = (top: number, height = 30) => ({ top, bottom: top + height, height, left: 0, right: 100, width: 100, x: 0, y: top, toJSON() {} })
let positions: Record<string, number>
beforeEach(() => {
  positions = { first: 200, second: 600, third: 1000 }
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.hasAttribute('data-site-nav')) return rect(0, 69)
    if (this.hasAttribute('data-site-breadcrumb')) return rect(69, 37)
    return rect(positions[this.id] ?? 0)
  })
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0))
  vi.stubGlobal('cancelAnimationFrame', window.clearTimeout)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  history.replaceState({ retained: true }, '', '/')
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) }) }
function Article({ replacement = false }: { replacement?: boolean }) {
  return <><header data-site-nav /><nav data-site-breadcrumb /><article>{replacement
    ? <h2 id="new-section">Replacement article</h2>
    : <><h2 id="first">First</h2><h3 id="second">Second nested section</h3><h2 id="third">Third</h2></>}
  </article><TableOfContents /><MobileToc /></>
}

describe('article anchor navigation', () => {
  it('initializes from actual restored scroll and follows fast jumps and upward scroll in both surfaces', async () => {
    positions = { first: -900, second: -400, third: 100 }
    const v = render(<Article />)
    expect(v.container.querySelectorAll('a[aria-current="location"][href="#third"]')).toHaveLength(2)
    positions = { first: 200, second: 600, third: 1000 }
    fireEvent.scroll(window); await settle()
    expect(v.container.querySelectorAll('a[aria-current="location"][href="#first"]')).toHaveLength(2)
    positions = { first: -500, second: 100, third: 500 }
    fireEvent.scroll(window); await settle()
    expect(v.container.querySelectorAll('a[aria-current="location"][href="#second"]')).toHaveLength(2)
  })
  it('collapses before measurement, preserves history state, focuses the target and uses instant motion', () => {
    const v = render(<Article />)
    const details = v.container.querySelector('details')!
    details.open = true
    const heading = document.getElementById('second')!
    Object.defineProperty(heading, 'getBoundingClientRect', { value: () => rect(details.open ? 1000 : 600), configurable: true })
    const link = details.querySelector<HTMLAnchorElement>('a[href="#second"]')!
    link.focus(); fireEvent.click(link)
    expect(details.open).toBe(false)
    expect(document.activeElement).toBe(heading)
    expect(window.location.hash).toBe('#second')
    expect(history.state).toEqual({ retained: true })
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 478, behavior: 'instant' })
    expect(heading.getAttribute('tabindex')).toBe('-1')
    fireEvent.blur(heading)
    expect(heading.hasAttribute('tabindex')).toBe(false)
  })
  it('adds one history entry per changed hash, encodes IDs and leaves modified activation native', () => {
    const v = render(<Article />)
    const push = vi.spyOn(history, 'pushState')
    const modifiedLink = v.getAllByRole('link', { name: 'First' })[0]
    // jsdom cannot open a modified-click tab; prevent only its queued default.
    modifiedLink.addEventListener('click', event => event.preventDefault(), { once: true })
    fireEvent.click(modifiedLink, { ctrlKey: true })
    expect(push).not.toHaveBeenCalled()
    arriveAtArticleHeading('second'); arriveAtArticleHeading('second'); arriveAtArticleHeading('third')
    expect(push).toHaveBeenCalledTimes(2)
    const special = document.getElementById('third')!
    special.id = 'punctuation / space'
    arriveAtArticleHeading(special.id)
    expect(window.location.hash).toBe('#punctuation%20%2F%20space')
  })
  it('preserves Back/Forward destinations and recalculates the active section on restoration', async () => {
    const v = render(<Article />)
    arriveAtArticleHeading('first')
    arriveAtArticleHeading('second')
    positions = { first: 122, second: 522, third: 922 }
    await act(async () => {
      await new Promise<void>(resolve => { window.addEventListener('popstate', () => resolve(), { once: true }); history.back() })
    }); await settle()
    expect(window.location.hash).toBe('#first')
    expect(v.container.querySelectorAll('a[aria-current="location"][href="#first"]')).toHaveLength(2)
    positions = { first: -278, second: 122, third: 522 }
    await act(async () => {
      await new Promise<void>(resolve => { window.addEventListener('popstate', () => resolve(), { once: true }); history.forward() })
    }); await settle()
    expect(window.location.hash).toBe('#second')
    expect(v.container.querySelectorAll('a[aria-current="location"][href="#second"]')).toHaveLength(2)
    expect(history.state).toEqual({ retained: true })
  })
  it('rediscovers replacement articles while both navigation subscribers remain mounted', async () => {
    const v = render(<Article />)
    v.rerender(<Article replacement />); await settle()
    expect(v.queryAllByRole('link', { name: 'First' })).toHaveLength(0)
    expect(v.getAllByRole('link', { name: 'Replacement article' })).toHaveLength(2)
  })
  it('renders neither navigation surface for empty or ancillary-only headings', () => {
    const v = render(<><article><figure><h2 id="figure">Figure</h2></figure><h2 id="empty"> </h2></article><TableOfContents /><MobileToc /></>)
    expect(v.queryByRole('navigation')).toBeNull()
    expect(v.container.querySelector('details')).toBeNull()
  })
  it('returns no active section for no headings', () => {
    expect(currentArticleHeading([], 100)).toBeNull()
  })
})
