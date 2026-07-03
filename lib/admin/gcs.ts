import { gps, parse } from 'exifr'
import type { Asset, ContentManifest } from '@/lib/gen/content'
import { ADMIN } from './config'
import {
  assetObject,
  cacheBust,
  libraryObject,
  libraryUrl,
  manifestObject,
  manifestUrl,
  parseManifestName,
  publicUrl,
  thumbObject,
  type ItemType,
} from './storage'

/**
 * Browser-side GCS helpers for the admin CRM. Writes use the admin's own OAuth
 * token (Bearer) — security is bucket IAM (only the admin's account) + CORS.
 *
 * IMPORTANT: GCS serves public objects with a DEFAULT `Cache-Control: public,
 * max-age=3600` unless the object's metadata sets otherwise — and a plain
 * `uploadType=media` upload does NOT set that metadata from a request header.
 * So JSON (manifest/library) is written via `uploadType=multipart` with explicit
 * `cacheControl: no-store`, and reads are cache-busted, so edits/deletes are live.
 */

export const emptyManifest = (): ContentManifest => ({ hero: undefined, og: undefined, gallery: [] })

// Re-encode a bitmap to webp at a max width. Canvas drops EXIF, so read GPS/
// orientation from the original first (see uploadAsset / readGeo).
async function encode(bitmap: ImageBitmap, maxW: number, quality: number) {
  const scale = Math.min(1, maxW / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  ctx.drawImage(bitmap, 0, 0, width, height)
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/webp', quality),
  )
  return { blob, width, height }
}

const mediaEndpoint = (object: string) =>
  `https://storage.googleapis.com/upload/storage/v1/b/${ADMIN.bucket}/o?uploadType=media&name=${encodeURIComponent(object)}`
const multipartEndpoint = `https://storage.googleapis.com/upload/storage/v1/b/${ADMIN.bucket}/o?uploadType=multipart`
const BOUNDARY = '----benebsworthCRMboundary8x2'

// binary/media upload (images) — immutable cache is fine (ids are unique)
async function putMedia(object: string, blob: Blob, token: string, contentType: string) {
  const r = await fetch(mediaEndpoint(object), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable' },
    body: blob,
  })
  if (!r.ok) throw new Error(`GCS ${r.status}: ${await r.text().catch(() => '')}`)
  return r.json()
}

// JSON upload with explicit object metadata (cacheControl: no-store) so public
// reads are never stale.
// KNOWN LIMITATION: last-writer-wins. Manifest/library saves are full-object
// overwrites with no concurrency control; a real fix needs GCS
// `ifGenerationMatch` preconditions, but those require the object generation,
// which the public-URL reads (loadManifest/loadLibrary) don't return.
// Acceptable for a single-admin tool.
async function putJson(object: string, data: unknown, token: string) {
  const meta = JSON.stringify({ name: object, cacheControl: 'no-store, max-age=0' })
  const body =
    `--${BOUNDARY}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
    `--${BOUNDARY}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data, null, 2)}\r\n` +
    `--${BOUNDARY}--`
  const r = await fetch(multipartEndpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${BOUNDARY}` },
    body,
  })
  if (!r.ok) throw new Error(`GCS ${r.status}: ${await r.text().catch(() => '')}`)
  return r.json()
}

const slugifyName = (s: string) =>
  s.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'photo'

// Returns null ONLY for a genuine 404 ("this JSON doesn't exist yet"). Any
// other failure (5xx, CORS, network) THROWS: if a transient error were mapped
// to null, loadManifest would fall back to emptyManifest() and a subsequent
// Save would overwrite the real manifest with an empty one — silently wiping
// an item's gallery.
async function readJson<T>(url: string): Promise<T | null> {
  if (!url) return null
  const r = await fetch(cacheBust(url), { cache: 'no-store' })
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`GCS read failed (${r.status}) for ${url}`)
  return (await r.json()) as T
}

// Read EXIF GPS + capture time from the ORIGINAL file (the canvas re-encode in
// `encode` strips all EXIF, so this must run on the raw upload).
async function readGeo(file: File): Promise<{ lat: number; lng: number; takenAt: string }> {
  let lat = 0
  let lng = 0
  let takenAt = ''
  try {
    const g = await gps(file)
    if (g && Number.isFinite(g.latitude) && Number.isFinite(g.longitude)) {
      lat = g.latitude
      lng = g.longitude
    }
  } catch {
    /* EXIF GPS is optional — photos without it keep lat/lng 0 */
  }
  try {
    const meta = await parse(file, ['DateTimeOriginal', 'CreateDate'])
    const d = meta?.DateTimeOriginal ?? meta?.CreateDate
    if (d) takenAt = d instanceof Date ? d.toISOString() : String(d)
  } catch {
    /* EXIF capture date is optional — takenAt stays empty */
  }
  return { lat, lng, takenAt }
}

/** Upload one image to the shared pool as a full + thumbnail webp; returns its
 *  Asset (with EXIF geo). Both variants are immutable-cached; grids use the
 *  thumb, lightboxes the full. */
export async function uploadAsset(file: File, token: string, stamp: number): Promise<Asset> {
  const geo = await readGeo(file)
  // `from-image` applies EXIF orientation so phone photos aren't sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const full = await encode(bitmap, 2200, 0.82)
  const thumb = await encode(bitmap, 480, 0.72)
  bitmap.close?.()
  const id = `${stamp}-${slugifyName(file.name)}`
  await putMedia(assetObject(id), full.blob, token, 'image/webp')
  await putMedia(thumbObject(id), thumb.blob, token, 'image/webp')
  return {
    id,
    url: publicUrl(assetObject(id)),
    thumb: publicUrl(thumbObject(id)),
    alt: '',
    caption: '',
    width: full.width,
    height: full.height,
    slot: '',
    ...geo,
  }
}

export const saveManifest = (type: ItemType, slug: string, manifest: ContentManifest, token: string) =>
  putJson(manifestObject(type, slug), manifest, token)

export const saveLibrary = (assets: Asset[], token: string) => putJson(libraryObject(), assets, token)

export const loadManifest = (type: ItemType, slug: string) =>
  readJson<ContentManifest>(manifestUrl(type, slug)).then((m) => m ?? emptyManifest())

export const loadLibrary = () => readJson<Asset[]>(libraryUrl()).then((a) => a ?? [])

/** List which items already have a manifest (authed) — avoids a 404 storm from
 *  probing every item. Returns the {type, slug} of each existing manifest.
 *  THROWS on failure: a failed listing must not look like "no manifests exist"
 *  (that would let the shell treat every item as manifest-less and Save an
 *  empty manifest over a real one). */
export async function listExistingManifests(token: string): Promise<{ type: ItemType; slug: string }[]> {
  const r = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${ADMIN.bucket}/o?prefix=manifest/&fields=items(name)`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
  if (!r.ok) throw new Error(`GCS manifest listing failed (${r.status})`)
  const data = (await r.json()) as { items?: { name: string }[] }
  return (data.items ?? [])
    .map((i) => parseManifestName(i.name))
    .filter((v): v is { type: ItemType; slug: string } => v !== null)
}
