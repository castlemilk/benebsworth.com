'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { connectorPath, type Rect } from './annotation-geometry'

type Drawing = { path: string; width: number; height: number }

/** Keep each pen gesture attached to its own figure as content and layout change. */
export function AnnotationLayout({ children, placement = 'margin', className = '' }: {
  children: ReactNode
  placement?: 'margin' | 'above' | 'below'
  className?: string
}) {
  const root = useRef<HTMLDivElement>(null)
  const [drawing, setDrawing] = useState<Drawing | null>(null)
  useEffect(() => {
    const el = root.current
    if (!el) return
    let alive = true
    let frame = 0
    const observed = new Set<Element>()
    const measure = () => {
      if (!alive) return
      // Resolve current children, not detached nodes captured on first mount.
      const target = el.querySelector<HTMLElement>(':scope > [data-annotation-target]')
      const note = el.querySelector<HTMLElement>(':scope > [data-annotation-note]')
      const current = new Set<Element>([el, ...[target, note].filter((n): n is HTMLElement => !!n)])
      for (const node of observed) if (!current.has(node)) { observer?.unobserve(node); observed.delete(node) }
      for (const node of current) if (!observed.has(node)) { observer?.observe(node); observed.add(node) }
      const box = el.getBoundingClientRect()
      const relative = (node: Element): Rect => {
        const r = node.getBoundingClientRect()
        return { x: r.left - box.left, y: r.top - box.top, width: r.width, height: r.height }
      }
      const anchor = target?.querySelector('[data-annotation-anchor]')
      const path = target && note && note.dataset.annotationMark !== 'none'
        ? connectorPath(relative(target), relative(note), anchor ? relative(anchor) : undefined,
          note.dataset.annotationMark === 'bracket' ? 'bracket' : 'arrow')
        : null
      const next = box.width > 200 && box.height > 0 && path ? { path, width: box.width, height: box.height } : null
      setDrawing(old => JSON.stringify(old) === JSON.stringify(next) ? old : next)
    }
    const schedule = () => {
      if (!alive) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null
    // Watch both note and target, but never react to our own SVG drawing updates.
    const mutations = new MutationObserver(records => {
      if (records.some(record => {
        const node = record.target instanceof Element ? record.target : record.target.parentElement
        if (node?.closest('.annotation-connector-layer')) return false
        if (record.type === 'childList' && record.target === el) {
          return [...record.addedNodes, ...record.removedNodes].some(child =>
            !(child instanceof Element && child.classList.contains('annotation-connector-layer')))
        }
        return true
      })) schedule()
    })
    mutations.observe(el, { attributes: true, childList: true, subtree: true, characterData: true })
    window.addEventListener('resize', schedule)
    document.fonts?.ready.then(schedule)
    schedule()
    return () => {
      alive = false
      cancelAnimationFrame(frame)
      observer?.disconnect()
      mutations.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [])
  return <div ref={root} className={`annotation-layout annotation-layout-${placement} ${className}`}>
    {children}
    {drawing && <svg className="annotation-connector-layer" aria-hidden="true" focusable="false"
      viewBox={`0 0 ${drawing.width} ${drawing.height}`} preserveAspectRatio="none">
      <path d={drawing.path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
        strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>}
  </div>
}
