import { describe, expect, it, vi } from 'vitest'
import { groundedCards } from './registry'
import { partitionGroundedDiscovery } from './partitions'
import { createGroundedLoader, groundedPage } from './remote-discovery'
import { searchGroundedCards } from './discovery'

const seed = groundedCards()
// Diverse fixture: unique slugs, titles, aliases and tags even at the far boundary.
const thousand = Array.from({ length: 1000 }, (_, i) => ({
  ...seed[i % seed.length], slug: `fixture-work-${i}`, title: `Étude unique ${i}`,
  aliases: [`Faraway alias ${i}`], subject: `subject-${i % 7}`, tags: [`unique-tag-${i}`, `shared-${i % 13}`],
}))
function fixture(cards = thousand) {
  const data = partitionGroundedDiscovery(cards)
  const fetcher = vi.fn(async (url: RequestInfo | URL) => new Response(data.files.get(String(url)), { status: data.files.has(String(url)) ? 200 : 404 }))
  return { ...data, fetcher, load: createGroundedLoader(data.bootstrap, fetcher) }
}
describe('partitioned discovery at 1,000 works', () => {
  it('bounds the bootstrap without hiding remaining card data or losing complete facets', async () => {
    const { bootstrap, files, load, fetcher } = fixture()
    expect(bootstrap.initial).toHaveLength(24)
    expect(Buffer.byteLength(JSON.stringify(bootstrap))).toBeLessThan(70000)
    expect(JSON.stringify(bootstrap)).not.toContain('Faraway alias 999')
    expect(JSON.stringify(bootstrap)).not.toContain('fixture-work-999')
    expect(bootstrap.tags).toContain('unique-tag-999')
    expect(bootstrap.subjects).toHaveLength(7)
    expect(files.size).toBe(43)
    expect((await load(''))?.visible).toHaveLength(24)
    expect(fetcher).not.toHaveBeenCalled()
    expect(partitionGroundedDiscovery(thousand)).toEqual(partitionGroundedDiscovery(thousand))
  })
  it('finds all curated titles, aliases, slugs and tags with global ranking and intersected facets', async () => {
    const { load } = fixture()
    for (const card of thousand) {
      for (const query of [card.title, ...card.aliases, card.slug, ...card.tags]) {
        const params = new URLSearchParams({ q: query, subject: card.subject, tag: card.tags[0] })
        const found = await load(String(params))
        expect(found?.visible.map(a => a.slug)).toEqual([card.slug])
      }
    }
    for (const q of ['ETUDE---unique', 'Faraway alias 999', 'shared 12', 'fixturework', 'nothingmatches']) {
      const found = await load(`q=${encodeURIComponent(q)}`)
      expect(found?.visible.map(a => a.slug)).toEqual(searchGroundedCards(thousand, q).slice(0, 24).map(a => a.slug))
    }
  }, 30000)
  it('paginates every work in registration order and reuses finite metadata requests', async () => {
    const { load, fetcher } = fixture()
    const seen: string[] = []
    for (let page = 1; page <= 42; page++) {
      const result = await load(`page=${page}`)
      expect(result?.pages).toBe(42)
      seen.push(...result!.visible.map(a => a.slug))
    }
    expect(seen).toEqual(thousand.map(a => a.slug))
    expect(fetcher).toHaveBeenCalledTimes(42)
    expect((await load('page=999999'))?.visible).toHaveLength(16)
    expect(fetcher).toHaveBeenCalledTimes(42)
  })
  it.each(['NaN', 'Infinity', '-1', '0', '1.5', '9007199254740992'])('clamps malformed page %s', raw => {
    expect(groundedPage(raw, 1000)).toEqual({ page: 1, pages: 42 })
  })
  it('deduplicates concurrent queries and bounds network concurrency to one', async () => {
    const data = partitionGroundedDiscovery(thousand)
    let active = 0, peak = 0
    const fetcher = vi.fn(async (url: RequestInfo | URL) => {
      peak = Math.max(peak, ++active)
      await new Promise(resolve => setTimeout(resolve, 1))
      active--
      return new Response(data.files.get(String(url)))
    })
    const load = createGroundedLoader(data.bootstrap, fetcher)
    await Promise.all(Array.from({ length: 20 }, () => load('q=Faraway%20alias%20999')))
    expect(peak).toBe(1)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('stops obsolete queries before requesting unselected partitions', async () => {
    const { bootstrap, files } = fixture()
    let finish!: (value: Response) => void
    const fetcher = vi.fn(() => new Promise<Response>(resolve => { finish = resolve }))
    const load = createGroundedLoader(bootstrap, fetcher)
    const pending = load('page=42', () => false)
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    finish(new Response(files.get(bootstrap.manifest)))
    expect(await pending).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('evicts failures without automatic retries and retries only missing files', async () => {
    const { bootstrap, files, manifest } = fixture()
    let fail = true
    const fetcher = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url) === manifest.partitions[41] && fail) return new Response('', { status: 503 })
      return new Response(files.get(String(url)))
    })
    const load = createGroundedLoader(bootstrap, fetcher)
    await expect(load('page=42')).rejects.toThrow('503')
    expect(fetcher).toHaveBeenCalledTimes(2)
    fail = false
    expect((await load('page=42'))?.visible).toHaveLength(16)
    expect(fetcher).toHaveBeenCalledTimes(3)
  })
})

