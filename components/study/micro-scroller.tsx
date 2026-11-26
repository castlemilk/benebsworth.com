'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TocItem } from './toc-nav'

/**
 * Minimap scroller for viewports below the TOC-rail breakpoint (<80rem): a
 * thin strip pinned to the left edge with a tick per section and a band for
 * the visible region. Hover expands it into labelled positions; on touch a
 * tap pins the labels open (tap a label to jump, tap outside or Esc to close).
 * Dragging scrubs the document like a scrollbar thumb — grab the band to keep
 * your place, grab anywhere else to jump.
 *
 * Pointer-first by design: keyboard and screen-reader users already get the
 * in-article "Contents" <details> with the same entries, so the minimap's
 * labels are mirrors (tabIndex -1), not a second tab stop per heading.
 */
export function MicroScroller({ items }: { items: TocItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const downRef = useRef<{ x: number; y: number; grab: number; touch: boolean; scrolled: boolean; rect: DOMRect } | null>(null)
  // A touch tap that pins the panel still emits a compatibility click, and
  // Chromium's fat-finger targeting may retarget it onto a nearby label <a> —
  // which would jump instead of open. Swallow any click for a beat after pin.
  const suppressClickUntil = useRef(0)
  const [geom, setGeom] = useState<{ docH: number; vh: number; trackH: number; tops: (number | null)[] } | null>(null)
  const [scrollY, setScrollY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [pinned, setPinned] = useState(false)

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    setGeom({
      docH: Math.max(1, document.documentElement.scrollHeight),
      vh: window.innerHeight,
      trackH: track.getBoundingClientRect().height,
      tops: items.map((i) => {
        const el = document.getElementById(i.id)
        return el ? el.getBoundingClientRect().top + window.scrollY : null
      }),
    })
  }, [items])

  // Heading offsets shift as images/charts/fonts lay out — re-measure whenever
  // the document body resizes, plus the usual viewport events.
  useEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(document.body)
    window.addEventListener('resize', measure)
    window.addEventListener('load', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('load', measure)
    }
  }, [measure])

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setScrollY(window.scrollY))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // Unpin on outside tap or Escape while the touch-pinned panel is open.
  useEffect(() => {
    if (!pinned) return
    const down = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest?.('.study-micro')) setPinned(false)
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPinned(false)
    }
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('keydown', key)
    }
  }, [pinned])

  const docH = geom?.docH ?? 1
  const trackH = geom?.trackH ?? 1
  const bandH = geom ? Math.max(16, (geom.vh / docH) * trackH) : 16
  const bandTop = geom ? Math.min((scrollY / docH) * trackH, Math.max(0, trackH - bandH)) : 0

  const active = useMemo(() => {
    if (!geom) return ''
    const mark = scrollY + geom.vh * 0.3
    let id = ''
    items.forEach((it, i) => {
      const t = geom.tops[i]
      if (t != null && t <= mark) id = it.id
    })
    return id
  }, [geom, scrollY, items])

  // Labels sit at their section's document fraction; dense sections would
  // collide, so push later labels down by a minimum gap (minimap convention).
  const labelTops = useMemo(() => {
    if (!geom) return [] as number[]
    const out: number[] = []
    let prev = -Infinity
    for (const t of geom.tops) {
      if (t == null) {
        out.push(NaN)
        continue
      }
      const y = Math.min(Math.max((t / docH) * trackH, prev + 11, 8), trackH - 8)
      out.push(y)
      prev = y
    }
    return out
  }, [geom, docH, trackH])

  const scrollToFrac = useCallback(
    (frac: number) => {
      if (!geom) return
      const max = Math.max(0, geom.docH - geom.vh)
      window.scrollTo(0, Math.min(Math.max(frac * geom.docH, 0), max))
    },
    [geom],
  )

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (!track || !geom) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = track.getBoundingClientRect()
    const y = e.clientY - rect.top
    // Grabbing the band keeps the grab offset; elsewhere the band centers on
    // the pointer — the classic scrollbar-jump behavior.
    const grab = y >= bandTop && y <= bandTop + bandH ? y - bandTop : bandH / 2
    const touch = e.pointerType === 'touch'
    // The rect is constant for the whole gesture (fixed element) — cache it
    // here rather than reading layout on every pointermove.
    downRef.current = { x: e.clientX, y: e.clientY, grab, touch, scrolled: false, rect }
    setDragging(true)
    // Mouse jumps immediately (scrollbar UX); a touch only scrolls once it
    // has moved — otherwise the tap means "pin the labels open".
    if (!touch) {
      scrollToFrac((y - grab) / rect.height)
      downRef.current.scrolled = true
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = downRef.current
    if (!dragging || !d) return
    if (d.touch && !d.scrolled) {
      const dist2 = (e.clientX - d.x) ** 2 + (e.clientY - d.y) ** 2
      if (dist2 < 100) return
      d.scrolled = true
    }
    scrollToFrac((e.clientY - d.rect.top - d.grab) / d.rect.height)
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    setDragging(false)
    const d = downRef.current
    downRef.current = null
    if (!d?.touch || d.scrolled) return
    // Touch tap with no scrub: first tap pins the labels open; a tap on the
    // already-open strip still means "go there".
    if (!pinned) {
      suppressClickUntil.current = performance.now() + 500
      setPinned(true)
      return
    }
    scrollToFrac((e.clientY - d.rect.top - bandH / 2) / d.rect.height)
  }

  const jump = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    if (performance.now() < suppressClickUntil.current) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    history.replaceState(null, '', `#${id}`)
    setPinned(false)
  }

  if (!items.length) return null

  return (
    <div
      ref={trackRef}
      className="study-micro"
      role="navigation"
      aria-label="Section minimap"
      data-dragging={dragging || undefined}
      data-pinned={pinned || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={() => {
        setDragging(false)
        downRef.current = null
      }}
      onClickCapture={(e) => {
        if (performance.now() >= suppressClickUntil.current) return
        suppressClickUntil.current = 0
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <div className="study-micro-panel">
        {items.map((it, i) =>
          Number.isNaN(labelTops[i]) || geom?.tops[i] == null ? null : (
            <a
              key={it.id}
              href={`#${it.id}`}
              tabIndex={-1}
              className="study-micro-label"
              style={{ top: labelTops[i] }}
              data-depth={it.depth === 3 || undefined}
              data-active={active === it.id || undefined}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => jump(e, it.id)}
            >
              {it.text}
            </a>
          ),
        )}
      </div>
      <div className="study-micro-band" style={{ top: bandTop, height: bandH }} aria-hidden />
      {items.map((it, i) =>
        geom?.tops[i] == null ? null : (
          <span
            key={it.id}
            className="study-micro-tick"
            style={{ top: Math.min(((geom.tops[i] as number) / docH) * trackH, trackH - 2) }}
            data-depth={it.depth === 3 || undefined}
            data-active={active === it.id || undefined}
            aria-hidden
          />
        ),
      )}
    </div>
  )
}
