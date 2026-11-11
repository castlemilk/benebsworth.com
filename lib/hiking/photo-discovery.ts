import type { Asset, Hike } from '@/lib/gen/content'

/** Published manifest metadata only. Never infer a place from schematic x/y,
 * fetch originals for EXIF, reverse-geocode, or expose additional coordinates. */
export type LocationFilter = 'all' | 'recorded' | 'unrecorded'
export function hasRecordedLocation(asset: Pick<Asset, 'lat' | 'lng'>) {
  return typeof asset.lat === 'number' && typeof asset.lng === 'number' &&
    Number.isFinite(asset.lat) && Number.isFinite(asset.lng) &&
    Math.abs(asset.lat) <= 90 && Math.abs(asset.lng) <= 180 &&
    (asset.lat !== 0 || asset.lng !== 0)
}
export function photoPlaces(gallery: Asset[], hike: Pick<Hike, 'waypoints'>) {
  const counts = new Map<string, number>()
  for (const photo of gallery) if (photo.slot.trim()) counts.set(photo.slot, (counts.get(photo.slot) ?? 0) + 1)
  const order = new Map(hike.waypoints.map((point, index) => [point.name, index]))
  return [...counts].sort(([a], [b]) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity) || a.localeCompare(b))
    .map(([name, count]) => ({ name, count }))
}
export function discoverPhotos(gallery: Asset[], place: string | null, location: LocationFilter, unlabelled = false) {
  return gallery.filter(photo => (!place || photo.slot === place) && (!unlabelled || !photo.slot.trim()) &&
    (location === 'all' || hasRecordedLocation(photo) === (location === 'recorded')))
}
const text = (value: unknown) => typeof value === 'string' ? value : ''
const imageUrl = (value: unknown) => typeof value === 'string' && (/^https?:\/\//.test(value) || /^\/(?!\/)/.test(value)) ? value : ''
/** Fail visibly on malformed manifests instead of declaring an empty gallery. */
export function readPublishedGallery(manifest: unknown): Asset[] {
  if (!manifest || typeof manifest !== 'object' || !('gallery' in manifest) || !Array.isArray(manifest.gallery)) throw new Error('Invalid gallery manifest')
  const seen = new Set<string>()
  return manifest.gallery.map((value: unknown) => {
    if (!value || typeof value !== 'object') throw new Error('Invalid gallery photograph')
    const photo = value as Record<string, unknown>
    const url = imageUrl(photo.url)
    if (!url || seen.has(url)) throw new Error('Invalid or duplicate gallery photograph')
    seen.add(url)
    const geo = hasRecordedLocation({lat: photo.lat as number, lng: photo.lng as number})
    return {
      id: text(photo.id), url, thumb: imageUrl(photo.thumb), alt: text(photo.alt), caption: text(photo.caption), slot: text(photo.slot), takenAt: text(photo.takenAt),
      width: typeof photo.width === 'number' && Number.isFinite(photo.width) && photo.width > 0 ? photo.width : 0,
      height: typeof photo.height === 'number' && Number.isFinite(photo.height) && photo.height > 0 ? photo.height : 0,
      lat: geo ? photo.lat as number : 0, lng: geo ? photo.lng as number : 0,
    }
  })
}

export const PHOTO_AREA_RADIUS_METRES = 2000
export type PhotoArea = { id: string; cover: Asset; photos: Asset[] }
export function photoDistanceMetres(a: Pick<Asset, 'lat' | 'lng'>, b: Pick<Asset, 'lat' | 'lng'>) {
  const radians = Math.PI / 180
  const h = Math.sin((b.lat - a.lat) * radians / 2) ** 2 + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin((b.lng - a.lng) * radians / 2) ** 2
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))))
}
/** A bounded, deterministic vicinity grouping, not a claimed named place or
 * itinerary. Every member is within 2 km of the first photo; chaining is forbidden. */
export function photoAreas(gallery: Asset[]): PhotoArea[] {
  const areas: PhotoArea[] = []
  for (const photo of gallery) {
    if (!hasRecordedLocation(photo)) continue
    let nearest: PhotoArea | undefined
    let distance = PHOTO_AREA_RADIUS_METRES
    for (const area of areas) {
      const candidate = photoDistanceMetres(area.cover, photo)
      if (candidate <= distance) { nearest = area; distance = candidate }
    }
    if (nearest) nearest.photos.push(photo)
    else areas.push({id:`area-${areas.length + 1}`,cover:photo,photos:[photo]})
  }
  return areas
}
