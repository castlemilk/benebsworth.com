import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Gradient Descent on a Loss Landscape
 *
 * Several optimiser "balls" start from the SAME point on a 2D loss surface
 * f(x, y) and roll downhill along their own colour-coded trajectories.
 * This is the canonical picture of HOW neural nets learn — and why the
 * choice of optimiser matters. On a curved ravine (scaled Rosenbrock),
 * plain SGD zig-zags across the valley, Momentum overshoots, and the
 * adaptive methods (RMSProp, Adam) damp the oscillation and slide down
 * the floor of the valley toward the minimum.
 *
 *   SGD:      θ ← θ − lr · g
 *   Momentum: v ← β v + g;                       θ ← θ − lr · v
 *   RMSProp:  s ← ρ s + (1−ρ) g⊙g;               θ ← θ − lr · g / (√s + ε)
 *   Adam:     m ← β₁ m + (1−β₁) g;
 *             u ← β₂ u + (1−β₂) g⊙g;
 *             m̂ = m/(1−β₁ᵗ); û = u/(1−β₂ᵗ);    θ ← θ − lr · m̂ / (√û + ε)
 *
 * where g = ∇f(θ) is computed analytically for each preset landscape.
 */

export const controls: ControlSpec[] = [
  {
    key: 'preset',
    label: 'Landscape',
    type: 'select',
    options: [
      { label: 'Ravine (Rosenbrock)', value: 'ravine' },
      { label: 'Saddle', value: 'saddle' },
      { label: 'Bumpy (local minima)', value: 'bumpy' },
      { label: 'Bowl (convex)', value: 'bowl' },
    ],
  },
  { key: 'lr', label: 'Learning rate', type: 'range', min: 0.001, max: 0.5, step: 0.001 },
  { key: 'momentum', label: 'Momentum β', type: 'range', min: 0, max: 0.99, step: 0.01 },
  {
    key: 'show',
    label: 'Show',
    type: 'select',
    options: [
      { label: 'Compare all', value: 'all' },
      { label: 'SGD only', value: 'SGD' },
      { label: 'Momentum only', value: 'Momentum' },
      { label: 'RMSProp only', value: 'RMSProp' },
      { label: 'Adam only', value: 'Adam' },
    ],
  },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.25, max: 4, step: 0.25 },
]

export const defaults: Params = {
  preset: 'ravine',
  lr: 0.004,
  momentum: 0.9,
  show: 'all',
  speed: 1,
}

// ── Brand palette ───────────────────────────────────────────────────────
const TEAL = '#00e0b8'
const PURPLE = '#7c5cff'
const ORANGE = '#ff7a59'
const YELLOW = '#ffd93d'

type OptName = 'SGD' | 'Momentum' | 'RMSProp' | 'Adam'
const OPT_ORDER: OptName[] = ['SGD', 'Momentum', 'RMSProp', 'Adam']
const OPT_COLOR: Record<OptName, string> = {
  SGD: ORANGE,
  Momentum: YELLOW,
  RMSProp: TEAL,
  Adam: PURPLE,
}

// ── Landscape definitions ───────────────────────────────────────────────
// Each landscape provides: a domain, a starting point, the loss f(x, y) and
// its analytic gradient ∇f. World coords are mapped to the view rect.

interface Landscape {
  // domain in world space
  xmin: number
  xmax: number
  ymin: number
  ymax: number
  // shared start point for every optimiser
  start: [number, number]
  f: (x: number, y: number) => number
  grad: (x: number, y: number) => [number, number]
}

// scaled Rosenbrock: long, narrow, curved valley
const A_ROSEN = 1
const B_ROSEN = 20
function ravine(): Landscape {
  const f = (x: number, y: number) => {
    const t1 = A_ROSEN - x
    const t2 = y - x * x
    return t1 * t1 + B_ROSEN * t2 * t2
  }
  const grad = (x: number, y: number): [number, number] => {
    const t2 = y - x * x
    const dfdx = -2 * (A_ROSEN - x) - 4 * B_ROSEN * x * t2
    const dfdy = 2 * B_ROSEN * t2
    return [dfdx, dfdy]
  }
  return { xmin: -2, xmax: 2, ymin: -1, ymax: 3, start: [-1.6, 2.4], f, grad }
}

