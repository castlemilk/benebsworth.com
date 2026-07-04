'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { accentStyle } from './primitives'

export interface TrailFigureProps {
  /** Image URL — a co-located `/blog/...` path or an absolute https URL (the
   *  real trip photos are served from GCS). */
  src: string
  caption?: ReactNode
  /** Explicit alt; falls back to a plain-string caption, else the meta chip. */
  alt?: string
  /** Small accent eyebrow chip above the caption, e.g. "Day 3 · Pas de Chèvres". */
  meta?: string
  /** Per-figure accent; otherwise inherits `--accent` from a themed wrapper. */
  accent?: string
  /** Cinematic 21:9 crop for a standalone hero moment. Default shows the photo
   *  whole at its natural aspect (portrait or landscape), capped in height and
   *  centred so the frame always hugs the image — no cropping, no dead bars. */
  wide?: boolean
  credit?: string
  /** Intrinsic pixel dimensions of the photo. When both are given the figure
   *  reserves the exact layout box before the image loads (intrinsic
   *  width/height attributes + CSS aspect-ratio), eliminating CLS on the
   *  photo-heavy guides. Optional — figures without dims behave as before. */
  width?: number
  height?: number
  /** Opt out of click-to-zoom (default: zoomable). */
  noZoom?: boolean
}

/**
 * A real-photo figure for a trail guide — the photo-led counterpart to the
 * researched <Landmark>/<Stop> cards. Trailkit chrome (accent border + caption)
 * so an embedded snapshot sits naturally beside <Stage>/<Checkpoint>. Phone
 * shots come in both orientations: the frame shrink-wraps each photo (centred,
 * height-capped) so a portrait never towers and a landscape still fills the
 * column. Click to open it full-size in a lightbox. Drop one inline for a single
 * beat, or wrap several in <TrailGrid>.
 */
export function TrailFigure({ src, caption, alt, meta, accent, wide, credit, width, height, noZoom }: TrailFigureProps) {
  const [zoom, setZoom] = useState(false)
  const altText = alt ?? (typeof caption === 'string' ? caption : meta ?? '')
  const hasDims = !!(width && height)
  // With known dims, reproduce the "natural size, capped by the column and by
  // 76vh of height" sizing as a pre-load-computable width so the box is
  // reserved before the bytes arrive: width = min(natural, column, 76vh·ratio),
  // height follows from the aspect ratio.
  const dimStyle =
    width && height && !wide
      ? { aspectRatio: `${width} / ${height}`, width: `min(100%, ${width}px, calc(76vh * ${(width / height).toFixed(4)}))` }
      : undefined
  return (
    <figure className={`not-prose my-8 ${wide ? 'w-full' : 'mx-auto w-fit max-w-full'}`} style={accentStyle(accent)}>
      <button
        type="button"
        onClick={noZoom ? undefined : () => setZoom(true)}
        aria-label={noZoom ? undefined : `Enlarge photo${altText ? `: ${altText}` : ''}`}
        className={`group relative block overflow-hidden rounded-[0.625rem] border border-[var(--color-border)] bg-surface p-0 leading-[0] transition-[border-color] duration-200 hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--color-border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ${noZoom ? 'cursor-default' : 'cursor-zoom-in'} ${wide ? 'w-full' : ''}`}
        disabled={noZoom}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={altText}
          loading="lazy"
          decoding="async"
          width={width}
          height={height}
          className={wide ? 'aspect-[21/9] w-full object-cover' : hasDims ? 'block h-auto' : 'block h-auto max-h-[76vh] w-auto max-w-full'}
          style={dimStyle}
        />
        {!noZoom && (
          <span className="pointer-events-none absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
          </span>
        )}
      </button>
      {(caption || meta || credit) && (
        <figcaption className="mt-2.5 px-1">
          {meta && (
            <span className="mb-1 block font-mono text-[0.6rem] uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>
              {meta}
            </span>
          )}
          <span className="flex flex-wrap items-baseline justify-between gap-2 font-sans text-[0.82rem] leading-relaxed text-fg/70">
            {caption && <span className="flex-1">{caption}</span>}
            {credit && <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-fg/40">{credit}</span>}
          </span>
        </figcaption>
      )}
      {zoom && <FigureZoom src={src} alt={altText} caption={caption} meta={meta} credit={credit} onClose={() => setZoom(false)} />}
    </figure>
  )
}

/** Full-size single-photo overlay: scroll-locked, esc/click-out to close, with a
 *  "full size" escape hatch to the raw file. Shares the visual language of the
 *  hike gallery lightbox but stays self-contained (one photo, no navigation). */
function FigureZoom({
  src,
  alt,
  caption,
  meta,
  credit,
  onClose,
}: {
  src: string
  alt: string
  caption?: ReactNode
  meta?: string
  credit?: string
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    const opener = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      opener?.focus?.()
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Photo'}
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex items-center justify-end gap-2 p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
        <a href={src} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/10 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-wider text-white/90 transition-colors hover:bg-white/20">full size ↗</a>
        <button type="button" className="rounded-full bg-white/10 px-3 py-1.5 font-mono text-xs text-white transition-colors hover:bg-white/20" onClick={onClose} aria-label="Close">esc ✕</button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-2 sm:px-4" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="max-h-full max-w-full rounded-lg object-contain" style={{ animation: 'jm-fade 0.28s ease-out' }} />
      </div>
      {(caption || meta || credit) && (
        <div className="shrink-0 p-3 text-center sm:p-4" onClick={(e) => e.stopPropagation()}>
          <p className="mx-auto max-w-3xl font-sans text-sm text-white/80">
            {meta && <span className="mr-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-white/50">{meta}</span>}
            {caption}
            {credit && <span className="ml-2 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-white/40">{credit}</span>}
          </p>
        </div>
      )}
    </div>
  )
}
