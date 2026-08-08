import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Kinetic Theory of Gases. LEFT: N equal-mass hard discs bouncing in a box,
 * with ELASTIC pair collisions (swap the normal velocity components) and wall
 * reflections; discs coloured by speed (slow indigo -> fast orange). RIGHT: a
 * live speed histogram, smoothed frame to frame, converging onto the 2D
 * Maxwell-Boltzmann curve f(v) = (m/kT) v exp(-m v^2 / 2kT), with kT/m = <v^2>/2.
 */
export const controls: ControlSpec[] = [
  { key: 'count', label: 'Particle count', type: 'range', min: 40, max: 200, step: 10 },
  { key: 'temperature', label: 'Temperature', type: 'range', min: 0.3, max: 3, step: 0.1 },
  { key: 'radius', label: 'Disc radius', type: 'range', min: 2, max: 8, step: 0.5 },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.3, max: 3, step: 0.1 },
]

export const defaults: Params = {
  count: 120,
  temperature: 1,
  radius: 4,
  speed: 1,
}

const COLD = [99, 102, 241] // indigo #6366f1 (slow)
const HOT = [255, 122, 89] // orange #ff7a59 (fast)
const NBINS = 22
const SPEED_PX = 75 // px/sec of initial speed per unit temperature
const TWO_PI = Math.PI * 2

function mix(a: number[], b: number[], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t)
  const g = Math.round(a[1] + (b[1] - a[1]) * t)
  const bl = Math.round(a[2] + (b[2] - a[2]) * t)
  return `rgb(${r},${g},${bl})`
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

