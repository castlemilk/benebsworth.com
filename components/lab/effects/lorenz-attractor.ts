import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Lorenz Attractor
 *
 * The classic chaotic 3D system discovered by Edward Lorenz in 1963
 * while modelling atmospheric convection:
 *
 *   dx/dt = σ (y − x)
 *   dy/dt = x (ρ − z) − y
 *   dz/dt = xy − β z
 *
 * Classic parameters σ = 10, β = 8/3, ρ = 28 produce the
 * iconic butterfly-shaped strange attractor — a bounded, non-periodic
 * trajectory that NEVER repeats.
 *
 * The viewpoint slowly rotates, giving a 3D sense of the attractor's
 * structure. Two near-identical trajectories diverge — showing
 * sensitivity to initial conditions (the "butterfly effect").
 */
export const controls: ControlSpec[] = [
  { key: 'points', label: 'Trajectories', type: 'range', min: 1, max: 5, step: 1 },
  { key: 'rho', label: 'ρ', type: 'range', min: 10, max: 40, step: 1 },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.2, max: 4, step: 0.1 },
  { key: 'trail', label: 'Trail', type: 'range', min: 0.02, max: 0.3, step: 0.01 },
]

export const defaults: Params = {
  points: 2,
  rho: 28,
  speed: 1,
  trail: 0.06,
}

const SIGMA = 10
const BETA = 8 / 3
// Simple 3D → 2D orthographic projection with rotation.
function project(
  x: number, y: number, z: number,
  angle: number, scale: number,
  cx: number, cy: number,
): [number, number] {
  // Rotate around Y axis for the slow spin
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)
  const rx = x * cosA - z * sinA
  const rz = x * sinA + z * cosA
  // Orthographic: drop Z, map X→screen X, Y→screen Y
  const sx = cx + rx * scale
  const sy = cy - y * scale + rz * scale * 0.07 // slight tilt
  return [sx, sy]
}