it('rejects truncated metadata rather than reporting a false empty result; retry can recover', async () => {
  const { bootstrap, files } = fixture()
  let fail = true
  const fetcher = vi.fn(async (url: RequestInfo | URL) => new Response(fail ? JSON.stringify({ records: [], partitions: [] }) : files.get(String(url))))
  const load = createGroundedLoader(bootstrap, fetcher)
  await expect(load('q=Faraway%20alias%20999')).rejects.toThrow('Incomplete discovery metadata')
  fail = false
  expect((await load('q=Faraway%20alias%20999'))?.visible[0].slug).toBe('fixture-work-999')
})
it('keeps the initial cap fixed even when complete facets would exceed it', () => {
  expect(() => partitionGroundedDiscovery(thousand.map((card, i) => ({ ...card, tags: [`unique-${i}-${'x'.repeat(100)}`] })))).toThrow('70,000-byte budget')
})
it('ranks exact titles, aliases, slugs and tags globally across partition boundaries', async () => {
  const cards = thousand.map(card => ({ ...card, tags: [...card.tags], aliases: [...card.aliases] }))
  cards[999].title = 'Needle'
  cards[700].aliases.push('Needle')
  cards[500].slug = 'needle'
  cards[300].tags.push('needle')
  cards[0].title = 'Needle prefix'
  const { load } = fixture(cards)
  expect((await load('q=needle'))?.visible.map(a => a.slug)).toEqual([cards[999].slug, cards[700].slug, 'needle', cards[300].slug, cards[0].slug])
})

it.each(['request', 'body'])('times out a stalled obsolete %s, releases the lane and allows retry', async kind => {
  vi.useFakeTimers()
  try {
    const { bootstrap, files, manifest } = fixture()
    let stall = true
    let obsoleteSignal: AbortSignal | undefined
    const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url) === manifest.partitions[41] && stall) {
        obsoleteSignal = init?.signal || undefined
        if (kind === 'request') return new Promise<Response>(() => {})
        return { ok: true, json: () => new Promise(() => {}) } as Response
      }
      return new Response(files.get(String(url)))
    })
    const load = createGroundedLoader(bootstrap, fetcher)
    const old = load('page=42').catch(error => error.message)
    await vi.advanceTimersByTimeAsync(0)
    const newer = load('page=41')
    await vi.advanceTimersByTimeAsync(15000)
    expect(await old).toBe('Discovery request timed out')
    expect(obsoleteSignal?.aborted).toBe(true)
    expect((await newer)?.page).toBe(41)
    stall = false
    expect((await load('page=42'))?.visible).toHaveLength(16)
    expect(fetcher).toHaveBeenCalledTimes(4)
  } finally { vi.useRealTimers() }
})
it.each(['duplicate', 'unsafe-slug', 'minimum-width'])('rejects malformed %s metadata', async mutation => {
  const { bootstrap, files, manifest } = fixture()
  const fetcher = vi.fn(async (url: RequestInfo | URL) => {
    const value = JSON.parse(files.get(String(url))!)
    if (String(url) === bootstrap.manifest) {
      if (mutation === 'duplicate') value.records[999].slug = value.records[998].slug
      if (mutation === 'unsafe-slug') value.records[999].slug = '../unsafe'
    } else if (String(url) === manifest.partitions[41] && mutation === 'minimum-width') value[0].minimumDisplayWidth = -1
    return new Response(JSON.stringify(value))
  })
  await expect(createGroundedLoader(bootstrap, fetcher)('page=42')).rejects.toThrow('Incomplete discovery metadata')
})