export const KineticGas: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims

    // ---- layout (constant for this renderer's lifetime) ----
    const P = 14
    const gap = 18
    const leftW = Math.floor(w * 0.6)
    const box = { x: P, y: P, w: leftW - P - gap * 0.5, h: h - P * 2 }
    const plot = { x: leftW + gap * 0.5, y: P + 20, w: w - leftW - gap * 0.5 - P, h: h - P * 2 - 40 }

    // ---- simulation state (allocated on reset) ----
    let px = new Float32Array(0)
    let py = new Float32Array(0)
    let vx = new Float32Array(0)
    let vy = new Float32Array(0)
    let head = new Int32Array(0) // uniform grid buckets (broad phase)
    let next = new Int32Array(0)
    let gCols = 1
    let gRows = 1
    let cell = 1
    let n = 0
    const hist = new Float32Array(NBINS) // smoothed density, converges to M-B
    const inst = new Float32Array(NBINS)
    let lastKey = ''
    let lastTemp = 1
    let lastT = 0

    function reset(count: number, r: number, temp: number) {
      n = count
      px = new Float32Array(n)
      py = new Float32Array(n)
      vx = new Float32Array(n)
      vy = new Float32Array(n)
      next = new Int32Array(n)
      cell = Math.max(2 * r, 4) // grid cell = interaction diameter
      gCols = Math.max(1, Math.floor(box.w / cell))
      gRows = Math.max(1, Math.floor(box.h / cell))
      head = new Int32Array(gCols * gRows)
      // seed on a jittered grid so nothing starts deeply overlapped
      const innerW = box.w - 2 * r
      const innerH = box.h - 2 * r
      const cols = Math.max(1, Math.round(Math.sqrt((n * innerW) / Math.max(1, innerH))))
      const cw = innerW / cols
      const ch = innerH / Math.ceil(n / cols)
      const v0 = temp * SPEED_PX
      for (let i = 0; i < n; i++) {
        const c = i % cols
        const rw = Math.floor(i / cols)
        px[i] = box.x + r + (c + 0.5) * cw + (Math.random() - 0.5) * Math.max(0, cw - 2 * r)
        py[i] = box.y + r + (rw + 0.5) * ch + (Math.random() - 0.5) * Math.max(0, ch - 2 * r)
        const ang = Math.random() * TWO_PI
        vx[i] = Math.cos(ang) * v0
        vy[i] = Math.sin(ang) * v0
      }
      hist.fill(0)
      lastTemp = temp
    }

    // equal-mass elastic collision: swap normal velocity components + separate
    function resolvePair(i: number, j: number, r: number, d2: number) {
      const dx = px[j] - px[i]
      const dy = py[j] - py[i]
      const dist2 = dx * dx + dy * dy
      if (dist2 >= d2) return
      let nx: number, ny: number, dist: number
      if (dist2 < 1e-6) {
        nx = 1
        ny = 0
        dist = 0.001
      } else {
        dist = Math.sqrt(dist2)
        nx = dx / dist
        ny = dy / dist
      }
      const sh = (2 * r - dist) * 0.5 // push each out of overlap
      px[i] -= nx * sh
      py[i] -= ny * sh
      px[j] += nx * sh
      py[j] += ny * sh
      const vrel = (vx[i] - vx[j]) * nx + (vy[i] - vy[j]) * ny // approach if > 0
      if (vrel <= 0) return
      vx[i] -= vrel * nx
      vy[i] -= vrel * ny
      vx[j] += vrel * nx
      vy[j] += vrel * ny
    }

    function collide(r: number) {
      const d2 = 2 * r * (2 * r)
      head.fill(-1)
      for (let i = 0; i < n; i++) {
        let cx = Math.floor((px[i] - box.x) / cell)
        let cy = Math.floor((py[i] - box.y) / cell)
        cx = cx < 0 ? 0 : cx >= gCols ? gCols - 1 : cx
        cy = cy < 0 ? 0 : cy >= gRows ? gRows - 1 : cy
        const idx = cy * gCols + cx
        next[i] = head[idx]
        head[idx] = i
      }
      for (let cy = 0; cy < gRows; cy++) {
        for (let cx = 0; cx < gCols; cx++) {
          let i = head[cy * gCols + cx]
          while (i >= 0) {
            for (let oy = -1; oy <= 1; oy++) {
              const ny = cy + oy
              if (ny < 0 || ny >= gRows) continue
              for (let ox = -1; ox <= 1; ox++) {
                const nx = cx + ox
                if (nx < 0 || nx >= gCols) continue
                let j = head[ny * gCols + nx]
                while (j >= 0) {
                  if (j > i) resolvePair(i, j, r, d2)
                  j = next[j]
                }
              }
            }
            i = next[i]
          }
        }
      }
    }

    return {
      step(t, p) {
        const count = Math.round(p.count as number)
        const r = p.radius as number
        const temp = p.temperature as number
        const spd = p.speed as number

        // reset ALL state on structural change (count / radius / canvas size)
        const key = `${count}|${r}|${w}|${h}`
        if (key !== lastKey) {
          reset(count, r, temp)
          lastKey = key
          lastT = t
        }

        // live temperature: rescale velocities (heat / cool), keep positions
        if (temp !== lastTemp && lastTemp > 0) {
          const f = temp / lastTemp
          for (let i = 0; i < n; i++) {
            vx[i] *= f
            vy[i] *= f
          }
          lastTemp = temp
        }

        // real-time dt keeps speed consistent across 30/60fps, clamped
        let dtMs = t - lastT
        lastT = t
        if (!(dtMs > 0) || dtMs > 50) dtMs = 16
        const simDt = dtMs * 0.001 * spd

        // substeps bound per-step travel to the disc size -> stable collisions
        let maxV2 = 1
        for (let i = 0; i < n; i++) {
          const s = vx[i] * vx[i] + vy[i] * vy[i]
          if (s > maxV2) maxV2 = s
        }
        const sub = Math.max(1, Math.min(6, Math.ceil((Math.sqrt(maxV2) * simDt) / Math.max(1, r))))
        const sdt = simDt / sub
        const xMin = box.x + r
        const xMax = box.x + box.w - r
        const yMin = box.y + r
        const yMax = box.y + box.h - r
        for (let s = 0; s < sub; s++) {
          for (let i = 0; i < n; i++) {
            px[i] += vx[i] * sdt
            py[i] += vy[i] * sdt
            if (px[i] < xMin) {
              px[i] = xMin
              vx[i] = Math.abs(vx[i])
            } else if (px[i] > xMax) {
              px[i] = xMax
              vx[i] = -Math.abs(vx[i])
            }
            if (py[i] < yMin) {
              py[i] = yMin
              vy[i] = Math.abs(vy[i])
            } else if (py[i] > yMax) {
              py[i] = yMax
              vy[i] = -Math.abs(vy[i])
            }
          }
          collide(r)
        }

        // stats + final clamp inside the box (never draw a disc outside its panel)
        let sumV2 = 0
        for (let i = 0; i < n; i++) {
          px[i] = px[i] < xMin ? xMin : px[i] > xMax ? xMax : px[i]
          py[i] = py[i] < yMin ? yMin : py[i] > yMax ? yMax : py[i]
          sumV2 += vx[i] * vx[i] + vy[i] * vy[i]
        }
        const meanV2 = Math.max(1e-6, sumV2 / n)
        const rms = Math.sqrt(meanV2)
        const vMax = 2.4 * rms // histogram / colour axis
        const a = 2 / meanV2 // = m/kT in 2D since <v^2> = 2kT/m

        // instantaneous histogram (density), blended into the smoothed one
        const binW = vMax / NBINS
        inst.fill(0)
        for (let i = 0; i < n; i++) {
          const v = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i])
          let b = Math.floor(v / binW)
          if (b < 0) b = 0
          else if (b >= NBINS) b = NBINS - 1
          inst[b] += 1
        }
        for (let b = 0; b < NBINS; b++) {
          hist[b] += (inst[b] / n / binW - hist[b]) * 0.05
        }

        // ---- draw ----
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)

        // box + discs
        ctx.strokeStyle = theme.fg
        ctx.globalAlpha = 0.2
        ctx.lineWidth = 1
        ctx.strokeRect(box.x, box.y, box.w, box.h)
        ctx.globalAlpha = 1
        for (let i = 0; i < n; i++) {
          const v = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i])
          ctx.fillStyle = mix(COLD, HOT, clamp01(v / vMax))
          ctx.beginPath()
          ctx.arc(px[i], py[i], r, 0, TWO_PI)
          ctx.fill()
        }

        // histogram scale: fit the taller of the M-B peak and the tallest bar
        let maxDens = Math.sqrt(a) * Math.exp(-0.5)
        for (let b = 0; b < NBINS; b++) if (hist[b] > maxDens) maxDens = hist[b]
        maxDens *= 1.15
        const yScale = plot.h / maxDens
        const bw = plot.w / NBINS

        // bars (clamped to the plot rect)
        ctx.fillStyle = '#a78bfa'
        ctx.globalAlpha = 0.5
        for (let b = 0; b < NBINS; b++) {
          const barH = clamp01((hist[b] * yScale) / plot.h) * plot.h
          ctx.fillRect(plot.x + b * bw + 0.5, plot.y + plot.h - barH, Math.max(1, bw - 1), barH)
        }
        ctx.globalAlpha = 1

        // theoretical Maxwell-Boltzmann curve (accent), clamped to the rect
        ctx.strokeStyle = '#ff7a59'
        ctx.lineWidth = 2
        ctx.beginPath()
        for (let k = 0; k <= 64; k++) {
          const v = (k / 64) * vMax
          const f = a * v * Math.exp((-a * v * v) / 2)
          const yy = plot.y + plot.h - clamp01((f * yScale) / plot.h) * plot.h
          const xx = plot.x + clamp01(v / vMax) * plot.w
          if (k === 0) ctx.moveTo(xx, yy)
          else ctx.lineTo(xx, yy)
        }
        ctx.stroke()

        // axes + labels
        ctx.strokeStyle = theme.fg
        ctx.globalAlpha = 0.25
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(plot.x, plot.y)
        ctx.lineTo(plot.x, plot.y + plot.h)
        ctx.lineTo(plot.x + plot.w, plot.y + plot.h)
        ctx.stroke()
        ctx.globalAlpha = 1

        ctx.font = '11px monospace'
        ctx.textAlign = 'left'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.7
        ctx.fillText('Speed distribution', plot.x, P + 10)
        ctx.globalAlpha = 0.5
        ctx.fillText(`N = ${n}   kT/m ≈ ${(meanV2 / 2).toFixed(0)}`, box.x + 6, box.y + box.h - 8)
        ctx.fillStyle = '#ff7a59'
        ctx.fillText('f(v) Maxwell–Boltzmann', plot.x, plot.y + plot.h + 16)
        ctx.globalAlpha = 0.4
        ctx.fillStyle = theme.fg
        ctx.fillText('v', plot.x + plot.w - 8, plot.y + plot.h + 16)
        ctx.globalAlpha = 1
      },
    }
  },
}
