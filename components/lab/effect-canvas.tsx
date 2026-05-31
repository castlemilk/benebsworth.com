'use client'
import { useEffect, useRef } from 'react'
import type { EffectModule, Params, Dims } from '@/lib/lab/types'

type Props = {
  effect: EffectModule
  params: Params
  quality?: 'full' | 'mini'
  className?: string
  ariaLabel?: string
}

export function EffectCanvas({ effect, params, quality = 'full', className, ariaLabel }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // live params: step() reads the latest without recreating the renderer
  const paramsRef = useRef(params)
  paramsRef.current = params

  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = quality === 'mini' ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    const minFrameMs = quality === 'mini' ? 1000 / 30 : 0

    let dims: Dims = { w: 0, h: 0, dpr }
    let renderer = effect.createRenderer(ctx, dims)
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
      renderer = effect.createRenderer(ctx!, dims)
      if (reduce) renderer.step(0, paramsRef.current) // static frame after resize
    }

    function loop(t: number) {
      raf = requestAnimationFrame(loop)
      if (minFrameMs && t - last < minFrameMs) return
      last = t
      renderer.step(t, paramsRef.current)
    }
    function start() { if (!raf && !reduce && visible && onscreen) raf = requestAnimationFrame(loop) }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0 } }

    const ro = new ResizeObserver(size); ro.observe(wrap)
    size()

    const io = new IntersectionObserver(
      ([e]) => { onscreen = e.isIntersecting; onscreen ? start() : stop() },
      { threshold: 0 },
    )
    io.observe(wrap)
    const onVis = () => { visible = !document.hidden; visible ? start() : stop() }
    document.addEventListener('visibilitychange', onVis)

    // Motion: the IntersectionObserver callback fires the first start() once on-screen.
    // Reduced motion: size() already painted the single static frame; no loop.

    return () => {
      stop(); ro.disconnect(); io.disconnect()
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
