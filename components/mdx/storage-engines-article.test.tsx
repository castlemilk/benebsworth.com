import React from 'react'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import matter from 'gray-matter'
import { renderToStaticMarkup } from 'react-dom/server'
import { compileMDX } from 'next-mdx-remote/rsc'
import { mdxOptions } from './mdx-options'
import { mdxComponents } from './mdx-components'
import { StorageEngineSim } from './storage-engine-sim'

const source = readFileSync('content/blog/b-trees-vs-lsm-trees/index.mdx', 'utf8')
const article = matter(source)
const sibling = readFileSync('public/blog/b-trees-vs-lsm-trees/index.md', 'utf8')
const references = [
  'https://dl.acm.org/doi/10.1145/1734663.1734671',
  'https://www.cs.umb.edu/~poneil/lsmtree.pdf',
  'https://stratos.seas.harvard.edu/publications/designing-access-methods-rum-conjecture',
  'https://www.postgresql.org/docs/current/indexes-index-only-scans.html',
  'https://www.postgresql.org/docs/current/storage-hot.html',
  'https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html',
  'https://github.com/facebook/rocksdb/wiki/Compaction',
  'https://www.databass.dev/',
]

describe('storage engines article editorial contract', () => {
  let html: string
  beforeAll(async () => {
    const { content } = await compileMDX({
      source: article.content,
      options: mdxOptions('/blog/b-trees-vs-lsm-trees'),
      // Resolve the real client widget directly; its production wrapper disables SSR.
      components: { ...mdxComponents, StorageEngineSim },
    })
    html = renderToStaticMarkup(<>{content}</>)
  })

  it('preserves identity, original publication date, artwork and classification', () => {
    expect(article.data).toMatchObject({
      date: '2026-06-17T00:00:00.000Z',
      author: 'Ben Ebsworth',
      labels: 'software,databases,data structures,systems',
      release: true,
      heroImage: '/blog/b-trees-vs-lsm-trees/hero.webp',
    })
    expect(article.data.takeaways).toHaveLength(4)
    for (const anchor of [
      'two-ways-to-put-a-tree-on-a-disk',
      'the-b-tree-update-in-place-shallow-read-optimised',
      'the-lsm-tree-append-to-a-memtable-flush-compact',
      'the-three-amplifications-and-the-rum-conjecture',
      'who-picks-what-and-why', 'the-same-shape-in-other-rooms', 'reading-further',
    ]) expect(html).toContain(`id="${anchor}"`)
  })

  it('renders three existing widgets and their original workload controls', () => {
    expect(source.match(/<StorageEngineSim \/>/g)).toHaveLength(3)
    expect(html.match(/aria-label="Workload"/g)).toHaveLength(3)
    expect(html.match(/SSTable writes/g)).toHaveLength(4) // 3 widgets and the prose
  })

  it('renders all equations with stable anchors and the qualified RUM copy source', () => {
    expect(html.match(/data-equation="true"/g)).toHaveLength(3)
    expect(html.match(/class="katex-display"/g)).toHaveLength(3)
    for (const id of ['eqn:btree-height', 'eqn:lsm-write-amp', 'eqn:rum']) {
      expect(html).toContain(`id="${id}"`)
    }
    for (const tex of [
      String.raw`h \approx \log_B(n)`,
      String.raw`W_\text{LSM} \approx L \times T`,
      String.raw`\min R \;\wedge\; \min U \;\Longrightarrow\; \uparrow M \qquad \text{(RUM conjecture)}`,
    ]) {
      expect(html).toContain(`data-latex="${tex}"`)
      expect(sibling).toContain(tex)
    }
    expect(html).not.toContain('katex-error')
  })

  it('keeps technical limits and primary references visible in both reading formats', () => {
    for (const text of [
      'not measured database I/O or benchmark results',
      'not a count of physical disk reads',
      'It cannot discard every old version immediately',
      'There is no fixed sum of these ratios.',
      'not a prediction for every byte or a result measured by the simulator',
      'not an algebraic identity or a proven universal bound',
      'Updates create new row versions',
      'This is a replacement value, not the same transactional SQL operation.',
    ]) {
      expect(html.replace(/<[^>]*>/g, '')).toContain(text)
      expect(sibling).toContain(text)
    }
    for (const reference of references) {
      expect(html).toContain(`href="${reference}"`)
      expect(sibling).toContain(reference)
    }
    expect(html).not.toContain('https://stratos.seas.harvard.edu/files/stratos/files/rum.pdf')
  })
})
