import Link from 'next/link'
import type { Hike } from '@/lib/gen/content'
import type { CSSProperties } from 'react'

/**
 * Index card for a hike. Until a cover photo (hike.hero) is set it shows a
 * stylized mountain-range placeholder tinted with the hike's accent, so the
 * grid looks intentional before any images exist.
 */
export function HikeCard({ hike }: { hike: Hike }) {
  const accent = hike.accent || '#5b9e6f'
  const planned = hike.status === 'planned'
  return (
    <Link
      href={`/hiking/${hike.slug}/`}
      className="group block h-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface transition-colors hover:border-[var(--color-muted)]"
      style={{ '--accent': accent } as CSSProperties}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {hike.hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hike.hero} alt={hike.name} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <RangePlaceholder accent={accent} />
        )}
        <span
          className="absolute left-3 top-3 rounded-full px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em]"
          style={{
            color: planned ? 'var(--color-muted)' : '#fff',
            backgroundColor: planned ? 'color-mix(in srgb, var(--color-fg) 8%, transparent)' : `color-mix(in srgb, ${accent} 80%, transparent)`,
            border: planned ? '1px dashed color-mix(in srgb, var(--color-fg) 25%, transparent)' : 'none',
          }}
        >
          {planned ? 'planned' : hike.year}
        </span>
      </div>

      <div className="flex flex-col p-5">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted">
          {hike.region} · {hike.country}
        </p>
        <h3 className="mt-1 font-display text-xl font-semibold leading-snug tracking-[-0.01em]">{hike.name}</h3>
        <p className="mt-2 line-clamp-2 font-sans text-sm leading-6 text-fg/60">{hike.summary}</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.7rem] text-muted">
          <span><span className="text-fg/80">{hike.distanceKm}</span> km</span>
          <span><span className="text-fg/80">{hike.days}</span> days</span>
          <span><span className="text-fg/80">{hike.maxAltitudeM.toLocaleString()}</span> m</span>
        </div>
      </div>
    </Link>
  )
}

function RangePlaceholder({ accent }: { accent: string }) {
  return (
    <div
      className="relative h-full w-full"
      style={{ background: `radial-gradient(120% 120% at 30% 0%, color-mix(in srgb, ${accent} 18%, var(--color-stage)), var(--color-stage))` }}
    >
      <svg viewBox="0 0 100 62" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <polygon points="0,62 18,30 30,42 46,16 60,40 74,24 100,52 100,62" fill={`color-mix(in srgb, ${accent} 30%, transparent)`} />
        <polygon points="0,62 26,40 40,48 58,28 72,46 88,34 100,46 100,62" fill={`color-mix(in srgb, ${accent} 50%, transparent)`} />
        <circle cx="78" cy="14" r="5" fill={`color-mix(in srgb, ${accent} 60%, transparent)`} />
      </svg>
      <span className="absolute bottom-2 right-3 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-fg/35">photo coming soon</span>
    </div>
  )
}
