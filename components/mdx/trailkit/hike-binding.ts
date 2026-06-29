import { getHike } from '@/content/hiking'
import type { Hike, HikeWaypoint } from '@/lib/gen/content'

export interface HikeDefaults {
  region: string
  country: string
  accent: string
  distanceKm: number
  days: number
  elevationGainM: number
  maxAltitudeM: number
  name: string
  waypoints: HikeWaypoint[]
  hike: Hike
}

/** Static, SSR-safe lookup of a hike's index data by slug (no fetch). */
export function getHikeDefaults(slug?: string): HikeDefaults | null {
  if (!slug) return null
  const h = getHike(slug)
  if (!h) return null
  return {
    region: h.region, country: h.country, accent: h.accent,
    distanceKm: h.distanceKm, days: h.days, elevationGainM: h.elevationGainM,
    maxAltitudeM: h.maxAltitudeM, name: h.name, waypoints: h.waypoints, hike: h,
  }
}
