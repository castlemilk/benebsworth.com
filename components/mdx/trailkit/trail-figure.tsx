'use client'

import type { ReactNode } from 'react'
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
}

/**
 * A real-photo figure for a trail guide — the photo-led counterpart to the
 * researched <Landmark>/<Stop> cards. Trailkit chrome (accent border + caption)
 * so an embedded snapshot sits naturally beside <Stage>/<Checkpoint>. Phone
 * shots come in both orientations: the frame shrink-wraps each photo (centred,
 * height-capped) so a portrait never towers and a landscape still fills the
 * column. Drop one inline for a single beat, or wrap several in <TrailGrid>.
 */
export function TrailFigure({ src, caption, alt, meta, accent, wide, credit, width, height }: TrailFigureProps) {
  const altText = alt ?? (typeof caption === 'string' ? caption : meta ?? '')
  const hasDims = !!(width && height)
  // With known dims, reproduce the "natural size, capped by the column and by
  // 76vh of height" sizing as a pre-load-computable width so the box is
  // reserved before the bytes arrive: width = min(natural, column, 76vh·ratio),
  // height follows from the aspect ratio.
  // TODO: no resized variants exist in GCS yet — once thumbnail/medium variants
  // are generated, add srcset/sizes here instead of shipping the full-res file.
  const dimStyle =
    width && height && !wide
      ? { aspectRatio: `${width} / ${height}`, width: `min(100%, ${width}px, calc(76vh * ${(width / height).toFixed(4)}))` }
      : undefined
  return (
    <figure className={`not-prose my-8 ${wide ? 'w-full' : 'mx-auto w-fit max-w-full'}`} style={accentStyle(accent)}>
      <div className="overflow-hidden rounded-[0.625rem] border border-[var(--color-border)] bg-surface transition-[border-color] duration-200 hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--color-border))]">
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
      </div>
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
    </figure>
  )
}
