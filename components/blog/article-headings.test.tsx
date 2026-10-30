// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { getArticleHeadings } from './article-headings'
import { TableOfContents } from './table-of-contents'
import { MobileToc } from './mobile-toc'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function Sections() {
  return <><article><h2 id="mechanism">Mechanism</h2><h3 id="limits">Limits</h3>
    <figure><div><h2 id="figure-label">Figure label</h2></div><figcaption><h3 id="caption-label">Caption label</h3></figcaption></figure>
    <div data-interactive-study><section><h2 id="study-label">Interactive study</h2><h3 id="control-label">Controls</h3></section></div>
    <div data-pagefind-ignore><section><h2 id="related-writing-heading">More from the blog</h2></section></div>
    <section className="not-prose"><h2 id="authored-nested">Authored nested section</h2><section><h3 id="authored-detail">Authored detail</h3></section></section>
    <h2 id="empty-label">{'   '}</h2><h3 id="">Missing anchor</h3><h2>No anchor</h2>
  </article><footer><h2 id="footer">Elsewhere</h2></footer></>
}

describe('shared article navigation scope', () => {
  it('retains authored IDs and hierarchy while excluding ancillary nested headings', () => {
    const { container } = render(<Sections />)
    expect(getArticleHeadings(container).map(el => [el.id, el.tagName])).toEqual([
      ['mechanism', 'H2'], ['limits', 'H3'], ['authored-nested', 'H2'], ['authored-detail', 'H3'],
    ])
  })
  it.each([TableOfContents, MobileToc])('uses the same scope in each navigation surface', Navigation => {
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
    const { container } = render(<><Sections /><Navigation /></>)
    expect([...container.querySelectorAll('nav a')].map(el => el.getAttribute('href')))
      .toEqual(['#mechanism', '#limits', '#authored-nested', '#authored-detail'])
    // Discovery must not remove the content it intentionally omits from navigation.
    for (const id of ['figure-label', 'caption-label', 'study-label', 'control-label', 'related-writing-heading', 'empty-label']) {
      expect(container.querySelector(`#${id}`)).not.toBeNull()
    }
  })
  it.each([TableOfContents, MobileToc])('keeps one destination per authored ID during overlapping article trees', Navigation => {
    const { container } = render(<>
      <article><h2 id="shared">First authored destination</h2><h3 id="detail">Detail</h3></article>
      <article><h2 id="shared">Overlapping destination</h2><h3 id="additional">Additional section</h3></article>
      <Navigation />
    </>)
    const headings = getArticleHeadings(container)
    expect(headings.map(h => h.id)).toEqual(['shared', 'detail', 'additional'])
    expect(headings[0]).toBe(container.querySelector('#shared'))
    expect([...container.querySelectorAll('nav a')].map(a => a.getAttribute('href')))
      .toEqual(['#shared', '#detail', '#additional'])
    // Navigation normalization must not rewrite IDs, text, or authored DOM.
    expect(container.querySelectorAll('h2#shared')).toHaveLength(2)
    expect(container.querySelectorAll('h2#shared')[1].textContent).toBe('Overlapping destination')
  })
  it('returns no navigation candidates when an article has only ancillary headings', () => {
    const { container } = render(<article>
      <figure><h2 id="figure-only">Figure</h2></figure>
      <div data-interactive-study><h3 id="control-only">Controls</h3></div>
    </article>)
    expect(getArticleHeadings(container)).toEqual([])
  })
})
