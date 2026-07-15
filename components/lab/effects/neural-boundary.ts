import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Neural Decision Boundary — a tiny MLP (2 → H → 1) trained live with
 * full-batch gradient descent + binary cross-entropy on a 2D toy dataset.
 * Each frame runs a few gradient steps; every ~4 frames the net is evaluated
 * on a coarse 44×44 grid and painted as a diverging heatmap (indigo ↔ orange)
 * behind the labelled points. The 0.5 contour is the decision boundary: it
 * bends as the loss falls, then pauses on convergence and reinitialises.
 *   h = φ(W₁·x + b₁),  ŷ = σ(w₂·h + b₂),  ∂L/∂z = ŷ − t  (sigmoid + BCE)
 */
export const controls: ControlSpec[] = [
  { key: 'dataset', label: 'Dataset', type: 'select', options: [
    { label: 'Spiral', value: 'spiral' }, { label: 'Moons', value: 'moons' },
    { label: 'Circles', value: 'circles' }, { label: 'XOR', value: 'xor' },
  ] },
  { key: 'hidden', label: 'Hidden units', type: 'range', min: 4, max: 24, step: 2 },
  { key: 'lr', label: 'Learning rate', type: 'range', min: 0.01, max: 0.5, step: 0.01 },
  { key: 'activation', label: 'Activation', type: 'select', options: [
    { label: 'tanh', value: 'tanh' }, { label: 'ReLU', value: 'relu' },
  ] },
]

export const defaults: Params = { dataset: 'spiral', hidden: 12, lr: 0.1, activation: 'tanh' }

const GRID = 44
const NUM = 200
const STEPS = 10         // gradient (full-batch) steps per frame
const MAX_EPOCHS = 4500
const STALL_LIMIT = 600  // epochs without loss improvement → converged
const HOLD_MS = 900      // pause on the converged surface before reinit
const VIEW = 1.28        // half-extent of the data view (tighter axis)

