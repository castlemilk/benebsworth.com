import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

// ── Gray-Scott presets ────────────────────────────────────────────────
// Each (F, k) pair lives in a different region of the Pearson parameter
// space and grows a qualitatively different Turing pattern.
const PRESETS: Record<string, { F: number; k: number; label: string }> = {
  spots: { F: 0.035, k: 0.065, label: 'spots' },
  coral: { F: 0.0545, k: 0.062, label: 'coral' },
  maze: { F: 0.029, k: 0.057, label: 'maze' },
  mitosis: { F: 0.0367, k: 0.0649, label: 'mitosis' },
  waves: { F: 0.014, k: 0.054, label: 'waves' },
  custom: { F: 0.037, k: 0.06, label: 'custom' },
}

export const controls: ControlSpec[] = [
  {
    key: 'preset',
    label: 'Pattern',
    type: 'select',
    options: [
      { label: 'Spots', value: 'spots' },
      { label: 'Coral', value: 'coral' },
      { label: 'Maze', value: 'maze' },
      { label: 'Mitosis (dividing)', value: 'mitosis' },
      { label: 'Waves', value: 'waves' },
      { label: 'Custom (use F/k)', value: 'custom' },
    ],
  },
  { key: 'feed', label: 'Feed rate F', type: 'range', min: 0.01, max: 0.07, step: 0.001 },
  { key: 'kill', label: 'Kill rate k', type: 'range', min: 0.04, max: 0.07, step: 0.001 },
  { key: 'speed', label: 'Speed (steps/frame)', type: 'range', min: 2, max: 16, step: 1 },
  { key: 'reseed', label: 'Reseed', type: 'toggle' },
]

export const defaults: Params = {
  preset: 'maze',
  feed: 0.029,
  kill: 0.057,
  speed: 14,
  reseed: false,
}

// NO synchronous warm-up. The first painted frame shows the bare seed blobs and
// the entire formation then plays out live on screen — the reader watches the
// spots grow in and settle, which is the whole point of the lead lab. (Any
// meaningful warm-up here made the canvas look frozen: the pattern formed before
// the first paint, so a static steady state like 'spots'/'maze' only "moved"
// when a knob forced a reset, and even the periodic re-seed was invisible
// because it re-formed synchronously between paints.)
const WARMUP_STEPS = 0

// ── Diffusion constants ───────────────────────────────────────────────
// 3x3 Laplacian kernel (von Neumann + diagonal weights). The centre is
// −1 so the kernel sums to zero; orthogonal neighbours weigh 0.2 and
// diagonals 0.05 — the standard Gray-Scott stencil.
const DU = 0.16
const DV = 0.08
const DT = 1.0

// Keep cell count manageable for plain JS on the main thread.
const MAX_GW = 220
const MAX_GH = 140

interface Fields {
  gw: number
  gh: number
  u: Float32Array
  v: Float32Array
  u2: Float32Array
  v2: Float32Array
  // Precomputed Laplacian neighbour offsets (periodic wrap) for every cell.
  // idxOrtho[i*4 + n] → flat index of the n-th orthogonal neighbour.
  // idxDiag[i*4 + n]  → flat index of the n-th diagonal neighbour.
  idxOrtho: Int32Array
  idxDiag: Int32Array
}

function buildFields(gw: number, gh: number): Fields {
  const n = gw * gh
  const u = new Float32Array(n)
  const v = new Float32Array(n)
  const u2 = new Float32Array(n)
  const v2 = new Float32Array(n)
  const idxOrtho = new Int32Array(n * 4)
  const idxDiag = new Int32Array(n * 4)
  for (let y = 0; y < gh; y++) {
    const ym = (y - 1 + gh) % gh
    const yp = (y + 1) % gh
    for (let x = 0; x < gw; x++) {
      const xm = (x - 1 + gw) % gw
      const xp = (x + 1) % gw
      const i = y * gw + x
      const o = i * 4
      idxOrtho[o] = y * gw + xm
      idxOrtho[o + 1] = y * gw + xp
      idxOrtho[o + 2] = ym * gw + x
      idxOrtho[o + 3] = yp * gw + x
      idxDiag[o] = ym * gw + xm
      idxDiag[o + 1] = ym * gw + xp
      idxDiag[o + 2] = yp * gw + xm
      idxDiag[o + 3] = yp * gw + xp
    }
  }
  return { gw, gh, u, v, u2, v2, idxOrtho, idxDiag }
}

