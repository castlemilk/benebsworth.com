import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Gravitational Lensing — a foreground point mass bends a background source by
 * inverse ray mapping. For each output direction θ the deflection
 * α(θ) = θ_E²·θ/|θ|² puts the source at β = θ − α(θ); we sample the background
 * at β and paint it at θ. On axis the images close into an Einstein ring of
 * radius θ_E; off axis it breaks into two arcs. θ_E ∝ √mass; the 1/|θ|²
 * singularity is floored and every value→pixel step is clamped.
 */

export const controls: ControlSpec[] = [
  { key: 'lensMass', label: 'Lens mass (θ_E)', type: 'range', min: 0.2, max: 2, step: 0.05 },
  { key: 'sourceX', label: 'Source offset', type: 'range', min: -2, max: 2, step: 0.05 },
  {
    key: 'background',
    label: 'Background',
    type: 'select',
    options: [
      { label: 'Grid', value: 'grid' },
      { label: 'Stars', value: 'stars' },
    ],
  },
  { key: 'showRing', label: 'Einstein ring', type: 'toggle' },
]

export const defaults: Params = {
  lensMass: 1,
  sourceX: 0,
  background: 'grid',
  showRing: true,
}

const VIEW_HALF = 2.2      // angular half-height of the view
const THETAE_BASE = 0.8    // Einstein radius at mass = 1
const SWEEP = 1.1          // autonomous source-sweep amplitude
const WX = 0.00042, WY = 0.00027  // sweep frequencies (per ms)
const G = 0.36, LW = 0.03  // source-grid spacing and line half-width (angular)
const RMIN2 = 0.0016       // floor on |θ|² near the singular centre
const RECOMPUTE_MS = 40    // offscreen grid recompute throttle
const N_STARS = 180, STAR_RX = 5.0, STAR_RY = 3.0  // background star field
const INDIGO: [number, number, number] = [99, 102, 241]   // #6366f1
const VIOLET: [number, number, number] = [167, 139, 250]  // #a78bfa

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}
function hexToRgb(hex: string): [number, number, number] {
  let s = hex.replace('#', '')
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]
}
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

type Star = { x: number; y: number; mag: number }

