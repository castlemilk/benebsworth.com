import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { GCLOUD_ACCOUNT, PUBLIC_BASE, manifestObject, manifestPublicUrl, gsUri, validateHikeSlug } from './config.mjs'

const pexec = promisify(execFile)

/** Read a hike's ContentManifest { hero?, og?, gallery[] } from the public GCS
 *  object (cache-busted). Returns an empty manifest on 404. */
export async function readManifestSnapshot(slug) {
  const url = `${manifestPublicUrl(slug)}?t=${Date.now()}`
  const res = await fetch(url, { cache: 'no-store' })
  if (res.status === 404) return { manifest: { hero: undefined, og: undefined, gallery: [] }, generation: '0' }
  if (!res.ok) throw new Error(`readManifest(${slug}): HTTP ${res.status}`)
  const m = await res.json()
  const header = res.headers.get('x-goog-generation')
  const generation = header && /^[1-9][0-9]*$/.test(header) ? header : null
  return { manifest: { hero: m.hero, og: m.og, gallery: Array.isArray(m.gallery) ? m.gallery : [] }, generation }
}

export async function readManifest(slug) {
  return (await readManifestSnapshot(slug)).manifest
}

/** Read the global library registry from the public GCS object. */
export async function readLibrary() {
  const url = `${PUBLIC_BASE}/library/index.json?t=${Date.now()}`
  const res = await fetch(url, { cache: 'no-store' })
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`readLibrary: HTTP ${res.status}`)
  return res.json()
}

/** Build a hike's working gallery from its manifest plus any assets uploaded
 *  from that hike (itemType/itemSlug). Keeps manifest order and avoids
 *  duplicates; newly discovered library assets are appended. */
export function mergeLibraryAssets(manifest, library, slug) {
  const seen = new Set((manifest.gallery || []).map((a) => a.id))
  const extra = (library || []).filter((a) => a.itemType === 'hike' && a.itemSlug === slug && !seen.has(a.id))
  return [...(manifest.gallery || []), ...extra]
}

/** Write only if the manifest still has the generation used by the proposal. */
export async function writeManifest(slug, manifest, tmpDir, generation) {
  validateHikeSlug(slug)
  if (typeof generation !== 'string' || !/^(0|[1-9][0-9]*)$/.test(generation)) {
    throw new Error('The proposal has no valid manifest generation. Create a new proposal before writing.')
  }
  const file = join(tmpDir, `${slug}.write.json`)
  await writeFile(file, JSON.stringify(manifest))
  const obj = manifestObject(slug)
  await pexec(
    'gcloud',
    ['storage', 'cp', file, gsUri(obj), `--if-generation-match=${generation}`, '--cache-control=no-store', '--content-type=application/json'],
    { env: { ...process.env, CLOUDSDK_CORE_ACCOUNT: GCLOUD_ACCOUNT } },
  )
  return gsUri(obj)
}

/** Write a timestamped backup of the pre-write manifest locally. */
export async function backupManifest(slug, manifest, tmpDir, stamp) {
  validateHikeSlug(slug)
  const file = join(tmpDir, `${slug}.backup.${stamp}.json`)
  await writeFile(file, JSON.stringify(manifest, null, 2))
  return file
}
