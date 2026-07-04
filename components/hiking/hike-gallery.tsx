'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { Hike, Asset } from '@/lib/gen/content'
import { hasGeo, mapsLink, thumbOf } from '@/lib/admin/storage'
import { fmtDate } from '@/lib/format'

/**
 * Per-hike photo gallery (read-only) — renders the manifest's ordered gallery
 * (read live from GCS) as a justified, aspect-respecting mosaic (portrait and
 * landscape phone shots keep their shape instead of being square-cropped) with a
 * full lightbox: keyboard + swipe navigation, neighbour preloading, a thumbnail
 * filmstrip, and a rich caption (date · place · waypoint). If a gallery image
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

  const containerRef = useRef<HTMLDivElement>(null)
  const width = useContainerWidth(containerRef)
  const rows = width > 0 ? justifyRows(shown, width, rowHeightFor(width), 12) : null

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

      <div ref={containerRef}>
        {loading && gallery.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-stage)]" />
            ))}
          </div>
        ) : rows ? (
          rows.map((row, ri) => (
            <div key={ri} className="flex" style={{ gap: 12, marginBottom: 12 }}>
              {row.items.map((it) => {
                const i = shown.indexOf(it.asset)
                return (
                  <GalleryTile
                    key={it.asset.url}
                    asset={it.asset}
                    hike={hike}
                    width={it.width}
                    height={row.height}
                    onOpen={() => setLightbox(i)}
                  />
                )
              })}
            </div>
          ))
        ) : (
          // pre-measurement fallback (keeps order, reserves boxes → no layout jump)
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((im, i) => (
              <GalleryTile key={im.url} asset={im} hike={hike} onOpen={() => setLightbox(i)} />
            ))}
          </div>
        )}
      </div>

      {lightbox !== null && shown[lightbox] && (
        <Lightbox
          images={shown}
          index={lightbox}
          hikeName={hike.name}
          onClose={() => setLightbox(null)}
          onIndex={(i) => setLightbox(((i % shown.length) + shown.length) % shown.length)}
        />
      )}
    </div>
  )
}

function GalleryTile({
  asset,
  hike,
  width,
  height,
  onOpen,
}: {
  asset: Asset
  hike: Hike
  width?: number
  height?: number
  onOpen: () => void
}) {
  const sized = width && height
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-stage)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ${sized ? '' : 'aspect-[4/3] w-full'}`}
      style={sized ? { width, height } : undefined}
      aria-label={asset.alt || asset.caption || `${hike.name} photo — open`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbOf(asset)}
        alt={asset.alt || asset.caption || `${hike.name} photo`}
        loading="lazy"
        decoding="async"
        width={asset.width || undefined}
        height={asset.height || undefined}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      {(asset.caption || asset.slot) && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-2 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          {asset.slot && (
            <span className="rounded-full px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-wider text-white" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 70%, transparent)' }}>
              {asset.slot}
            </span>
          )}
          {asset.caption && <span className="line-clamp-2 font-sans text-[0.7rem] leading-tight text-white/90">{asset.caption}</span>}
        </span>
      )}
    </button>
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

// ── justified-rows layout ────────────────────────────────────────────────
type Row = { items: { asset: Asset; width: number }[]; height: number }

const aspectOf = (a: Asset) => (a.width && a.height ? a.width / a.height : 4 / 3)

function rowHeightFor(w: number) {
  if (w < 480) return 150
  if (w < 768) return 190
  return 230
}

/** Greedy row packing: fill each row to the container width at a shared height,
 *  respecting each photo's aspect ratio (Flickr/Google-Photos style). The last
 *  partial row keeps the target height rather than stretching a lone photo wide. */
