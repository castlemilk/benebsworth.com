import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const CACHE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../.cache')
const CACHE_FILE = resolve(CACHE_DIR, 'geocode.json')

// Seed: Walker's Haute Route waypoint town centres. Accurate enough for
// nearest-neighbour among 8 waypoints 5-20 km apart vs ±50 m photo GPS. Other
// hikes geocode live via Nominatim (cached).
const SEED = {
  Chamonix: { lat: 45.9237, lng: 6.8694 },
  Trient: { lat: 46.0594, lng: 6.9989 },
  Champex: { lat: 46.0289, lng: 7.1119 },
  'Le Châble': { lat: 46.0856, lng: 7.2206 },
  Arolla: { lat: 46.0277, lng: 7.4836 },
  Zinal: { lat: 46.1356, lng: 7.6228 },
  Gruben: { lat: 46.1639, lng: 7.7178 },
  Zermatt: { lat: 46.0207, lng: 7.7491 },
}

let cache = null
async function loadCache() {
  if (cache) return cache
  try {
    cache = JSON.parse(await readFile(CACHE_FILE, 'utf8'))
  } catch {
    cache = {}
  }
  return cache
}
async function saveCache() {
  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2))
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Geocode a place name → { lat, lng } | null. Seed → cache → Nominatim. */
export async function geocodePlace(name, hint = '') {
  if (SEED[name]) return SEED[name]
  const c = await loadCache()
  const key = `${name}|${hint}`
  if (key in c) return c[key]
  const q = encodeURIComponent(hint ? `${name}, ${hint}` : name)
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'benebsworth-hike-annotate/0.1 (ben.ebsworth@gmail.com)' },
  })
  if (!res.ok) throw new Error(`geocode ${name}: HTTP ${res.status}`)
  const arr = await res.json()
  const hit = arr[0] ? { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) } : null
  c[key] = hit
  await saveCache()
  await sleep(1100) // Nominatim politeness (1 req/s)
  return hit
}

/** Geocode an ordered waypoint list → [{ ...waypoint, lat, lng }]. */
export async function geocodeWaypoints(waypoints, hint = '') {
  const out = []
  for (const w of waypoints) {
    const g = await geocodePlace(w.name, hint)
    out.push({ ...w, lat: g?.lat ?? NaN, lng: g?.lng ?? NaN })
  }
  return out
}
