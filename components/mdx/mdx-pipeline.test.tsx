import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { compileMDX } from 'next-mdx-remote/rsc'
import { mdxOptions } from './mdx-options'
import { mdxComponents } from './mdx-components'
import { technicalProseFixture } from '@/app/lab/folio-review/technical-prose-fixture'

describe('production technical MDX pipeline', () => {
  it('renders real GFM, slugs, highlighted code, source destinations and footnote backlinks', async () => {
    const { content } = await compileMDX({ source: technicalProseFixture, options: mdxOptions(), components: mdxComponents })
    const html = renderToStaticMarkup(<>{content}</>)
    expect(html).toContain('id="technical-prose-and-source-links"')
    expect(html).toContain('<h4')
    expect(html).toContain('<thead>')
    expect(html).toContain('<th>Specimen</th>')
    expect(html).toContain('technical-table-scroll')
    expect(html).toContain('technical-pre')
    expect(html).toContain('data-rehype-pretty-code-figure')
    expect(html).toContain('data-line')
    expect(html).toContain('data-language="ts"')
    expect(html).toContain('href="#user-content-fn-review-scope"')
    expect(html).toContain('href="#user-content-fnref-review-scope"')
    expect(html).toContain('href="https://github.com/remarkjs/remark-gfm"')
    expect(html).toContain('href="https://github.com/remarkjs/remark-gfm#this-deliberately-long-fragment-tests-visible-link-wrapping-without-changing-the-source-destination"')
    expect(html).toMatch(/<ol>[\s\S]*<ul\b/)
    expect(html).not.toContain('<button')
  })
  it('preserves image rewriting and first-party expression attributes after options extraction', async () => {
    const { content } = await compileMDX({
      source: '![Review alt](./missing-review.png)\n\n<Probe count={3} />',
      options: mdxOptions('/blog/review'),
      components: { Probe: ({ count }: { count: number }) => <span data-count={count}>Expression specimen</span> },
    })
    const html = renderToStaticMarkup(<>{content}</>)
    expect(html).toContain('src="/blog/review/missing-review.png"')
    expect(html).toContain('alt="Review alt"')
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('decoding="async"')
    expect(html).toContain('data-count="3"')
  })

})
