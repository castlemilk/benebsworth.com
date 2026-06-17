'use client'
import { useEffect, useRef } from 'react'
import { useScrollActivity } from '@/components/mdx/use-scroll-activity'
import type { EffectModule, Params, Dims, EffectTheme } from '@/lib/lab/types'

type Props = {
  effect: EffectModule
  params: Params
  quality?: 'full' | 'mini'
  className?: string
  ariaLabel?: string
}

/** Read the live themed stage palette from CSS vars; dark fallback for SSR. */
function resolveTheme(): EffectTheme {
  if (typeof window === 'undefined') return { bg: '#0c0c10', fg: '#ececf0' }
  const s = getComputedStyle(document.documentElement)
  const bg = s.getPropertyValue('--stage').trim() || '#0c0c10'
  const fg = s.getPropertyValue('--fg').trim() || '#ececf0'
  return { bg, fg }
}

export function EffectCanvas({ effect, params, quality = 'full', className, ariaLabel }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // live params: step() reads the latest without recreating the renderer
  const paramsRef = useRef(params)
  paramsRef.current = params
  // scroll-aware: skip render frames while user is actively scrolling so the
  // browser can dedicate the frame budget to scroll + repaint. Synced via ref
  // so the rAF loop reads the latest value without re-renders.
  const scrolling = useScrollActivity(200)
  const scrollingRef = useRef(false)
  scrollingRef.current = scrolling

  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = quality === 'mini' ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    const minFrameMs = quality === 'mini' ? 1000 / 30 : 0

    let dims: Dims = { w: 0, h: 0, dpr }
    let renderer = effect.createRenderer(ctx, dims, resolveTheme())
    let raf = 0
    let last = -Infinity
    let visible = true
    let onscreen = false // IntersectionObserver drives the first start → off-screen canvases run zero frames

    function size() {
      const r = wrap!.getBoundingClientRect()
      const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height))
      if (w === dims.w && h === dims.h) return
      canvas!.width = w * dpr; canvas!.height = h * dpr
      canvas!.style.width = `${w}px`; canvas!.style.height = `${h}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      dims = { w, h, dpr }
      renderer.destroy?.()
      renderer = effect.createRenderer(ctx!, dims, resolveTheme())
      if (reduce) renderer.step(0, paramsRef.current) // static frame after resize
    }

    function loop(t: number) {
      raf = requestAnimationFrame(loop)
      if (scrollingRef.current) return
      if (minFrameMs && t - last < minFrameMs) return
      last = t
      renderer.step(t, paramsRef.current)
    }
    function start() { if (!raf && !reduce && visible && onscreen) raf = requestAnimationFrame(loop) }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0 } }

    const ro = new ResizeObserver(size); ro.observe(wrap)
    size()

    const io = new IntersectionObserver(
      ([e]) => { onscreen = e.isIntersecting; if (onscreen) start(); else stop() },
      { threshold: 0 },
    )
    io.observe(wrap)
    const onVis = () => { visible = !document.hidden; if (visible) start(); else stop() }
    document.addEventListener('visibilitychange', onVis)

    // Recreate the renderer with the new palette when the theme class flips.
    const themeObserver = new MutationObserver(() => {
      renderer.destroy?.()
      renderer = effect.createRenderer(ctx!, dims, resolveTheme())
      if (reduce) renderer.step(0, paramsRef.current) // static repaint under reduced motion
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    // Motion: the IntersectionObserver callback fires the first start() once on-screen.
    // Reduced motion: size() already painted the single static frame; no loop.

    return () => {
      stop(); ro.disconnect(); io.disconnect(); themeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      renderer.destroy?.()
    }
    // effect identity + quality are the only structural deps; params are live via ref
  }, [effect, quality])

  return (
    <div ref={wrapRef} className={className} role="img" aria-label={ariaLabel}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
