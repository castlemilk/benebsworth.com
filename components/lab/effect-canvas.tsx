'use client'
import { Fragment, useEffect, useId, useRef, useState } from 'react'
import { inspectionPosition } from './inspection-position'
import styles from './inspection.module.css'
import { useScrollActivity } from '@/components/mdx/use-scroll-activity'
import type { EffectModule, Params, Dims, EffectTheme, Renderer } from '@/lib/lab/types'

type Props = {
  effect: EffectModule
  params: Params
  quality?: 'full' | 'mini'
  className?: string
  ariaLabel?: string
}

/** Read the live themed stage palette from CSS vars; dark fallback for SSR. */
function resolveTheme(element?: Element): EffectTheme {
  if (typeof window === 'undefined') return { bg: '#0c0c10', fg: '#ececf0' }
  const s = getComputedStyle(element ?? document.documentElement)
  const bg = s.getPropertyValue('--stage').trim() || '#0c0c10'
  const fg = s.getPropertyValue('--fg').trim() || '#ececf0'
  return { bg, fg }
}

export function EffectCanvas({ effect, params, quality = 'full', className, ariaLabel }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tooltipId = useId()
  const [probe, setProbe] = useState<{x:number;y:number;w:number;h:number;t:number;clipX:number;clipY:number;visibleW:number;visibleH:number}|null>(null)
  const probeRef = useRef(probe)
  probeRef.current = probe
  const frameRef = useRef(0)
  const inspectable = quality === 'full' && Boolean(effect.inspect)
  function inspectAt(x:number,y:number) {
    const r=wrapRef.current?.getBoundingClientRect()
    if (!r || r.width<32 || r.height<32) return
    const clipX=Math.max(0,-(r.left || 0)), clipY=Math.max(0,-(r.top || 0))
    const visibleW=Math.min(r.width,window.innerWidth-(r.left || 0))-clipX
    const visibleH=Math.min(r.height,window.innerHeight-(r.top || 0))-clipY
    if(visibleW<120 || visibleH<150) {setProbe(null);return}
    setProbe({x:Math.max(0,Math.min(r.width,x)),y:Math.max(0,Math.min(r.height,y)),w:r.width,h:r.height,t:probeRef.current?.t ?? frameRef.current,clipX,clipY,visibleW,visibleH})
  }
  useEffect(() => {
    if (!probe) return
    const outside=(event:PointerEvent) => { if (!wrapRef.current?.contains(event.target as Node)) setProbe(null) }
    const dismiss=() => setProbe(null)
    document.addEventListener('pointerdown',outside)
    window.addEventListener('resize',dismiss)
    window.addEventListener('scroll',dismiss,true)
    return () => { document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',dismiss);window.removeEventListener('scroll',dismiss,true) }
  },[probe])
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
    let renderer: Renderer | undefined
    let drawable = false
    let themeChanged = false
    let raf = 0
    let last = -Infinity
    let visible = true
    let onscreen = false // IntersectionObserver drives the first start → off-screen canvases run zero frames

    function size() {
      const r = wrap!.getBoundingClientRect()
      const w = Math.round(r.width), h = Math.round(r.height)
      drawable = Number.isFinite(w) && Number.isFinite(h) && w > 1 && h > 1
      if (!drawable) {
        // Hidden/transient layout sizes are not render targets. Keep the last
        // valid bitmap and renderer so a brief collapse cannot blank the figure.
        stop()
        return
      }
      if (!renderer || w !== dims.w || h !== dims.h || themeChanged) {
        canvas!.width = w * dpr; canvas!.height = h * dpr
        canvas!.style.width = `${w}px`; canvas!.style.height = `${h}px`
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
        dims = { w, h, dpr }
        renderer?.destroy?.()
        renderer = effect.createRenderer(ctx!, dims, resolveTheme(wrap!))
        themeChanged = false
        last = -Infinity
        if (reduce) renderer.step(0, paramsRef.current)
      }
      start()
    }

    function loop(t: number) {
      raf = 0
      if (!drawable || !renderer) return
      raf = requestAnimationFrame(loop)
      // Allow the first visible frame even during scrolling; subsequent frames
      // still honour the existing scroll-pause policy.
      if (scrollingRef.current && last !== -Infinity) return
      if (minFrameMs && t - last < minFrameMs) return
      last = t
      const frame = probeRef.current?.t ?? t
      frameRef.current = frame
      renderer.step(frame, paramsRef.current)
    }
    function start() { if (!raf && !reduce && visible && onscreen && drawable && renderer) raf = requestAnimationFrame(loop) }
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
      themeChanged = true
      size() // Repaint only when measured dimensions are usable.
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    // Motion: the IntersectionObserver callback fires the first start() once on-screen.
    // Reduced motion: size() already painted the single static frame; no loop.

    return () => {
      stop(); ro.disconnect(); io.disconnect(); themeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      renderer?.destroy?.()
    }
    // effect identity + quality are the only structural deps; params are live via ref
  }, [effect, quality])

  return (
    <div ref={wrapRef} className={`${className ?? ''} ${inspectable ? styles.inspectable : ''}`} role={inspectable ? 'group' : 'img'} aria-label={inspectable ? `${ariaLabel}. Inspect with arrow keys; Escape dismisses.` : ariaLabel}
      tabIndex={inspectable ? 0 : undefined} aria-describedby={probe ? tooltipId : undefined}
      onPointerMove={inspectable ? e => { if(e.pointerType !== 'touch') { const r=e.currentTarget.getBoundingClientRect(); inspectAt(e.clientX-r.left,e.clientY-r.top) } } : undefined}
      onPointerDown={inspectable ? e => { const r=e.currentTarget.getBoundingClientRect(); inspectAt(e.clientX-r.left,e.clientY-r.top) } : undefined}
      onPointerLeave={inspectable ? e => { if(e.pointerType !== 'touch') setProbe(null) } : undefined}
      onFocus={inspectable ? e => { const r=e.currentTarget.getBoundingClientRect(); inspectAt(r.width/2,r.height/2) } : undefined}
      onBlur={() => setProbe(null)}
      onKeyDown={inspectable ? e => {
        if(e.key==='Escape') {setProbe(null);return}
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return
        e.preventDefault()
        const r=e.currentTarget.getBoundingClientRect(), x=probe?.x ?? r.width/2
        inspectAt(e.key==='Home'?0:e.key==='End'?r.width:x+(e.key==='ArrowRight'?1:-1)*r.width/100,r.height/2)
      } : undefined}>

      <canvas ref={canvasRef} className="block h-full w-full" />
      {probe && effect.inspect && <>
        <span className={styles.crosshair} style={{left:`${probe.x/probe.w*100}%`}} aria-hidden="true" />
        <div id={tooltipId} role="tooltip" className={styles.readout} style={(() => { const position=inspectionPosition(probe.x-probe.clipX,probe.y-probe.clipY,probe.visibleW,probe.visibleH); return {...position,left:position.left+probe.clipX,top:position.top+probe.clipY} })()}>
          <strong>{effect.inspection?.title ?? 'Sample readout'}</strong>
          <dl>{effect.inspect(probe.x/probe.w,probe.t,params).map(row=><Fragment key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></Fragment>)}</dl>
          <small>Frame held{effect.inspection?.caption && ` · ${effect.inspection.caption}`}<br />Move to inspect · Esc to dismiss</small>
        </div>
      </>}
    </div>
  )
}
