import { ADMIN } from './config'

export type ItemType = 'blog' | 'hike'

// GCS object layout (single bucket, all public-read):
//   assets/<type>/<slug>/<id>.webp  — per-item image pool
//   library/index.json              — global asset registry (catalogue + metadata)
//   manifest/<type>/<slug>.json     — per-item assignment { hero, og, gallery[] }
//
// Legacy flat pool (pre-namespacing): assets/<id>.webp. Existing assets keep
// working because their full urls are stored in the registry/manifests.
export const assetObject = (type: ItemType, slug: string, id: string) => `assets/${type}/${slug}/${id}.webp`
export const thumbObject = (type: ItemType, slug: string, id: string) => `assets/${type}/${slug}/${id}-thumb.webp`
export const legacyAssetObject = (id: string) => `assets/${id}.webp`
export const legacyThumbObject = (id: string) => `assets/${id}-thumb.webp`
export const manifestObject = (type: ItemType, slug: string) => `manifest/${type}/${slug}.json`
export const libraryObject = () => 'library/index.json'

/** Small cached variant for grids/thumbnails; falls back to full url (old assets). */
export const thumbOf = (a?: { thumb?: string; url?: string } | null) => (a ? a.thumb || a.url || '' : '')

export const publicUrl = (object: string) => `${ADMIN.publicBase}/${object}`
export const manifestUrl = (type: ItemType, slug: string) =>
  ADMIN.publicBase ? publicUrl(manifestObject(type, slug)) : ''
export const libraryUrl = () => (ADMIN.publicBase ? publicUrl(libraryObject()) : '')

/** Append a unique query so a read bypasses any stale GCS public-object cache. */
export const cacheBust = (url: string) => (url ? `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}` : url)

/** Geo helpers (lat/lng are 0 when a photo has no EXIF GPS). */
export const hasGeo = (a?: { lat?: number; lng?: number } | null) => !!(a && (a.lat || a.lng))
export const mapsLink = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
export const fmtLatLng = (lat: number, lng: number) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`

/** `manifest/<type>/<slug>.json` → { type, slug } (null if it doesn't match). */
export function parseManifestName(name: string): { type: ItemType; slug: string } | null {
  const m = name.match(/^manifest\/(blog|hike)\/(.+)\.json$/)
  return m ? { type: m[1] as ItemType, slug: m[2] } : null
}