export const lorenzAttractor: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims
    const cx = w / 2
    const cy = h / 2
    const scale = Math.min(w, h) * 0.028

    type State = { x: number; y: number; z: number }
    let states: State[] = []
    let lastRho = 0
    let lastN = 0

    // Ring buffers for the trail
    const TRAIL_LEN = 4000
    let trailBufs: Array<{ x: Float64Array; y: Float64Array }> = []
    let trailHeads: Int32Array = new Int32Array(0)
    let trailFrame = 0

    function init(n: number) {
      states = []
      trailBufs = []
      trailHeads = new Int32Array(n)
      trailFrame = 0
      for (let i = 0; i < n; i++) {
        // Start near the attractor with a tiny perturbation
        const pert = i === 0 ? 0 : 0.0001 * i
        states.push({ x: 0.1 + pert, y: 0, z: 0 })
        trailBufs.push({
          x: new Float64Array(TRAIL_LEN),
          y: new Float64Array(TRAIL_LEN),
        })
      }
    }

    return {
      step(t, p) {
        const n = p.points as number
        const rho = p.rho as number
        const speed = p.speed as number
        const trailAlpha = p.trail as number

        if (n !== lastN || rho !== lastRho) {
          init(n)
          lastN = n
          lastRho = rho
        }

        // Translucent clear for trail effect
        ctx.save()
        ctx.globalAlpha = trailAlpha
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)
        ctx.restore()

        // Integrate with RK4
        const dt = 0.008 * speed
        for (let i = 0; i < n; i++) {
          const s = states[i]

          // RK4
          const dx1 = SIGMA * (s.y - s.x)
          const dy1 = s.x * (rho - s.z) - s.y
          const dz1 = s.x * s.y - BETA * s.z

          const k1x = dx1 * dt, k1y = dy1 * dt, k1z = dz1 * dt
          const dx2 = SIGMA * ((s.y + k1y / 2) - (s.x + k1x / 2))
          const dy2 = (s.x + k1x / 2) * (rho - (s.z + k1z / 2)) - (s.y + k1y / 2)
          const dz2 = (s.x + k1x / 2) * (s.y + k1y / 2) - BETA * (s.z + k1z / 2)

          const k2x = dx2 * dt, k2y = dy2 * dt, k2z = dz2 * dt
          const dx3 = SIGMA * ((s.y + k2y / 2) - (s.x + k2x / 2))
          const dy3 = (s.x + k2x / 2) * (rho - (s.z + k2z / 2)) - (s.y + k2y / 2)
          const dz3 = (s.x + k2x / 2) * (s.y + k2y / 2) - BETA * (s.z + k2z / 2)

          const k3x = dx3 * dt, k3y = dy3 * dt, k3z = dz3 * dt
          const dx4 = SIGMA * ((s.y + k3y) - (s.x + k3x))
          const dy4 = (s.x + k3x) * (rho - (s.z + k3z)) - (s.y + k3y)
          const dz4 = (s.x + k3x) * (s.y + k3y) - BETA * (s.z + k3z)

          s.x += (k1x + 2 * k2x + 2 * k3x + dx4 * dt) / 6
          s.y += (k1y + 2 * k2y + 2 * k3y + dy4 * dt) / 6
          s.z += (k1z + 2 * k2z + 2 * k3z + dz4 * dt) / 6

          // Store trail point
          const head = trailHeads[i]
          trailBufs[i].x[head] = s.x
          trailBufs[i].y[head] = s.y
          trailHeads[i] = (head + 1) % TRAIL_LEN
        }
        trailFrame++

        // Rotation angle — slow spin so the 3D structure is clear
        const angle = (t / 12000) * speed

        // Colours for trajectories — cycle through hues
        const hues = [200, 340, 120, 40, 280] // blue, pink, green, orange, purple

        // Draw all trails, then current points
        for (let i = 0; i < n; i++) {
          const hue = hues[i % hues.length]
          const buf = trailBufs[i]
          const head = trailHeads[i]
          const len = Math.min(trailFrame, TRAIL_LEN)

          // Project all stored positions into screen space and collect visible segments.
          // We only draw the LAST segment (from len-1 backwards) because the trail
          // naturally fades via the translucent clear — that's the "physics" look.
          // Instead, draw the FULL trail for the last trajectory, fading backward.
          ctx.save()
          ctx.strokeStyle = `hsla(${hue}, 75%, 60%, 0.6)`
          ctx.lineWidth = 1.2
          ctx.beginPath()
          let started = false
          let drawCount = 0
          for (let j = 0; j < len; j++) {
            const idx = (head + j) % TRAIL_LEN
            const [sx, sy] = project(buf.x[idx], buf.y[idx], 0, angle, scale, cx, cy)
            if (!started) { ctx.moveTo(sx, sy); started = true }
            else ctx.lineTo(sx, sy)
            drawCount++
            // Thin the trail for performance: skip every 4th point when drawing
            // but keep all for the curve accuracy
            if (drawCount > 3000) break // cap
          }
          ctx.stroke()
          ctx.restore()

          // Draw the current tip as a bright dot
          const [tipX, tipY] = project(states[i].x, states[i].y, 0, angle, scale, cx, cy)
          ctx.save()
          ctx.fillStyle = `hsl(${hue}, 75%, 65%)`
          ctx.shadowColor = `hsl(${hue}, 80%, 60%)`
          ctx.shadowBlur = 8
          ctx.globalAlpha = 1
          ctx.beginPath()
          ctx.arc(tipX, tipY, 2.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        // Label
        ctx.save()
        ctx.font = '11px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.4
        ctx.fillText(`Lorenz attractor — ρ = ${rho} (σ = ${SIGMA}, β = ${BETA.toFixed(1)})`, 12, h - 12)
        if (n > 1) {
          ctx.fillText(`${n} trajectories with Δx(0) = 10⁻⁴`, 12, h - 24)
        }
        ctx.restore()
      },
    }
  },
}
