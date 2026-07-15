import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Exoplanet Transit — transit photometry in two synced panels. TOP: a face-on,
 * limb-darkened star with a dark planet disk crossing a chord at height b.
 * BOTTOM: the light curve, relative flux vs time. The dip is measured, not
 * faked: F0 = ∫∫ I(r) dA over the disk with linear limb darkening
 * I(μ) = 1 − u(1 − μ), μ = √(1 − r²), and the blocked flux is that same
 * intensity integrated over the planet∩star overlap. So depth ≈ (Rp/R*)² for a
 * central transit (deeper with limb darkening, shallower when grazing), with
 * real ingress/egress slopes and a rounded floor.
 */

export const controls: ControlSpec[] = [
  { key: 'planetRadius', label: 'Planet radius Rp/R*', type: 'range', min: 0.02, max: 0.2, step: 0.005 },
  { key: 'impact', label: 'Impact parameter b', type: 'range', min: 0, max: 1.1, step: 0.05 },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.3, max: 3, step: 0.1 },
  { key: 'limbDarkening', label: 'Limb darkening', type: 'toggle' },
]

export const defaults: Params = {
  planetRadius: 0.1,
  impact: 0.2,
  speed: 1,
  limbDarkening: true,
}

const U_LIMB = 0.6          // linear limb-darkening coefficient (Sun-like, optical)
const SWEEP_HALF = 1.4      // half-width of the planet sweep, in stellar radii
const NPHASE = 480          // precomputed flux samples over one full sweep
const WINDOW = 1.3          // periods of light curve visible in the scroll window
const INDIGO = '#6366f1'
const PLANET_FILL = '#0c0e15'
const A_BRIGHT: [number, number, number] = [255, 220, 150]
const A_DIM: [number, number, number] = [168, 74, 22]

function mix(a: readonly [number, number, number], b: readonly [number, number, number], t: number) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