// saddle: f = x² − y² with a tiny asymmetry so it isn't degenerate
function saddle(): Landscape {
  const f = (x: number, y: number) => x * x - y * y + 0.04 * y
  const grad = (x: number, y: number): [number, number] => [2 * x, -2 * y + 0.04]
  return { xmin: -2, xmax: 2, ymin: -2, ymax: 2, start: [-1.6, 0.02], f, grad }
}

// bumpy: shallow bowl minus a few Gaussians → several local minima
const BUMPS: Array<[number, number, number]> = [
  // [cx, cy, amplitude]
  [-1.0, -0.9, 2.2],
  [1.1, 0.6, 2.6],
  [0.2, -1.2, 1.6],
  [-0.7, 1.1, 1.9],
]
const BUMP_S = 0.6
function bumpy(): Landscape {
  const f = (x: number, y: number) => {
    let v = 0.1 * (x * x + y * y)
    for (const [cx, cy, amp] of BUMPS) {
      const dx = x - cx
      const dy = y - cy
      v -= amp * Math.exp(-(dx * dx + dy * dy) / BUMP_S)
    }
    return v
  }
  const grad = (x: number, y: number): [number, number] => {
    let gx = 0.2 * x
    let gy = 0.2 * y
    for (const [cx, cy, amp] of BUMPS) {
      const dx = x - cx
      const dy = y - cy
      const e = amp * Math.exp(-(dx * dx + dy * dy) / BUMP_S)
      // d/dx of [−amp·exp(−(dx²+dy²)/s)] = +amp·exp·(2dx/s)
      gx += e * (2 * dx) / BUMP_S
      gy += e * (2 * dy) / BUMP_S
    }
    return [gx, gy]
  }
  return { xmin: -2, xmax: 2, ymin: -2, ymax: 2, start: [-1.7, 1.7], f, grad }
}

// bowl: simple convex sanity check f = x² + 2y²
function bowl(): Landscape {
  const f = (x: number, y: number) => x * x + 2 * y * y
  const grad = (x: number, y: number): [number, number] => [2 * x, 4 * y]
  return { xmin: -2, xmax: 2, ymin: -2, ymax: 2, start: [-1.7, 1.5], f, grad }
}

function makeLandscape(preset: string): Landscape {
  switch (preset) {
    case 'saddle':
      return saddle()
    case 'bumpy':
      return bumpy()
    case 'bowl':
      return bowl()
    case 'ravine':
    default:
      return ravine()
  }
}

// ── Optimiser state ─────────────────────────────────────────────────────
interface Ball {
  name: OptName
  x: number
  y: number
  // momentum velocity
  vx: number
  vy: number
  // RMSProp accumulator
  sx: number
  sy: number
  // Adam moments
  mx: number
  my: number
  ux: number
  uy: number
  t: number
  converged: boolean
  // trail (world-space, ring buffer)
  tx: Float64Array
  ty: Float64Array
  head: number
  count: number
  minLoss: number
}

const TRAIL_LEN = 1400
const EPS = 1e-8
const BETA1 = 0.9
const BETA2 = 0.999
const RHO = 0.9
const MAX_STEPS = 1600
const CONVERGE_GRAD = 1e-3
// Gradient clipping by global norm — the steep Rosenbrock walls produce
// gradients of norm ~25+, which at any usable learning rate send plain SGD
// careening off the domain clamp into a canvas-spanning scribble. Clipping to
// a bounded norm is standard practice (and keeps every optimiser legible while
// preserving the SGD-zig-zags-vs-Adam-glides contrast).
const GRAD_CLIP = 12

function makeBall(name: OptName, start: [number, number]): Ball {
  return {
    name,
    x: start[0],
    y: start[1],
    vx: 0,
    vy: 0,
    sx: 0,
    sy: 0,
    mx: 0,
    my: 0,
    ux: 0,
    uy: 0,
    t: 0,
    converged: false,
    tx: new Float64Array(TRAIL_LEN),
    ty: new Float64Array(TRAIL_LEN),
    head: 0,
    count: 0,
    minLoss: Infinity,
  }
}

