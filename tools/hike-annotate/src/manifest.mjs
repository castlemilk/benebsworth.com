import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { GCLOUD_ACCOUNT, PUBLIC_BASE, manifestObject, manifestPublicUrl, gsUri } from './config.mjs'

const pexec = promisify(execFile)

/** Read a hike's ContentManifest { hero?, og?, gallery[] } from the public GCS
 *  object (cache-busted). Returns an empty manifest on 404. */
export async function readManifest(slug) {
  const url = `${manifestPublicUrl(slug)}?t=${Date.now()}`
  const res = await fetch(url, { cache: 'no-store' })
  if (res.status === 404) return { hero: undefined, og: undefined, gallery: [] }
  if (!res.ok) throw new Error(`readManifest(${slug}): HTTP ${res.status}`)
  const m = await res.json()
  return { hero: m.hero, og: m.og, gallery: Array.isArray(m.gallery) ? m.gallery : [] }
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

/** Write a ContentManifest back to GCS via gsutil (pinned account; cache-control
 *  no-store to match the admin so public reads never go stale). Returns the gs:// uri. */
export async function writeManifest(slug, manifest, tmpDir) {
  const file = join(tmpDir, `${slug}.write.json`)
  await writeFile(file, JSON.stringify(manifest))
  const obj = manifestObject(slug)
  await pexec(
    'gsutil',
    ['-h', 'Cache-Control:no-store', '-h', 'Content-Type:application/json', 'cp', file, gsUri(obj)],
    { env: { ...process.env, CLOUDSDK_CORE_ACCOUNT: GCLOUD_ACCOUNT } },
  )
  return gsUri(obj)
}

/** Write a timestamped backup of the pre-write manifest locally. */
export async function backupManifest(slug, manifest, tmpDir, stamp) {
  const file = join(tmpDir, `${slug}.backup.${stamp}.json`)
  await writeFile(file, JSON.stringify(manifest, null, 2))
  return file
}
