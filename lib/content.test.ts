import { describe, it, expect } from 'vitest'
import { getAllPosts, getPublishedPosts, getLatestPost, getAllProjects } from './content'

describe('content loader', () => {
  it('loads blog posts with required frontmatter', () => {
    const posts = getAllPosts()
    expect(posts.length).toBeGreaterThan(0)
    for (const p of posts) {
      expect(p.slug).toBeTruthy()
      expect(p.title).toBeTruthy()
      expect(p.date).toBeTruthy()
    }
  })
  it('maps labels frontmatter into tags', () => {
    const posts = getAllPosts()
    expect(posts.some((p) => p.tags.length > 0)).toBe(true)
  })
  it('sorts posts newest-first', () => {
    const posts = getAllPosts()
    for (let i = 1; i < posts.length; i++) {
      expect(new Date(posts[i - 1].date) >= new Date(posts[i].date)).toBe(true)
    }
  })
  it('excludes posts with release: false from the published list', () => {
    const published = getPublishedPosts()
    expect(published.length).toBeGreaterThan(0)
    expect(published.length).toBeLessThan(getAllPosts().length)
    for (const p of published) {
      expect(p.release).toBe(true)
      expect(p.draft).toBe(false)
    }
    // A known release:false stub must not appear.
    expect(published.find((p) => p.slug === 'serverless-benchmarks')).toBeUndefined()
  })
  it('latest post is the newest published post', () => {
    expect(getLatestPost()?.slug).toBe(getPublishedPosts()[0].slug)
  })
  it('loads projects ordered by order field', () => {
    const projs = getAllProjects()
    expect(projs.length).toBeGreaterThan(0)
    for (let i = 1; i < projs.length; i++) expect(projs[i - 1].order <= projs[i].order).toBe(true)
  })
})
