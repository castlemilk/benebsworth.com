import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  {
    key: 'system',
    label: 'System',
    type: 'select',
    options: [
      { label: 'Lotka-Volterra', value: 'lotka-volterra' },
      { label: 'Van der Pol', value: 'van-der-pol' },
      { label: 'Duffing', value: 'duffing' },
    ],
  },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.1, max: 3, step: 0.1 },
  { key: 'trails', label: 'Trails', type: 'range', min: 0.02, max: 0.3, step: 0.01 },
  { key: 'color', label: 'Color', type: 'color' },
]

export const defaults: Params = {
  system: 'lotka-volterra',
  speed: 1,
  trails: 0.06,
  color: '#00e0b8',
}

// ---------------------------------------------------------------------------
// ODE systems
// Each returns [dx/dt, dy/dt] (or dy/dt includes dt/d_state for Duffing)
// State is always a Float64Array of appropriate dimension
// ---------------------------------------------------------------------------

// Lotka-Volterra: dx/dt = αx - βxy,  dy/dt = δxy - γy
// Standard ecological parameters
const LV_ALPHA = 1.1
const LV_BETA = 0.4
const LV_DELTA = 0.1
const LV_GAMMA = 0.4

function lotkaVolterra(s: Float64Array): Float64Array {
  const x = s[0], y = s[1]
  return new Float64Array([
    LV_ALPHA * x - LV_BETA * x * y,
    LV_DELTA * x * y - LV_GAMMA * y,
  ])
}

// Van der Pol: x'' - μ(1-x²)x' + x = 0
// Rewrite: x' = y, y' = μ(1-x²)y - x
const VDP_MU = 1.0

function vanDerPol(s: Float64Array): Float64Array {
  const x = s[0], y = s[1]
  return new Float64Array([
    y,
    VDP_MU * (1 - x * x) * y - x,
  ])
}

// Duffing: x'' + δx' + αx + βx³ = γcos(ωt)
// 3D system: x' = y, y' = -δy - αx - βx³ + γcos(ωθ), θ' = 1
const DUF_DELTA = 0.3
const DUF_ALPHA = -1.0
const DUF_BETA = 1.0
const DUF_GAMMA = 0.37
const DUF_OMEGA = 1.2

function duffing(s: Float64Array): Float64Array {
  const x = s[0], y = s[1], theta = s[2]
  return new Float64Array([
    y,
    -DUF_DELTA * y - DUF_ALPHA * x - DUF_BETA * x * x * x + DUF_GAMMA * Math.cos(DUF_OMEGA * theta),
    1.0,
  ])
}

// ---------------------------------------------------------------------------
// 4th-order Runge-Kutta integrator
// ---------------------------------------------------------------------------
const RK4_DT = 0.005

