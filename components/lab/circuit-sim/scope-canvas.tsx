'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { ScopeTrace } from '@/lib/lab/circuit-sim/types'
import { DARK_COLORS } from '@/lib/lab/circuit-sim/draw'
import { drawScopeGraticule, drawScopeTraces } from './scope-panel'

interface Props {
  traces: ScopeTrace[]
  simTime: number
}

export function ScopeCanvas({ traces, simTime }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const w = rect.width, h = rect.height
    if (w < 10 || h < 10) return

    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }

    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const colors = DARK_COLORS

    ctx.fillStyle = colors.scopeBg
    ctx.fillRect(0, 0, w, h)

    if (traces.length === 0) {
      ctx.fillStyle = colors.scopeText
      ctx.font = '11px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Probe a node (P) to see traces here', w / 2, h / 2)
      return
    }

    const sr = { x: 40, y: 12, w: w - 80, h: h - 28 }
    drawScopeGraticule(ctx, sr, colors)

    for (const trace of traces) {
      drawScopeTraces(ctx, trace, sr, colors)
    }

    for (let i = 0; i < traces.length; i++) {
      ctx.fillStyle = traces[i].color
      ctx.textAlign = 'center'
      ctx.font = '9px monospace'
      ctx.fillText(
        `CH${i + 1} N${traces[i].nodeId}`,
        sr.x + sr.w / (traces.length + 1) * (i + 1),
        h - 6,
      )
    }

    ctx.fillStyle = colors.scopeText
    ctx.font = '9px monospace'
    ctx.textAlign = 'left'
    ctx.fillText('DSO', 8, 14)
  }, [traces, simTime])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [draw])

  return (
    <div ref={wrapRef} className="w-full h-full min-h-0 overflow-hidden rounded-b-xl bg-[#06080c]">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  )
}
