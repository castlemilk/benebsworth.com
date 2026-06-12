import type { ControlSpec, Dims, EffectModule, Params, Renderer } from '@/lib/lab/types'

/* ------------------------------------------------------------------ */
/*  Controls & defaults                                                */
/* ------------------------------------------------------------------ */

export const controls: ControlSpec[] = [
  { key: 'layers', label: 'Layers', type: 'range', min: 1, max: 4, step: 1 },
  { key: 'petals', label: 'Petals', type: 'range', min: 3, max: 12, step: 1 },
  { key: 'innerRatio', label: 'Inner Ratio', type: 'range', min: 0.1, max: 0.9, step: 0.05 },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.1, max: 3, step: 0.1 },
  { key: 'trail', label: 'Trail', type: 'range', min: 0.01, max: 0.1, step: 0.005 },
  { key: 'color', label: 'Color', type: 'color' },
]

export const defaults: Params = {
  layers: 3,
  petals: 5,
  innerRatio: 0.38,
  speed: 1,
  trail: 0.03,
  color: '#e84393',
}

/* ------------------------------------------------------------------ */
/*  Colour helpers                                                     */
/* ------------------------------------------------------------------ */

/** Parse a hex colour into [r, g, b] 0-255. */
function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace('#', ''), 16)
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]
}

/**
 * Derive a colour for layer `i` out of `total` layers from a base hex.
 * Rotates hue in 30-60 degree offsets per layer and shifts saturation.
 */
function layerColor(base: string, i: number, total: number): string {
  const [r, g, b] = hexToRgb(base)
  // Convert to HSL-ish rotation: rotate by ~45 degrees per layer
  const angleOffset = (i / total) * Math.PI * 2
  const cos = Math.cos(angleOffset)
  const sin = Math.sin(angleOffset)
  // Simple hue rotation matrix
  const nr = Math.max(0, Math.min(255,
    r * (0.6 + 0.4 * cos) + g * (0.3 * (1 - cos) - 0.6 * sin) + b * (0.3 * (1 - cos) + 0.6 * sin)))
  const ng = Math.max(0, Math.min(255,
    r * (0.3 * (1 - cos) + 0.6 * sin) + g * (0.6 + 0.4 * cos) + b * (0.3 * (1 - cos) - 0.6 * sin)))
  const nb = Math.max(0, Math.min(255,
    r * (0.3 * (1 - cos) - 0.6 * sin) + g * (0.3 * (1 - cos) + 0.6 * sin) + b * (0.6 + 0.4 * cos)))
  return `rgb(${nr | 0},${ng | 0},${nb | 0})`
}

/* ------------------------------------------------------------------ */
/*  Hypotrochoid math                                                  */
/* ------------------------------------------------------------------ */

/**
 * Hypotrochoid position at parameter t.
 * x = (R-r)*cos(t) + d*cos((R-r)/r * t)
 * y = (R-r)*sin(t) - d*sin((R-r)/r * t)
 */
function hypotrochoid(
  t: number,
  R: number,
  r: number,
  d: number,
): [number, number] {
  const diff = R - r
  const ratio = diff / r
  return [
    diff * Math.cos(t) + d * Math.cos(ratio * t),
    diff * Math.sin(t) - d * Math.sin(ratio * t),
  ]
}

/* ------------------------------------------------------------------ */
/*  Per-layer state (typed for perf)                                   */
/* ------------------------------------------------------------------ */

interface LayerState {
  t: number          // current parametric angle
  prevX: number      // previous point x
  prevY: number      // previous point y
  R: number          // outer radius
  r: number          // inner radius
  d: number          // pen distance
  dBase: number      // base pen distance (for oscillation)
  phaseOffset: number // phase offset for each layer
  color: string       // derived colour
  alpha: number       // line alpha
}

/* ------------------------------------------------------------------ */
/*  Effect module                                                      */
/* ------------------------------------------------------------------ */

export const spirographRose: EffectModule = {
  controls,
  defaults,

  createRenderer(
    ctx: CanvasRenderingContext2D,
    dims: Dims,
    theme = { bg: '#0a0a0c', fg: '#ececf0' },
  ): Renderer {
    const { w, h } = dims
    const cx = w / 2
    const cy = h / 2
    const baseScale = Math.min(w, h) * 0.38

    // Build layer states
    let layers: LayerState[] = []

    function rebuildLayers(p: Params): void {
      const count = p.layers as number
      const petals = p.petals as number
      const innerRatio = p.innerRatio as number
      const baseColor = (p.color as string) || '#e84393'

      // Preserve existing state where possible
      const oldLayers = layers
      layers = new Array<LayerState>(count)

      for (let i = 0; i < count; i++) {
        // Each layer gets a slightly different inner ratio and petal count
        const layerRatio = innerRatio + (i - count / 2) * 0.06
        const _layerPetals = petals + (i % 2 === 0 ? 1 : -1) * (i * 0.5)
        const R = baseScale * (1 - i * 0.08)
        const r = R * Math.max(0.1, Math.min(0.9, layerRatio))
        const dBase = r * 0.8

        const old = i < oldLayers.length ? oldLayers[i] : null

        layers[i] = {
          t: old ? old.t : i * Math.PI * 0.4,
          prevX: old ? old.prevX : cx,
          prevY: old ? old.prevY : cy,
          R,
          r,
          d: old ? old.d : dBase,
          dBase,
          phaseOffset: (i / count) * Math.PI * 2,
          color: layerColor(baseColor, i, count),
          alpha: 0.85 - i * 0.12,
        }
      }
    }

    // Initial build
    let lastParams: Params | null = null

    return {
      step(timeMs: number, p: Params) {
        // Rebuild layers if params changed
        if (p !== lastParams) {
          rebuildLayers(p)
          lastParams = p
        }

        const speed = p.speed as number
        const trail = p.trail as number
        const dt = speed * 0.025 // angular increment per frame

        // Fade-trail: translucent clear over entire canvas
        ctx.save()
        ctx.globalAlpha = trail
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)
        ctx.restore()

        // Segments to draw per frame (batch)
        const segmentsPerFrame = 6

        // Draw each layer
        for (let li = 0; li < layers.length; li++) {
          const layer = layers[li]

          // Oscillate d for organic motion
          const time = timeMs / 1000
          layer.d = layer.dBase * (0.7 + 0.3 * Math.sin(time * 0.4 + layer.phaseOffset))

          ctx.beginPath()
          ctx.strokeStyle = layer.color
          ctx.globalAlpha = layer.alpha
          ctx.lineWidth = Math.max(1, 1.4 - li * 0.25)

          // Batch multiple segments into one path
          let started = false
          for (let s = 0; s < segmentsPerFrame; s++) {
            layer.t += dt

            const [px, py] = hypotrochoid(layer.t, layer.R, layer.r, layer.d)
            const sx = cx + px
            const sy = cy + py

            if (!started) {
              ctx.moveTo(layer.prevX, layer.prevY)
              started = true
            }
            ctx.lineTo(sx, sy)

            layer.prevX = sx
            layer.prevY = sy
          }

          ctx.stroke()
          ctx.globalAlpha = 1
        }
      },

      destroy() {
        layers = []
      },
    }
  },
}