// Nucleate: U=1 everywhere, V=0, then drop a few square blobs of
// V=0.5, U=0.25 to seed the reaction. Without a seed nothing happens —
// the trivial state U=1, V=0 is a fixed point.
function seedFields(f: Fields) {
  const { gw, gh, u, v } = f
  u.fill(1)
  v.fill(0)
  // Scatter many small V blobs across the WHOLE field (not just the centre)
  // so the pattern nucleates everywhere at once and fills the frame fast,
  // instead of slowly spreading out from one site.
  const blobs = 16
  const r = Math.max(2, Math.round(Math.min(gw, gh) * 0.035))
  for (let b = 0; b < blobs; b++) {
    const cx = Math.round((0.08 + 0.84 * Math.random()) * gw)
    const cy = Math.round((0.08 + 0.84 * Math.random()) * gh)
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx
        const y = cy + dy
        if (x < 0 || x >= gw || y < 0 || y >= gh) continue
        const i = y * gw + x
        u[i] = 0.25
        v[i] = 0.5
      }
    }
  }
}

// Additive disturbance: stamp a few fresh V blobs onto the EXISTING field
// (without clearing it) so a converged pattern keeps locally re-forming. This
// is perpetual gentle motion with no jarring full-field wipe — the spots near a
// new blob dissolve and re-knit while the rest of the frame carries on.
function perturbFields(f: Fields) {
  const { gw, gh, u, v } = f
  const blobs = 5
  const r = Math.max(2, Math.round(Math.min(gw, gh) * 0.03))
  for (let b = 0; b < blobs; b++) {
    const cx = Math.round((0.1 + 0.8 * Math.random()) * gw)
    const cy = Math.round((0.1 + 0.8 * Math.random()) * gh)
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx
        const y = cy + dy
        if (x < 0 || x >= gw || y < 0 || y >= gh) continue
        const i = y * gw + x
        u[i] = 0.25
        v[i] = 0.5
      }
    }
  }
}

// ── Colour ramp ───────────────────────────────────────────────────────
// Map v (0..~0.4) to a brand-palette ramp:
//   near-black bg → teal (#00e0b8) → purple (#7c5cff) → bright orange tip.
// Precompute a 256-entry RGB lookup so the hot pixel loop is just indexing.
function buildRamp(): Uint8Array {
  const ramp = new Uint8Array(256 * 3)
  const stops: { t: number; c: [number, number, number] }[] = [
    { t: 0.0, c: [10, 10, 14] }, // background (matches theme.bg-ish)
    { t: 0.18, c: [9, 32, 40] }, // deep teal shadow
    { t: 0.42, c: [0, 224, 184] }, // teal
    { t: 0.66, c: [124, 92, 255] }, // purple
    { t: 0.86, c: [255, 122, 89] }, // orange
    { t: 1.0, c: [255, 236, 210] }, // bright tip
  ]
  for (let i = 0; i < 256; i++) {
    const t = i / 255
    let a = stops[0]
    let b = stops[stops.length - 1]
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s].t && t <= stops[s + 1].t) {
        a = stops[s]
        b = stops[s + 1]
        break
      }
    }
    const span = b.t - a.t || 1
    const f = (t - a.t) / span
    ramp[i * 3] = Math.round(a.c[0] + (b.c[0] - a.c[0]) * f)
    ramp[i * 3 + 1] = Math.round(a.c[1] + (b.c[1] - a.c[1]) * f)
    ramp[i * 3 + 2] = Math.round(a.c[2] + (b.c[2] - a.c[2]) * f)
  }
  return ramp
}

