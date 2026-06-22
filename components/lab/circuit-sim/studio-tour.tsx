'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface TourStep {
  /** CSS selector resolved within the studio root. Omit for a centered step. */
  target?: string
  title: string
  body: string
}

interface Props {
  steps: TourStep[]
  /** The studio root the data-tour targets live under. */
  rootRef: React.RefObject<HTMLElement | null>
  onClose: () => void
}

/**
 * A dismissable spotlight "coach-mark" walkthrough. Dims the studio, rings the
 * step's target element, and shows a tooltip with Back / Next / Skip. Esc, ←/→,
 * Enter, and a backdrop click all work; the listener captures so it beats the
 * studio's own window keydown. Targets are resolved by `data-tour` selectors.
 */
export function StudioTour({ steps, rootRef, onClose }: Props) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: -9999, top: -9999 })
  const tipRef = useRef<HTMLDivElement>(null)

  const step = steps[i]
  const last = i === steps.length - 1

  const measure = useCallback(() => {
    const root = rootRef.current
    if (!root || !step?.target) { setRect(null); return }
    const el = root.querySelector(step.target) as HTMLElement | null
    setRect(el ? el.getBoundingClientRect() : null)
  }, [rootRef, step])

  // Re-measure the target on step change and on resize.
  useLayoutEffect(() => { measure() }, [measure])
  useEffect(() => {
    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [measure])

  // Position the tooltip near the target (prefer below, flip above, clamp to viewport).
  useLayoutEffect(() => {
    const tip = tipRef.current
    const tw = tip?.offsetWidth ?? 300
    const th = tip?.offsetHeight ?? 170
    const vw = window.innerWidth, vh = window.innerHeight
    const m = 12
    if (!rect) { setPos({ left: (vw - tw) / 2, top: (vh - th) / 2 }); return }
    let top = rect.bottom + m
    if (top + th > vh - m) top = rect.top - th - m
    top = Math.max(m, Math.min(top, vh - th - m))
    let left = rect.left + rect.width / 2 - tw / 2
    left = Math.max(m, Math.min(left, vw - tw - m))
    setPos({ left, top })
  }, [rect, i])

  const next = useCallback(() => { if (last) onClose(); else setI(n => Math.min(n + 1, steps.length - 1)) }, [last, onClose, steps.length])
  const prev = useCallback(() => setI(n => Math.max(0, n - 1)), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); next() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); prev() }
    }
    // Capture phase so it runs before the studio's bubble-phase window keydown.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [next, prev, onClose])

  return (
    <div className="fixed inset-0 z-[60]" data-testid="studio-tour" role="dialog" aria-modal="true" aria-label="Studio tour">
      {/* Backdrop: dark fill (or a spotlight cutout around the target). Click advances. */}
      {rect ? (
        <div
          className="pointer-events-none absolute"
          style={{
            left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(3,7,12,0.76)',
            border: '2px solid #22c8ee', borderRadius: 12,
            transition: 'left .28s ease, top .28s ease, width .28s ease, height .28s ease',
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: 'rgba(3,7,12,0.76)' }} />
      )}
      <div className="absolute inset-0" onClick={next} aria-hidden />

      {/* Tooltip */}
      <div
        ref={tipRef}
        onClick={e => e.stopPropagation()}
        style={{ left: pos.left, top: pos.top, width: 304 }}
        className="absolute z-[61] rounded-xl border border-[#22c8ee]/30 bg-[#0b121b] p-4 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#22c8ee]/80">
            {i + 1} / {steps.length}
          </span>
          <button
            onClick={onClose}
            className="font-mono text-[10px] text-[#5c8294]/60 hover:text-[#cfe3ee] transition-colors"
          >
            Skip ✕
          </button>
        </div>
        <h3 className="mt-2 font-mono text-sm font-bold text-[#cfe3ee]">{step.title}</h3>
        <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-[#9fb6c4]">{step.body}</p>

        {/* Progress dots */}
        <div className="mt-3 flex items-center gap-1">
          {steps.map((_, n) => (
            <span
              key={n}
              className={`h-1 rounded-full transition-all ${n === i ? 'w-4 bg-[#22c8ee]' : 'w-1 bg-[#22c8ee]/25'}`}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={prev}
            disabled={i === 0}
            className="rounded-md px-2.5 py-1 font-mono text-[11px] text-[#7aa0b2]/80 transition-colors hover:bg-[#142233] disabled:opacity-30"
          >
            ← Back
          </button>
          <button
            onClick={next}
            className="rounded-md border border-[#22c8ee]/40 bg-[#22c8ee]/15 px-3 py-1 font-mono text-[11px] font-bold text-[#22c8ee] transition-colors hover:bg-[#22c8ee]/25"
          >
            {last ? 'Done ✓' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
