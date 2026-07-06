import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readManifest, readLibrary, mergeLibraryAssets } from './manifest.mjs'
import { getWaypoints, getHikeMeta } from './waypoints.mjs'
import { geocodeWaypoints } from './geocode.mjs'
import { nearestWaypoint } from './geo.mjs'
import { classifyImage } from './classify.mjs'
import { placeAsset, pickHero, orderGallery } from './place.mjs'

/** Run up to `limit` async workers over items. */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, worker))
  return results
}

async function downloadThumb(asset, dir) {
  const url = asset.thumb || asset.url
  const file = join(dir, `${asset.id}.webp`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download ${asset.id}: HTTP ${res.status}`)
  await writeFile(file, Buffer.from(await res.arrayBuffer()))
  return file
}

/**
 * Classify + place every gallery photo of a hike. Returns a PROPOSAL — does not
 * write. `limit` processes only the first N (the rest are kept unchanged); when
 * limit < total the proposal is `partial` (not safe to write).
 */
export async function annotateHike(slug, opts = {}) {
  const { limit = Infinity, hint = '', concurrency = 4, onProgress = () => {} } = opts
  const [meta, wps, manifest, library] = await Promise.all([
    getHikeMeta(slug),
    getWaypoints(slug),
    readManifest(slug),
    readLibrary(),
  ])
  const geo = await geocodeWaypoints(wps, hint || meta.country || '')
  const validNames = new Set(geo.map((w) => w.name))

  // Start from the manifest, then pull in any assets uploaded from this hike
  // that aren't already assigned (e.g. uploaded via /admin but not yet saved).
  const workingGallery = mergeLibraryAssets(manifest, library, slug)

  const n = Number.isFinite(limit) ? Math.min(limit, workingGallery.length) : workingGallery.length
  const toProcess = workingGallery.slice(0, n)
  const rest = workingGallery.slice(n)
  const partial = rest.length > 0

  const dir = await mkdtemp(join(tmpdir(), `hike-annotate-${slug}-`))
  await mapLimit(toProcess, 8, (a) => downloadThumb(a, dir).catch(() => null))

  let done = 0
  const placed = await mapLimit(toProcess, concurrency, async (asset) => {
    const geoMatch = asset.lat || asset.lng ? nearestWaypoint({ lat: asset.lat, lng: asset.lng }, geo) : null
    const candidates = geoMatch
      ? geoMatch.ranked.slice(0, 3).map((r) => ({ name: r.name, km: +r.km.toFixed(1) }))
      : geo.slice(0, 4).map((w) => ({ name: w.name, km: 0 }))
    const ctx = { hike: meta, waypoints: geo, candidates, takenAt: asset.takenAt }
    const cls = await classifyImage(join(dir, `${asset.id}.webp`), dir, ctx)
    onProgress(++done, toProcess.length, asset.id, cls)
    return placeAsset(asset, geoMatch ? { waypoint: geoMatch.waypoint, km: geoMatch.km } : null, cls, validNames)
  })

  const annotated = placed.map((p) => p.asset)
  const metas = placed.map((p) => p.meta)
  const metaById = Object.fromEntries(metas.map((m) => [m.id, m]))
  const ordered = orderGallery(annotated, metaById)
  const heroId = pickHero(metas)
  const heroAsset = heroId ? annotated.find((a) => a.id === heroId) : undefined

  const proposal = { hero: heroAsset || manifest.hero, og: manifest.og, gallery: [...ordered, ...rest] }
  return { slug, meta, geo, manifest, proposal, metas, metaById, heroId, tmpDir: dir, partial }
}
