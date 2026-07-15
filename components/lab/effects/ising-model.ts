import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * 2D Ising Model — Metropolis Monte Carlo on an L×L periodic lattice.
 *
 * Every cell is a spin s = ±1. The energy rewards neighbours that agree:
 *   E = −J Σ⟨ij⟩ s_i s_j − h Σ_i s_i
 * We sample configurations with the Metropolis rule: pick a random site,
 * compute the cost of flipping it,
 *   ΔE = 2·J·s·(sum of 4 periodic neighbours) + 2·h·s
 * and flip if ΔE ≤ 0, else with probability exp(−ΔE/T). Below the critical
 * temperature Tc = 2J/ln(1+√2) large aligned domains form; above it the
 * lattice is salt-and-pepper disorder.
 *
 * The lattice lives in a persistent Int8Array and is painted through a
 * device-pixel ImageData (nearest-neighbour upscale) so it fills the canvas
 * cheaply at any size.
 */

const L = 96
const LN1P_SQRT2 = Math.log(1 + Math.SQRT2) // ≈ 0.8814

export const controls: ControlSpec[] = [
  { key: 'temperature', label: 'Temperature T', type: 'range', min: 0.5, max: 4.0, step: 0.05 },
  { key: 'J', label: 'Coupling J', type: 'range', min: 0.2, max: 2.0, step: 0.1 },
  { key: 'h', label: 'Field h', type: 'range', min: -0.5, max: 0.5, step: 0.05 },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.2, max: 4, step: 0.1 },
]

export const defaults: Params = {
  temperature: 2.2,
  J: 1.0,
  h: 0.0,
  speed: 1,
}

// Up-spins glow brand orange; down-spins sit in a dark teal/indigo.
const UP: readonly [number, number, number] = [255, 122, 89] // #ff7a59
const DOWN: readonly [number, number, number] = [20, 70, 82] // deep teal

export const IsingModel: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h, dpr } = dims

    // Persistent spin lattice (±1) — the only heavyweight state.
    const spins = new Int8Array(L * L)

    // Periodic wrap lookup so the hot loop avoids a modulo. The lattice is
    // square, so the same table serves both columns (x) and rows (y).
    const wm = new Int32Array(L)
    const wp = new Int32Array(L)
    for (let i = 0; i < L; i++) {
      wm[i] = (i - 1 + L) % L
      wp[i] = (i + 1) % L
    }

    // Device-pixel ImageData that fills the whole backing store. putImageData
    // ignores the ctx transform, so we build at real resolution and blit at
    // (0,0); each device pixel samples its lattice cell (nearest-neighbour).
    const dw = Math.max(1, Math.round(w * dpr))
    const dh = Math.max(1, Math.round(h * dpr))
    const img = ctx.createImageData(dw, dh)
    const data = img.data
    for (let i = 3; i < data.length; i += 4) data[i] = 255 // opaque, set once

    const colOf = new Int32Array(dw)
    for (let px = 0; px < dw; px++) colOf[px] = Math.min(L - 1, (px * L / dw) | 0)
    const rowOf = new Int32Array(dh)
    for (let py = 0; py < dh; py++) rowOf[py] = Math.min(L - 1, (py * L / dh) | 0)

    let lastKey = ''
    let alignedMs = -1 // wall-clock when |M| first crossed the frozen threshold

    function randomise() {
      for (let i = 0; i < L * L; i++) spins[i] = Math.random() < 0.5 ? 1 : -1
      alignedMs = -1
    }

    return {
      step(t, p) {
        const T = (p.temperature as number) || 2.2
        const J = p.J as number
        const hField = p.h as number
        const speed = p.speed as number

        // Structural reset: only the coupling J re-randomises the lattice.
        // Temperature and field just steer the ongoing evolution.
        const key = J.toFixed(2)
        if (key !== lastKey) {
          randomise()
          lastKey = key
        }

        // Metropolis single-spin updates: about speed·L² per frame.
        const invT = 1 / T
        const updates = Math.max(1, Math.round(speed * L * L))
        for (let u = 0; u < updates; u++) {
          const x = (Math.random() * L) | 0
          const y = (Math.random() * L) | 0
          const row = y * L
          const s = spins[row + x]
          const neigh =
            spins[row + wm[x]] + spins[row + wp[x]] +
            spins[wm[y] * L + x] + spins[wp[y] * L + x]
          const dE = 2 * J * s * neigh + 2 * hField * s
          if (dE <= 0 || Math.random() < Math.exp(-dE * invT)) spins[row + x] = -s
        }

        // Magnetisation M = mean spin (used for the readout and the
        // auto-retrigger when the lattice freezes into full alignment).
        let sum = 0
        for (let i = 0; i < L * L; i++) sum += spins[i]
        const absM = Math.abs(sum / (L * L))

        // Keep the canvas alive: a low-T / biased lattice locks to |M|≈1 and
        // stops evolving. After a short grace period, quench it back to a
        // random start so the ordering plays out again. Near Tc (the default)
        // |M| never gets this high, so this never trips.
        if (absM > 0.985) {
          if (alignedMs < 0) alignedMs = t
          else if (t - alignedMs > 2500) randomise()
        } else {
          alignedMs = -1
        }

        // Paint the lattice into the full-canvas ImageData.
        let di = 0
        for (let py = 0; py < dh; py++) {
          const rBase = rowOf[py] * L
          for (let px = 0; px < dw; px++) {
            const c = spins[rBase + colOf[px]] > 0 ? UP : DOWN
            data[di] = c[0]
            data[di + 1] = c[1]
            data[di + 2] = c[2]
            di += 4
          }
        }
        ctx.putImageData(img, 0, 0)

        // ── Overlay (CSS-pixel space; the ctx transform handles dpr) ──────
        const Tc = 2 * J / LN1P_SQRT2
        const phase = T < Tc ? 'ordered' : 'disordered'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.font = '10px monospace'
        const line1 = `2D Ising · ${L}×${L}   T=${T.toFixed(2)}   Tc=${Tc.toFixed(2)}`
        const line2 = `|M|=${absM.toFixed(3)}   J=${J.toFixed(1)}   h=${hField.toFixed(2)}   ${phase}`
        const tw = Math.max(ctx.measureText(line1).width, ctx.measureText(line2).width)
        ctx.globalAlpha = 0.72
        ctx.fillStyle = theme.bg
        ctx.fillRect(6, 6, tw + 12, 30)
        ctx.globalAlpha = 0.9
        ctx.fillStyle = theme.fg
        ctx.fillText(line1, 11, 10)
        ctx.fillText(line2, 11, 22)

        // Temperature scale: T on the 0.5..4 axis with the Tc tick marked.
        const barX = 11
        const barW = Math.min(140, w - 22)
        const barY = h - 14
        const barH = 4
        const frac = Math.max(0, Math.min(1, (T - 0.5) / (4.0 - 0.5)))
        const tcFrac = Math.max(0, Math.min(1, (Tc - 0.5) / (4.0 - 0.5)))
        ctx.globalAlpha = 0.22
        ctx.fillStyle = theme.fg
        ctx.fillRect(barX, barY, barW, barH)
        ctx.globalAlpha = 0.92
        ctx.fillStyle = '#ff7a59'
        ctx.fillRect(barX, barY, frac * barW, barH)
        ctx.globalAlpha = 0.85
        ctx.fillStyle = theme.fg
        ctx.fillRect(barX + tcFrac * barW - 1, barY - 3, 2, barH + 6)
        ctx.font = '8px monospace'
        ctx.fillText('Tc', barX + tcFrac * barW - 5, barY - 13)
        ctx.globalAlpha = 1
      },
    }
  },
}
