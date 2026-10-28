import React from 'react'
import { readFileSync } from 'node:fs'
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

describe('production equation MDX pipeline', () => {
  it('renders real inline, display and aligned mathematics, optional metadata and anchors', async () => {
    const { equationFixture } = await import('@/app/lab/folio-review/equation-fixture')
    const { content } = await compileMDX({ source: equationFixture, options: mdxOptions(), components: mdxComponents })
    const html = renderToStaticMarkup(<>{content}</>)
    expect(html.match(/data-equation="true"/g)).toHaveLength(5)
    expect(html.match(/class="katex-display"/g)).toHaveLength(5)
    expect(html.match(/class="katex"/g)).toHaveLength(6)
    expect(html).toContain('<math')
    expect(html).toContain('encoding="application/x-tex"')
    expect(html).toContain('class="mtable"')
    expect(html).toContain('href="#eqn:review-rlc"')
    expect(html).toContain('id="eqn:review-rlc"')
    expect(html.match(/aria-label="Copy equation to clipboard"/g)).toHaveLength(4)
    expect(html.match(/<figcaption/g)).toHaveLength(4)
    expect(html).not.toContain('katex-error')
    expect(html).not.toContain('role="group"')
  })
  it('reproduces the long published PLL equation and copy source unchanged', async () => {
    const { equationFixture } = await import('@/app/lab/folio-review/equation-fixture')
    const original = readFileSync('content/blog/pll-from-first-principles/index.mdx', 'utf8')
      .match(/<Equation id="eqn:pll-multiply"[\s\S]*?<\/Equation>/)![0]
    const fixture = equationFixture.match(/<Equation id="eqn:review-pll-multiply"[\s\S]*?<\/Equation>/)![0]
    expect(fixture.replace('eqn:review-pll-multiply', 'eqn:pll-multiply')).toBe(original)
    const { content } = await compileMDX({ source: fixture, options: mdxOptions(), components: mdxComponents })
    const html = renderToStaticMarkup(<>{content}</>)
    expect(html).toContain('id="eqn:review-pll-multiply"')
    expect(html).toContain('role="region"')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('class="katex-display"')
    expect(html).toContain('encoding="application/x-tex"')
    expect(html).not.toContain('katex-error')
  })
  it('uses children for displayed mathematics even when the copy prop is different', async () => {
    const source = String.raw`<Equation latex="copy-only-source">

$$
\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0}
$$

</Equation>`
    const { content } = await compileMDX({ source, options: mdxOptions(), components: mdxComponents })
    const html = renderToStaticMarkup(<>{content}</>)
    expect(html).toContain('data-latex="copy-only-source"')
    expect(html).toContain('encoding="application/x-tex">\\Gamma = \\frac{Z_L - Z_0}{Z_L + Z_0}</annotation>')
    expect(html).not.toContain('katex-error')
  })
})
