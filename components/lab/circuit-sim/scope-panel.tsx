'use client'

import type { ScopeTrace } from '@/lib/lab/circuit-sim/types'
import type { DrawColors } from '@/lib/lab/circuit-sim/draw'

export interface ScopeRect {
  x: number
  y: number
  w: number
  h: number
}

export function drawScopeGraticule(
  ctx: CanvasRenderingContext2D,
  rect: ScopeRect,
  colors: DrawColors,
) {
  const { x, y, w, h } = rect

  ctx.fillStyle = colors.scopeBg
  ctx.fillRect(x, y, w, h)

  ctx.strokeStyle = colors.scopeGrid
  ctx.lineWidth = 0.5
  const divsH = 10, divsV = 8
  for (let i = 0; i <= divsH; i++) {
    const px = x + (w / divsH) * i
    ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + h); ctx.stroke()
  }
  for (let i = 0; i <= divsV; i++) {
    const py = y + (h / divsV) * i
    ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + w, py); ctx.stroke()
  }

  ctx.strokeStyle = colors.scopeGridMajor
  ctx.lineWidth = 1
  for (let i = 0; i <= divsH; i += 2) {
    const px = x + (w / divsH) * i
    ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + h); ctx.stroke()
  }
  for (let i = 0; i <= divsV; i += 2) {
    const py = y + (h / divsV) * i
    ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + w, py); ctx.stroke()
  }

  ctx.strokeStyle = colors.scopeText
  ctx.globalAlpha = 0.3
  ctx.lineWidth = 0.5
  ctx.setLineDash([3, 5])
  const cx = x + w / 2, cy = y + h / 2
  ctx.beginPath()
  ctx.moveTo(x, cy); ctx.lineTo(x + w, cy)
  ctx.moveTo(cx, y); ctx.lineTo(cx, y + h)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 1

  ctx.strokeStyle = colors.scopeGridMajor
  ctx.lineWidth = 1.5
  ctx.strokeRect(x, y, w, h)
}

export function drawScopeTraces(
  ctx: CanvasRenderingContext2D,
  trace: ScopeTrace,
  rect: ScopeRect,
  _colors: DrawColors,
) {
  if (trace.count < 2) return
  const { x, y, w, h } = rect
  const maxSamples = trace.samples.length

  let vMin = Infinity, vMax = -Infinity
  const startIdx = trace.count < maxSamples ? 0 : trace.writeIdx
  const count = Math.min(trace.count, maxSamples)
  for (let i = 0; i < count; i++) {
    const idx = (startIdx + i) % maxSamples
    const v = trace.samples[idx]
    if (v < vMin) vMin = v
    if (v > vMax) vMax = v
  }
  if (!isFinite(vMin) || !isFinite(vMax)) { vMin = -5; vMax = 5 }
  const vRange = vMax - vMin || 1
  const vPad = vRange * 0.15
  const vLo = vMin - vPad
  const vHi = vMax + vPad

  function vToY(volts: number) {
    return y + h - ((volts - vLo) / (vHi - vLo)) * h
  }

  // Glow underlay
  ctx.save()
  ctx.strokeStyle = trace.color
  ctx.globalAlpha = 0.15
  ctx.lineWidth = 6
  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const idx = (startIdx + i) % maxSamples
    const px = x + (w / (count - 1)) * i
    const py = vToY(trace.samples[idx])
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.restore()

  // Main trace
  ctx.save()
  ctx.strokeStyle = trace.color
  ctx.lineWidth = 1.5
  ctx.lineJoin = 'round'
  ctx.shadowColor = trace.color
  ctx.shadowBlur = 4
  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const idx = (startIdx + i) % maxSamples
    const px = x + (w / (count - 1)) * i
    const py = vToY(trace.samples[idx])
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.restore()

  // Latest voltage readout
  const lastV = trace.samples[(trace.writeIdx - 1 + maxSamples) % maxSamples]
  if (isFinite(lastV)) {
    const lastX = x + w - 40
    const lastY = vToY(lastV)
    ctx.fillStyle = trace.color
    ctx.font = 'bold 9px monospace'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText(`${lastV.toFixed(2)}V`, lastX + 30, lastY - 4)
  }
}

/**
 * Draw animated current-flow particles along a wire path.
 * `particles` is an array of t values (0..1) representing each particle's
 * position along the wire path. The path is defined by the series of
 * waypoints + the endpoint.
 */
export function drawFlowParticles(
  ctx: CanvasRenderingContext2D,
  fromX: number, fromY: number,
  toX: number, toY: number,
  waypoints: { x: number; y: number }[],
  particles: number[],
  currentMa: number,
  colors: DrawColors,
  timeSec: number,
) {
  if (particles.length === 0) return

  // Build full path
  const path: { x: number; y: number }[] = [{ x: fromX, y: fromY }]
  for (const wp of waypoints) path.push(wp)
  path.push({ x: toX, y: toY })

  // Compute segment lengths
  const segLengths: number[] = []
  let totalLen = 0
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x
    const dy = path[i].y - path[i - 1].y
    const len = Math.sqrt(dx * dx + dy * dy)
    segLengths.push(len)
    totalLen += len
  }
  if (totalLen < 1) return

    // Determine brightness from current (more visible at low currents)
    const absMa = Math.abs(currentMa)
    const maxBright = Math.min(1, absMa / 3) // saturate at 3mA instead of 10mA
    const baseAlpha = 0.25 + maxBright * 0.65

  // Direction: +1 = conventional (positive to negative), -1 = electron
  const dir = currentMa >= 0 ? 1 : -1

  for (const tRaw of particles) {
    const t = ((tRaw % 1) + 1) % 1 // normalize 0..1
    const dist = t * totalLen
    let accum = 0
    let px = path[0].x, py = path[0].y
    for (let i = 0; i < segLengths.length; i++) {
      if (accum + segLengths[i] >= dist) {
        const frac = (dist - accum) / segLengths[i]
        px = path[i].x + (path[i + 1].x - path[i].x) * frac
        py = path[i].y + (path[i + 1].y - path[i].y) * frac
        break
      }
      accum += segLengths[i]
    }

    // Pulsing brightness
    const pulse = 0.5 + 0.5 * Math.sin(tRaw * 20 + timeSec * 8)
    const alpha = baseAlpha * (0.5 + 0.5 * pulse)

    // Current direction color: warm (positive) / cool (negative)
    const r = currentMa >= 0 ? 255 : 100
    const g = currentMa >= 0 ? 180 : 180
    const b = currentMa >= 0 ? 60 : 255
    const a = alpha

    // Larger, more visible particles
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
    ctx.beginPath()
    ctx.arc(px, py, 4, 0, Math.PI * 2)
    ctx.fill()

    // Bright center (white hot-spot)
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.8})`
    ctx.beginPath()
    ctx.arc(px, py, 1.8, 0, Math.PI * 2)
    ctx.fill()
  }
}
