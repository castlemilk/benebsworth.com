import catalogue from './catalogue.json' with { type: 'json' }
import { GROUNDED_THEMES, type GroundedArtwork, type GroundedCard } from './types'
import { groundedArtworkUrl, groundedSearchText, searchGroundedCards } from './discovery'
export { groundedArtworkUrl, GROUNDED_PAGE_SIZE } from './discovery'

const nonempty = (s: unknown): s is string => typeof s === 'string' && s.length > 0 && s.trim() === s
const slug = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const digest = /^[a-f0-9]{64}$/
const assetPath = /^\/artwork\/grounded\/[a-zA-Z0-9_./-]+$/

/** Trusted authored catalogue only; raw SVG is never injected into the document. */
export function validateGroundedCatalogue(artworks: readonly GroundedArtwork[]): void {
  const ids = new Set<string>(), identities = new Set<string>(), paths = new Set<string>()
  for (const art of artworks) {
    const identity = `${art.batchId}/${art.sourceId}/${art.revision}`
    if (!slug.test(art.slug) || ids.has(art.slug) || identities.has(identity)) throw Error(`Duplicate or invalid grounded identity: ${art.slug}`)
    ids.add(art.slug); identities.add(identity)
    if (![art.title, art.batchId, art.sourceId, art.sourceDirectoryId, art.caption, art.basis, art.limitations, art.provenance, art.subject].every(nonempty)
      || art.width !== 900 || art.height !== 900 || art.viewBox !== '0 0 900 900'
      || !Number.isInteger(art.revision) || art.revision < 1 || ![240, 320].includes(art.minimumDisplayWidth)) throw Error(`Incomplete grounded definition: ${art.slug}`)
    if (!art.tags.length || art.tags.some(t => !slug.test(t)) || new Set(art.tags).size !== art.tags.length
      || !art.aliases.every(nonempty) || new Set(art.aliases).size !== art.aliases.length) throw Error(`Invalid grounded discovery: ${art.slug}`)
    if (!art.sources.length || art.sources.some(s => !nonempty(s.title) || !/^https:\/\//.test(s.url))) throw Error(`Missing grounded sources: ${art.slug}`)
    for (const theme of GROUNDED_THEMES) {
      const variant = art.variants[theme]
      for (const [url, sha, bytes, ext] of [
        [variant.master, variant.sha256, variant.bytes, '.svg'],
        [variant.thumbnail, variant.thumbnailSha256, variant.thumbnailBytes, '.webp'],
        [variant.preview, variant.previewSha256, variant.previewBytes, '.webp'],
      ] as const) {
        if (!assetPath.test(url) || url.includes('..') || paths.has(url) || !url.endsWith(ext)
          || !digest.test(sha) || !url.includes(sha.slice(0, 12)) || !Number.isSafeInteger(bytes) || bytes <= 0) throw Error(`Invalid grounded asset: ${art.slug}/${theme}`)
        paths.add(url)
      }
    }
  }
}

const data = catalogue as GroundedArtwork[]
validateGroundedCatalogue(data)
export const GROUNDED_ARTWORK: readonly GroundedArtwork[] = data
const bySlug = new Map(data.map(art => [art.slug, art]))
export const getGroundedArtwork = (slug: string): GroundedArtwork | undefined => bySlug.get(slug)
export const GROUNDED_SUBJECTS = [...new Set(data.map(art => art.subject))].sort()
export const GROUNDED_TAGS = [...new Set(data.flatMap(art => art.tags))].sort()
export function groundedCards(): GroundedCard[] {
  return data.map(({ slug, title, subject, tags, aliases, caption, minimumDisplayWidth, variants }) => ({
    slug, title, subject, tags, aliases, caption, minimumDisplayWidth,
    thumbnails: { light: variants.light.thumbnail, dark: variants.dark.thumbnail, mono: variants.mono.thumbnail },
  }))
}
export const searchGroundedArtworks = (query = '', filters: { subject?: string; tag?: string } = {}) => searchGroundedCards(groundedCards(), query, filters)
export function groundedSearchRecords() {
  return data.map(art => ({
    url: groundedArtworkUrl(art), language: 'en', content: groundedSearchText(art),
    meta: { title: art.title, description: `Fixed SVG artwork · ${art.subject}. ${art.tags.map(t => t.replaceAll('-', ' ')).join(', ')}.`, kind: 'Fixed SVG artwork' },
    filters: { kind: ['Fixed SVG artwork'], subject: [art.subject], tag: art.tags },
  }))
}
