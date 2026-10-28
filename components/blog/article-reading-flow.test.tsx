import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ArticleReadingFlow } from './article-reading-flow'

describe('article reading sequence', () => {
  it('preserves the argument and figure before the exact takeaway recap', () => {
    const html = renderToStaticMarkup(<ArticleReadingFlow takeaways={['Exact first takeaway.', 'Exact second takeaway.']} accent="#123456">
      <section><p>Authored opening.</p><figure><figcaption>Existing scientific caption.</figcaption></figure></section>
    </ArticleReadingFlow>)
    expect(html.indexOf('Authored opening.')).toBeLessThan(html.indexOf('Existing scientific caption.'))
    expect(html.indexOf('Existing scientific caption.')).toBeLessThan(html.indexOf('Key takeaways'))
    expect(html).toContain('Exact first takeaway.')
    expect(html).toContain('Exact second takeaway.')
    expect(html.match(/Exact first takeaway\./g)).toHaveLength(1)
  })

  it('adds no empty recap when a post has none', () => {
    const html = renderToStaticMarkup(<ArticleReadingFlow accent="red"><p>Essay remains text-led.</p></ArticleReadingFlow>)
    expect(html).toContain('Essay remains text-led.')
    expect(html).not.toContain('folio-reading-recap')
  })
})
