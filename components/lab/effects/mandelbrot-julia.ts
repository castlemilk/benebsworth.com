import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Mandelbrot & Julia
 *
 * Escape-time fractal renderer for the quadratic map z → z² + c.
 *   - 'mandelbrot': z₀ = 0, c ranges over the pixels (the static c-plane).
 *   - 'julia':      c is fixed, z₀ ranges over the pixels.
 *
 * The heavy per-pixel iteration runs into a REDUCED-resolution offscreen
 * canvas (~half size, capped at 320×200) and is scaled up to fill the
 * frame. The smooth iteration count is cached in nuBuf; Mandelbrot only
 * recolours the cache each frame (cheap palette cycling), while Julia
 * re-iterates on a ~20fps throttle as its c drifts and the set morphs.
 */
export const controls: ControlSpec[] = [
  {
    key: 'mode',
    label: 'Set',
    type: 'select',
    options: [
      { label: 'Julia (morphing)', value: 'julia' },
      { label: 'Mandelbrot', value: 'mandelbrot' },
    ],
  },
  { key: 'maxIter', label: 'Max iterations', type: 'range', min: 40, max: 300, step: 10 },
  { key: 'zoom', label: 'Zoom', type: 'range', min: 0.5, max: 6, step: 0.1 },
  { key: 'colourCycle', label: 'Colour cycle', type: 'range', min: 0, max: 2, step: 0.05 },
]

export const defaults: Params = {
  mode: 'julia',
  maxIter: 140,
  zoom: 1.3,
  colourCycle: 0.6,
}

// Brand-tinted cyclic palette: teal → cyan → purple → violet → orange → amber → teal.
const PALETTE_STOPS: { t: number; c: [number, number, number] }[] = [
  { t: 0.0, c: [0, 224, 184] },   // teal   #00e0b8
  { t: 0.18, c: [0, 180, 216] },  // cyan   #00b4d8
  { t: 0.4, c: [124, 92, 255] },  // purple #7c5cff
  { t: 0.56, c: [167, 139, 250] },// violet #a78bfa
  { t: 0.76, c: [255, 122, 89] }, // orange #ff7a59
  { t: 0.9, c: [245, 166, 35] },  // amber  #f5a623
  { t: 1.0, c: [0, 224, 184] },   // wrap back to teal (seamless cycle)
]

// Interior of the set (never escaped) reads as a dark silhouette.
const INTERIOR: [number, number, number] = [7, 6, 14]

// Julia c drifts slowly around a small circle near a detailed connected set.
const JULIA_C0_RE = -0.7
const JULIA_C0_IM = 0.27015
const JULIA_ORBIT_R = 0.05

const LN2 = Math.log(2)

function buildPalette(): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 3)
  for (let i = 0; i < 256; i++) {
    const t = i / 256
    let a = PALETTE_STOPS[0]
    let b = PALETTE_STOPS[PALETTE_STOPS.length - 1]
    for (let s = 0; s < PALETTE_STOPS.length - 1; s++) {
      if (t >= PALETTE_STOPS[s].t && t <= PALETTE_STOPS[s + 1].t) {
        a = PALETTE_STOPS[s]; b = PALETTE_STOPS[s + 1]; break
      }
    }
    const span = b.t - a.t || 1
    const f = (t - a.t) / span
    lut[i * 3] = a.c[0] + (b.c[0] - a.c[0]) * f
    lut[i * 3 + 1] = a.c[1] + (b.c[1] - a.c[1]) * f
    lut[i * 3 + 2] = a.c[2] + (b.c[2] - a.c[2]) * f
  }
  return lut
}

