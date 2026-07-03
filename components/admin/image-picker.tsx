'use client'

import { useRef, useState, type CSSProperties } from 'react'
import type { Asset } from '@/lib/gen/content'
import { thumbOf } from '@/lib/admin/storage'

/**
 * Library picker. Single mode: click a tile to pick one. Multi mode: batch
 * selection via click-toggle, shift-click range, drag-marquee, and select-all —
 * then "Add N". Uploading adds to the pool and auto-selects the new images.
 * Grids render the small cached thumb variant.
 */
type Rect = { left: number; top: number; right: number; bottom: number }
const intersects = (r: Rect, b: DOMRect) =>
  !(b.right < r.left || b.left > r.right || b.bottom < r.top || b.top > r.bottom)

export function ImagePicker({
  library,
  multi = false,
  busy,
  onConfirm,
  onUploadFiles,
  onClose,
}: {
  library: Asset[]
  multi?: boolean
  busy?: string | null
  onConfirm: (assets: Asset[]) => void
  onUploadFiles: (files: FileList | null) => Promise<Asset[]>
  onClose: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const lastIdx = useRef(-1)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [marquee, setMarquee] = useState<Rect | null>(null)

  const confirmSelected = () => onConfirm(library.filter((a) => sel.has(a.id)))

  const onTile = (i: number, a: Asset, e: React.MouseEvent) => {
    if (!multi) return onConfirm([a])
    if (e.shiftKey && lastIdx.current >= 0) {
      const [lo, hi] = [lastIdx.current, i].sort((x, y) => x - y)
      setSel((s) => {
        const n = new Set(s)
        for (let k = lo; k <= hi; k++) n.add(library[k].id)
        return n
      })
    } else {
      setSel((s) => {
        const n = new Set(s)
        if (n.has(a.id)) n.delete(a.id)
        else n.add(a.id)
        return n
      })
      lastIdx.current = i
    }
  }

  // drag-marquee selection (multi only), starting on grid background
  const startMarquee = (e: React.PointerEvent) => {
    if (!multi || (e.target as HTMLElement).closest('[data-tile]')) return
    e.preventDefault()
    const start = { x: e.clientX, y: e.clientY }
    const base = new Set(sel)
    const move = (ev: PointerEvent) => {
      const r: Rect = {
        left: Math.min(start.x, ev.clientX),
        top: Math.min(start.y, ev.clientY),
        right: Math.max(start.x, ev.clientX),
        bottom: Math.max(start.y, ev.clientY),
      }
      setMarquee(r)
      const next = new Set(base)
      gridRef.current?.querySelectorAll<HTMLElement>('[data-tile]').forEach((el) => {
        if (intersects(r, el.getBoundingClientRect())) next.add(el.dataset.id!)
      })
      setSel(next)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setMarquee(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  async function upload(files: FileList | null) {
    const added = await onUploadFiles(files)
    if (!added.length) return
    if (multi) setSel((s) => new Set([...s, ...added.map((a) => a.id)]))
    else onConfirm([added[0]])
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] p-3">
          <div className="flex items-center gap-3">
            <h3 className="font-display text-base font-semibold">{multi ? 'Add images' : 'Pick an image'}</h3>
            {multi && (
              <span className="font-mono text-xs text-muted">
                {sel.size} selected
                {library.length > 0 && (
                  <>
                    {' · '}
                    <button type="button" className="underline hover:text-fg" onClick={() => setSel(new Set(library.map((a) => a.id)))}>all</button>
                    {' · '}
                    <button type="button" className="underline hover:text-fg" onClick={() => setSel(new Set())}>clear</button>
                  </>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {busy && <span className="font-mono text-xs text-muted">{busy}</span>}
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 font-mono text-xs hover:border-[var(--color-muted)]">+ Upload</button>
            {multi && (
              <button type="button" disabled={sel.size === 0} onClick={confirmSelected} className="rounded-lg bg-about px-3 py-1.5 font-mono text-xs text-white disabled:opacity-40">
                Add {sel.size || ''}
              </button>
            )}
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 font-mono text-xs text-muted hover:text-fg">Close</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
        </div>

        {/* scroll lives on this wrapper; the grid stays in normal flow so
            aspect-square rows size correctly (a grid that is ALSO the scroll
            container mis-sizes aspect-ratio rows once it overflows). */}
        <div className="overflow-y-auto p-3">
        <div ref={gridRef} onPointerDown={startMarquee} className="relative grid select-none grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {library.length === 0 && (
            <p className="col-span-full py-10 text-center font-mono text-xs text-muted">No images yet — upload some.</p>
          )}
          {library.map((a, i) => {
            const selected = sel.has(a.id)
            return (
              <button
                key={a.id}
                type="button"
                data-tile
                data-id={a.id}
                onClick={(e) => onTile(i, a, e)}
                title={a.caption || a.id}
                className="group relative aspect-square overflow-hidden rounded-lg border-2 transition-colors"
                style={{ borderColor: selected ? 'var(--color-about)' : 'var(--color-border)' } as CSSProperties}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbOf(a)} alt={a.alt || ''} loading="lazy" decoding="async" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
                {multi && (
                  <span
                    className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border text-[0.7rem] ${selected ? 'border-about bg-about text-white' : 'border-white/70 bg-black/30 text-transparent'}`}
                  >
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>
        </div>
      </div>

      {marquee && (
        <div
          className="pointer-events-none fixed z-[130] rounded-sm border border-about bg-about/15"
          style={{ left: marquee.left, top: marquee.top, width: marquee.right - marquee.left, height: marquee.bottom - marquee.top }}
        />
      )}
    </div>
  )
}
