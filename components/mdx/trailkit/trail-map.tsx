'use client'

import type { Hike, HikeWaypoint } from '@/lib/gen/content'
import { JourneyMap } from '@/components/hiking/journey-map'
import { getHikeDefaults } from './hike-binding'

export interface TrailMapProps {
  /** auto-bind waypoints + accent + name from content/hiking.ts */
  hike?: string
  /** explicit override / non-hike usage */
  waypoints?: HikeWaypoint[]
  name?: string
  accent?: string
  showElevation?: boolean
  compact?: boolean
}

/** Build a minimal Hike object JourneyMap can render from explicit props. */
function syntheticHike(props: TrailMapProps): Hike | null {
  if (!props.waypoints || props.waypoints.length < 2) return null
  return {
    slug: 'inline', name: props.name ?? 'Route', region: '', country: '', status: '',
    year: '', dates: '', summary: '', distanceKm: 0, days: 0, elevationGainM: 0,
    maxAltitudeM: 0, accent: props.accent ?? '', highlights: [], waypoints: props.waypoints,
    order: 0, hero: '',
  } as Hike
}

export function TrailMap(props: TrailMapProps) {
  const bound = getHikeDefaults(props.hike)
  const hike = bound?.hike ?? syntheticHike(props)
  if (!hike) {
    return (
      <p className="not-prose my-6 rounded-lg border border-[var(--color-border)] bg-surface p-4 font-mono text-sm text-muted">
        TrailMap: unknown hike <code>{props.hike}</code> and no <code>waypoints</code> provided.
      </p>
    )
  }
  // allow accent override even when bound to a hike
  const withAccent = props.accent ? ({ ...hike, accent: props.accent } as Hike) : hike
  return (
    <div className="my-10">
      <JourneyMap hike={withAccent} compact={props.compact} showElevation={props.showElevation ?? true} />
    </div>
  )
}
