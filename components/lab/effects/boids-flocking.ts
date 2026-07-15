import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Boids Flocking (Craig Reynolds, 1987)
 *
 * N agents, each with a position and a velocity. Every frame, for the
 * neighbours inside a perception radius, three local steering rules are
 * summed:
 *   separation — steer away from close neighbours
 *   alignment  — match the neighbours' average heading
 *   cohesion   — steer toward the neighbours' centre of mass
 * A max-speed clamp keeps motion bounded and the edges wrap around, so
 * ~120 agents settle into murmuration-like clusters that keep reforming.
 *
 * Neighbour search is O(n^2) but cheap: squared-distance rejection, a
 * per-agent neighbour cap, and wrap-safe (toroidal) offsets keep it smooth
 * even at 250 agents.
 */
export const controls: ControlSpec[] = [
  { key: 'count', label: 'Agents', type: 'range', min: 30, max: 250, step: 10 },
  { key: 'separation', label: 'Separation', type: 'range', min: 0, max: 2, step: 0.05 },
  { key: 'alignment', label: 'Alignment', type: 'range', min: 0, max: 2, step: 0.05 },
  { key: 'cohesion', label: 'Cohesion', type: 'range', min: 0, max: 2, step: 0.05 },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.5, max: 4, step: 0.1 },
]

export const defaults: Params = {
  count: 120,
  separation: 1,
  alignment: 1,
  cohesion: 0.9,
  speed: 2,
}

export const BoidsFlocking: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims

    const R = Math.max(30, Math.min(w, h) * 0.12) // perception radius (px)
    const R2 = R * R
    const SEP = R * 0.55 // separation radius (px)
    const SEP2 = SEP * SEP
    const MAX_NEIGH = 32 // cap neighbour work per agent
    const SIZE = Math.max(3, R * 0.14) // triangle half-length

    // ---- persistent simulation state (closure) ----
    let n = 0
    let px = new Float32Array(0)
    let py = new Float32Array(0)
    let vx = new Float32Array(0)
    let vy = new Float32Array(0)
    let lastKey = ''
    let needsClear = true

    function reset(count: number, maxSpeed: number) {
      n = count
      px = new Float32Array(n)
      py = new Float32Array(n)
      vx = new Float32Array(n)
      vy = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        px[i] = Math.random() * w
        py[i] = Math.random() * h
        const a = Math.random() * Math.PI * 2
        vx[i] = Math.cos(a) * maxSpeed
        vy[i] = Math.sin(a) * maxSpeed
      }
      needsClear = true // repaint an opaque frame before trails accumulate
    }

    return {
      step(t, p) {
        // 1) read params
        const count = Math.round(p.count as number)
        const sepW = p.separation as number
        const aliW = p.alignment as number
        const cohW = p.cohesion as number
        const maxSpeed = (p.speed as number) * 1.4
        const minSpeed = maxSpeed * 0.45

        // 2) reset the agent array when the structural param (count) changes
        const key = String(count)
        if (key !== lastKey) {
          reset(count, maxSpeed)
          lastKey = key
        }

        // steering factors (position-scale-independent)
        const avoidF = 0.045 * sepW
        const matchF = 0.05 * aliW
        const centerF = 0.0009 * cohW

        // 3) advance the flock — three summed rules per agent
        for (let i = 0; i < n; i++) {
          const xi = px[i]
          const yi = py[i]
          let sepX = 0, sepY = 0 // away from close neighbours
          let avx = 0, avy = 0 // running sum of neighbour velocities
          let cx = 0, cy = 0 // running sum of relative offsets
          let neigh = 0
          for (let j = 0; j < n; j++) {
            if (j === i) continue
            let dx = px[j] - xi
            let dy = py[j] - yi
            // toroidal shortest offset so flocks wrap seamlessly
            if (dx > w * 0.5) dx -= w
            else if (dx < -w * 0.5) dx += w
            if (dy > h * 0.5) dy -= h
            else if (dy < -h * 0.5) dy += h
            const d2 = dx * dx + dy * dy
            if (d2 > R2) continue
            if (d2 < SEP2 && d2 > 0.0001) {
              const inv = 1 / Math.sqrt(d2)
              sepX -= dx * inv
              sepY -= dy * inv
            }
            avx += vx[j]; avy += vy[j]
            cx += dx; cy += dy
            neigh++
            if (neigh >= MAX_NEIGH) break // bound worst-case work
          }

          if (neigh > 0) {
            // alignment: steer toward the average heading
            vx[i] += (avx / neigh - vx[i]) * matchF
            vy[i] += (avy / neigh - vy[i]) * matchF
            // cohesion: steer toward the neighbour centre (relative, wrap-safe)
            vx[i] += (cx / neigh) * centerF
            vy[i] += (cy / neigh) * centerF
          }
          // separation
          vx[i] += sepX * avoidF
          vy[i] += sepY * avoidF

          // max-speed clamp (and a floor so nothing stalls)
          let sp = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i])
          if (sp > maxSpeed) {
            const k = maxSpeed / sp
            vx[i] *= k; vy[i] *= k
          } else if (sp < minSpeed && sp > 0.0001) {
            const k = minSpeed / sp
            vx[i] *= k; vy[i] *= k
          }
        }

        // integrate positions + wrap-around edges
        for (let i = 0; i < n; i++) {
          px[i] += vx[i]
          py[i] += vy[i]
          if (px[i] < 0) px[i] += w
          else if (px[i] >= w) px[i] -= w
          if (py[i] < 0) py[i] += h
          else if (py[i] >= h) py[i] -= h
        }

        // 4) clear — opaque on (re)init, translucent after for faint short trails
        if (needsClear) {
          ctx.fillStyle = theme.bg
          ctx.fillRect(0, 0, w, h)
          needsClear = false
        } else {
          ctx.save()
          ctx.globalAlpha = 0.32
          ctx.fillStyle = theme.bg
          ctx.fillRect(0, 0, w, h)
          ctx.restore()
        }

        // 5) draw each agent as a triangle pointing along its velocity,
        //    coloured by heading across the brand teal->cyan->violet range
        for (let i = 0; i < n; i++) {
          const s = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]) || 1
          const ux = vx[i] / s
          const uy = vy[i] / s
          const ang = Math.atan2(uy, ux)
          const hue = 160 + ((ang + Math.PI) / (Math.PI * 2)) * 120
          const x = px[i]
          const y = py[i]
          const nx = -uy
          const ny = ux
          const backX = x - ux * SIZE
          const backY = y - uy * SIZE
          ctx.fillStyle = `hsla(${hue.toFixed(0)}, 85%, 62%, 0.9)`
          ctx.beginPath()
          ctx.moveTo(x + ux * SIZE, y + uy * SIZE)
          ctx.lineTo(backX + nx * SIZE * 0.6, backY + ny * SIZE * 0.6)
          ctx.lineTo(backX - nx * SIZE * 0.6, backY - ny * SIZE * 0.6)
          ctx.closePath()
          ctx.fill()
        }

        // caption
        ctx.save()
        ctx.font = '11px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.4
        ctx.fillText(
          `Boids · N = ${n} · sep ${sepW.toFixed(2)} · ali ${aliW.toFixed(2)} · coh ${cohW.toFixed(2)}`,
          12,
          h - 12,
        )
        ctx.restore()
      },
    }
  },
}
