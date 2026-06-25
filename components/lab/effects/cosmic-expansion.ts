import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Cosmic Expansion — the FLRW scale factor a(t)
 *
 * A homogeneous, isotropic universe expands or contracts according to the
 * scale factor a(t), governed by the Friedmann equation. Writing it in terms
 * of the present-day density parameters and normalising a(today) = 1:
 *
 *   (ȧ / a)² = H₀² [ Ω_M a⁻³ + Ω_Λ + Ω_k a⁻² ]
 *
 * where the curvature term is fixed by flatness:
 *
 *   Ω_k = 1 − Ω_M − Ω_Λ
 *
 * Matter dilutes as a⁻³ (volume), the cosmological constant Λ stays constant,
 * and curvature scales as a⁻². Taking the square root and substituting a
 * dimensionless time τ = H₀ t gives the first-order ODE we integrate:
 *
 *   da/dτ = √[ Ω_M / a + Ω_Λ a² + (1 − Ω_M − Ω_Λ) ]
 *
 * Light emitted at scale factor a_emit and seen today is stretched by the
 * expansion: 1 + z = a_now / a_emit. So a galaxy whose light set out when the
 * universe was half its present size arrives redshifted by z = 1.
 *
 * The "mode" control snaps the densities to the textbook fates:
 *   - open    Ω_M < 1, Ω_Λ = 0  → expands forever, ever-slowing (Ω_k > 0)
 *   - flat    Ω_M = 1, Ω_Λ = 0  → Einstein–de Sitter, expands, ȧ → 0
 *   - closed  Ω_M > 1, Ω_Λ = 0  → expands, halts, recollapses (Big Crunch)
 *   - lambda  Ω_M + Ω_Λ ≈ 1     → accelerating, ΛCDM-like (the real universe)
 *
 * The visualisation: a comoving grid of galaxies whose physical separations
 * scale with a(t), tinted by their redshift; a live a(τ) timeline below.
 */

export const controls: ControlSpec[] = [
  {
    key: 'mode',
    label: 'Cosmic fate',
    type: 'select',
    options: [
      { label: 'Open (forever, slowing)', value: 'open' },
      { label: 'Flat (Einstein–de Sitter)', value: 'flat' },
      { label: 'Closed (Big Crunch)', value: 'closed' },
      { label: 'Λ accelerating (ΛCDM)', value: 'lambda' },
    ],
  },
  { key: 'omegaM', label: 'Ω_M (matter)', type: 'range', min: 0, max: 2, step: 0.05 },
  { key: 'omegaLambda', label: 'Ω_Λ (dark energy)', type: 'range', min: 0, max: 1.5, step: 0.05 },
  { key: 'hubble', label: 'H₀ (expansion rate)', type: 'range', min: 0.3, max: 2.5, step: 0.1 },
]

export const defaults: Params = {
  mode: 'lambda',
  omegaM: 0.3,
  omegaLambda: 0.7,
  hubble: 1,
}

// Mode → canonical density pair. The select drives the sliders; editing a
// slider drops the user into a bespoke point on the same fate where possible
// (handled in reconcileParams).
const MODE_PRESETS: Record<string, { omegaM: number; omegaLambda: number }> = {
  open: { omegaM: 0.3, omegaLambda: 0 },
  flat: { omegaM: 1, omegaLambda: 0 },
  closed: { omegaM: 1.6, omegaLambda: 0 },
  lambda: { omegaM: 0.3, omegaLambda: 0.7 },
}

// Classify a density pair into a fate label (used when the user drags sliders
// away from a preset). Λ-dominated → 'lambda'; otherwise by Ω_k sign.
function classify(omegaM: number, omegaLambda: number): string {
  if (omegaLambda > 0.05) return 'lambda'
  const omegaK = 1 - omegaM - omegaLambda
  if (Math.abs(omegaK) < 1e-3) return 'flat'
  return omegaK > 0 ? 'open' : 'closed'
}

