// Dry-run: geo-match every gallery photo of a hike to its nearest waypoint.
// No agy, no writes — validates the geo half against the real manifest.
//   node tools/hike-annotate/scripts/geomatch-dry.mjs [slug] [geocode-hint]
import { readManifest } from '../src/manifest.mjs'
import { getWaypoints, getHikeMeta } from '../src/waypoints.mjs'
import { geocodeWaypoints } from '../src/geocode.mjs'
import { nearestWaypoint, chronologyConflicts } from '../src/geo.mjs'

const slug = process.argv[2] || 'haute-route'
const hint = process.argv[3] || 'Switzerland'

const [meta, wps, manifest] = await Promise.all([getHikeMeta(slug), getWaypoints(slug), readManifest(slug)])
const geo = await geocodeWaypoints(wps, hint)

console.log(`\n${meta.name} — ${meta.region}, ${meta.country} (${meta.year})`)
console.log('Geocoded waypoints:')
for (const g of geo) console.log(`  ${g.day.padEnd(7)} ${g.name.padEnd(12)} ${Number.isFinite(g.lat) ? `${g.lat.toFixed(4)}, ${g.lng.toFixed(4)}` : '(no geo)'}  ${g.elev} m`)

const placed = manifest.gallery.map((a) => {
  if (!a.lat && !a.lng) return { id: a.id, slot: '', km: null, takenAt: a.takenAt, noGeo: true }
  const n = nearestWaypoint({ lat: a.lat, lng: a.lng }, geo)
  return { id: a.id, slot: n.waypoint, km: +n.km.toFixed(2), takenAt: a.takenAt, second: n.ranked[1] }
})

const counts = {}
for (const p of placed) counts[p.slot || '(no geo)'] = (counts[p.slot || '(no geo)'] || 0) + 1
const conflicts = chronologyConflicts(placed, geo)

console.log(`\n${manifest.gallery.length} photos → geo-nearest waypoint:`)
for (const g of geo) console.log(`  ${String(counts[g.name] || 0).padStart(3)}  ${g.name}`)
if (counts['(no geo)']) console.log(`  ${String(counts['(no geo)']).padStart(3)}  (no geo)`)
console.log(`\nMedian/maX nearest distance: ${distStats(placed.filter((p) => p.km != null).map((p) => p.km))}`)
console.log(`Chronology conflicts (geo vs takenAt order): ${conflicts.size}`)

console.log('\nChronological sample (first 14 by takenAt):')
for (const p of placed.filter((p) => p.takenAt).sort((a, b) => String(a.takenAt).localeCompare(String(b.takenAt))).slice(0, 14)) {
  const flag = conflicts.has(p.id) ? ' ⚠chrono' : ''
  console.log(`  ${String(p.takenAt).slice(0, 16).replace('T', ' ')}  →  ${(p.slot || '(no geo)').padEnd(12)} ${p.km != null ? `${p.km} km` : ''}${flag}`)
}

function distStats(arr) {
  if (!arr.length) return 'n/a'
  const s = [...arr].sort((a, b) => a - b)
  const med = s[Math.floor(s.length / 2)]
  return `${med.toFixed(2)} km / ${s[s.length - 1].toFixed(2)} km`
}
