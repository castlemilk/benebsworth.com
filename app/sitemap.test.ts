import { describe, expect, it } from 'vitest'
import sitemap from './sitemap'

const SITE_ORIGIN = 'https://benebsworth.com'

describe('sitemap', () => {
  const entries = sitemap()
  const urls = entries.map((entry) => entry.url)

  it('contains unique canonical apex-domain URLs', () => {
    expect(new Set(urls).size).toBe(urls.length)
    expect(urls.every((url) => url.startsWith(`${SITE_ORIGIN}/`))).toBe(true)
    expect(urls.some((url) => url.includes('www.'))).toBe(false)
    expect(urls.some((url) => url.includes('next.'))).toBe(false)
  })

  it('covers the public content sections and dedicated pages', () => {
    for (const path of [
      '/',
      '/about/',
      '/blog/',
      '/projects/',
      '/hiking/',
      '/uses/',
      '/vectors/',
      '/lab/',
      '/lab/black-hole-sim/',
      '/lab/carbon/',
      '/lab/cost-dashboard/',
      '/lab/harness-eval/',
      '/lab/llm-benchmark/',
      '/lab/local-llm/',
    ]) {
      expect(urls).toContain(`${SITE_ORIGIN}${path}`)
    }
  })

  it('does not publish private tools or non-page alternates', () => {
    expect(urls.some((url) => url.includes('/admin/'))).toBe(false)
    expect(urls.some((url) => url.endsWith('/index.md'))).toBe(false)
    expect(urls.some((url) => url.endsWith('/feed.xml'))).toBe(false)
    expect(urls.some((url) => url.endsWith('/robots.txt'))).toBe(false)
  })

  it('uses content dates for posts instead of the build timestamp', () => {
    const post = entries.find((entry) => entry.url === `${SITE_ORIGIN}/blog/benchmarking-openrouter-free-tier/`)
    expect(post?.lastModified).toEqual(new Date('2026-08-08T00:00:00.000Z'))
    expect(entries.find((entry) => entry.url === `${SITE_ORIGIN}/`)).not.toHaveProperty('lastModified')
  })
})
