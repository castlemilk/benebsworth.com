'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * useInViewport — `true` when the element is at least partially visible,
 * `false` when it's fully scrolled out of view. Used by NeuralGraph to
 * skip its rAF loops entirely when the graph is off-screen.
 *
 * The IntersectionObserver fires whenever the element crosses the
 * viewport boundary. With `rootMargin: '0px'` (the default), "visible"
 * means at least 1px of the element is inside the viewport. We use a
 * 100px rootMargin so graphs that are JUST out of view (e.g., the user
 * is reading the paragraph just below the figure) still run — gives a
 * 100px "buffer zone" so the simulation doesn't stop the moment the
 * bottom edge crosses the viewport.
 *
 * The observer is set up in a `useEffect` and torn down on unmount.
 * The initial state is `true` (assume visible) so the graph starts
 * animating immediately; the observer corrects it on the first
 * observation if the element happens to be off-screen at mount.
 *
 * Returns a ref callback for the element AND a boolean for the
 * visibility state.
 */
export function useInViewport<T extends Element = Element>(
  rootMargin = '100px',
): [React.RefCallback<T>, boolean] {
  const [inView, setInView] = useState(true)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const elRef = useRef<T | null>(null)

  // Ref callback that gets called by React when the element mounts /
  // unmounts. We re-attach the observer every time the element changes
  // so this works inside a list, after async data load, etc.
  const ref: React.RefCallback<T> = (el) => {
    // Disconnect the old observer, if any
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    elRef.current = el
    if (el == null) return
    if (typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          setInView(e.isIntersecting)
        }
      },
      { rootMargin, threshold: 0 },
    )
    obs.observe(el)
    observerRef.current = obs
  }

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [])

  return [ref, inView]
}