const INDIGO: readonly [number, number, number] = [99, 102, 241]
const ORANGE: readonly [number, number, number] = [255, 122, 89]

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const s = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]
}
// Numerically stable logistic.
function sigmoid(z: number): number {
  if (z >= 0) { const e = Math.exp(-z); return 1 / (1 + e) }
  const e = Math.exp(z); return e / (1 + e)
}
// Approx N(0, ~0.29) from four uniforms — cheap and good enough for init/noise.
function gauss(): number {
  return (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 0.5
}

// Fill point/label buffers for the chosen toy dataset. Coordinates land in
// roughly [-1.1, 1.1] so the VIEW window frames them with margin.
function makeData(kind: string, px: Float64Array, py: Float64Array, lab: Uint8Array) {
  const half = NUM >> 1
  for (let i = 0; i < NUM; i++) {
    const c = i < half ? 0 : 1
    if (kind === 'xor') {
      const x = Math.random() * 2 - 1, y = Math.random() * 2 - 1
      px[i] = x; py[i] = y; lab[i] = (x > 0) === (y > 0) ? 0 : 1
    } else if (kind === 'circles') {
      const r = (c === 0 ? 0.32 : 0.82) + gauss() * 0.05
      const a = Math.random() * Math.PI * 2
      px[i] = r * Math.cos(a); py[i] = r * Math.sin(a); lab[i] = c
    } else if (kind === 'moons') {
      const t = Math.random() * Math.PI
      const x = c === 0 ? Math.cos(t) : 1 - Math.cos(t)
      const y = c === 0 ? Math.sin(t) : 0.5 - Math.sin(t)
      px[i] = (x - 0.5) * 0.78 + gauss() * 0.05
      py[i] = (y - 0.25) * 0.9 + gauss() * 0.05
      lab[i] = c
    } else { // spiral: two interleaved arms
      const k = (i % half) / half
      const r = 0.14 + k * 0.9
      const th = k * 1.5 * Math.PI + c * Math.PI + gauss() * 0.12
      px[i] = r * Math.cos(th); py[i] = r * Math.sin(th); lab[i] = c
    }
  }
}

export const NeuralBoundary: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims
    const bg = hexRgb(theme.bg)

    // Aspect-correct view extents so circles stay circular on a wide canvas.
    const aspect = w / h
    const viewX = aspect >= 1 ? VIEW * aspect : VIEW
    const viewY = aspect >= 1 ? VIEW : VIEW / aspect
    const sx = (x: number) => Math.max(0, Math.min(w, (x + viewX) / (2 * viewX) * w))
    const sy = (y: number) => Math.max(0, Math.min(h, (viewY - y) / (2 * viewY) * h))

    // Dataset buffers.
    const px = new Float64Array(NUM), py = new Float64Array(NUM)
    const lab = new Uint8Array(NUM)

    // Net weights (reallocated on (re)init so H can change).
    let H = 0, b2 = 0
    let W1 = new Float64Array(0), b1 = new Float64Array(0), W2 = new Float64Array(0)
    let gW1 = new Float64Array(0), gb1 = new Float64Array(0), gW2 = new Float64Array(0)
    let z1 = new Float64Array(0), a1 = new Float64Array(0)

    // Offscreen coarse heatmap, upscaled behind the data each frame.
    const off = document.createElement('canvas')
    off.width = GRID; off.height = GRID
    const octx = off.getContext('2d')!
    const heat = octx.createImageData(GRID, GRID)
    for (let i = 3; i < heat.data.length; i += 4) heat.data[i] = 255

    let epoch = 0, loss = 1, bestLoss = Infinity, stall = 0
    let phase: 'train' | 'hold' = 'train'
    let holdUntil = 0, frame = 0, lastKey = ''

    function initNet(hUnits: number, relu: boolean) {
      H = hUnits
      W1 = new Float64Array(H * 2); b1 = new Float64Array(H); W2 = new Float64Array(H)
      gW1 = new Float64Array(H * 2); gb1 = new Float64Array(H); gW2 = new Float64Array(H)
      z1 = new Float64Array(H); a1 = new Float64Array(H)
      const s1 = relu ? 1.8 : 1.4
      for (let i = 0; i < H * 2; i++) W1[i] = gauss() * s1
      for (let j = 0; j < H; j++) { b1[j] = relu ? 0.05 : 0; W2[j] = gauss() * 1.4 / Math.sqrt(H) }
      b2 = 0
      epoch = 0; loss = 1; bestLoss = Infinity; stall = 0; phase = 'train'
    }

    // One full-batch gradient step. Returns the mean BCE loss.
    function trainEpoch(lr: number, relu: boolean): number {
      gW1.fill(0); gb1.fill(0); gW2.fill(0)
      let gb2 = 0, L = 0
      for (let n = 0; n < NUM; n++) {
        const x = px[n], y = py[n], t = lab[n]
        let z2 = b2
        for (let j = 0; j < H; j++) {
          const z = W1[j * 2] * x + W1[j * 2 + 1] * y + b1[j]
          z1[j] = z
          const a = relu ? (z > 0 ? z : 0) : Math.tanh(z)
          a1[j] = a; z2 += W2[j] * a
        }
        const yh = sigmoid(z2)
        L += -(t * Math.log(yh + 1e-7) + (1 - t) * Math.log(1 - yh + 1e-7))
        const dz2 = yh - t
        gb2 += dz2
        for (let j = 0; j < H; j++) {
          gW2[j] += dz2 * a1[j]
          const der = relu ? (z1[j] > 0 ? 1 : 0) : (1 - a1[j] * a1[j])
          const dz = dz2 * W2[j] * der
          gW1[j * 2] += dz * x; gW1[j * 2 + 1] += dz * y; gb1[j] += dz
        }
      }
      const sc = lr / NUM
      for (let i = 0; i < H * 2; i++) W1[i] -= sc * gW1[i]
      for (let j = 0; j < H; j++) { b1[j] -= sc * gb1[j]; W2[j] -= sc * gW2[j] }
      b2 -= sc * gb2
      return L / NUM
    }

    // Paint the decision surface into the offscreen ImageData.
    function recompute(relu: boolean) {
      const d = heat.data
      for (let j = 0; j < GRID; j++) {
        const dy = viewY - (j + 0.5) / GRID * 2 * viewY
        for (let i = 0; i < GRID; i++) {
          const dx = -viewX + (i + 0.5) / GRID * 2 * viewX
          let z2 = b2
          for (let m = 0; m < H; m++) {
            const z = W1[m * 2] * dx + W1[m * 2 + 1] * dy + b1[m]
            z2 += W2[m] * (relu ? (z > 0 ? z : 0) : Math.tanh(z))
          }
          const o = sigmoid(z2)
          const conf = Math.pow(Math.min(1, Math.abs(o - 0.5) * 2), 0.8) // 0 at boundary
          const cls = o < 0.5 ? INDIGO : ORANGE
          const k = (j * GRID + i) * 4
          d[k] = bg[0] + (cls[0] - bg[0]) * conf
          d[k + 1] = bg[1] + (cls[1] - bg[1]) * conf
          d[k + 2] = bg[2] + (cls[2] - bg[2]) * conf
        }
      }
      octx.putImageData(heat, 0, 0)
    }

    return {
      step(t, p) {
        const dataset = p.dataset as string
        const hUnits = Math.round(p.hidden as number)
        const lr = p.lr as number
        const relu = (p.activation as string) === 'relu'

        // Reset ALL state when a structural param changes (lr is live-only).
        const key = `${dataset}|${hUnits}|${relu}`
        if (key !== lastKey) {
          makeData(dataset, px, py, lab)
          initNet(hUnits, relu)
          recompute(relu)
          frame = 0
          lastKey = key
        }

        if (phase === 'train') {
          for (let s = 0; s < STEPS; s++) { loss = trainEpoch(lr, relu); epoch++ }
          if (loss < bestLoss - 1e-4) { bestLoss = loss; stall = 0 } else stall += STEPS
          if (loss < 0.05 || stall > STALL_LIMIT || epoch > MAX_EPOCHS) {
            phase = 'hold'; holdUntil = t + HOLD_MS
          }
          if (frame % 4 === 0) recompute(relu)
        } else if (t > holdUntil) {
          // Converged: regenerate data + weights and train again.
          makeData(dataset, px, py, lab)
          initNet(hUnits, relu)
          recompute(relu)
          frame = 0
        }
        frame++

        // Decision surface (upscaled, smoothed) behind the data.
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)
        ctx.imageSmoothingEnabled = true
        ctx.globalAlpha = 0.92
        ctx.drawImage(off, 0, 0, GRID, GRID, 0, 0, w, h)
        ctx.globalAlpha = 1

        // Labelled points, ringed in bg so they read against their own class.
        for (let n = 0; n < NUM; n++) {
          ctx.beginPath()
          ctx.arc(sx(px[n]), sy(py[n]), 3.1, 0, Math.PI * 2)
          ctx.fillStyle = lab[n] === 0 ? '#a5b4fc' : '#fdba74'
          ctx.fill()
          ctx.lineWidth = 1.2
          ctx.globalAlpha = 0.85
          ctx.strokeStyle = theme.bg
          ctx.stroke()
          ctx.globalAlpha = 1
        }

        // Readout panel.
        ctx.save()
        ctx.fillStyle = theme.bg; ctx.globalAlpha = 0.5
        ctx.fillRect(12, 12, 148, 44)
        ctx.globalAlpha = 1
        ctx.fillStyle = theme.fg
        ctx.font = 'bold 13px monospace'
        ctx.fillText(`epoch ${epoch}`, 22, 32)
        ctx.globalAlpha = 0.72
        ctx.font = '11px monospace'
        ctx.fillText(`loss ${loss.toFixed(3)}`, 22, 48)
        ctx.restore()

        // Footer.
        ctx.save()
        ctx.fillStyle = theme.fg; ctx.globalAlpha = 0.5
        ctx.font = '11px monospace'
        const tail = phase === 'hold' ? ' · converged, reinitialising' : ''
        ctx.fillText(`${dataset} · ${H}h · ${relu ? 'relu' : 'tanh'}${tail}`, 14, h - 14)
        ctx.restore()
      },
    }
  },
}
