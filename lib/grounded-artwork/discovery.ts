import type { GroundedCard } from './types'
import { normalizeStudySearch } from '../generative-svg/registry'

export const GROUNDED_PAGE_SIZE = 24
export function groundedArtworkUrl(artwork: { slug: string }): string {
  return `/vectors/grounded/${encodeURIComponent(artwork.slug)}/`
}
export function groundedSearchText(artwork: Pick<GroundedCard, 'slug' | 'title' | 'subject' | 'tags' | 'aliases'>): string {
  return [artwork.title, artwork.slug, artwork.subject, ...artwork.tags, ...artwork.aliases].join(' ')
}
/** All terms match word prefixes; subject and tag filters intersect, never index disclaimers. */
export function searchGroundedCards<T extends GroundedCard>(cards: readonly T[], query = '', filters: { subject?: string; tag?: string } = {}): readonly T[] {
  const normalized = normalizeStudySearch(query), terms = normalized.split(' ').filter(Boolean)
  return cards.filter(card => {
    if (filters.subject && card.subject !== filters.subject || filters.tag && !card.tags.includes(filters.tag)) return false
    const words = normalizeStudySearch(groundedSearchText(card)).split(' ')
    return terms.every(term => words.some(word => word.startsWith(term)))
  }).map((card, index) => {
    const exact = (value: string) => normalized !== '' && normalizeStudySearch(value) === normalized
    const rank = exact(card.title) ? 100 : card.aliases.some(exact) ? 90 : exact(card.slug) ? 85 : card.tags.some(exact) ? 80 : 0
    return { card, index, rank }
  }).sort((a, b) => b.rank - a.rank || a.index - b.index).map(({ card }) => card)
}