export const reactionDiffusion: EffectModule = {
  controls,
  defaults,
  // Keep the Pattern preset and the Feed/Kill sliders coherent. The renderer
  // only uses the sliders when preset === 'custom', so without this the F/k
  // knobs look live but do nothing under a named preset. Here: editing F or k
  // flips to 'custom' (so the slider drives the sim); picking a named preset
  // loads its F/k into the sliders (so they reflect the active values).
  reconcileParams(params, change) {
    if (change && (change.key === 'feed' || change.key === 'kill')) {
      return { ...params, [change.key]: change.value, preset: 'custom' }
    }
    const next = change ? { ...params, [change.key]: change.value } : { ...params }
    const presetKey = next.preset as string
    if (presetKey && presetKey !== 'custom') {
      const p = PRESETS[presetKey] ?? PRESETS.custom
      next.feed = p.F
      next.kill = p.k
    }
    return next
  },
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h, dpr } = dims
    const fg = theme.fg

    // Device-pixel canvas size. putImageData ignores the ctx transform, so
    // we build the ImageData at the real backing-store resolution and write
    // it at (0,0); the grid is sampled per device pixel (nearest-neighbour
    // upscale) so the field fills the whole canvas crisply.
    const dw = Math.max(1, Math.round(w * dpr))
    const dh = Math.max(1, Math.round(h * dpr))

    // Simulation grid: capped cell count, aspect-matched to the canvas.
    const gw = Math.max(16, Math.min(MAX_GW, Math.round(w)))
    const gh = Math.max(16, Math.min(MAX_GH, Math.round(h)))

    const fields = buildFields(gw, gh)
    seedFields(fields)

    const ramp = buildRamp()
    const img = ctx.createImageData(dw, dh)
    const data = img.data
    // Set alpha to fully opaque once; we only overwrite RGB each frame.
    for (let i = 3; i < data.length; i += 4) data[i] = 255

    // Precompute the device-pixel → grid-cell column/row mapping once so the
    // render loop never divides per pixel.
    const colOf = new Int32Array(dw)
    for (let px = 0; px < dw; px++) colOf[px] = Math.min(gw - 1, (px * gw / dw) | 0)
    const rowOf = new Int32Array(dh)
    for (let py = 0; py < dh; py++) rowOf[py] = Math.min(gh - 1, (py * gh / dh) | 0)

    let lastKey = ''
    let lastReseed = false
    // Track how long the field has been visually flat so a fully-decayed
    // pattern auto-reseeds instead of sitting on a blank canvas.
    let flatFrames = 0
    // Wall-clock time (ms) of the last activity injection (full reset OR a
    // perturbation). A converged Gray-Scott field would freeze into a still
    // image, so we periodically stamp fresh blobs onto it to keep it evolving.
    // Time-based so the cadence holds regardless of frame rate.
    let lastPerturbMs = 0

    // Advance the Gray-Scott PDE `steps` sub-steps in place (ping-pong the
    // two buffer pairs). Shared by the per-frame update and the warm-up.
    function advance(F: number, k: number, steps: number) {
      const fld = fields
      const n = fld.gw * fld.gh
      const idxO = fld.idxOrtho
      const idxD = fld.idxDiag
      let u = fld.u
      let v = fld.v
      let un = fld.u2
      let vn = fld.v2
      for (let s = 0; s < steps; s++) {
        for (let i = 0; i < n; i++) {
          const o = i * 4
          const uc = u[i]
          const vc = v[i]
          // 3x3 Laplacian: centre −1, orthogonal 0.2, diagonal 0.05.
          const lapU =
            -uc +
            0.2 * (u[idxO[o]] + u[idxO[o + 1]] + u[idxO[o + 2]] + u[idxO[o + 3]]) +
            0.05 * (u[idxD[o]] + u[idxD[o + 1]] + u[idxD[o + 2]] + u[idxD[o + 3]])
          const lapV =
            -vc +
            0.2 * (v[idxO[o]] + v[idxO[o + 1]] + v[idxO[o + 2]] + v[idxO[o + 3]]) +
            0.05 * (v[idxD[o]] + v[idxD[o + 1]] + v[idxD[o + 2]] + v[idxD[o + 3]])
          const uvv = uc * vc * vc
          un[i] = uc + (DU * lapU - uvv + F * (1 - uc)) * DT
          vn[i] = vc + (DV * lapV + uvv - (F + k) * vc) * DT
        }
        const tu = u; u = un; un = tu
        const tv = v; v = vn; vn = tv
      }
      fld.u = u; fld.u2 = un
      fld.v = v; fld.v2 = vn
    }

    function reset(F: number, k: number, presetKey: string) {
      seedFields(fields)
      flatFrames = 0
      // Small pre-grow so the first frame is an emerging blur, not bare seeds;
      // the rest of the formation plays out live on screen.
      advance(F, k, WARMUP_STEPS)
      lastKey = `${F.toFixed(4)}_${k.toFixed(4)}_${presetKey}`
    }

    return {
      step(timeMs, p) {
        // 1. Read params ------------------------------------------------
        const presetKey = (p.preset as string) ?? (defaults.preset as string)
        const preset = PRESETS[presetKey] ?? PRESETS.custom
        // A non-custom preset drives F/k; 'custom' uses the sliders directly.
        const F = presetKey === 'custom'
          ? ((p.feed as number) ?? (defaults.feed as number))
          : preset.F
        const k = presetKey === 'custom'
          ? ((p.kill as number) ?? (defaults.kill as number))
          : preset.k
        const speed = Math.max(1, Math.round((p.speed as number) ?? (defaults.speed as number)))
        const reseedToggle = !!p.reseed

        // 2. Reset-on-param guard: any change to F, k or the preset name
        //    reinitialises BOTH fields so the new pattern grows from scratch.
        const key = `${F.toFixed(4)}_${k.toFixed(4)}_${presetKey}`
        const doReset = () => { reset(F, k, presetKey); lastPerturbMs = timeMs }
        if (key !== lastKey) doReset()
        // Manual reseed on the rising edge of the toggle.
        if (reseedToggle && !lastReseed) doReset()
        lastReseed = reseedToggle

        // 3. Advance the simulation `speed` sub-steps with fixed dt -----
        advance(F, k, speed)
        const fld = fields
        const n = fld.gw * fld.gh
        const v = fld.v

        // 4. Render: sample V into the full-canvas ImageData ------------
        // Find the live V range so the ramp uses the available contrast.
        let vmax = 0.0001
        let vsum = 0
        for (let i = 0; i < n; i++) {
          const vi = v[i]
          if (vi > vmax) vmax = vi
          vsum += vi
        }
        const inv = 1 / vmax

        let di = 0
        for (let py = 0; py < dh; py++) {
          const rowBase = rowOf[py] * gw
          for (let px = 0; px < dw; px++) {
            const vi = v[rowBase + colOf[px]]
            // Normalise to 0..1 then index the 256-entry ramp (clamped).
            let t = vi * inv
            if (t < 0) t = 0
            else if (t > 1) t = 1
            const ri = ((t * 255) | 0) * 3
            data[di] = ramp[ri]
            data[di + 1] = ramp[ri + 1]
            data[di + 2] = ramp[ri + 2]
            di += 4
          }
        }
        ctx.putImageData(img, 0, 0)

        // Keep the canvas alive. A Gray-Scott field stops being interesting two
        // ways: it extinguishes to the trivial U=1, V≈0 state, or it converges
        // to a static steady state (spots/maze "settle and hold"). In either
        // case, after a short grace period, re-seed so the formation plays
        // again. Dynamic regimes (mitosis, waves) never settle, so meanActivity
        // stays high and they just keep moving without ever tripping this.
        const vmean = vsum / n
        if (vmax < 0.02 || vmean < 0.0008) {
          // field extinguished → full re-seed
          if (++flatFrames > 90) doReset()
        } else {
          flatFrames = 0
          // gentle perpetual life: a converged pattern would freeze, so stamp a
          // few fresh blobs onto it every ~2.2s (wall-clock). It keeps locally
          // re-forming with no jarring wipe; dynamic regimes barely notice.
          if (timeMs - lastPerturbMs > 2200) { perturbFields(fields); lastPerturbMs = timeMs }
        }

        // 5. Caption (drawn in CSS-pixel space, on top of the bitmap) ---
        const label = PRESETS[presetKey]?.label ?? presetKey
        ctx.font = '10px monospace'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        const caption = `Gray-Scott · ${label}  F=${F.toFixed(3)}  k=${k.toFixed(3)}  ${gw}×${gh}`
        // Subtle backing for legibility over bright pattern tips.
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        const tw = ctx.measureText(caption).width
        ctx.fillRect(6, 6, tw + 10, 16)
        ctx.fillStyle = fg
        ctx.fillText(caption, 11, 9)
      },
    }
  },
}
