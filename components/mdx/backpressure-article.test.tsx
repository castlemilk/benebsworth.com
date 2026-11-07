import React from 'react'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import matter from 'gray-matter'
import { renderToStaticMarkup } from 'react-dom/server'
import { compileMDX } from 'next-mdx-remote/rsc'
import { mdxOptions } from './mdx-options'
import { mdxComponents } from './mdx-components'

const source = readFileSync('content/blog/backpressure-is-the-system-saying-no/index.mdx', 'utf8')
const article = matter(source)
const sibling = readFileSync('public/blog/backpressure-is-the-system-saying-no/index.md', 'utf8')
const references = [
  'https://projectproduction.org/journal/reprint-littles-law-as-viewed-on-its-50th-anniversary/',
  'https://www.reactive-streams.org/',
  'https://datatracker.ietf.org/doc/html/rfc5681',
  'https://mechanical-sympathy.blogspot.com/2012/05/apply-back-pressure-when-overloaded.html',
]

describe('backpressure article editorial contract', () => {
  let html: string
  beforeAll(async () => {
    const { content } = await compileMDX({
      source: article.content,
      options: mdxOptions('/blog/backpressure-is-the-system-saying-no'),
      components: mdxComponents,
    })
    html = renderToStaticMarkup(<>{content}</>)
  })

  it('keeps article identity, original publication date, artwork and classification', () => {
    expect(article.data).toMatchObject({
      title: 'Backpressure is the system saying no',
      date: '2026-07-07T01:00:00.000Z',
      labels: 'software,systems,queues,distributed-systems',
      heroImage: '/blog/backpressure-is-the-system-saying-no/hero.webp',
      release: true,
      author: 'Ben Ebsworth',
    })
    expect(article.data.takeaways).toHaveLength(4)
  })

  it('renders both original equations with their anchors and copyable LaTeX', () => {
    expect(html.match(/data-equation="true"/g)).toHaveLength(2)
    expect(html.match(/class="katex-display"/g)).toHaveLength(2)
    expect(html).toContain('id="eqn:littles-law-backpressure"')
    expect(html).toContain('id="eqn:utilisation-backpressure"')
    expect(html).toContain(String.raw`data-latex="L = \lambda W"`)
    expect(html).toContain(String.raw`data-latex="\rho = \frac{\lambda}{\mu}"`)
    expect(html).not.toContain('katex-error')
  })

  it('preserves all section anchors and reference destinations in the rendered article', () => {
    for (const anchor of [
      'a-queue-stores-time', 'backpressure-is-feedback-not-a-queue',
      'the-retry-trap', 'streams-make-the-signal-explicit',
      'how-i-would-design-it', 'a-small-practical-checklist', 'reading-further',
    ]) expect(html).toContain(`id="${anchor}"`)
    for (const reference of references) expect(html).toContain(`href="${reference}"`)
    expect(/<code\b[^>]*>request\(n\)<\/code>/.test(html)).toBe(true)
    expect(/<code\b[^>]*>Retry-After<\/code>/.test(html)).toBe(true)
  })

  it('keeps assumptions and overload limits visible in both reading formats', () => {
    for (const text of [
      'This long-run interpretation assumes the averages settle.',
      'Rejected requests do not enter the queue, so exclude them from its arrival rate.',
      'A queue length limit alone does not bound latency when service times vary.',
      'Requests add to that demand, and the publisher must not emit more items than requested in total.',
      'A timeout ends the caller',
    ]) {
      expect(html).toContain(text)
      expect(sibling).toContain(text)
    }
    for (const reference of references) expect(sibling).toContain(reference)
    expect(sibling).toContain(String.raw`L = \lambda W`)
    expect(sibling).toContain(String.raw`\rho = \frac{\lambda}{\mu}`)
  })
})
