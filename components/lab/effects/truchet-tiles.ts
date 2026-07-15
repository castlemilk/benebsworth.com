import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Truchet Tiles
 *
 * A multiscale Truchet tiling. The canvas is covered by a grid of square
 * cells; each cell deterministically picks an orientation of its motif from a
 * small integer hash of (i, j, phase). For the arc motif the two quarter-circle
 * endpoints always land on edge midpoints, so neighbouring cells join into
 * continuous flowing labyrinth loops regardless of which orientation each rolled.
 *
 * Animation: a per-cell integer phase advances as a shallow diagonal gradient
 *   phase(i, j, t) = floor(v·t + m·(i + j))
 * so cells re-roll in a slow travelling wave rather than a full random re-roll
 * every frame (which would just flicker). Math.random is used ONLY to pick the
 * per-reset seed offset; every orientation after that is a pure hash.
 */
export const controls: ControlSpec[] = [
  { key: 'tiles', label: 'Tiles across', type: 'range', min: 6, max: 40, step: 1 },
  {
    key: 'style',
    label: 'Motif',
    type: 'select',
    options: [
      { label: 'Arcs', value: 'arcs' },
      { label: 'Diagonals', value: 'diagonals' },
      { label: 'Triangles', value: 'triangles' },
    ],
  },
  { key: 'reseedSpeed', label: 'Reseed wave', type: 'range', min: 0, max: 2, step: 0.05 },
  { key: 'lineWidth', label: 'Line width', type: 'range', min: 1, max: 8, step: 0.5 },
]

export const defaults: Params = {
  tiles: 16,
  style: 'arcs',
  reseedSpeed: 0.5,
  lineWidth: 3,
}

// Brand palette
const ACCENT = '#00e0b8' // teal — the travelling reseed wave
const ACCENT2 = '#7c5cff' // purple — a sparse static accent

