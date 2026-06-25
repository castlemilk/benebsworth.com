'use client'

import dynamic from 'next/dynamic'

// The studio is canvas + theme + rAF heavy; load it client-only so it never
// blocks the static post render (matches the LabSide/LabCanvas pattern).
const UniverseScaleStudio = dynamic(
  () => import('@/components/lab/universe-scale/universe-scale-studio').then((m) => m.UniverseScaleStudio),
  { ssr: false, loading: () => null },
)

/**
 * `<UniverseScale focus="schwarzschild" height={420} />` — embeds the
 * Universe-Scale explorer inside a blog post. `focus` accepts a catalogue id
 * (e.g. "ant", "earth", "sun"), a marker id ("schwarzschild", "planck"),
 * "ladder", or a raw log10(metres) number, setting the initial zoom.
 */
export function UniverseScale({ focus, height = 440 }: { focus?: string; height?: number }) {
  return <UniverseScaleStudio focus={focus} height={height} embedded />
}
