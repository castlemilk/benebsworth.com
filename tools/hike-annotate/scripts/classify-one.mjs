// Classify a single image end-to-end (geo candidates + agy). For smoke-testing.
//   node tools/hike-annotate/scripts/classify-one.mjs <slug> <imagePath> <lat> <lng> [dir] [hint]
import { getWaypoints, getHikeMeta } from '../src/waypoints.mjs'
import { geocodeWaypoints } from '../src/geocode.mjs'
import { nearestWaypoint } from '../src/geo.mjs'
import { classifyImage } from '../src/classify.mjs'

const [, , slug, imagePath, latS, lngS, dir = '/tmp', hint = 'Switzerland'] = process.argv
const lat = parseFloat(latS)
const lng = parseFloat(lngS)

const [meta, wps] = await Promise.all([getHikeMeta(slug), getWaypoints(slug)])
const geo = await geocodeWaypoints(wps, hint)
const n = nearestWaypoint({ lat, lng }, geo)
const ctx = {
  hike: meta,
  waypoints: geo,
  candidates: n.ranked.slice(0, 3).map((r) => ({ name: r.name, km: +r.km.toFixed(1) })),
  takenAt: '',
}
console.error('geo candidates:', JSON.stringify(ctx.candidates))
const t0 = Date.now()
const cls = await classifyImage(imagePath, dir, ctx)
console.error(`agy took ${((Date.now() - t0) / 1000).toFixed(1)}s`)
console.log(JSON.stringify(cls, null, 2))
