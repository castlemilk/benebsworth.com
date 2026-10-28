'use client'

import { useEffect, useId, useRef, useState, type ReactNode, type SyntheticEvent, type KeyboardEvent } from 'react'
import { GammaButton } from '@/components/gamma/GammaButton'
import { sketchPath } from './annotation-geometry'
import styles from './interactive-study.module.css'

type Drawing = { path: string; x: number; y: number; width: number; height: number }

/** A shared reading frame and optional, dismissible first-interaction guide. */
export function InteractiveStudy({ title, hint, targetSelector = '[data-study-target]', ready = true, children, controls, className = '' }: {
  title: string
  hint?: string
  targetSelector?: string
  ready?: boolean
  children: ReactNode
  controls?: ReactNode
  className?: string
}) {
  const root = useRef<HTMLDivElement>(null)
  const note = useRef<HTMLParagraphElement>(null)
  const guideId = useId()
  const automaticUsed = useRef(false)
  const [shown, setShown] = useState(false)
  const [hasTarget, setHasTarget] = useState(false)
  const [drawing, setDrawing] = useState<Drawing | null>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    let alive = true
    let target: HTMLElement | null = null
    let inView = false
    let noteInView = false
    let frame = 0
    const own = (node: Element) => node.closest('[data-interactive-study]') === el
    const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === target) inView = entry.isIntersecting && entry.intersectionRatio >= .15
        if (entry.target === note.current) noteInView = entry.isIntersecting && entry.intersectionRatio >= .75
      }
      measure()
    }, { threshold: [.15, .75] })
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    resize?.observe(el)
    if (note.current) resize?.observe(note.current)

    function measure() {
      if (!alive) return
      const nextTarget = [...el!.querySelectorAll<HTMLElement>(targetSelector)].find(own) ?? null
      if (target !== nextTarget) {
        if (target) { intersection?.unobserve(target); resize?.unobserve(target) }
        target = nextTarget
        inView = false
        if (target) { intersection?.observe(target); resize?.observe(target) }
      }
      const box = el!.getBoundingClientRect()
      const t = target?.getBoundingClientRect()
      const n = note.current?.getBoundingClientRect()
      const usable = !!(ready && hint && target && t && t.width > 0 && t.height > 0 &&
        getComputedStyle(target).visibility !== 'hidden' && !target.closest('[hidden], [inert], [aria-disabled="true"]') &&
        !target.matches(':disabled, [readonly]'))
      setHasTarget(usable)
      if (usable && inView && noteInView && !automaticUsed.current) {
        automaticUsed.current = true
        setShown(true)
      }
      let next: Drawing | null = null
      if (usable && t && n && box.width > 0 && box.height > 0 && n.width > 0 && n.height > 0) {
        // Both ends sit outside the content column. The entire curve is kept
        // in the reserved left gutter, never over plot, prose or control text.
        const sx = n.left - box.left - 7, sy = n.top - box.top + n.height / 2
        const ex = t.left - box.left - 7, ey = t.top - box.top + t.height / 2
        let emptyPadding = 0
        for (let parent = target!.parentElement; parent && parent !== el; parent = parent.parentElement) {
          emptyPadding += parseFloat(getComputedStyle(parent).paddingLeft) || 0
        }
        // A padded SVG/canvas can be inset from the column. Only cross that
        // measured empty padding; do not guess across arbitrary grid/margin gaps.
        const inset = ex - sx
        if (sx >= 12 && ex >= 12 && inset >= -12 && inset <= emptyPadding + 12 && Math.abs(ey - sy) >= 18) {
          const bend = Math.max(5, Math.min(sx, ex) - 18)
          const direction = ey > sy ? 1 : -1
          const end = `${ex} ${ey}`
          const path = sketchPath(`M${sx} ${sy} C${bend} ${sy + direction * 16} ${bend} ${ey - direction * 16} ${end} M${ex - 6} ${ey - direction * 7} L${end} L${ex - 8} ${ey + direction * 3}`, 619, .8)
          next = { path, x: ex, y: ey, width: box.width, height: box.height }
        }
      }
      setDrawing(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next)
    }
    function schedule() {
      if (!alive) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    const layoutAttributes = new Set(['class', 'style', 'hidden', 'inert', 'disabled', 'aria-disabled'])
    const containsTarget = (node: Node) => node instanceof Element &&
      (node.matches(targetSelector) || !!node.querySelector(targetSelector))
    const mutations = new MutationObserver(records => {
      if (records.some(record => {
        const node = record.target instanceof Element ? record.target : record.target.parentElement
        if (!node || node.closest('[data-study-guide-ui]')) return false
        if (record.type === 'childList') return [...record.addedNodes, ...record.removedNodes].some(containsTarget)
        // Do not measure animated plot paths, bars or text. Only target/ancestor
        // layout/availability or a changed target marker can affect the cue.
        if (node === target && !node.matches(targetSelector)) return true
        if (node !== target && node.matches(targetSelector) && own(node)) return true
        return layoutAttributes.has(record.attributeName ?? '') && !!target && (node === target || node.contains(target))
      })) schedule()
    })
    mutations.observe(el, { childList: true, subtree: true, attributes: true })
    window.addEventListener('resize', schedule)
    document.fonts?.ready.then(schedule)
    measure()
    // The reserved hint region must be readable too: tall frames can expose
    // their target long before the note reaches the viewport.
    if (note.current) intersection?.observe(note.current)
    return () => {
      alive = false
      cancelAnimationFrame(frame)
      intersection?.disconnect(); resize?.disconnect(); mutations.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [ready, hint, targetSelector])

  function dismiss(event: SyntheticEvent) {
    const node = event.target instanceof Element ? event.target : null
    if (!node || node.closest('[data-interactive-study]') !== root.current || node.closest('[data-study-guide-ui]')) return
    const action = node.closest('input, select, textarea, button, [data-study-action]')
    if (!action || action.closest('[data-interactive-study]') !== root.current ||
      action.matches(':disabled, [readonly]') || action.closest('[inert], [hidden], [aria-disabled="true"]')) return
    automaticUsed.current = true
    setShown(false)
  }
  function keyDown(event: KeyboardEvent) {
    const node = event.target instanceof Element ? event.target : null
    if (!node) return
    const valueControl = node.matches('input[type="range"], input[type="number"], select')
    const activatable = node.closest('button, select, input[type="checkbox"], input[type="radio"], [data-study-action]')
    if ((activatable && (event.key === 'Enter' || event.key === ' ')) || (valueControl && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key))) dismiss(event)
  }
  function toggleGuide() {
    automaticUsed.current = true
    setShown(!open)
    if (!open && note.current) {
      const box = note.current.getBoundingClientRect()
      if (box.top < 0 || box.bottom > window.innerHeight) {
        note.current.scrollIntoView?.({ block: 'center', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      }
    }
  }
  const open = shown && ready && hasTarget && !!hint
  return (
    <div ref={root} className={`not-prose ${styles.study} ${className}`} data-interactive-study
      onInputCapture={dismiss} onChangeCapture={dismiss} onClickCapture={dismiss} onPointerDownCapture={event => { if (event.button === 0) dismiss(event) }} onKeyDownCapture={keyDown}>
      <div className={styles.header}>
        <div className={styles.heading}><span className={styles.title}>{title}</span><span className={styles.kicker}>Interactive study</span></div>
        {hint && <div data-study-guide-ui><GammaButton type="button" variant="quiet" size="sm" aria-expanded={open} aria-controls={guideId}
          disabled={!ready || !hasTarget} onClick={toggleGuide}>
          {open ? 'Hide guide' : 'Show guide'}
        </GammaButton></div>}
      </div>
      <div className={styles.content}>{children}</div>
      {hint && <div className={styles.guideSlot} data-study-guide-ui>
        <p ref={note} id={guideId} className={styles.hint} data-open={open} aria-hidden={!open}>{hint}</p>
      </div>}
      {controls && <div className={styles.controls}>{controls}</div>}
      <div data-study-guide-ui className={styles.overlay} aria-hidden="true">
        {open && drawing && <svg focusable="false" viewBox={`0 0 ${drawing.width} ${drawing.height}`} preserveAspectRatio="none">
          <path d={drawing.path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={drawing.x} cy={drawing.y} r="3" fill="currentColor" />
        </svg>}
      </div>
    </div>
  )
}
