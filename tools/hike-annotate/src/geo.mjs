const R_KM = 6371

const toRad = (d) => (d * Math.PI) / 180

/** Great-circle distance in km between two {lat,lng} points. */
export function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** Nearest geocoded waypoint to a point. Returns { waypoint, km, ranked }.
 *  `geoWaypoints` = [{ name, lat, lng, ... }]; entries without finite lat/lng are skipped. */
export function nearestWaypoint(point, geoWaypoints) {
  const ranked = geoWaypoints
    .filter((w) => Number.isFinite(w.lat) && Number.isFinite(w.lng))
    .map((w) => ({ name: w.name, km: haversineKm(point, w) }))
    .sort((a, b) => a.km - b.km)
  return { waypoint: ranked[0]?.name ?? '', km: ranked[0]?.km ?? Infinity, ranked }
}

/** Day-order index per waypoint name, parsed from "Day N" labels (for chronology). */
export function dayIndex(geoWaypoints) {
  const idx = {}
  geoWaypoints.forEach((w, i) => {
    const m = /(\d+)/.exec(w.day || '')
    idx[w.name] = m ? Number(m[1]) : i + 1
  })
  return idx
}

/** Flag photos whose geo-nearest waypoint regresses against takenAt chronology.
 *  Returns a Set of asset ids that look temporally out of place (low confidence). */
export function chronologyConflicts(placed, geoWaypoints) {
  const di = dayIndex(geoWaypoints)
  const withTime = placed
    .filter((p) => p.takenAt && p.slot && di[p.slot] != null)
    .sort((a, b) => String(a.takenAt).localeCompare(String(b.takenAt)))
  const conflicts = new Set()
  let maxDay = -Infinity
  for (const p of withTime) {
    const d = di[p.slot]
    // allow same-or-forward; a meaningful backward jump (>1 day) is suspicious
    if (d < maxDay - 1) conflicts.add(p.id)
    else maxDay = Math.max(maxDay, d)
  }
  return conflicts
}
