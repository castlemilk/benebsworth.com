'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import type { Hike, Asset } from '@/lib/gen/content'
import { hasGeo, mapsLink, thumbOf } from '@/lib/admin/storage'

/**
 * Per-hike photo gallery (read-only) — renders the manifest's ordered gallery
 * (read live from GCS) in a responsive grid with a lightbox. If a gallery image
 * carries a `slot` matching the active waypoint, selecting that waypoint filters
 * to its photos. Before any photos exist it shows placeholder tiles keyed to the
 * route's waypoints so the section never looks broken.
 */
export function HikeGallery({
  gallery,
  hike,
  active,
  onSelect,
  loading,
}: {
  gallery: Asset[]
  hike: Hike
  active: string | null
  onSelect: (name: string | null) => void
  loading?: boolean
}) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  const accent = hike.accent || '#5b9e6f'

  const hasSlotMatch = active ? gallery.some((a) => a.slot === active) : false
  const shown = hasSlotMatch ? gallery.filter((a) => a.slot === active) : gallery
  const lb = lightbox !== null ? shown[lightbox] : null

  if (!loading && gallery.length === 0) {
    return <GalleryPlaceholder hike={hike} />
  }

  return (
    <div style={{ '--accent': accent } as CSSProperties}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="type-h3">Gallery</h3>
        {hasSlotMatch && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="rounded-full border px-2.5 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider transition-colors hover:text-fg"
            style={{ color: 'var(--accent)', borderColor: 'color-mix(in srgb, var(--accent) 45%, transparent)' }}
          >
            {active} ✕
          </button>
        )}
        <span className="font-mono text-xs text-muted">{shown.length} photo{shown.length === 1 ? '' : 's'}</span>
      </div>

      {loading && gallery.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-stage)]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((im, i) => (
            <button
              key={im.url}
              type="button"
              onClick={() => setLightbox(i)}
              className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-stage)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbOf(im)}
                alt={im.alt || im.caption || `${hike.name} photo`}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />
              {(im.caption || im.slot) && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-2 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  {im.slot && (
                    <span className="rounded-full px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-white" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 70%, transparent)' }}>
                      {im.slot}
                    </span>
                  )}
                  {im.caption && <span className="font-sans text-[0.7rem] leading-tight text-white/90">{im.caption}</span>}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {lb && (
        <Lightbox
          image={lb}
          count={shown.length}
          index={lightbox!}
          onClose={() => setLightbox(null)}
          onNav={(d) => setLightbox((i) => (i === null ? null : (i + d + shown.length) % shown.length))}
        />
      )}
    </div>
  )
}

function GalleryPlaceholder({ hike }: { hike: Hike }) {
  const accent = hike.accent || '#5b9e6f'
  const tiles = hike.waypoints.slice(0, 8)
  return (
    <div style={{ '--accent': accent } as CSSProperties}>
      <div className="mb-4 flex items-center gap-3">
        <h3 className="type-h3">Gallery</h3>
        <span className="font-mono text-xs text-muted">photos coming soon</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((w, i) => (
          <div
            key={i}
            className="relative flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-[var(--color-border)] bg-[radial-gradient(120%_120%_at_30%_0%,color-mix(in_srgb,var(--accent)_8%,var(--color-stage)),var(--color-stage))] p-3 text-center"
          >
            <span className="font-mono text-lg" style={{ color: 'color-mix(in srgb, var(--accent) 70%, transparent)' }}>◰</span>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">{w.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Lightbox({
  image,
  index,
  count,
  onClose,
  onNav,
}: {
  image: Asset
  index: number
  count: number
  onClose: () => void
  onNav: (d: number) => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onNav(-1)
      if (e.key === 'ArrowRight') onNav(1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, onNav])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={onClose}>
      <button type="button" className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 font-mono text-xs text-white" onClick={onClose}>esc ✕</button>
      {count > 1 && (
        <>
          <button type="button" className="absolute left-4 rounded-full bg-white/10 px-3 py-2 text-white" onClick={(e) => { e.stopPropagation(); onNav(-1) }} aria-label="Previous">‹</button>
          <button type="button" className="absolute right-4 rounded-full bg-white/10 px-3 py-2 text-white" onClick={(e) => { e.stopPropagation(); onNav(1) }} aria-label="Next">›</button>
        </>
      )}
      <figure className="max-h-[88vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.url} alt={image.alt || image.caption || 'photo'} className="max-h-[82vh] w-auto rounded-lg object-contain" />
        <figcaption className="mt-2 flex items-center justify-between gap-3 font-mono text-xs text-white/70">
          <span>
            {image.caption}{image.slot ? ` · ${image.slot}` : ''}
            {hasGeo(image) && (
              <a href={mapsLink(image.lat, image.lng)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="ml-2 text-white/85 underline underline-offset-2">📍 location</a>
            )}
          </span>
          <span className="tabular-nums">{index + 1} / {count}</span>
        </figcaption>
      </figure>
    </div>
  )
}
