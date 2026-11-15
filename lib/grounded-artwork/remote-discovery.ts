import { GROUNDED_PAGE_SIZE, searchGroundedCards } from './discovery'
import type { GroundedCard } from './types'

export type GroundedSearchCard = Pick<GroundedCard, 'slug' | 'title' | 'subject' | 'tags' | 'aliases'>
export type GroundedDisplayCard = Pick<GroundedCard, 'slug' | 'title' | 'subject' | 'minimumDisplayWidth'> & { thumbnail: string }
export interface GroundedBootstrap {
  total: number
  initial: GroundedDisplayCard[]
  subjects: string[]
  tags: string[]
  manifest: string
}
export interface GroundedManifest {
  partitions: string[]
  records: (GroundedSearchCard & { partition: number })[]
}
export const GROUNDED_REQUEST_TIMEOUT_MS = 15000
export interface GroundedResult { total: number; page: number; pages: number; visible: GroundedDisplayCard[] }
export function groundedPage(raw: string | null, total: number) {
  const pages = Math.max(1, Math.ceil(total / GROUNDED_PAGE_SIZE)), requested = Number(raw || 1)
  return { pages, page: Math.max(1, Math.min(pages, Number.isSafeInteger(requested) ? requested : 1)) }
}
export function initialGroundedResult(bootstrap: GroundedBootstrap, queryString: string): GroundedResult | null {
  const params = new URLSearchParams(queryString)
  const { page, pages } = groundedPage(params.get('page'), bootstrap.total)
  if (params.get('q') || params.get('subject') || params.get('tag') || page !== 1) return null
  return { total: bootstrap.total, page, pages, visible: bootstrap.initial }
}

/** One cache per mounted collection, bounded by manifest + catalogue partitions, not queries.
 * A single request lane deduplicates in-flight work and limits network concurrency to one.
 * Failed entries are evicted for explicit retry; no automatic retry loop. */
export function createGroundedLoader(bootstrap: GroundedBootstrap, fetcher: typeof fetch = (...args) => fetch(...args)) {
  const cache = new Map<string, Promise<unknown>>()
  let lane: Promise<unknown> = Promise.resolve()
  function read<T>(url: string, validate: (value: T) => boolean): Promise<T> {
    const existing = cache.get(url)
    if (existing) return existing as Promise<T>
    const promise = lane.catch(() => {}).then(async () => {
      const controller = new AbortController()
      let timer: ReturnType<typeof setTimeout> | undefined
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort()
          reject(Error('Discovery request timed out'))
        }, GROUNDED_REQUEST_TIMEOUT_MS)
      })
      try {
        return await Promise.race([deadline, (async () => {
          const response = await fetcher(url, { signal: controller.signal })
          if (!response.ok) throw Error(`Discovery request failed (${response.status})`)
          const value = await response.json() as T
          if (!validate(value)) throw Error('Incomplete discovery metadata')
          return value
        })()])
      } finally { clearTimeout(timer) }
    })
    lane = promise
    cache.set(url, promise)
    void promise.catch(() => { if (cache.get(url) === promise) cache.delete(url) })
    return promise as Promise<T>
  }
  return async (queryString: string, current: () => boolean = () => true): Promise<GroundedResult | null> => {
    const initial = initialGroundedResult(bootstrap, queryString)
    if (initial) return initial
    const manifest = await read<GroundedManifest>(bootstrap.manifest, value =>
      Array.isArray(value?.records) && value.records.length === bootstrap.total &&
      new Set(value.records.map(card => card?.slug)).size === bootstrap.total &&
      Array.isArray(value.partitions) && value.partitions.length === Math.ceil(bootstrap.total / GROUNDED_PAGE_SIZE) &&
      value.partitions.every(url => /^\/artwork\/grounded-discovery\/[a-f0-9]{64}\.json$/.test(url)) &&
      value.records.every((card, index) => card && typeof card.slug === 'string' && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(card.slug) && typeof card.title === 'string' && typeof card.subject === 'string' &&
        Array.isArray(card.tags) && card.tags.every(tag => typeof tag === 'string') && Array.isArray(card.aliases) && card.aliases.every(alias => typeof alias === 'string') &&
        card.partition === Math.floor(index / GROUNDED_PAGE_SIZE)))
    if (!current()) return null
    const params = new URLSearchParams(queryString)
    const results = searchGroundedCards(manifest.records, params.get('q') || '', { subject: params.get('subject') || '', tag: params.get('tag') || '' })
    const { page, pages } = groundedPage(params.get('page'), results.length)
    const selected = results.slice((page - 1) * GROUNDED_PAGE_SIZE, page * GROUNDED_PAGE_SIZE)
    const cards = new Map(bootstrap.initial.map(card => [card.slug, card]))
    for (const partition of new Set(selected.filter(card => !cards.has(card.slug)).map(card => card.partition))) {
      if (!current()) return null
      const loaded = await read<GroundedDisplayCard[]>(manifest.partitions[partition], value => {
        const expected = manifest.records.slice(partition * GROUNDED_PAGE_SIZE, (partition + 1) * GROUNDED_PAGE_SIZE)
        return Array.isArray(value) && value.length === expected.length && value.every((card, index) => card &&
          card.slug === expected[index].slug && card.title === expected[index].title && card.subject === expected[index].subject &&
          [240, 320].includes(card.minimumDisplayWidth) && typeof card.thumbnail === 'string' &&
          /^\/artwork\/grounded\/[a-zA-Z0-9_./-]+\.webp$/.test(card.thumbnail) && !card.thumbnail.includes('..'))
      })
      for (const card of loaded) cards.set(card.slug, card)
    }
    if (!current()) return null
    const visible = selected.map(record => {
      const card = cards.get(record.slug)
      if (!card) throw Error('Incomplete discovery partition')
      return card
    })
    return { total: results.length, page, pages, visible }
  }
}
