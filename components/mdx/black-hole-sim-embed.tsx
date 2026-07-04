'use client'

import dynamic from 'next/dynamic'

// The studio is WebGL2 + rAF heavy; load it client-only so it never blocks
// the static post render (matches the UniverseScale embed pattern). The
// dynamic() call is hoisted to module scope so the chunk is requested once.
const BlackHoleStudio = dynamic(
  () => import('@/components/lab/black-hole-sim/black-hole-studio').then((m) => m.BlackHoleStudio),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[560px] w-full animate-pulse rounded-xl border border-[var(--color-border)]"
        style={{ background: '#04050a' }}
        aria-hidden
      />
    ),
  },
)

/**
 * `<BlackHoleSim />` — embeds the general-relativistic black-hole ray tracer
 * inside a blog post: per-pixel Schwarzschild null geodesics, a physically
 * shaded accretion disk, and a compact collapsible control drawer with a
 * link out to the full lab at /lab/black-hole-sim/.
 */
export function BlackHoleSim() {
  return (
    <div className="not-prose my-8">
      <BlackHoleStudio embed />
    </div>
  )
}