// Small integer hash of a 3-tuple -> unsigned 32-bit. Deterministic: the only
// randomness in the whole effect is the per-reset seed offset fed into `s`.
function hash3(i: number, j: number, s: number): number {
  let h = (Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(s, 83492791)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0
  return (h ^ (h >>> 15)) >>> 0
}

// Add one cell's motif to a path sink (a Path2D or the context itself — both
// implement CanvasPath). Arcs & diagonals are stroked; triangles are filled.
function addMotif(path: CanvasPath, style: string, x: number, y: number, s: number, o: number) {
  const r = s / 2
  if (style === 'arcs') {
    if ((o & 1) === 0) {
      // quarter-circles hugging the top-left and bottom-right corners
      path.moveTo(x + r, y); path.arc(x, y, r, 0, Math.PI / 2)
      path.moveTo(x + r, y + s); path.arc(x + s, y + s, r, Math.PI, 1.5 * Math.PI)
    } else {
      // the complementary pair: top-right and bottom-left corners
      path.moveTo(x + s, y + r); path.arc(x + s, y, r, 0.5 * Math.PI, Math.PI)
      path.moveTo(x, y + r); path.arc(x, y + s, r, 1.5 * Math.PI, 2 * Math.PI)
    }
  } else if (style === 'diagonals') {
    if ((o & 1) === 0) { path.moveTo(x, y); path.lineTo(x + s, y + s) }
    else { path.moveTo(x + s, y); path.lineTo(x, y + s) }
  } else {
    // triangles: a right-angle corner triangle, corner chosen from two hash bits
    const c = o & 3
    const cx = c === 1 || c === 2 ? x + s : x
    const cy = c === 2 || c === 3 ? y + s : y
    const lx = cx === x ? x + s : x // leg end along the horizontal edge
    const ly = cy === y ? y + s : y // leg end along the vertical edge
    path.moveTo(cx, cy); path.lineTo(lx, cy); path.lineTo(cx, ly); path.closePath()
  }
}

const SLOPE = 0.14 // diagonal gradient of the phase field -> a travelling wave
const DECAY = 0.9 // per-frame fade of a cell's freshly-reseeded highlight

export const TruchetTiles: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims

    // ---- persistent renderer state (reset when structural params change) ----
    let lastKey = ''
    let cols = 0
    let rows = 0
    let cell = 0
    let seed = 0
    let phaseArr = new Int32Array(0)
    let flash = new Float32Array(0)
    let firstInit = true

    function reset(tiles: number) {
      cols = Math.max(1, tiles)
      cell = w / cols
      rows = Math.max(1, Math.ceil(h / cell))
      const n = cols * rows
      phaseArr = new Int32Array(n)
      flash = new Float32Array(n)
      seed = (Math.random() * 0x7fffffff) | 0
      firstInit = true
    }

    // Scratch list of freshly-reseeded cells, refilled each frame (idx,x,y,o).
    const flashCells: number[] = []

    return {
      step(t, p) {
        const tiles = Math.round(p.tiles as number)
        const style = p.style as string
        const reseed = p.reseedSpeed as number
        const lw = p.lineWidth as number

        // Reset ALL state when the structural params (grid / motif) change.
        const key = `${tiles}|${style}`
        if (key !== lastKey) { reset(tiles); lastKey = key }

        const wave = t * 0.0006 * reseed
        flashCells.length = 0

        // Batch by colour: most cells stroke/fill in fg, a sparse hash-picked
        // minority in purple. Both are single draw calls per frame.
        const basePath = new Path2D()
        const accentPath = new Path2D()

        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const idx = j * cols + i
            const phase = Math.floor(wave + (i + j) * SLOPE)

            // Fade any lingering highlight, then re-trigger on a phase advance.
            flash[idx] = flash[idx] > 0.001 ? flash[idx] * DECAY : 0
            if (firstInit) {
              phaseArr[idx] = phase
            } else if (phase !== phaseArr[idx]) {
              phaseArr[idx] = phase
              flash[idx] = 1
            }

            const o = hash3(i, j, phase + seed)
            const x = i * cell
            const y = j * cell
            if (flash[idx] > 0.02) flashCells.push(idx, x, y, o)

            const accent = hash3(i, j, seed + 911) % 7 === 0
            addMotif(accent ? accentPath : basePath, style, x, y, cell, o)
          }
        }
        firstInit = false

        // ---- draw ----
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)

        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = lw

        if (style === 'triangles') {
          // fill the tiles, then carve grout seams with the background colour
          ctx.globalAlpha = 0.5; ctx.fillStyle = theme.fg; ctx.fill(basePath)
          ctx.globalAlpha = 0.6; ctx.fillStyle = ACCENT2; ctx.fill(accentPath)
          ctx.globalAlpha = 1; ctx.strokeStyle = theme.bg
          ctx.stroke(basePath); ctx.stroke(accentPath)
        } else {
          ctx.globalAlpha = 0.5; ctx.strokeStyle = theme.fg; ctx.stroke(basePath)
          ctx.globalAlpha = 0.62; ctx.strokeStyle = ACCENT2; ctx.stroke(accentPath)
        }

        // Travelling reseed wave: overlay freshly re-rolled cells in teal,
        // brightness proportional to how recently they flipped.
        for (let k = 0; k < flashCells.length; k += 4) {
          const idx = flashCells[k]
          const x = flashCells[k + 1]
          const y = flashCells[k + 2]
          const o = flashCells[k + 3]
          const f = Math.max(0, Math.min(1, flash[idx]))
          ctx.beginPath()
          addMotif(ctx, style, x, y, cell, o)
          if (style === 'triangles') {
            ctx.globalAlpha = f * 0.7; ctx.fillStyle = ACCENT; ctx.fill()
          } else {
            ctx.globalAlpha = f * 0.85; ctx.strokeStyle = ACCENT
            ctx.lineWidth = lw + 1.2; ctx.stroke()
          }
        }

        ctx.globalAlpha = 1
        ctx.lineWidth = lw
      },
    }
  },
}
