'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { sketchPath } from '@/components/mdx/annotation-geometry'
import styles from '@/components/mdx/editorial-blocks.module.css'

/** A continuous pen-drawn hook, sized to this insight rather than the page. */
export function InsightFocusRail() {
  const ref = useRef<SVGSVGElement>(null)
  const [height, setHeight] = useState(256)
  useEffect(() => {
    const svg = ref.current
    if (!svg) return
    const measure = () => {
      const next = Math.round(svg.getBoundingClientRect().height)
      if (next > 0) setHeight(previous => previous === next ? previous : next)
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(svg)
    window.addEventListener('resize', measure)
    let active = true
    document.fonts?.ready.then(() => { if (active) measure() })
    return () => { active = false; observer?.disconnect(); window.removeEventListener('resize', measure) }
  }, [])
  const path = useMemo(() => {
    const h = Math.max(64, height)
    // The curved shoulder leads into the title; the rail gathers its supporting
    // paragraph. The terminal dot closes the thought inside the reserved gutter.
    return sketchPath(`M27 4 C27 24 8 20 8 40 C7 ${h * .45} 9 ${h * .75} 8 ${h - 14}`, 947, 1.15)
  }, [height])
  return <svg ref={ref} className={styles.focusRail} data-insight-focus-rail=""
    aria-hidden="true" focusable="false" viewBox={`0 0 32 ${Math.max(64, height)}`}
    width="32" height="256" preserveAspectRatio="none" fill="none">
    <path d={path} stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    <circle cx="8" cy={Math.max(64, height) - 5} r="2.8" fill="currentColor" />
  </svg>
}
