import manifest from './manifest.json'
import { normalizeStudySearch } from '../generative-svg/registry'

/** Raster artwork is a separate asset kind. It never enters the SVG model registry. */
export const ARTWORK = Object.freeze(manifest.map(asset => Object.freeze({ ...asset, tags: Object.freeze(asset.tags), aliases: Object.freeze(asset.aliases) })))
export type Artwork = (typeof ARTWORK)[number]
export const ARTWORK_TAGS = Object.freeze([...new Set(ARTWORK.flatMap(asset => [...asset.tags]))].sort())
export const artworkUrl = (asset: Pick<Artwork, 'id'>) => `/vectors/#artwork-${encodeURIComponent(asset.id)}`
export const artworkSearchText = (asset: Artwork) => [asset.title, asset.id, ...asset.tags, ...asset.aliases].join(' ')

export function searchArtwork(query = '', tag = '') {
  const terms = normalizeStudySearch(query).split(' ').filter(Boolean)
  return ARTWORK.filter(asset => (!tag || asset.tags.includes(tag)) && terms.every(term => normalizeStudySearch(artworkSearchText(asset)).split(' ').some(word => word.startsWith(term))))
}

export function artworkSearchRecords() {
  return ARTWORK.map(asset => ({
    url: artworkUrl(asset), language: 'en', content: artworkSearchText(asset),
    meta: { title: asset.title, description: `Generated PNG artwork · ${asset.tags.join(', ')}.`, kind: 'PNG artwork' },
    filters: { kind: ['PNG artwork'], tag: [...asset.tags] },
  }))
}