// da/dτ as a function of a, in units where H₀ = 1. The argument under the
// root can go negative for closed models at turnaround — that is the moment
// expansion reverses, which we detect and handle in the integrator.
function friedmannRHS(a: number, omegaM: number, omegaLambda: number): number {
  const omegaK = 1 - omegaM - omegaLambda
  return omegaM / a + omegaLambda * a * a + omegaK
}

export const cosmicExpansion: EffectModule = {
  controls,
  defaults,

  // Keep the select and the two sliders coherent: choosing a fate loads its
  // canonical densities; dragging a density relabels the fate to match.
  reconcileParams(params, change) {
    const next: Params = { ...params }
    if (!change) {
      // Initial normalisation: trust the mode, snap densities to its preset
      // only if they are missing; otherwise keep whatever was passed in.
      const mode = (next.mode as string) ?? 'lambda'
      if (next.omegaM == null || next.omegaLambda == null) {
        const preset = MODE_PRESETS[mode] ?? MODE_PRESETS.lambda
        next.omegaM = preset.omegaM
        next.omegaLambda = preset.omegaLambda
      }
      return next
    }
    // Apply the edit first, then keep the coupled controls coherent.
    next[change.key] = change.value
    if (change.key === 'mode') {
      const preset = MODE_PRESETS[change.value as string] ?? MODE_PRESETS.lambda
      next.omegaM = preset.omegaM
      next.omegaLambda = preset.omegaLambda
    } else if (change.key === 'omegaM' || change.key === 'omegaLambda') {
      next.mode = classify(next.omegaM as number, next.omegaLambda as number)
    }
    return next
  },

  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h, dpr } = dims
    const fg = theme.fg
    const bg = theme.bg
    const accent = '#6366f1' // cosmic indigo (matches the cosmology desk)

    // ── Comoving galaxy grid (fixed lattice, scaled by a) ───────────────
    // Comoving coordinates in [-1, 1]², jittered so the grid reads as a
    // distribution of galaxies rather than graph paper.
    const GRID = 7
    type Galaxy = { cx: number; cy: number; size: number; tw: number }
    const galaxies: Galaxy[] = []
    let rng = 0x9e3779b9 >>> 0
    const rand = () => {
      // xorshift32 — deterministic so the grid is identical across resets
      rng ^= rng << 13; rng >>>= 0
      rng ^= rng >> 17
      rng ^= rng << 5; rng >>>= 0
      return rng / 0xffffffff
    }
    for (let iy = 0; iy < GRID; iy++) {
      for (let ix = 0; ix < GRID; ix++) {
        const cx = (ix / (GRID - 1)) * 2 - 1 + (rand() - 0.5) * 0.12
        const cy = (iy / (GRID - 1)) * 2 - 1 + (rand() - 0.5) * 0.12
        galaxies.push({ cx, cy, size: 1.4 + rand() * 1.8, tw: rand() * Math.PI * 2 })
      }
    }

    // ── Simulation state (reset on param change) ────────────────────────
    // The sim plays the universe's whole history: it starts just after the
    // Big Bang (a = A_START) and integrates a(t) forward. a = 1 is "today".
    const A_START = 0.04
    const A_MIN = 0.02
    const A_MAX = 6 // generous ceiling for accelerating models
    let a = A_START // scale factor, normalised a(today) = 1
    let tau = 0 // dimensionless cosmic time since the Big Bang
    let direction = 1 // +1 expanding, −1 contracting (closed turnaround)
    let crunched = false // closed model: collapsed to a Big Crunch
    let crunchAtMs = 0 // wall-clock time of crunch / ceiling (for the loop hold)
    let frozen = false // open/flat/Λ: hit the display ceiling, holding before loop
    // Logged a(τ) history for the timeline plot
    const HIST = 600
    const histA = new Float32Array(HIST)
    const histT = new Float32Array(HIST)
    let histLen = 0
    let aMaxSeen = 1
    let lastParams = ''
    let lastTime = 0

    function reset() {
      a = A_START
      tau = 0
      direction = 1
      crunched = false
      frozen = false
      crunchAtMs = 0
      aMaxSeen = A_START
      histA[0] = A_START
      histT[0] = 0
      histLen = 1
    }

    reset()

    return {
      step(timeMs, p) {
        const mode = (p.mode as string) ?? 'lambda'
        const omegaM = (p.omegaM as number) ?? (defaults.omegaM as number)
        const omegaLambda = (p.omegaLambda as number) ?? (defaults.omegaLambda as number)
        const hubble = (p.hubble as number) ?? (defaults.hubble as number)

        const key = `${mode}|${omegaM.toFixed(3)}|${omegaLambda.toFixed(3)}|${hubble.toFixed(2)}`
        if (key !== lastParams) {
          reset()
          lastParams = key
        }

        // Real elapsed time → dimensionless dτ, scaled by H₀ (hubble).
        const dtReal = Math.min((timeMs - lastTime) / 1000, 0.05)
        lastTime = timeMs

        // ── Integrate a(τ) with RK4 in the cosmic-time direction ─────────
        // Matter dominates near the Big Bang where ȧ ∝ a^(−1/2) → ∞; we
        // floor a at A_MIN inside f() so the singularity stays finite.
        if (!crunched && !frozen) {
          const dTau = dtReal * 0.6 * hubble * direction
          const substeps = 6
          const ds = dTau / substeps
          for (let s = 0; s < substeps; s++) {
            // Friedmann RHS magnitude; sign carries the direction.
            const f = (av: number) => {
              const r = friedmannRHS(Math.max(av, A_MIN), omegaM, omegaLambda)
              return Math.sqrt(Math.max(r, 0))
            }
            const k1 = direction * f(a)
            const k2 = direction * f(Math.max(a + 0.5 * ds * k1, A_MIN))
            const k3 = direction * f(Math.max(a + 0.5 * ds * k2, A_MIN))
            const k4 = direction * f(Math.max(a + ds * k3, A_MIN))
            const da = (ds / 6) * (k1 + 2 * k2 + 2 * k3 + k4)
            a += da
            tau += ds

            // Closed model turnaround: ȧ² → 0, expansion reverses.
            if (direction > 0 && friedmannRHS(a, omegaM, omegaLambda) <= 0) {
              direction = -1
            }
            // Big Crunch: a collapses back toward zero.
            if (direction < 0 && a <= A_START) {
              a = A_MIN
              crunched = true
              crunchAtMs = timeMs
              break
            }
            // Display ceiling for ever-expanding models: hold, then loop.
            if (a >= A_MAX) {
              a = A_MAX
              frozen = true
              crunchAtMs = timeMs
              break
            }
          }

          aMaxSeen = Math.max(aMaxSeen, a)
          // Log history
          if (histLen < HIST) {
            histA[histLen] = a
            histT[histLen] = tau
            histLen++
          } else {
            // Drop the oldest sample and append (long Λ / open runs).
            histA.copyWithin(0, 1)
            histT.copyWithin(0, 1)
            histA[HIST - 1] = a
            histT[HIST - 1] = tau
          }
        }

        // After a crunch (closed) or hitting the ceiling (open/flat/Λ), hold
        // briefly then replay so the whole history cycles continuously.
        if ((crunched || frozen) && timeMs - crunchAtMs > 1600) {
          reset()
        }

        // ── Draw ─────────────────────────────────────────────────────────
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, w, h)

        // Layout: galaxy field on top, a(τ) timeline below.
        const margin = 12
        const fieldH = Math.round(h * 0.62)
        const field = { x: margin, y: margin + 14, w: w - margin * 2, h: fieldH - margin - 14 }
        const plot = { x: margin, y: field.y + field.h + 28, w: w - margin * 2, h: h - (field.y + field.h + 28) - 26 }

        // Title
        ctx.font = `bold ${Math.round(11 * Math.min(dpr, 1.5))}px monospace`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillStyle = fg
        ctx.globalAlpha = 0.9
        ctx.fillText('Cosmic Expansion — FLRW scale factor a(t)', margin, margin - 2)
        ctx.globalAlpha = 1

        // ── Galaxy field ────────────────────────────────────────────────
        const fcx = field.x + field.w / 2
        const fcy = field.y + field.h / 2
        // Map comoving [-1,1] → pixels, scaled by a (relative to a=1 framing).
        // Pick the framing scale so the grid fills the field at a ≈ aMaxSeen,
        // and clamp every galaxy to the field rect so nothing escapes.
        const frameA = Math.max(1, aMaxSeen)
        const half = Math.min(field.w, field.h) / 2 - 6
        const pxPerComoving = (half / frameA) * a

        // Observer sits at the centre (us). Light reaching us from a galaxy at
        // comoving radius set out when the universe was smaller — approximate
        // its emission scale factor from its distance for the redshift tint.
        let maxZ = 0
        for (let i = 0; i < galaxies.length; i++) {
          const g = galaxies[i]
          let gx = fcx + g.cx * pxPerComoving
          let gy = fcy + g.cy * pxPerComoving
          // Clamp to the field rect (physical separations overshoot at large a)
          const inField =
            gx >= field.x && gx <= field.x + field.w &&
            gy >= field.y && gy <= field.y + field.h
          gx = Math.max(field.x + 2, Math.min(field.x + field.w - 2, gx))
          gy = Math.max(field.y + 2, Math.min(field.y + field.h - 2, gy))

          // Comoving distance from observer (0..1). Farther galaxies recede
          // faster (Hubble flow), so the light reaching us left when the
          // universe was smaller → larger redshift. As a grows, more space has
          // stretched between us and them, so the redshift grows too.
          const dCom = Math.min(1, Math.hypot(g.cx, g.cy) / Math.SQRT2)
          // Emission scale factor: the more expansion (larger a) and the
          // farther the galaxy, the smaller a was when its light set out.
          const look = dCom * (1 - 1 / (1 + a)) // 0 nearby/early → →1 far/late
          const aEmit = Math.max(A_MIN, a * (1 - 0.85 * look))
          const z = a / aEmit - 1 // redshift 1+z = a_now / a_emit
          if (z > maxZ) maxZ = z
          // Tint: blue (blueshift / nearby) → white → red (high redshift).
          const zClamped = Math.max(0, Math.min(2.5, z))
          const hue = 220 - (zClamped / 2.5) * 230 // 220 (blue) → −10 ≈ 350 (red)
          const hueWrapped = ((hue % 360) + 360) % 360
          const sat = 55 + zClamped * 12
          const light = 62

          // Twinkle + dim if it has been clamped (escaped the visible field)
          const twk = 0.75 + 0.25 * Math.sin(g.tw + timeMs * 0.0015 + i)
          const r = g.size * (0.9 + 0.3 * Math.min(a, 2)) * Math.min(dpr, 2)

          ctx.globalAlpha = (inField ? 1 : 0.35) * twk
          ctx.fillStyle = `hsl(${hueWrapped.toFixed(0)}, ${sat.toFixed(0)}%, ${light}%)`
          ctx.beginPath()
          ctx.arc(gx, gy, Math.max(0.8, r), 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1

        // Observer marker (us) at centre
        ctx.strokeStyle = fg
        ctx.globalAlpha = 0.5
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(fcx, fcy, 4, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 0.4
        ctx.font = '9px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = fg
        ctx.fillText('us', fcx, fcy + 7)
        ctx.globalAlpha = 1

        // Redshift legend (top-right of field)
        const legW = 90
        const legX = field.x + field.w - legW - 4
        const legY = field.y + 4
        const grad = ctx.createLinearGradient(legX, 0, legX + legW, 0)
        grad.addColorStop(0, 'hsl(220, 60%, 62%)') // blueshift
        grad.addColorStop(0.5, 'hsl(60, 50%, 70%)')
        grad.addColorStop(1, 'hsl(350, 75%, 55%)') // high z
        ctx.fillStyle = grad
        ctx.fillRect(legX, legY, legW, 5)
        ctx.font = '8px monospace'
        ctx.fillStyle = fg
        ctx.globalAlpha = 0.5
        ctx.textAlign = 'left'
        ctx.fillText('blue', legX, legY + 7)
        ctx.textAlign = 'right'
        ctx.fillText('redshift z →', legX + legW, legY + 7)
        ctx.globalAlpha = 1

        // ── a(τ) timeline ────────────────────────────────────────────────
        const pr = plot
        const padL = 34
        const padR = 8
        const padT = 8
        const padB = 16
        const px = pr.x + padL
        const py = pr.y + padT
        const pw = Math.max(10, pr.w - padL - padR)
        const ph = Math.max(10, pr.h - padT - padB)

        // Axes
        ctx.strokeStyle = fg
        ctx.globalAlpha = 0.25
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(px, py + ph)
        ctx.lineTo(px + pw, py + ph)
        ctx.stroke()
        ctx.globalAlpha = 1

        // Y range: 0 .. max(aMaxSeen, current a) with headroom; X range over τ history.
        const aTop = Math.max(1.2, aMaxSeen * 1.1)
        const tMin = histLen > 0 ? histT[0] : 0
        const tMax = Math.max(histLen > 0 ? histT[histLen - 1] : 1, tMin + 0.5)
        const sx = (t: number) => px + ((t - tMin) / (tMax - tMin)) * pw
        const sy = (av: number) => {
          const frac = Math.max(0, Math.min(1, av / aTop)) // clamp into plot
          return py + ph - frac * ph
        }

        // a = 1 (today) reference line
        const y1 = sy(1)
        ctx.setLineDash([3, 4])
        ctx.strokeStyle = accent
        ctx.globalAlpha = 0.4
        ctx.beginPath()
        ctx.moveTo(px, y1)
        ctx.lineTo(px + pw, y1)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 0.5
        ctx.font = '8px monospace'
        ctx.fillStyle = accent
        ctx.textAlign = 'left'
        ctx.textBaseline = 'bottom'
        ctx.fillText('a = 1 (today)', px + 2, y1 - 1)
        ctx.globalAlpha = 1

        // a(τ) curve
        if (histLen > 1) {
          ctx.strokeStyle = accent
          ctx.lineWidth = 1.8
          ctx.beginPath()
          for (let i = 0; i < histLen; i++) {
            const x = sx(histT[i])
            const y = sy(histA[i])
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
          // Current point
          const cxp = sx(histT[histLen - 1])
          const cyp = sy(histA[histLen - 1])
          ctx.fillStyle = accent
          ctx.shadowColor = accent
          ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.arc(cxp, cyp, 3, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }

        // Axis labels
        ctx.fillStyle = fg
        ctx.globalAlpha = 0.45
        ctx.font = '8px monospace'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        ctx.fillText('a', px - 5, py + 4)
        ctx.fillText('0', px - 5, py + ph)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText('cosmic time  τ = H₀ t  →', px + pw / 2, py + ph + 4)
        ctx.globalAlpha = 1

        // ── Readout ──────────────────────────────────────────────────────
        const omegaK = 1 - omegaM - omegaLambda
        const fateLabel =
          mode === 'open' ? 'Open — expands forever, ever slowing'
            : mode === 'flat' ? 'Flat — Einstein–de Sitter, ȧ → 0'
              : mode === 'closed' ? (crunched ? 'Closed — Big Crunch' : 'Closed — will recollapse')
                : 'Λ — accelerating expansion'

        ctx.font = '9px monospace'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillStyle = fg
        ctx.globalAlpha = 0.55
        ctx.fillText(
          `Ω_M = ${omegaM.toFixed(2)}   Ω_Λ = ${omegaLambda.toFixed(2)}   Ω_k = ${omegaK.toFixed(2)}   H₀ = ${hubble.toFixed(1)}`,
          field.x,
          field.y + field.h + 4,
        )
        ctx.fillStyle = accent
        ctx.globalAlpha = 0.85
        ctx.fillText(
          `${fateLabel}    a = ${a.toFixed(2)}   z(max) ≈ ${maxZ.toFixed(1)}`,
          field.x,
          field.y + field.h + 16,
        )
        ctx.globalAlpha = 1
      },

      destroy() {
        // no external resources to release
      },
    }
  },
}
