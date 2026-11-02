import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PostTag } from './post-tag'
import { topicFor, TOPIC } from '@/lib/topics'

describe('shared post subject labels', () => {
  it.each(['ai', 'machine-learning', 'deep-learning', 'llm', ' AI '])('uses the brain for %s', tag => {
    expect(topicFor({ slug: 'new-post', tags: [tag] })).toBe(TOPIC.ai)
    expect(renderToStaticMarkup(<PostTag tag={tag}/>)).toContain('/topics/custom-v6/ai.svg')
  })
  it('preserves curated categories and specific platform priority', () => {
    expect(topicFor({ slug: 'a-neural-net-learns-a-shape', tags: ['ai'] })).toBe(TOPIC.software)
    expect(topicFor({ slug: 'new-post', tags: ['software', 'llm', 'kubernetes'] })).toBe(TOPIC.kubernetes)
  })
  it.each([['software', 'software'], ['circuits', 'ee'], ['physics', 'physics'], ['algorithms', 'algorithms'], ['cosmology', 'cosmology']])('reuses reviewed %s symbol', (tag, file) => {
    expect(renderToStaticMarkup(<PostTag tag={tag}/>)).toContain(`/topics/custom-v6/${file}.svg`)
  })
  it('keeps canonical Kubernetes image geometry and original label', () => {
    const html = renderToStaticMarkup(<PostTag tag="Kubernetes"/>)
    expect(html).toContain('src="/topics/kubernetes.png"')
    expect(html).not.toContain('mask:')
    expect(html).toContain('>Kubernetes</span>')
  })
  it('uses a neutral unknown label without invented icon or nested interaction', () => {
    const html = renderToStaticMarkup(<PostTag tag="new-subject"/>)
    expect(html).toContain('data-tag="new-subject"')
    expect(html).toContain('--ink:var(--muted)')
    expect(html).not.toMatch(/<a|<button|tabindex|\/topics\//)
  })
})
