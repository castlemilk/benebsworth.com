'use client'

import { useEffect, useState } from 'react'

/**
 * useScrollActivity — `true` while the user is actively scrolling, `false`
 * after a 300ms idle. Intended for components that do heavy continuous
 * animation (e.g. particle rAF loops) and should pause themselves while
 * the browser is busy handling user-driven scroll.
 *
 * The scroll event fires dozens of times per second during a smooth
 * scroll (TOC click → smoothScrollTo, wheel events, touch moves, etc.).
 * When this happens, the browser is doing layout + paint work to update
 * the viewport. If we ALSO have six 60Hz SVG rAF loops running in the
 * background (one per NeuralGraph on the page), they fight for the same
 * frame budget and the user feels jank.
 *
 * By auto-pausing the rAFs during scroll, we hand the frame budget
 * back to the browser. The 300ms idle delay means the simulation
 * smoothly resumes a moment after the scroll settles, so the user
 * doesn't see a stutter on stop.
 *
 * Implementation notes:
 *  - We listen on `window` (not the document) — `window` is where wheel
 *    and touch events bubble up.
 *  - We use a ref'd timeout so multiple scroll events in the same
 *    burst don't restart the timer unnecessarily.
 *  - We start in the "idle" state — false. The first user scroll
 *    flips it to true.
 *  - SSR-safe: the listener is only added inside useEffect.
 */
export function useScrollActivity(idleMs = 300): boolean {
  const [active, setActive] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const onScroll = () => {
      if (timer == null) setActive(true)
      if (timer != null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        setActive(false)
      }, idleMs)
    }
    // Initial state — no scroll yet, so we're idle.
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (timer != null) clearTimeout(timer)
    }
  }, [idleMs])

  return active
}
