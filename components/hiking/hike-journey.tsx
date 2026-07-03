'use client'

import { useEffect, useState } from 'react'
import type { Hike, Asset } from '@/lib/gen/content'
import { cacheBust, manifestUrl } from '@/lib/admin/storage'
import { JourneyMap } from './journey-map'
import { HikeGallery } from './hike-gallery'

/**
 * Client orchestrator for a hike detail page: holds the shared "active waypoint"
 * selection (links the journey map ↔ gallery) and reads the live photo manifest
 * from GCS (managed in /admin). Read-only — there is no inline editor on public
 * pages anymore.
 */
export function HikeJourney({ hike }: { hike: Hike }) {
  const [active, setActive] = useState<string | null>(null)
  const [gallery, setGallery] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = manifestUrl('hike', hike.slug)
    if (!url) { setLoading(false); return }
    let alive = true
    fetch(cacheBust(url), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => { if (alive) setGallery(Array.isArray(m?.gallery) ? m.gallery : []) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [hike.slug])

  return (
    <>
      <JourneyMap hike={hike} active={active} onSelect={setActive} />
      <div className="mt-12">
        <HikeGallery hike={hike} gallery={gallery} active={active} onSelect={setActive} loading={loading} />
      </div>
    </>
  )
}
