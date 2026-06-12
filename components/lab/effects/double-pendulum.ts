import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'pendulums', label: 'Pendulums', type: 'range', min: 1, max: 3, step: 1 },
  { key: 'length', label: 'Length', type: 'range', min: 0.2, max: 0.9, step: 0.05 },
  { key: 'gravity', label: 'Gravity', type: 'range', min: 0.5, max: 3, step: 0.1 },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.5, max: 3, step: 0.1 },
  { key: 'trail', label: 'Trail', type: 'range', min: 0.02, max: 0.3, step: 0.01 },
  { key: 'color', label: 'Color', type: 'color' },
]

export const defaults: Params = {
  pendulums: 3,
  length: 0.5,
  gravity: 1.5,
  speed: 1,
  trail: 0.08,
  color: '#ff5c8a',
}

// Max pendulums preallocated
const MAX_P = 3
const SUBSTEPS = 4
const DT = 0.016 / SUBSTEPS // ~16ms frame split into substeps

// Preallocate state arrays (theta1, theta2, omega1, omega2 per pendulum)
const th1 = new Float64Array(MAX_P)
const th2 = new Float64Array(MAX_P)
const om1 = new Float64Array(MAX_P)
const om2 = new Float64Array(MAX_P)
const mass1 = 1.0
const mass2 = 1.0

function initPendulum(i: number) {
  // Slightly different initial conditions to show chaos divergence
  const offset = i * 0.001
  th1[i] = Math.PI / 2 + offset
  th2[i] = Math.PI / 2 + offset
  om1[i] = 0
  om2[i] = 0
}

// Initialize all on module load
for (let i = 0; i < MAX_P; i++) initPendulum(i)

// Double pendulum equations of motion (angular accelerations)
// Uses standard Lagrangian-derived formulas
function computeAlpha1(
  t1: number, t2: number, w1: number, w2: number,
  G: number, L: number
): number {
  const dt = t1 - t2
  const sinDt = Math.sin(dt)
  const cosDt = Math.cos(dt)
  const den = 2 * mass1 + mass2 - mass2 * Math.cos(2 * dt)
  const num =
    -G * (2 * mass1 + mass2) * Math.sin(t1)
    - mass2 * G * Math.sin(t1 - 2 * t2)
    - 2 * sinDt * mass2 * (w2 * w2 * L + w1 * w1 * L * cosDt)
  return num / (L * den)
}

function computeAlpha2(
  t1: number, t2: number, w1: number, w2: number,
  G: number, L: number
): number {
  const dt = t1 - t2
  const sinDt = Math.sin(dt)
  const cosDt = Math.cos(dt)
  const den = 2 * mass1 + mass2 - mass2 * Math.cos(2 * dt)
  const num =
    2 * sinDt * (
      w1 * w1 * L * (mass1 + mass2)
      + G * (mass1 + mass2) * Math.cos(t1)
      + w2 * w2 * L * mass2 * cosDt
    )
  return num / (L * den)
}

// Preallocate tip positions for ring buffer trail
const TRAIL_LEN = 256
const trailX = new Float64Array(MAX_P * TRAIL_LEN) // flat: pendulum * TRAIL_LEN + idx
const trailY = new Float64Array(MAX_P * TRAIL_LEN)
const trailHead = new Int32Array(MAX_P) // ring buffer head index
let trailFrame = 0

