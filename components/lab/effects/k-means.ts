import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * k-Means Clustering (Lloyd's algorithm). Points sampled from Gaussian
 * blobs; k centroids seeded with k-means++. A slow cadence alternates
 * ASSIGN (colour each point by nearest centroid) and UPDATE (glide each
 * centroid to its cluster mean). WCSS/inertia falls until the centroids
 * settle, then the scene pauses and reseeds.
 */
export const controls: ControlSpec[] = [
  { key: 'k', label: 'Clusters k', type: 'range', min: 2, max: 6, step: 1 },
  { key: 'points', label: 'Points', type: 'range', min: 60, max: 300, step: 20 },
  { key: 'blobs', label: 'Blobs', type: 'range', min: 2, max: 6, step: 1 },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.25, max: 3, step: 0.05 },
]

export const defaults: Params = { k: 3, points: 160, blobs: 3, speed: 1 }

// Cluster palette (leads with the AI category accent, violet).
const PALETTE = ['#a78bfa', '#00e0b8', '#ff7a59', '#00b4d8', '#ff5c8a', '#f5a623']
const TAU = Math.PI * 2

const cr = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

// Standard-normal sample via Box-Muller.
function gauss(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v)
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

export const KMeans: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims

    // Plot rectangle (leaves room for the header/footer readouts).
    const padX = 16, padTop = 34, padBottom = 26
    const plotL = padX, plotT = padTop
    const plotW = Math.max(1, w - padX * 2)
    const plotH = Math.max(1, h - padTop - padBottom)
    const toX = (nx: number) => plotL + clamp01(nx) * plotW
    const toY = (ny: number) => plotT + clamp01(ny) * plotH

    // Simulation state (all reset by reseed()).
    let px = new Float64Array(0), py = new Float64Array(0)
    let assign = new Int32Array(0)
    let cx = new Float64Array(0), cy = new Float64Array(0)
    let startx = new Float64Array(0), starty = new Float64Array(0)
    let targetx = new Float64Array(0), targety = new Float64Array(0)
    let counts = new Int32Array(0)
    let nPts = 0, kC = 0
    let iteration = 0, inertia = 0
    let phase: 'assign' | 'update' | 'converged' = 'assign'
    let phaseStartT = 0, convergeT = 0
    let lastKey = ''

    // Faint Voronoi background rendered offscreen at low resolution, only
    // recomputed when the centroids actually move.
    const VW = 72, VH = 46
    const prgb = PALETTE.map(hexToRgb)
    const off = document.createElement('canvas')
    off.width = VW; off.height = VH
    const octx = off.getContext('2d')
    const oimg = octx ? octx.createImageData(VW, VH) : null
    let voroSig = Number.NaN

    function assignPoints() {
      let inert = 0
      for (let i = 0; i < nPts; i++) {
        let best = 0, bd = Infinity
        for (let c = 0; c < kC; c++) {
          const dx = px[i] - cx[c], dy = py[i] - cy[c]
          const dd = dx * dx + dy * dy
          if (dd < bd) { bd = dd; best = c }
        }
        assign[i] = best
        inert += bd
      }
      inertia = inert * 10000 // coords live in [0,1]; scale to a readable WCSS
    }

    function kmeanspp() {
      const first = (Math.random() * nPts) | 0
      cx[0] = px[first]; cy[0] = py[first]
      const d2 = new Float64Array(nPts).fill(Infinity)
      for (let c = 1; c < kC; c++) {
        let sum = 0
        for (let i = 0; i < nPts; i++) {
          const dx = px[i] - cx[c - 1], dy = py[i] - cy[c - 1]
          const dd = dx * dx + dy * dy
          if (dd < d2[i]) d2[i] = dd
          sum += d2[i]
        }
        let r = Math.random() * sum, pick = nPts - 1
        for (let i = 0; i < nPts; i++) { r -= d2[i]; if (r <= 0) { pick = i; break } }
        cx[c] = px[pick]; cy[c] = py[pick]
      }
    }

    function computeMeans() {
      counts.fill(0)
      const sx = new Float64Array(kC), sy = new Float64Array(kC)
      for (let i = 0; i < nPts; i++) { const c = assign[i]; sx[c] += px[i]; sy[c] += py[i]; counts[c]++ }
      for (let c = 0; c < kC; c++) {
        if (counts[c] > 0) { targetx[c] = sx[c] / counts[c]; targety[c] = sy[c] / counts[c] }
        else { targetx[c] = cx[c]; targety[c] = cy[c] } // empty cluster: hold position
      }
    }

    function reseed(t: number, k: number, np: number, nb: number) {
      kC = k; nPts = np
      px = new Float64Array(np); py = new Float64Array(np); assign = new Int32Array(np)
      cx = new Float64Array(k); cy = new Float64Array(k)
      startx = new Float64Array(k); starty = new Float64Array(k)
      targetx = new Float64Array(k); targety = new Float64Array(k)
      counts = new Int32Array(k)
      const bx = new Float64Array(nb), by = new Float64Array(nb)
      for (let i = 0; i < nb; i++) { bx[i] = 0.15 + Math.random() * 0.7; by[i] = 0.15 + Math.random() * 0.7 }
      const std = 0.07
      for (let i = 0; i < np; i++) {
        const b = (Math.random() * nb) | 0
        px[i] = clamp01(bx[b] + gauss() * std)
        py[i] = clamp01(by[b] + gauss() * std)
      }
      kmeanspp()
      assignPoints()
      iteration = 0
      phase = 'assign'
      phaseStartT = t
      voroSig = Number.NaN
    }

    function drawVoronoi() {
      if (!octx || !oimg) return
      const d = oimg.data
      for (let vy = 0; vy < VH; vy++) {
        const ny = vy / (VH - 1)
        for (let vx = 0; vx < VW; vx++) {
          const nx = vx / (VW - 1)
          let best = 0, bd = Infinity
          for (let c = 0; c < kC; c++) {
            const dx = nx - cx[c], dy = ny - cy[c]
            const dd = dx * dx + dy * dy
            if (dd < bd) { bd = dd; best = c }
          }
          const col = prgb[best % prgb.length]
          const idx = (vy * VW + vx) * 4
          d[idx] = col[0]; d[idx + 1] = col[1]; d[idx + 2] = col[2]; d[idx + 3] = 44
        }
      }
      octx.putImageData(oimg, 0, 0)
    }

    return {
      step(t, p) {
        const k = Math.round(cr(p.k as number, 2, 6))
        const np = Math.round(cr(p.points as number, 60, 300))
        const nb = Math.round(cr(p.blobs as number, 2, 6))
        const speed = cr(p.speed as number, 0.25, 3)

        // Reset all state when a structural param changes.
        const key = `${k}|${np}|${nb}`
        if (key !== lastKey) { reseed(t, k, np, nb); lastKey = key }

        const interval = 500 / speed
        const elapsed = t - phaseStartT

        if (phase === 'assign') {
          if (elapsed >= interval) {
            computeMeans()
            startx.set(cx); starty.set(cy)
            phase = 'update'; phaseStartT = t
          }
        } else if (phase === 'update') {
          const frac = clamp01(elapsed / interval)
          const e = frac < 0.5 ? 2 * frac * frac : 1 - Math.pow(-2 * frac + 2, 2) / 2
          for (let c = 0; c < kC; c++) {
            cx[c] = startx[c] + (targetx[c] - startx[c]) * e
            cy[c] = starty[c] + (targety[c] - starty[c]) * e
          }
          if (elapsed >= interval) {
            let maxMove = 0
            for (let c = 0; c < kC; c++) {
              const dx = targetx[c] - startx[c], dy = targety[c] - starty[c]
              cx[c] = targetx[c]; cy[c] = targety[c]
              const m = Math.sqrt(dx * dx + dy * dy)
              if (m > maxMove) maxMove = m
            }
            iteration++
            assignPoints()
            if (maxMove < 0.002) { phase = 'converged'; convergeT = t }
            else { phase = 'assign'; phaseStartT = t }
          }
        } else if (t - convergeT >= 1500) {
          reseed(t, k, np, nb)
        }

        // ---- render ----
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)

        // Voronoi cells (recompute only when centroids moved).
        let sig = kC * 977
        for (let c = 0; c < kC; c++) sig += cx[c] * 31.7 + cy[c] * 57.3
        if (sig !== voroSig) { drawVoronoi(); voroSig = sig }
        if (octx && oimg) {
          ctx.save()
          ctx.globalAlpha = 0.5
          ctx.imageSmoothingEnabled = true
          ctx.drawImage(off, plotL, plotT, plotW, plotH)
          ctx.restore()
        }

        // Points, batched one path per cluster colour.
        ctx.save()
        ctx.globalAlpha = 0.9
        for (let c = 0; c < kC; c++) {
          ctx.fillStyle = PALETTE[c % PALETTE.length]
          ctx.beginPath()
          for (let i = 0; i < nPts; i++) {
            if (assign[i] !== c) continue
            const x = toX(px[i]), y = toY(py[i])
            ctx.moveTo(x + 2.3, y)
            ctx.arc(x, y, 2.3, 0, TAU)
          }
          ctx.fill()
        }
        ctx.restore()

        // Centroids as large ringed markers.
        for (let c = 0; c < kC; c++) {
          const x = toX(cx[c]), y = toY(cy[c]), col = PALETTE[c % PALETTE.length]
          ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU)
          ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.95; ctx.stroke()
          ctx.beginPath(); ctx.arc(x, y, 5.5, 0, TAU)
          ctx.fillStyle = col; ctx.globalAlpha = 1; ctx.fill()
          ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU)
          ctx.fillStyle = theme.bg; ctx.globalAlpha = 0.9; ctx.fill()
        }
        ctx.globalAlpha = 1

        // Header + footer readouts in theme.fg.
        ctx.save()
        ctx.fillStyle = theme.fg
        ctx.textBaseline = 'alphabetic'
        ctx.font = 'bold 12px ui-monospace, monospace'
        ctx.textAlign = 'left'
        ctx.globalAlpha = 0.9
        ctx.fillText("k-Means · Lloyd's algorithm", plotL, 21)
        ctx.textAlign = 'right'
        ctx.font = '11px ui-monospace, monospace'
        ctx.globalAlpha = 0.72
        const tag = phase === 'converged' ? '  ✓ converged' : ''
        ctx.fillText(`iteration ${iteration}   WCSS ${Math.round(inertia)}${tag}`, w - plotL, 21)
        ctx.textAlign = 'left'
        ctx.font = '10px ui-monospace, monospace'
        ctx.globalAlpha = 0.4
        const label = phase === 'assign'
          ? 'assign each point to its nearest centroid'
          : phase === 'update'
            ? 'move each centroid to its cluster mean'
            : 'converged — pausing, then reseeding'
        ctx.fillText(label, plotL, h - 10)
        ctx.restore()
      },
    }
  },
}
