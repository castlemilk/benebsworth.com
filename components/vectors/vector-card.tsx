'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Download } from 'lucide-react'
import type { VectorItem } from '@/lib/vectors/registry'
import { cn } from '@/lib/utils'

export type StageBg = 'dark' | 'blueprint' | 'light' | 'checker' | 'tint'
export type CardScale = 'sm' | 'md' | 'lg'
export type CopyState = 'idle' | 'copied' | 'failed'
/** A card can also learn that the file itself is missing, which no download can work around. */
export type CardCopyState = CopyState | 'missing'

/** The matte the marks sit on. The artwork is luminous on transparency, so the
 *  default stays dark in both themes; the gallery exposes the alternatives. */
export const STAGE_CLASSES: Record<StageBg, string> = {
  dark: 'bg-[#0e0f14] border-white/10',
  blueprint:
    'bg-[#0d121f] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:12px_12px] border-blue-500/20',
  light: 'bg-white border-black/10',
  checker:
    'bg-[#181920] bg-[repeating-conic-gradient(#22232d_0%_25%,#181920_0%_50%)] [background-size:16px_16px] border-white/10',
  tint: 'bg-[#0f141c] border-white/10',
}

/** Hover edges keyed to the matte, not the theme: the mattes are fixed colours in both themes. */
const STAGE_HOVER: Record<StageBg, string> = {
  dark: 'hover:border-white/40',
  blueprint: 'hover:border-white/40',
  light: 'hover:border-black/40',
  checker: 'hover:border-white/40',
  tint: 'hover:border-white/40',
}

export const COPY_STATUS: Record<CardCopyState, string> = {
  idle: '',
  copied: 'SVG copied to clipboard',
  failed: 'Copy failed — download the SVG instead',
  missing: 'SVG file not found',
}

/**
 * Copies the SVG markup itself and reports what actually happened. A missing
 * file and a refused clipboard are different failures: only the second can be
 * worked around by downloading, so they get different messages. Neither is
 * ever a path quietly substituted under a success tick.
 */
export async function copySvgSource(svgPath: string): Promise<Exclude<CardCopyState, 'idle'>> {
  let text: string
  try {
    const res = await fetch(svgPath)
    if (!res.ok) return 'missing'
    text = await res.text()
  } catch {
    return 'failed'
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

interface VectorCardProps {
  item: VectorItem
  previewBg: StageBg
  scaleSize: CardScale
  onInspect: (item: VectorItem) => void
}

/**
 * One mark on a quiet matte. The stage is the card: no shell, badge, aura or
 * hover lift competes with the artwork. The name and semantic role sit below
 * as plain text and keep the full column; copy/download overlay the stage's
 * corner on hover or focus (always on touch), so they never take width from
 * the name, and are withheld when the file is missing. The status line keeps a
 * fixed footprint so a copy never shifts the grid.
 */
export function VectorCard({ item, previewBg, scaleSize, onInspect }: VectorCardProps) {
  const [copy, setCopy] = useState<CardCopyState>('idle')
  const [imgError, setImgError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  // A lazy image that already failed before hydration never fires onError again.
  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth === 0) setImgError(true)
  }, [])

  const handleCopy = async () => {
    setCopy(await copySvgSource(item.svgPath))
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopy('idle'), 2500)
  }

  const markSize = { sm: 'h-12 w-12 sm:h-14 sm:w-14', md: 'h-20 w-20 sm:h-24 sm:w-24', lg: 'h-28 w-28 sm:h-36 sm:w-36' }[scaleSize]
  const action =
    'inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-muted transition-colors hover:border-[var(--color-fg)] hover:text-[var(--color-fg)] focus-visible:opacity-100'

  return (
    <article className="group/vector relative flex min-w-0 flex-col" data-vector-card={item.id}>
      <button
        type="button"
        onClick={() => onInspect(item)}
        aria-label={`Inspect ${item.name}`}
        className={cn(
          'relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-md border transition-colors',
          STAGE_CLASSES[previewBg],
          STAGE_HOVER[previewBg],
        )}
      >
        {imgError ? (
          <span className={cn('px-3 text-center text-xs', previewBg === 'light' ? 'text-black/60' : 'text-white/60')}>
            Preview unavailable
          </span>
        ) : (
          <img
            ref={imgRef}
            src={item.svgPath}
            alt=""
            onError={() => setImgError(true)}
            loading="lazy"
            className={cn('object-contain', markSize)}
          />
        )}
      </button>

      {!imgError && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 transition-opacity group-hover/vector:opacity-100 group-focus-within/vector:opacity-100 pointer-coarse:opacity-100">
          <button type="button" onClick={handleCopy} aria-label={`Copy ${item.name} SVG`} title="Copy SVG" className={action}>
            {copy === 'copied' ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
          <a
            href={item.svgPath}
            download={`${item.filename_stem}.svg`}
            aria-label={`Download ${item.name} SVG`}
            title="Download SVG"
            className={action}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      )}

      <div className="mt-2 min-w-0">
        <h3 title={item.name} className="line-clamp-2 break-words font-display text-sm font-semibold text-[var(--color-fg)]">
          {item.name}
        </h3>
        <p title={item.semantic_role} className="truncate font-mono text-[0.7rem] text-muted">{item.semantic_role}</p>
      </div>

      <p
        role="status"
        aria-live="polite"
        className={cn('mt-1 h-4 truncate text-[0.7rem]', copy === 'failed' || copy === 'missing' ? 'text-[var(--color-fg)]' : 'text-muted')}
      >
        {COPY_STATUS[copy]}
      </p>
    </article>
  )
}