// Helper to shift hue from a hex color
function shiftHue(hex: string, pendulumIndex: number): string {
  // Parse hex
  let r = parseInt(hex.slice(1, 3), 16) / 255
  let g = parseInt(hex.slice(3, 5), 16) / 255
  let b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  // Shift hue by ~30deg per pendulum
  h = (h + pendulumIndex * 0.083) % 1
  // HSL to RGB
  function hue2rgb(p: number, q: number, t: number) {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  if (s === 0) { r = g = b = l } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export const doublePendulum: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    // Reset trails on creation
    trailHead.fill(0)
    trailX.fill(0)
    trailY.fill(0)
    trailFrame = 0
    for (let i = 0; i < MAX_P; i++) initPendulum(i)

    return {
      step(t, p) {
        const { w, h } = dims
        const cx = w / 2
        const cy = h * 0.25 // anchor in upper quarter
        const armLen = h * (p.length as number) * 0.45 // arm length in px
        const G = (p.gravity as number) * 9.81
        const L = armLen
        const spd = p.speed as number
        const n = p.pendulums as number

        // Translucent clear for trail effect
        ctx.save()
        ctx.globalAlpha = p.trail as number
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)
        ctx.restore()

        // Physics substeps
        const dt = DT * spd
        for (let i = 0; i < n; i++) {
          for (let s = 0; s < SUBSTEPS; s++) {
            // Euler integration (symplectic / semi-implicit for stability)
            const a1 = computeAlpha1(th1[i], th2[i], om1[i], om2[i], G, L)
            const a2 = computeAlpha2(th1[i], th2[i], om1[i], om2[i], G, L)
            om1[i] += a1 * dt
            om2[i] += a2 * dt
            th1[i] += om1[i] * dt
            th2[i] += om2[i] * dt
          }

          // Divergence check
          if (
            Math.abs(th1[i]) > 100 || Math.abs(th2[i]) > 100 ||
            !isFinite(th1[i]) || !isFinite(th2[i])
          ) {
            initPendulum(i)
          }

          // Compute positions
          const jx = cx + L * Math.sin(th1[i])
          const jy = cy + L * Math.cos(th1[i])
          const tx = jx + L * Math.sin(th2[i])
          const ty = jy + L * Math.cos(th2[i])

          // Store trail point (ring buffer)
          const base = i * TRAIL_LEN
          const head = trailHead[i]
          trailX[base + head] = tx
          trailY[base + head] = ty
          trailHead[i] = (head + 1) % TRAIL_LEN
        }

        // Record frame for trail thinning
        trailFrame++

        // Draw trails, arms, and bobs
        for (let i = 0; i < n; i++) {
          const base = i * TRAIL_LEN
          const head = trailHead[i]
          const col = n === 1 ? (p.color as string) : shiftHue(p.color as string, i)

          // Draw trail from ring buffer
          ctx.save()
          ctx.strokeStyle = col
          ctx.lineWidth = 1.5
          ctx.shadowColor = col
          ctx.shadowBlur = 6
          ctx.globalAlpha = 0.6
          ctx.beginPath()
          let started = false
          // Read oldest to newest
          const len = Math.min(trailFrame, TRAIL_LEN)
          for (let j = 0; j < len; j++) {
            const idx = (head + j) % TRAIL_LEN
            const px = trailX[base + idx]
            const py = trailY[base + idx]
            if (!started) { ctx.moveTo(px, py); started = true }
            else ctx.lineTo(px, py)
          }
          ctx.stroke()
          ctx.restore()

          // Compute current positions for arms + bobs
          const jx = cx + L * Math.sin(th1[i])
          const jy = cy + L * Math.cos(th1[i])
          const tipX = jx + L * Math.sin(th2[i])
          const tipY = jy + L * Math.cos(th2[i])

          // Draw arms with glow
          ctx.save()
          ctx.strokeStyle = theme.fg
          ctx.lineWidth = 1.5
          ctx.shadowColor = theme.fg
          ctx.shadowBlur = 4
          ctx.globalAlpha = 0.7
          // Arm 1: anchor -> joint
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(jx, jy)
          ctx.stroke()
          // Arm 2: joint -> tip
          ctx.beginPath()
          ctx.moveTo(jx, jy)
          ctx.lineTo(tipX, tipY)
          ctx.stroke()
          ctx.restore()

          // Draw joint bob
          const bobR = Math.max(2, Math.min(w, h) * 0.008)
          ctx.save()
          ctx.fillStyle = theme.fg
          ctx.shadowColor = theme.fg
          ctx.shadowBlur = 6
          ctx.globalAlpha = 0.8
          ctx.beginPath()
          ctx.arc(jx, jy, bobR, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()

          // Draw tip bob with accent glow
          const tipR = Math.max(3, Math.min(w, h) * 0.012)
          ctx.save()
          ctx.fillStyle = col
          ctx.shadowColor = col
          ctx.shadowBlur = 14
          ctx.beginPath()
          ctx.arc(tipX, tipY, tipR, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        // Draw anchor point
        ctx.save()
        ctx.fillStyle = theme.fg
        ctx.shadowColor = theme.fg
        ctx.shadowBlur = 4
        ctx.beginPath()
        ctx.arc(cx, cy, Math.max(2, Math.min(w, h) * 0.006), 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      },
    }
  },
}