// One optimiser update step for a ball, given lr, momentum β and the landscape.
function updateBall(b: Ball, lr: number, beta: number, land: Landscape): void {
  if (b.converged) return
  let [gx, gy] = land.grad(b.x, b.y)
  const gnorm = Math.hypot(gx, gy)
  // Clip by global norm so no single step can blow past the domain.
  if (gnorm > GRAD_CLIP) {
    const scale = GRAD_CLIP / gnorm
    gx *= scale
    gy *= scale
  }

  switch (b.name) {
    case 'SGD': {
      b.x -= lr * gx
      b.y -= lr * gy
      break
    }
    case 'Momentum': {
      b.vx = beta * b.vx + gx
      b.vy = beta * b.vy + gy
      b.x -= lr * b.vx
      b.y -= lr * b.vy
      break
    }
    case 'RMSProp': {
      b.sx = RHO * b.sx + (1 - RHO) * gx * gx
      b.sy = RHO * b.sy + (1 - RHO) * gy * gy
      b.x -= (lr * gx) / (Math.sqrt(b.sx) + EPS)
      b.y -= (lr * gy) / (Math.sqrt(b.sy) + EPS)
      break
    }
    case 'Adam': {
      b.t += 1
      b.mx = BETA1 * b.mx + (1 - BETA1) * gx
      b.my = BETA1 * b.my + (1 - BETA1) * gy
      b.ux = BETA2 * b.ux + (1 - BETA2) * gx * gx
      b.uy = BETA2 * b.uy + (1 - BETA2) * gy * gy
      const bc1 = 1 - Math.pow(BETA1, b.t)
      const bc2 = 1 - Math.pow(BETA2, b.t)
      const mhx = b.mx / bc1
      const mhy = b.my / bc1
      const uhx = b.ux / bc2
      const uhy = b.uy / bc2
      b.x -= (lr * mhx) / (Math.sqrt(uhx) + EPS)
      b.y -= (lr * mhy) / (Math.sqrt(uhy) + EPS)
      break
    }
  }

  // Clamp to the domain so trails never leave the heatmap rect.
  b.x = Math.max(land.xmin, Math.min(land.xmax, b.x))
  b.y = Math.max(land.ymin, Math.min(land.ymax, b.y))

  // Record trail
  b.tx[b.head] = b.x
  b.ty[b.head] = b.y
  b.head = (b.head + 1) % TRAIL_LEN
  if (b.count < TRAIL_LEN) b.count++

  // Track lowest loss reached
  const loss = land.f(b.x, b.y)
  if (loss < b.minLoss) b.minLoss = loss

  // Convergence: gradient norm tiny (Adam/Momentum may not stop on a saddle,
  // which is the point of the demo — so guard with the step cap too).
  if (gnorm < CONVERGE_GRAD) b.converged = true
}