function rk4(
  f: (s: Float64Array) => Float64Array,
  s: Float64Array,
  dt: number,
): Float64Array {
  const k1 = f(s)
  const s2 = new Float64Array(s.length)
  for (let i = 0; i < s.length; i++) s2[i] = s[i] + 0.5 * dt * k1[i]
  const k2 = f(s2)
  const s3 = new Float64Array(s.length)
  for (let i = 0; i < s.length; i++) s3[i] = s[i] + 0.5 * dt * k2[i]
  const k3 = f(s3)
  const s4 = new Float64Array(s.length)
  for (let i = 0; i < s.length; i++) s4[i] = s[i] + dt * k3[i]
  const k4 = f(s4)
  const out = new Float64Array(s.length)
  for (let i = 0; i < s.length; i++) {
    out[i] = s[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
  }
  return out
}

// ---------------------------------------------------------------------------
// Initial conditions per system
// ---------------------------------------------------------------------------
const LV_ICS = [
  [2.0, 1.0], [1.5, 2.5], [3.0, 0.5], [0.5, 1.5], [2.5, 2.0], [4.0, 1.0], [1.0, 3.5],
]
const VDP_ICS = [
  [0.1, 0.0], [2.0, 0.0], [-2.0, 0.0], [0.0, 2.0], [0.0, -2.0], [3.0, 0.0], [-3.0, 0.0],
]
const DUF_ICS = [
  [1.0, 0.0, 0.0], [0.5, 0.5, 0.0], [-1.0, 0.0, 0.0],
  [0.0, 1.0, 0.0], [1.5, -0.5, 0.0], [-0.5, 1.0, 0.0],
]

// View bounds per system [xmin, xmax, ymin, ymax]
const LV_BOUNDS = [0, 8, 0, 6] as const
const VDP_BOUNDS = [-4, 4, -6, 6] as const
const DUF_BOUNDS = [-2.5, 2.5, -2, 2] as const

const TRAIL_LEN = 512

export const phasePortrait: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims

    // Per-trajectory state
    const maxTraj = 8
    const states: Float64Array[] = []
    const trailsX: Float64Array[] = []
    const trailsY: Float64Array[] = []
    const trailHeads = new Int32Array(maxTraj)
    let nTraj = 0
    let trailFrame = 0
    let lastSystem = ''

    function initTrajectories(system: string) {
      states.length = 0
      trailsX.length = 0
      trailsY.length = 0
      trailHeads.fill(0)
      trailFrame = 0
      let ics: number[][]
      if (system === 'lotka-volterra') ics = LV_ICS
      else if (system === 'van-der-pol') ics = VDP_ICS
      else ics = DUF_ICS
      nTraj = ics.length
      for (let i = 0; i < nTraj; i++) {
        if (system === 'duffing') {
          states.push(new Float64Array([ics[i][0], ics[i][1], ics[i][2] ?? 0]))
        } else {
          states.push(new Float64Array([ics[i][0], ics[i][1]]))
        }
        trailsX.push(new Float64Array(TRAIL_LEN))
        trailsY.push(new Float64Array(TRAIL_LEN))
      }
    }

    function getDynFn(system: string) {
      if (system === 'lotka-volterra') return lotkaVolterra
      if (system === 'van-der-pol') return vanDerPol
      return duffing
    }

    function getBounds(system: string): readonly [number, number, number, number] {
      if (system === 'lotka-volterra') return LV_BOUNDS
      if (system === 'van-der-pol') return VDP_BOUNDS
      return DUF_BOUNDS
    }

    // World -> screen
    function toScreen(wx: number, wy: number, bounds: readonly [number, number, number, number]): [number, number] {
      const margin = 40
      const pw = w - 2 * margin
      const ph = h - 2 * margin
      const sx = margin + ((wx - bounds[0]) / (bounds[1] - bounds[0])) * pw
      const sy = margin + ((bounds[3] - wy) / (bounds[3] - bounds[2])) * ph
      return [sx, sy]
    }

    // Draw vector field arrows
    function drawVectorField(
      f: (s: Float64Array) => Float64Array,
      dim: number,
      bounds: readonly [number, number, number, number],
      _system: string,
    ) {
      const gridN = 20
      const dx = (bounds[1] - bounds[0]) / gridN
      const dy = (bounds[3] - bounds[2]) / gridN
      ctx.save()
      ctx.strokeStyle = theme.fg
      ctx.globalAlpha = 0.12
      ctx.lineWidth = 1

      for (let i = 0; i <= gridN; i++) {
        for (let j = 0; j <= gridN; j++) {
          const wx = bounds[0] + i * dx
          const wy = bounds[2] + j * dy
          let state: Float64Array
          if (dim === 3) {
            state = new Float64Array([wx, wy, 0])
          } else {
            state = new Float64Array([wx, wy])
          }
          const deriv = f(state)
          // For display we use the first two components
          const vx = deriv[0]
          const vy = deriv[1]
          const mag = Math.sqrt(vx * vx + vy * vy)
          if (mag < 1e-8) continue
          // Normalize and scale for display
          const arrowLen = Math.min(dx, dy) * 0.35
          const nx = (vx / mag) * arrowLen
          const ny = -(vy / mag) * arrowLen // flip y for screen
          const [sx, sy] = toScreen(wx, wy, bounds)
          ctx.beginPath()
          ctx.moveTo(sx - nx * 0.5, sy - ny * 0.5)
          ctx.lineTo(sx + nx * 0.5, sy + ny * 0.5)
          ctx.stroke()
        }
      }
      ctx.restore()
    }

    // Parse hex color to hue-shifted variants for trajectories
    function hexToRgb(hex: string): [number, number, number] {
      return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
      ]
    }

    function shiftHue(r: number, g: number, b: number, shift: number): string {
      // Simplified hue rotation in RGB space
      const cos = Math.cos(shift)
      const sin = Math.sin(shift)
      const nr = Math.min(255, Math.max(0, Math.round(
        r * (cos + (1 - cos) / 3) + g * ((1 - cos) / 3 - Math.sqrt(1 / 3) * sin) + b * ((1 - cos) / 3 + Math.sqrt(1 / 3) * sin)
      )))
      const ng = Math.min(255, Math.max(0, Math.round(
        r * ((1 - cos) / 3 + Math.sqrt(1 / 3) * sin) + g * (cos + (1 - cos) / 3) + b * ((1 - cos) / 3 - Math.sqrt(1 / 3) * sin)
      )))
      const nb = Math.min(255, Math.max(0, Math.round(
        r * ((1 - cos) / 3 - Math.sqrt(1 / 3) * sin) + g * ((1 - cos) / 3 + Math.sqrt(1 / 3) * sin) + b * (cos + (1 - cos) / 3)
      )))
      return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
    }

    return {
      step(t, p) {
        const system = p.system as string
        const spd = p.speed as number

        // Reinit on system change
        if (system !== lastSystem) {
          initTrajectories(system)
          lastSystem = system
        }

        const f = getDynFn(system)
        const bounds = getBounds(system)
        const dim = system === 'duffing' ? 3 : 2

        // Translucent clear
        ctx.save()
        ctx.globalAlpha = p.trails as number
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)
        ctx.restore()

        // Draw vector field
        drawVectorField(f, dim, bounds, system)

        // Integrate trajectories with RK4
        const substeps = 8
        const dt = RK4_DT * spd
        for (let i = 0; i < nTraj; i++) {
          for (let s = 0; s < substeps; s++) {
            states[i] = rk4(f, states[i], dt)
          }

          // Check for divergence
          if (!isFinite(states[i][0]) || !isFinite(states[i][1])) {
            // Reset to initial condition
            const ics = system === 'duffing' ? DUF_ICS : system === 'van-der-pol' ? VDP_ICS : LV_ICS
            const ic = ics[i % ics.length]
            if (dim === 3) {
              states[i] = new Float64Array([ic[0], ic[1], 0])
            } else {
              states[i] = new Float64Array([ic[0], ic[1]])
            }
          }

          // Store trail point
          const [sx, sy] = toScreen(states[i][0], states[i][1], bounds)
          const head = trailHeads[i]
          trailsX[i][head] = sx
          trailsY[i][head] = sy
          trailHeads[i] = (head + 1) % TRAIL_LEN
        }
        trailFrame++

        // Draw trajectories
        const [baseR, baseG, baseB] = hexToRgb(p.color as string)
        ctx.lineWidth = 1.8

        for (let i = 0; i < nTraj; i++) {
          const col = nTraj <= 1
            ? (p.color as string)
            : shiftHue(baseR, baseG, baseB, (i / nTraj) * Math.PI * 2)
          ctx.save()
          ctx.strokeStyle = col
          ctx.globalAlpha = 0.75
          ctx.beginPath()
          let started = false
          const len = Math.min(trailFrame, TRAIL_LEN)
          const head = trailHeads[i]
          for (let j = 0; j < len; j++) {
            const idx = (head + j) % TRAIL_LEN
            const px = trailsX[i][idx]
            const py = trailsY[i][idx]
            if (!started) { ctx.moveTo(px, py); started = true }
            else ctx.lineTo(px, py)
          }
          ctx.stroke()

          // Draw current position as bright dot
          if (trailFrame > 0) {
            const curIdx = (head + TRAIL_LEN - 1) % TRAIL_LEN
            ctx.globalAlpha = 1
            ctx.fillStyle = col
            ctx.beginPath()
            ctx.arc(trailsX[i][curIdx], trailsY[i][curIdx], 3, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.restore()
        }

        // Draw system label
        ctx.save()
        ctx.font = '11px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.4
        const labels: Record<string, string> = {
          'lotka-volterra': 'dx/dt = αx − βxy   dy/dt = δxy − γy',
          'van-der-pol': "x'' − μ(1−x²)x' + x = 0   μ = " + VDP_MU,
          'duffing': "x'' + δx' + αx + βx³ = γcos(ωt)",
        }
        ctx.fillText(labels[system] || '', 12, h - 12)
        ctx.restore()
      },
    }
  },
}