export const GravitationalLensing: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims
    const cx = w / 2
    const cy = h / 2
    const s = Math.min(w, h) / (2 * VIEW_HALF) // pixels per angular unit

    // Fixed background sky for 'stars' mode (generated once).
    const stars: Star[] = []
    for (let i = 0; i < N_STARS; i++) {
      stars.push({
        x: (rand(i + 1) * 2 - 1) * STAR_RX,
        y: (rand(i + 137) * 2 - 1) * STAR_RY,
        mag: 0.4 + rand(i + 61) * 0.6,
      })
    }

    // Reduced-resolution offscreen buffer for the per-pixel 'grid' warp.
    const rScale = Math.min(0.5, 300 / w, 190 / h)
    const rw = Math.max(1, Math.round(w * rScale))
    const rh = Math.max(1, Math.round(h * rScale))
    const so = s * (rw / w) // offscreen pixels per angular unit
    const off = document.createElement('canvas')
    off.width = rw
    off.height = rh
    const octx = off.getContext('2d')!
    const img = octx.createImageData(rw, rh)
    const data = img.data
    for (let i = 3; i < data.length; i += 4) data[i] = 255 // opaque

    let lastKey = ''
    let lastComputeMs = -1e9

    // Inverse-map each θ pixel to β and shade the warped grid.
    function computeGrid(thetaE: number, sx: number, sy: number, bg: [number, number, number]) {
      const thetaE2 = thetaE * thetaE
      const ocx = rw / 2
      const ocy = rh / 2
      let idx = 0
      for (let oy = 0; oy < rh; oy++) {
        const ty = -(oy - ocy) / so
        for (let ox = 0; ox < rw; ox++) {
          const tx = (ox - ocx) / so
          let r2 = tx * tx + ty * ty
          if (r2 < RMIN2) r2 = RMIN2
          const factor = 1 - thetaE2 / r2 // β = θ·(1 − θ_E²/|θ|²) − source
          const bx = tx * factor - sx
          const by = ty * factor - sy
          const gx = Math.abs(bx / G - Math.round(bx / G)) * G
          const gy = Math.abs(by / G - Math.round(by / G)) * G
          const d = gx < gy ? gx : gy
          const line = d < LW ? 1 - d / LW : 0
          const rr = Math.sqrt(r2) // proximity to the ring → violet glow
          let rn = 1 - Math.abs(rr - thetaE) / (0.6 * thetaE)
          if (rn < 0) rn = 0
          const o = idx << 2
          if (line <= 0 && rn <= 0) {
            data[o] = bg[0]; data[o + 1] = bg[1]; data[o + 2] = bg[2]
          } else {
            const lr = INDIGO[0] + (VIOLET[0] - INDIGO[0]) * rn
            const lg = INDIGO[1] + (VIOLET[1] - INDIGO[1]) * rn
            const lb = INDIGO[2] + (VIOLET[2] - INDIGO[2]) * rn
            let a = line + rn * rn * 0.2
            if (a > 1) a = 1
            data[o] = bg[0] + (lr - bg[0]) * a
            data[o + 1] = bg[1] + (lg - bg[1]) * a
            data[o + 2] = bg[2] + (lb - bg[2]) * a
          }
          idx++
        }
      }
      octx.putImageData(img, 0, 0)
    }

    // Forward-map each source star to its two images θ± = ½(b ± √(b²+4θ_E²)).
    function drawStars(thetaE: number, sx: number, sy: number) {
      const thetaE2 = thetaE * thetaE
      const period = 2 * STAR_RX
      for (let i = 0; i < N_STARS; i++) {
        const st = stars[i]
        let bx = st.x + sx // slide the sky by the source offset, wrapping
        bx = ((((bx + STAR_RX) % period) + period) % period) - STAR_RX
        let by = st.y + sy
        by = ((((by + STAR_RY) % (2 * STAR_RY)) + 2 * STAR_RY) % (2 * STAR_RY)) - STAR_RY
        let b = Math.sqrt(bx * bx + by * by)
        if (b < 1e-4) b = 1e-4
        const ux = bx / b
        const uy = by / b
        const disc = Math.sqrt(b * b + 4 * thetaE2)
        const xPlus = (b + disc) / 2  // outer image (same side)
        const xMinus = (b - disc) / 2 // inner image (opposite side)
        const u = b / thetaE
        const shared = (u * u + 2) / (u * Math.sqrt(u * u + 4)) // total magnif.
        drawImagePoint(xPlus * ux, xPlus * uy, 0.5 * (shared + 1), st.mag, VIOLET)
        drawImagePoint(xMinus * ux, xMinus * uy, 0.5 * (shared - 1), st.mag, INDIGO)
      }
    }

    function drawImagePoint(tx: number, ty: number, mu: number, mag: number, col: [number, number, number]) {
      const px = cx + tx * s
      const py = cy - ty * s
      if (px < -4 || px > w + 4 || py < -4 || py > h + 4) return
      const m = Math.min(Math.abs(mu), 40)
      const sz = clamp((0.9 + Math.sqrt(m) * 0.9) * mag, 0.6, 9)
      const al = clamp(0.25 + 0.55 * (1 - 1 / (1 + m)) * mag, 0.12, 0.95)
      ctx.globalAlpha = al
      ctx.fillStyle = `rgb(${col[0]}, ${col[1]}, ${col[2]})`
      ctx.beginPath()
      ctx.arc(clamp(px, 0, w), clamp(py, 0, h), sz, 0, Math.PI * 2)
      ctx.fill()
    }

    return {
      step(t, p) {
        const lensMass = clamp(p.lensMass as number, 0.2, 2)
        const sourceXCtl = clamp(p.sourceX as number, -2, 2)
        const background = p.background as string
        const showRing = p.showRing as boolean
        const thetaE = THETAE_BASE * Math.sqrt(lensMass)

        // Autonomous sweep so the ring keeps forming (β→0) and breaking to arcs.
        const sx = sourceXCtl + SWEEP * Math.sin(t * WX)
        const sy = 0.4 * Math.sin(t * WY)

        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)

        if (background === 'grid') {
          const bg = hexToRgb(theme.bg)
          const key = `grid|${thetaE.toFixed(3)}`
          if (key !== lastKey || t - lastComputeMs > RECOMPUTE_MS) {
            computeGrid(thetaE, sx, sy, bg)
            lastKey = key
            lastComputeMs = t
          }
          ctx.imageSmoothingEnabled = true
          ctx.drawImage(off, 0, 0, w, h)
        } else {
          lastKey = 'stars'
          drawStars(thetaE, sx, sy)
          ctx.globalAlpha = 1
        }

        // Faint Einstein ring at radius θ_E.
        if (showRing) {
          ctx.save()
          ctx.globalAlpha = 0.55
          ctx.strokeStyle = '#a78bfa'
          ctx.lineWidth = 1.2
          ctx.setLineDash([4, 4])
          ctx.beginPath()
          ctx.arc(cx, cy, Math.min(thetaE * s, Math.hypot(w, h)), 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }

        // Lens marker (covers the singular centre).
        ctx.save()
        ctx.globalAlpha = 0.9
        ctx.fillStyle = theme.bg
        ctx.beginPath()
        ctx.arc(cx, cy, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 0.85
        ctx.fillStyle = '#6366f1'
        ctx.beginPath()
        ctx.arc(cx, cy, 2.6, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Labels.
        ctx.save()
        ctx.font = '11px monospace'
        ctx.textAlign = 'left'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.45
        ctx.fillText('β = θ − θ_E² · θ / |θ|²', 12, 20)
        ctx.globalAlpha = 0.4
        ctx.fillText(`θ_E = ${thetaE.toFixed(2)}   source β_x = ${sx.toFixed(2)}   ${background}`, 12, h - 12)
        ctx.restore()
        ctx.globalAlpha = 1
      },
    }
  },
}