export const gradientDescent: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims
    const bg = theme.bg
    const fg = theme.fg

    // ── per-instance simulation state (all mutable state lives here) ──
    let lastKey = ''
    let land: Landscape = makeLandscape('ravine')
    let balls: Ball[] = []
    let globalStep = 0
    let settled = false
    let retriggerAt = 0
    let lastTime = 0

    // Heatmap precompute. Recomputed only when preset changes.
    const GRID = 64
    const grid = new Float32Array(GRID * GRID)
    let gridMin = 0
    let gridMax = 1
    let heatPreset = ''

    function precomputeGrid(l: Landscape) {
      let mn = Infinity
      let mx = -Infinity
      for (let j = 0; j < GRID; j++) {
        const fy = j / (GRID - 1)
        const wy = l.ymin + fy * (l.ymax - l.ymin)
        for (let i = 0; i < GRID; i++) {
          const fx = i / (GRID - 1)
          const wx = l.xmin + fx * (l.xmax - l.xmin)
          // Compress dynamic range so deep Rosenbrock walls don't blow out
          // the heatmap; log1p keeps detail near the valley floor.
          const v = Math.log1p(Math.max(0, l.f(wx, wy)))
          grid[j * GRID + i] = v
          if (v < mn) mn = v
          if (v > mx) mx = v
        }
      }
      gridMin = mn
      gridMax = mx
    }

    function which(showVal: string): OptName[] {
      if (showVal === 'all') return OPT_ORDER.slice()
      return [showVal as OptName]
    }

    function reset(preset: string, showVal: string) {
      land = makeLandscape(preset)
      if (preset !== heatPreset) {
        precomputeGrid(land)
        heatPreset = preset
      }
      balls = which(showVal).map((name) => makeBall(name, land.start))
      globalStep = 0
      settled = false
      retriggerAt = 0
    }

    // teal → purple ramp for the heatmap (low = dark teal, high = bright purple)
    function ramp(t: number): [number, number, number] {
      const u = Math.max(0, Math.min(1, t))
      // dark navy → teal → purple → light
      // piecewise to give the valley floor a teal glow
      let r: number, g: number, b: number
      if (u < 0.5) {
        const k = u / 0.5
        r = 8 + k * (0 - 8)
        g = 20 + k * (224 - 20)
        b = 30 + k * (184 - 30)
      } else {
        const k = (u - 0.5) / 0.5
        r = 0 + k * (124 - 0)
        g = 224 + k * (92 - 224)
        b = 184 + k * (255 - 184)
      }
      return [r, g, b]
    }

    return {
      step(timeMs, p) {
        const dtRaw = (timeMs - lastTime) / 1000
        lastTime = timeMs

        const preset = (p.preset ?? defaults.preset) as string
        const lr = (p.lr ?? defaults.lr) as number
        const beta = (p.momentum ?? defaults.momentum) as number
        const showVal = (p.show ?? defaults.show) as string
        const speed = (p.speed ?? defaults.speed) as number

        // ── reset-on-param-change guard ──
        const key = `${preset}_${lr.toFixed(4)}_${beta.toFixed(2)}_${showVal}`
        if (key !== lastKey) {
          reset(preset, showVal)
          lastKey = key
        }

        // ── auto-retrigger when all active balls converge OR step cap ──
        if (!settled) {
          const allDone = balls.every((b) => b.converged) || globalStep >= MAX_STEPS
          if (allDone) {
            settled = true
            retriggerAt = timeMs + 2000
          }
        }
        if (settled && timeMs >= retriggerAt) {
          reset(preset, showVal)
          lastKey = key // re-arm
        }

        // ── advance the optimisers a fixed number of sub-steps ──
        // Frame-rate independent: target ~3 optimiser steps per 16ms, scaled.
        if (!settled) {
          const baseSteps = Math.max(1, Math.round(dtRaw * 60 * 3 * speed))
          const stepsNow = Math.min(baseSteps, 24)
          for (let s = 0; s < stepsNow; s++) {
            if (globalStep >= MAX_STEPS) break
            for (const b of balls) updateBall(b, lr, beta, land)
            globalStep++
          }
        }

        // ── layout ──
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, w, h)

        const topPad = 22
        const botPad = 30
        const sidePad = 12
        const legendW = Math.min(96, w * 0.26)
        const plotX = sidePad
        const plotY = topPad
        const plotW = w - sidePad * 2 - legendW - 8
        const plotH = h - topPad - botPad

        // world → pixel
        const toPx = (wx: number): number =>
          plotX + ((wx - land.xmin) / (land.xmax - land.xmin)) * plotW
        const toPy = (wy: number): number =>
          // invert Y so larger y is up
          plotY + (1 - (wy - land.ymin) / (land.ymax - land.ymin)) * plotH

        // ── heatmap ──
        const cellW = plotW / GRID
        const cellH = plotH / GRID
        const range = gridMax - gridMin || 1
        for (let j = 0; j < GRID; j++) {
          for (let i = 0; i < GRID; i++) {
            const v = (grid[j * GRID + i] - gridMin) / range
            const [r, g, b] = ramp(v)
            ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`
            // grid j=0 is ymin (bottom). Pixel y inverted.
            const px = plotX + i * cellW
            const py = plotY + (GRID - 1 - j) * cellH
            ctx.fillRect(px, py, cellW + 1, cellH + 1)
          }
        }

        // contour bands — a few iso-lines for readability
        ctx.save()
        ctx.globalAlpha = 0.18
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 0.6
        const levels = 7
        for (let lv = 1; lv < levels; lv++) {
          const target = gridMin + (lv / levels) * range
          for (let j = 0; j < GRID - 1; j++) {
            for (let i = 0; i < GRID - 1; i++) {
              const a = grid[j * GRID + i]
              const bV = grid[j * GRID + i + 1]
              // simple crossing detection on horizontal edges
              if ((a - target) * (bV - target) < 0) {
                const fx = (target - a) / (bV - a)
                const px = plotX + (i + fx) * cellW
                const py = plotY + (GRID - 1 - j) * cellH
                ctx.fillRect(px, py, 1, 1)
              }
            }
          }
        }
        ctx.restore()

        // border
        ctx.strokeStyle = '#2a2a32'
        ctx.lineWidth = 1
        ctx.strokeRect(plotX + 0.5, plotY + 0.5, plotW, plotH)

        // ── start marker ──
        const sPx = toPx(land.start[0])
        const sPy = toPy(land.start[1])
        ctx.strokeStyle = fg
        ctx.globalAlpha = 0.5
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(sPx - 4, sPy)
        ctx.lineTo(sPx + 4, sPy)
        ctx.moveTo(sPx, sPy - 4)
        ctx.lineTo(sPx, sPy + 4)
        ctx.stroke()
        ctx.globalAlpha = 1

        // ── trails + dots ──
        for (const b of balls) {
          const color = OPT_COLOR[b.name]
          const n = b.count
          if (n > 1) {
            // draw oldest → newest from the ring buffer, fading older points
            ctx.lineWidth = 1.6
            ctx.lineJoin = 'round'
            const start = b.count < TRAIL_LEN ? 0 : b.head
            ctx.strokeStyle = color
            ctx.beginPath()
            let started = false
            for (let k = 0; k < n; k++) {
              const idx = (start + k) % TRAIL_LEN
              const px = toPx(b.tx[idx])
              const py = toPy(b.ty[idx])
              if (!started) {
                ctx.moveTo(px, py)
                started = true
              } else {
                ctx.lineTo(px, py)
              }
            }
            ctx.globalAlpha = 0.85
            ctx.stroke()
            ctx.globalAlpha = 1
          }

          // current dot
          const dx = toPx(b.x)
          const dy = toPy(b.y)
          ctx.save()
          ctx.fillStyle = color
          ctx.shadowColor = color
          ctx.shadowBlur = b.converged ? 4 : 9
          ctx.beginPath()
          ctx.arc(dx, dy, b.converged ? 3 : 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        // ── legend (colour → optimiser) ──
        const lgX = plotX + plotW + 12
        let lgY = plotY + 6
        ctx.font = 'bold 9px monospace'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = fg
        ctx.globalAlpha = 0.7
        ctx.fillText('optimiser', lgX, lgY)
        ctx.globalAlpha = 1
        lgY += 16
        ctx.font = '9px monospace'
        for (const name of OPT_ORDER) {
          const active = balls.some((b) => b.name === name)
          const color = OPT_COLOR[name]
          ctx.globalAlpha = active ? 1 : 0.28
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(lgX + 4, lgY, 3.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = fg
          ctx.fillText(name, lgX + 13, lgY + 0.5)
          ctx.globalAlpha = 1
          lgY += 15
        }

        // lowest-loss readout per active optimiser, under the legend
        lgY += 6
        ctx.font = '8px monospace'
        ctx.fillStyle = fg
        ctx.globalAlpha = 0.55
        ctx.fillText('min loss', lgX, lgY)
        ctx.globalAlpha = 1
        lgY += 13
        for (const b of balls) {
          ctx.fillStyle = OPT_COLOR[b.name]
          const ml = isFinite(b.minLoss) ? b.minLoss : 0
          const txt = ml < 0 ? ml.toFixed(2) : ml.toFixed(3)
          ctx.fillText(txt, lgX, lgY)
          lgY += 12
        }

        // ── title ──
        ctx.font = 'bold 10px monospace'
        ctx.fillStyle = fg
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        const presetLabel =
          preset === 'ravine'
            ? 'Rosenbrock ravine'
            : preset === 'saddle'
              ? 'Saddle x²−y²'
              : preset === 'bumpy'
                ? 'Bumpy (local minima)'
                : 'Convex bowl'
        ctx.fillText(`Gradient descent — ${presetLabel}`, plotX, 6)

        // ── caption: step count + lowest loss reached overall ──
        let best = Infinity
        for (const b of balls) if (b.minLoss < best) best = b.minLoss
        if (!isFinite(best)) best = 0
        ctx.font = '9px monospace'
        ctx.fillStyle = fg
        ctx.globalAlpha = 0.55
        ctx.textBaseline = 'alphabetic'
        const status = settled ? 'replaying…' : `step ${globalStep}`
        ctx.fillText(
          `${status}   lr=${lr.toFixed(3)}  β=${beta.toFixed(2)}   best loss=${best < 0 ? best.toFixed(2) : best.toFixed(3)}`,
          plotX,
          h - 10,
        )
        ctx.globalAlpha = 1
      },
    }
  },
}
