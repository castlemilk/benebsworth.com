import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { FolioArchiveHeading } from './folio-archive-heading'
import { FolioEntry } from './folio-entry'
import { BlogPostCard } from './blog-post-card'

describe('research folio archive', () => {
  it('renders a semantic heading and meaningful note target without client scripting', () => {
    const html = renderToStaticMarkup(<FolioArchiveHeading />)
    expect(html).toContain('<h1>')
    expect(html).toContain('href="#archive-index"')
    expect(html).toContain('Pick a thread.')
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toContain('<canvas')
  })
  it('keeps the entry semantic without pointer tracking or fake actions', () => {
    const html = renderToStaticMarkup(<FolioEntry accent="#123456"><h2>A real title</h2><p>Article summary</p></FolioEntry>)
    expect(html).toContain('<article')
    expect(html).toContain('Article summary')
    expect(html).not.toContain('<button')
  })
  it('retains article routes and machine-readable dates', () => {
    const html = renderToStaticMarkup(<BlogPostCard post={{slug:'example',title:'Example article',date:'2026-10-22',description:'A worked example.',tags:['Kubernetes'],readingTime:4,heroImage:''}} />)
    expect(html).toMatch(/href="\/blog\/example\/?"/)
    expect(html).toContain('dateTime="2026-10-22"')
    expect(html).toContain('Example article')
  })
})