export const MandelbrotJulia: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims

    // Reduced-resolution offscreen buffer (~half size, capped at 320×200),
    // aspect-matched to the canvas so it upscales to fill without distortion.
    const scale = Math.min(0.5, 320 / w, 200 / h)
    const rw = Math.max(1, Math.round(w * scale))
    const rh = Math.max(1, Math.round(h * scale))

    const off = document.createElement('canvas')
    off.width = rw
    off.height = rh
    const octx = off.getContext('2d')!
    const img = octx.createImageData(rw, rh)
    const data = img.data
    for (let i = 3; i < data.length; i += 4) data[i] = 255 // opaque once

    // Smooth iteration count per pixel; −1 marks interior (never escaped).
    const nuBuf = new Float32Array(rw * rh)
    const palette = buildPalette()

    let lastKey = ''
    let lastComputeMs = -1e9

    // Iterate the escape-time map into nuBuf for the current view/params.
    function compute(isJulia: boolean, maxIter: number, zoom: number, cRe: number, cIm: number) {
      const centreRe = isJulia ? 0 : -0.6
      const centreIm = 0
      const viewH = (isJulia ? 3.2 : 2.8) / zoom
      const viewW = viewH * (rw / rh)
      const re0 = centreRe - viewW * 0.5
      const im0 = centreIm - viewH * 0.5
      const dRe = viewW / rw
      const dIm = viewH / rh
      const ESCAPE2 = 1e4 // large bailout → smooth, low-banding nu
      let idx = 0
      for (let py = 0; py < rh; py++) {
        const pim = im0 + py * dIm
        for (let px = 0; px < rw; px++) {
          const pre = re0 + px * dRe
          let zr: number, zi: number, kr: number, ki: number
          if (isJulia) { zr = pre; zi = pim; kr = cRe; ki = cIm }
          else { zr = 0; zi = 0; kr = pre; ki = pim }
          let n = 0
          let zr2 = zr * zr
          let zi2 = zi * zi
          while (n < maxIter && zr2 + zi2 <= ESCAPE2) {
            zi = 2 * zr * zi + ki
            zr = zr2 - zi2 + kr
            zr2 = zr * zr
            zi2 = zi * zi
            n++
          }
          if (n >= maxIter) {
            nuBuf[idx] = -1 // interior
          } else {
            // nu = n + 1 − log(log|z|)/log2  (smooth escape-time colouring)
            const mag = Math.sqrt(zr2 + zi2)
            nuBuf[idx] = n + 1 - Math.log(Math.log(mag)) / LN2
          }
          idx++
        }
      }
    }

    // Map the cached nuBuf → RGBA with the moving palette offset, then blit.
    function paint(density: number, offset: number) {
      const n = rw * rh
      for (let i = 0; i < n; i++) {
        const nu = nuBuf[i]
        const o = i * 4
        if (nu < 0) {
          data[o] = INTERIOR[0]; data[o + 1] = INTERIOR[1]; data[o + 2] = INTERIOR[2]
        } else {
          let t = nu * 0.028 * density + offset
          t -= Math.floor(t) // wrap into [0,1)
          const pi = ((t * 256) & 255) * 3
          data[o] = palette[pi]; data[o + 1] = palette[pi + 1]; data[o + 2] = palette[pi + 2]
        }
      }
      octx.putImageData(img, 0, 0)
    }

    return {
      step(t, p) {
        const mode = (p.mode as string) ?? 'julia'
        const maxIter = Math.round((p.maxIter as number) ?? 140)
        const zoom = (p.zoom as number) ?? 1.3
        const colourCycle = (p.colourCycle as number) ?? 0.6
        const isJulia = mode === 'julia'

        // Julia c drifts around a small circle → the set morphs continuously.
        const angle = t * 0.00025
        const cRe = isJulia ? JULIA_C0_RE + JULIA_ORBIT_R * Math.cos(angle) : 0
        const cIm = isJulia ? JULIA_C0_IM + JULIA_ORBIT_R * Math.sin(angle) : 0

        // Structural key: any change fully rebuilds the cached buffer.
        const key = `${mode}|${maxIter}|${zoom.toFixed(2)}`
        const structuralChange = key !== lastKey
        // Recompute the heavy iteration only on change, or — in Julia mode where
        // c animates — on a ~20fps throttle. Mandelbrot's plane is static, so it
        // just recolours the cached buffer each frame (cheap palette cycling).
        const throttled = isJulia && t - lastComputeMs >= 50
        if (structuralChange || throttled) {
          compute(isJulia, maxIter, zoom, cRe, cIm)
          lastKey = key
          lastComputeMs = t
        }

        // Density from the colour-cycle knob; Mandelbrot rotates the palette
        // over time, Julia holds it still (its own motion is the morph).
        const density = 0.5 + colourCycle
        const offset = isJulia ? 0 : t * 0.00006
        paint(density, offset)

        // Clear (theme-aware) then upscale the reduced buffer to fill the frame.
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)
        ctx.imageSmoothingEnabled = true
        ctx.drawImage(off, 0, 0, w, h)

        // Caption in theme.fg over a theme-aware scrim (adapts to light/dark).
        const label = isJulia
          ? `Julia · c = ${cRe.toFixed(3)} ${cIm >= 0 ? '+' : '−'} ${Math.abs(cIm).toFixed(3)}i · ${maxIter} iter`
          : `Mandelbrot · zoom ${zoom.toFixed(1)}× · ${maxIter} iter`
        ctx.font = '10px monospace'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        const tw = ctx.measureText(label).width
        ctx.globalAlpha = 0.6
        ctx.fillStyle = theme.bg
        ctx.fillRect(6, 6, tw + 10, 16)
        ctx.globalAlpha = 0.85
        ctx.fillStyle = theme.fg
        ctx.fillText(label, 11, 9)
        ctx.globalAlpha = 1
      },
    }
  },
}
