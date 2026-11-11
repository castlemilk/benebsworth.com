import { afterEach, describe, expect, it, vi } from 'vitest'
import { listingHas } from './storage'

describe('manifest listing probe', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('treats only an exact object name as present', () => {
    const object = 'manifest/blog/b-trees.json'
    expect(listingHas({ items: [{ name: object }] }, object)).toBe(true)
    // A prefix listing can return a longer sibling slug; that is not this post.
    expect(listingHas({ items: [{ name: 'manifest/blog/b-trees.json.bak' }] }, object)).toBe(false)
    // GCS omits `items` entirely when nothing matches.
    expect(listingHas({}, object)).toBe(false)
    expect(listingHas(null, object)).toBe(false)
  })

  it('lists one encoded manifest prefix from the configured bucket', async () => {
    vi.stubEnv('NEXT_PUBLIC_HIKE_BUCKET', 'example-bucket')
    const { manifestListingUrl } = await import('./storage')
    const url = new URL(manifestListingUrl('blog', 'b-trees-vs-lsm-trees'))
    expect(url.origin + url.pathname).toBe('https://storage.googleapis.com/storage/v1/b/example-bucket/o')
    expect(url.searchParams.get('prefix')).toBe('manifest/blog/b-trees-vs-lsm-trees.json')
    expect(url.searchParams.get('fields')).toBe('items(name)')
  })

  it('skips the probe when no bucket is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_HIKE_BUCKET', '')
    const { manifestListingUrl } = await import('./storage')
    expect(manifestListingUrl('blog', 'any')).toBe('')
  })
})