function justifyRows(items: Asset[], containerWidth: number, targetHeight: number, gap: number): Row[] {
  const rows: Row[] = []
  let row: Asset[] = []
  let aspectSum = 0
  const flush = (last: boolean) => {
    if (!row.length) return
    const totalGap = gap * (row.length - 1)
    const naturalWidth = aspectSum * targetHeight + totalGap
    const height = last && naturalWidth <= containerWidth ? targetHeight : (containerWidth - totalGap) / aspectSum
    rows.push({ height, items: row.map((a) => ({ asset: a, width: aspectOf(a) * height })) })
    row = []
    aspectSum = 0
  }
  for (const it of items) {
    row.push(it)
    aspectSum += aspectOf(it)
    const rowWidth = aspectSum * targetHeight + gap * (row.length - 1)
    if (rowWidth >= containerWidth) flush(false)
  }
  flush(true)
  return rows
}

function useContainerWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(e.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return w
}

// ── lightbox ─────────────────────────────────────────────────────────────
function Lightbox({
  images,
  index,
  hikeName,
  onClose,
  onIndex,
}: {
  images: Asset[]
  index: number
  hikeName: string
  onClose: () => void
  onIndex: (i: number) => void
}) {
  const image = images[index]
  const count = images.length
  const dialogRef = useRef<HTMLDivElement>(null)
  const touchX = useRef<number | null>(null)

  const nav = useCallback((d: number) => onIndex(index + d), [index, onIndex])

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') nav(-1)
      else if (e.key === 'ArrowRight') nav(1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, nav])

  // body scroll lock + focus management (restore focus to the opener on close)
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    const opener = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
  }, [])

  // preload neighbours
  useEffect(() => {
    for (const d of [-1, 1]) {
      const n = images[(((index + d) % count) + count) % count]
      if (n) { const im = new Image(); im.src = n.url }
    }
  }, [index, images, count])

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0]?.clientX ?? null }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current
    if (Math.abs(dx) > 44) nav(dx < 0 ? 1 : -1)
    touchX.current = null
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${hikeName} gallery, photo ${index + 1} of ${count}`}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm focus:outline-none"
      onClick={onClose}
    >
      {/* top bar */}
      <div className="flex items-center justify-between gap-3 p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-white/60">{hikeName}</span>
        <div className="flex items-center gap-2">
          <a href={image.url} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/10 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-wider text-white/90 transition-colors hover:bg-white/20">full size ↗</a>
          <button type="button" className="rounded-full bg-white/10 px-3 py-1.5 font-mono text-xs text-white transition-colors hover:bg-white/20" onClick={onClose} aria-label="Close">esc ✕</button>
        </div>
      </div>

      {/* stage */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-4" onClick={(e) => e.stopPropagation()} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {count > 1 && (
          <>
            <button type="button" className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition-colors hover:bg-white/20 sm:left-4" onClick={() => nav(-1)} aria-label="Previous photo">‹</button>
            <button type="button" className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition-colors hover:bg-white/20 sm:right-4" onClick={() => nav(1)} aria-label="Next photo">›</button>
          </>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={image.url}
          src={image.url}
          alt={image.alt || image.caption || `${hikeName} photo`}
          className="max-h-full max-w-full rounded-lg object-contain"
          style={{ animation: 'jm-fade 0.28s ease-out' }}
        />
      </div>

      {/* caption + filmstrip */}
      <div className="shrink-0 p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-xs text-white/70">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {image.caption && <span className="font-sans text-sm text-white/90">{image.caption}</span>}
            {image.slot && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-wider">{image.slot}</span>}
            {image.takenAt && <span className="text-white/50">{fmtDate(image.takenAt)}</span>}
            {hasGeo(image) && (
              <a href={mapsLink(image.lat, image.lng)} target="_blank" rel="noopener noreferrer" className="text-white/85 underline underline-offset-2">📍 location</a>
            )}
          </span>
          <span className="tabular-nums text-white/60">{index + 1} / {count}</span>
        </div>

        {count > 1 && (
          <div className="mx-auto mt-3 flex max-w-5xl gap-1.5 overflow-x-auto pb-1">
            {images.map((im, i) => (
              <button
                key={im.url}
                type="button"
                onClick={() => onIndex(i)}
                aria-label={`Go to photo ${i + 1}`}
                aria-current={i === index}
                className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-md ring-2 transition-all ${
                  i === index ? 'opacity-100 ring-[var(--accent)]' : 'opacity-50 ring-transparent hover:opacity-90'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbOf(im)} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
