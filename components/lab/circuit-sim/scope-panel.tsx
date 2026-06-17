'use client'

import type { DrawColors } from '@/lib/lab/circuit-sim/draw'

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
