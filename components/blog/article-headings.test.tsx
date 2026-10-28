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
    <div data-pagefind-ignore><section><h2 id="related-writing-heading">More from the blog</h2></section></div>
  </article><footer><h2 id="footer">Elsewhere</h2></footer></>
}

describe('shared article navigation scope', () => {
  it('retains authored IDs and hierarchy while excluding ancillary nested headings', () => {
    const { container } = render(<Sections />)
    expect(getArticleHeadings(container).map(el => [el.id, el.tagName])).toEqual([
      ['mechanism', 'H2'], ['limits', 'H3'],
    ])
  })
  it.each([TableOfContents, MobileToc])('uses the same scope in each navigation surface', Navigation => {
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
    const { container } = render(<><Sections /><Navigation /></>)
    expect([...container.querySelectorAll('nav a')].map(el => el.getAttribute('href')))
      .toEqual(['#mechanism', '#limits'])
    expect(container.querySelector('#related-writing-heading')).not.toBeNull()
  })
})
