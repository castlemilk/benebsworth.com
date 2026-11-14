import { describe, expect, it } from 'vitest'
import { GROUNDED_ARTWORK, getGroundedArtwork, groundedCards, groundedSearchRecords, validateGroundedCatalogue } from './registry'
import { groundedArtworkUrl, GROUNDED_PAGE_SIZE, searchGroundedCards } from './discovery'

const clone = () => structuredClone(GROUNDED_ARTWORK)
describe('fixed artwork registry', () => {
  it('retains thirty subjects, ninety masters, intrinsic square geometry and original identities', () => {
    expect(GROUNDED_ARTWORK).toHaveLength(30)
    expect(new Set(GROUNDED_ARTWORK.map(a => `${a.batchId}:${a.sourceId}:${a.revision}`)).size).toBe(30)
    expect(GROUNDED_ARTWORK.every(a => a.width === a.height && a.viewBox === '0 0 900 900')).toBe(true)
    expect(GROUNDED_ARTWORK.filter(a => a.minimumDisplayWidth === 320)).toHaveLength(6)
    expect(GROUNDED_ARTWORK.some(a => /^\d/.test(a.sourceId))).toBe(true)
    expect(GROUNDED_ARTWORK.some(a => !/^\d/.test(a.sourceId))).toBe(true)
    expect(getGroundedArtwork('constructor')).toBeUndefined()
    expect(getGroundedArtwork('../leaf')).toBeUndefined()
  })
  it('rejects duplicate canonical or source identities', () => {
    const data = clone(); data[1].slug = data[0].slug
    expect(() => validateGroundedCatalogue(data)).toThrow(/identity/)
    const second = clone(); Object.assign(second[1], { batchId: second[0].batchId, sourceId: second[0].sourceId, revision: second[0].revision })
    expect(() => validateGroundedCatalogue(second)).toThrow(/identity/)
  })
  it.each(['master', 'thumbnail', 'preview'] as const)('rejects non-fingerprinted or unsafe %s paths', field => {
    for (const url of ['https://host.invalid/master.svg', '/artwork/grounded/../master.svg', '/artwork/grounded/master.svg']) {
      const data = clone(); data[0].variants.light[field] = url
      expect(() => validateGroundedCatalogue(data)).toThrow(/asset/)
    }
  })
  it('ships a small discovery record without full master metadata or scientific paragraphs', () => {
    const cards = groundedCards()
    expect(cards).toHaveLength(30)
    for (const card of cards) {
      expect(Object.keys(card).sort()).toEqual(['aliases', 'caption', 'minimumDisplayWidth', 'slug', 'subject', 'tags', 'thumbnails', 'title'])
      expect(JSON.stringify(card)).not.toContain('.svg')
    }
    expect(GROUNDED_PAGE_SIZE).toBe(24)
    expect(Buffer.byteLength(JSON.stringify(cards))).toBeLessThan(50000)
  })
  it.each(GROUNDED_ARTWORK.map(a => [a.slug, a] as const))('discovers %s by every curated title, alias and tag', (_slug, art) => {
    const cards = groundedCards()
    for (const query of [art.title, ...art.aliases, ...art.tags]) {
      expect(searchGroundedCards(cards, query).some(a => a.slug === art.slug), query).toBe(true)
    }
    expect(getGroundedArtwork(art.slug)).toBe(art)
    expect(groundedArtworkUrl(art)).toBe(`/vectors/grounded/${art.slug}/`)
  })
  it('intersects normalized term, subject and tag filters and preserves registration order', () => {
    const cards = groundedCards(), first = cards[0]
    expect(searchGroundedCards(cards, `  ${first.title.toUpperCase().replaceAll(' ', '--')}  `)[0]).toBe(first)
    const matches = searchGroundedCards(cards, '', { subject: first.subject, tag: first.tags[0] })
    expect(matches.length).toBeGreaterThan(0)
    expect(matches.every(a => a.subject === first.subject && a.tags.includes(first.tags[0]))).toBe(true)
    expect(searchGroundedCards(cards, '', { subject: 'Unknown' })).toEqual([])
    expect(searchGroundedCards(cards, 'nothingmatches')).toEqual([])
    expect(searchGroundedCards(cards)).toEqual(cards)
  })
  it('keeps scientific disclaimers and original IDs outside curated search content', () => {
    const records = groundedSearchRecords()
    for (const [i, record] of records.entries()) {
      const art = GROUNDED_ARTWORK[i]
      expect(record.content).toBe([art.title, art.slug, art.subject, ...art.tags, ...art.aliases].join(' '))
      expect(record.url).toBe(groundedArtworkUrl(art))
      expect(record.filters.kind).toEqual(['Fixed SVG artwork'])
    }
  })
})