export const ExoplanetTransit: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims
    const fg = theme.fg

    // Precomputed light curve for the current structural params.
    const fluxArr = new Float32Array(NPHASE)
    let F0 = 1          // un-occulted stellar flux (numeric integral)
    let minFlux = 1     // deepest point of the dip
    let lastKey = ''

    // Stellar surface intensity at fractional radius r∈[0,1] (r=1 is the limb).
    function intensity(r: number, limb: boolean) {
      if (!limb) return 1
      const mu = Math.sqrt(Math.max(0, 1 - r * r))
      return 1 - U_LIMB * (1 - mu)
    }

    // Numerically estimate the flux blocked with the planet centre at (xp, b),
    // as a fraction of F0. Integrates stellar intensity over the planet disk on
    // a grid, counting only cells inside BOTH the planet and the stellar disk.
    function blockedFraction(xp: number, b: number, rp: number, limb: boolean) {
      if (Math.hypot(xp, b) >= 1 + rp) return 0     // planet fully off the star
      const M = 42
      const stepp = (2 * rp) / M
      const cellA = stepp * stepp
      let acc = 0
      for (let i = 0; i < M; i++) {
        const x = xp - rp + (i + 0.5) * stepp
        for (let j = 0; j < M; j++) {
          const y = b - rp + (j + 0.5) * stepp
          const dx = x - xp, dy = y - b
          if (dx * dx + dy * dy > rp * rp) continue  // outside planet
          const r2 = x * x + y * y
          if (r2 > 1) continue                       // outside star
          acc += intensity(Math.sqrt(r2), limb)
        }
      }
      return (acc * cellA) / F0
    }

    function rebuild(rp: number, b: number, limb: boolean) {
      // Un-occulted flux: integrate I(r) over the unit stellar disk once.
      const NG = 150
      const d = 2 / NG
      const cellA = d * d
      let f0 = 0
      for (let i = 0; i < NG; i++) {
        const x = -1 + (i + 0.5) * d
        for (let j = 0; j < NG; j++) {
          const y = -1 + (j + 0.5) * d
          const r2 = x * x + y * y
          if (r2 <= 1) f0 += intensity(Math.sqrt(r2), limb) * cellA
        }
      }
      F0 = f0
      minFlux = 1
      for (let k = 0; k < NPHASE; k++) {
        const xp = -SWEEP_HALF + (k / NPHASE) * 2 * SWEEP_HALF
        const flux = 1 - blockedFraction(xp, b, rp, limb)
        fluxArr[k] = flux
        if (flux < minFlux) minFlux = flux
      }
    }

    // Periodic lookup with linear interpolation; phase in period units.
    function sampleFlux(ph: number) {
      const f = ph - Math.floor(ph)          // wrap to [0,1)
      const s = f * NPHASE
      const i0 = Math.floor(s) % NPHASE
      const i1 = (i0 + 1) % NPHASE
      const frac = s - Math.floor(s)
      return fluxArr[i0] * (1 - frac) + fluxArr[i1] * frac
    }

    let phase = 0.12       // continuous phase in period units (start on baseline)
    let lastT = -1

    return {
      step(t, p) {
        const rp = p.planetRadius as number
        const b = p.impact as number
        const limb = p.limbDarkening as boolean
        const speed = p.speed as number

        const key = `${rp}|${b}|${limb}`
        if (key !== lastKey) {           // structural change → rebuild + reset
          rebuild(rp, b, limb)
          lastKey = key
          phase = 0.12
          lastT = -1
        }

        if (lastT < 0) lastT = t
        const dtMs = Math.min(80, t - lastT)
        lastT = t
        phase += (dtMs / 7000) * speed   // one sweep ≈ 7 s at speed 1

        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)

        // Layout: star panel on top, light curve below.
        const compact = h < 200
        const padL = w < 300 ? 34 : 50
        const padR = 16
        const padTop = compact ? 16 : 26
        const padBot = compact ? 18 : 26
        const innerW = Math.max(20, w - padL - padR)
        const innerH = Math.max(20, h - padTop - padBot)
        const gap = compact ? 10 : 16
        const topH = innerH * 0.48
        const botY = padTop + topH + gap
        const botH = Math.max(20, innerH - topH - gap)

        // ── TOP: limb-darkened star + transiting planet ──────────────────────
        const cx = padL + innerW / 2
        const cyTop = padTop + topH / 2
        const Rpx = Math.min(topH * 0.44, innerW / (2 * (SWEEP_HALF + 0.15)))

        const grad = ctx.createRadialGradient(cx, cyTop, 0, cx, cyTop, Rpx)
        const STOPS = 8
        for (let s = 0; s <= STOPS; s++) {
          const rf = s / STOPS
          const tt = limb ? Math.max(0, Math.min(1, (intensity(rf, true) - (1 - U_LIMB)) / U_LIMB)) : 0.72
          const c = mix(A_DIM, A_BRIGHT, tt)
          grad.addColorStop(rf, `rgb(${c[0]},${c[1]},${c[2]})`)
        }
        ctx.save()
        ctx.shadowColor = 'rgba(245,166,35,0.5)'; ctx.shadowBlur = Rpx * 0.35
        ctx.fillStyle = grad
        ctx.beginPath(); ctx.arc(cx, cyTop, Rpx, 0, Math.PI * 2); ctx.fill()
        ctx.restore()

        // Chord the planet follows, at height b.
        const chordY = cyTop + b * Rpx
        ctx.save()
        ctx.strokeStyle = fg; ctx.globalAlpha = 0.16; ctx.lineWidth = 1; ctx.setLineDash([4, 4])
        ctx.beginPath(); ctx.moveTo(cx - SWEEP_HALF * Rpx, chordY); ctx.lineTo(cx + SWEEP_HALF * Rpx, chordY); ctx.stroke()
        ctx.restore()

        // Planet at the current phase (clipped to the star panel).
        const xp = -SWEEP_HALF + (phase - Math.floor(phase)) * 2 * SWEEP_HALF
        ctx.save()
        ctx.beginPath(); ctx.rect(padL - 6, padTop - 4, innerW + 12, topH + 8); ctx.clip()
        ctx.fillStyle = PLANET_FILL
        ctx.beginPath(); ctx.arc(cx + xp * Rpx, chordY, rp * Rpx, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = fg; ctx.globalAlpha = 0.22; ctx.lineWidth = 1; ctx.stroke()
        ctx.restore()

        // ── BOTTOM: light curve (flux vs time) ───────────────────────────────
        // Auto-scale the flux axis to the dip so small planets stay legible.
        const depth = 1 - minFlux
        const shown = Math.max(depth, 0.006)
        const yTopF = 1 + shown * 0.20
        const yBotF = 1 - shown * 1.25
        const fluxToY = (fl: number) => {
          const fr = Math.max(0, Math.min(1, (yTopF - fl) / (yTopF - yBotF)))
          return botY + fr * botH
        }

        ctx.strokeStyle = fg; ctx.globalAlpha = 0.16; ctx.lineWidth = 1
        ctx.strokeRect(padL, botY, innerW, botH)
        const baseY = fluxToY(1)
        ctx.globalAlpha = 0.14; ctx.setLineDash([4, 4])
        ctx.beginPath(); ctx.moveTo(padL, baseY); ctx.lineTo(padL + innerW, baseY); ctx.stroke()
        ctx.setLineDash([]); ctx.globalAlpha = 1

        if (depth > 1e-4) {              // depth marker at the transit floor
          const floorY = fluxToY(minFlux)
          ctx.strokeStyle = INDIGO; ctx.globalAlpha = 0.4; ctx.setLineDash([3, 3])
          ctx.beginPath(); ctx.moveTo(padL, floorY); ctx.lineTo(padL + innerW, floorY); ctx.stroke()
          ctx.setLineDash([]); ctx.globalAlpha = 1
          if (!compact && floorY - 4 > botY + 12) {
            ctx.fillStyle = INDIGO; ctx.globalAlpha = 0.7; ctx.font = '9px monospace'; ctx.textAlign = 'left'
            ctx.fillText(`depth ${(depth * 100).toFixed(2)}%  ((Rp/R*)² = ${(rp * rp * 100).toFixed(2)}%)`, padL + 5, floorY - 4)
            ctx.globalAlpha = 1
          }
        }

        // Scrolling flux trace: right edge = now, extending WINDOW periods back.
        const cols = Math.max(2, Math.min(360, Math.floor(innerW)))
        const xs = new Float32Array(cols + 1)
        const ys = new Float32Array(cols + 1)
        for (let c = 0; c <= cols; c++) {
          const fr = c / cols
          xs[c] = padL + fr * innerW
          ys[c] = fluxToY(sampleFlux(phase - (1 - fr) * WINDOW))
        }
        ctx.beginPath()               // soft fill under the curve
        ctx.moveTo(xs[0], ys[0])
        for (let c = 1; c <= cols; c++) ctx.lineTo(xs[c], ys[c])
        ctx.lineTo(padL + innerW, botY + botH)
        ctx.lineTo(padL, botY + botH)
        ctx.closePath()
        ctx.fillStyle = INDIGO
        ctx.globalAlpha = 0.09
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.moveTo(xs[0], ys[0])
        for (let c = 1; c <= cols; c++) ctx.lineTo(xs[c], ys[c])
        ctx.strokeStyle = INDIGO
        ctx.lineWidth = 1.8
        ctx.lineJoin = 'round'
        ctx.stroke()

        // Live 'now' flux (re-measured this frame) + playhead dot at right edge.
        const nowFlux = 1 - blockedFraction(xp, b, rp, limb)
        const nowX = padL + innerW
        ctx.save()
        ctx.strokeStyle = fg; ctx.globalAlpha = 0.2; ctx.setLineDash([2, 3])
        ctx.beginPath(); ctx.moveTo(nowX, botY); ctx.lineTo(nowX, botY + botH); ctx.stroke()
        ctx.restore()
        ctx.fillStyle = INDIGO; ctx.shadowColor = INDIGO; ctx.shadowBlur = 8
        ctx.beginPath(); ctx.arc(nowX, fluxToY(nowFlux), 3, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0

        // Axis labels + readouts.
        ctx.textAlign = 'right'; ctx.font = '9px monospace'; ctx.fillStyle = fg; ctx.globalAlpha = 0.45
        ctx.fillText('1.000', padL - 5, baseY + 3)
        if (depth > 1e-4) ctx.fillText(minFlux.toFixed(4), padL - 5, fluxToY(minFlux) + 3)
        ctx.globalAlpha = 1

        if (!compact) {
          ctx.textAlign = 'left'; ctx.fillStyle = fg; ctx.globalAlpha = 0.85; ctx.font = 'bold 12px monospace'
          ctx.fillText('Exoplanet transit', padL, 16)
          ctx.font = '10px monospace'; ctx.globalAlpha = 0.5; ctx.textAlign = 'right'
          ctx.fillText(`Rp/R* ${rp.toFixed(3)}   b ${b.toFixed(2)}   ${limb ? 'limb-darkened' : 'uniform disk'}`, w - padR, 16)
          ctx.textAlign = 'center'; ctx.globalAlpha = 0.4
          ctx.fillText('relative flux vs time  →', cx, h - 7)
          ctx.globalAlpha = 1
        }
      },
    }
  },
}
