import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Black Hole — a 2-D ray-bent view of a Schwarzschild black hole.
 *
 * Schwarzschild geometry has three special radii, all multiples of the
 * Schwarzschild (gravitational) radius r_s = 2GM/c²:
 *
 *   • event horizon       r = r_s        — escape velocity reaches c
 *   • photon sphere       r = 1.5 r_s    — light can orbit on a circle
 *   • ISCO                r = 3 r_s       — innermost stable circular orbit
 *
 * Light from a distant background is bent by the curved spacetime. For a ray
 * with impact parameter b the (weak-field) deflection angle is
 *
 *   α = 2 r_s / b = 4GM / (c² b)
 *
 * — twice Newton's value, Einstein's 1915 prediction confirmed in 1919. Rays
 * aimed within the critical impact parameter b_c = (3√3 / 2) r_s ≈ 2.6 r_s are
 * captured, so a distant observer sees a dark disc — the black-hole *shadow* —
 * of apparent radius b_c, ringed by an infinitely-lensed photon ring.
 *
 * An optional probe falls in radially. Its light is redshifted by two effects:
 * gravitational time dilation √(1 − r_s/r) and the relativistic Doppler shift of
 * its infall velocity. Both diverge at the horizon, so to a far observer the
 * probe reddens, dims and freezes — it never appears to cross.
 *
 * We render in arbitrary "geometric" units with r_s set by the Mass control,
 * mapped to pixels at a fixed scale. Every value→pixel mapping is clamped to the
 * plotting rect because lensed positions and a diverging redshift overshoot hard.
 */

export const controls: ControlSpec[] = [
  // Mass sets r_s (in our pixel units). Larger mass ⇒ larger horizon/shadow.
  { key: 'mass', label: 'Mass (r_s)', type: 'range', min: 0.5, max: 3, step: 0.1 },
  { key: 'showPhotonSphere', label: 'Photon sphere (1.5 r_s)', type: 'toggle' },
  { key: 'showISCO', label: 'ISCO (3 r_s)', type: 'toggle' },
  { key: 'lensing', label: 'Gravitational lensing', type: 'toggle' },
  { key: 'infall', label: 'Infalling probe', type: 'toggle' },
]

export const defaults: Params = {
  mass: 1.4,
  showPhotonSphere: true,
  showISCO: true,
  lensing: true,
  infall: true,
}

// --- small helpers -----------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

/** Deterministic pseudo-random in [0,1) from an integer seed. */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

type Star = { ang: number; r: number; mag: number }

export const blackHole: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims
    const cx = w / 2
    const cy = h / 2

    // Pixels per geometric unit. r_s in pixels = rsUnits * UNIT.
    // Choose so a r_s≈1.4 black hole's shadow (~2.6 r_s) sits comfortably inside.
    const minDim = Math.min(w, h)
    const UNIT = minDim * 0.11
    // Furthest a star can sit from centre (the lensing "sky"): the frame corner.
    const maxR = Math.sqrt(cx * cx + cy * cy) + 4

    // Background star field, generated once per renderer (fixed sky). Positions
    // in undeflected (flat-space) polar coords around the centre.
    const N_STARS = 520
    const stars: Star[] = []
    for (let i = 0; i < N_STARS; i++) {
      const ang = rand(i + 1) * Math.PI * 2
      // Bias toward filling the area uniformly: r ∝ √u.
      const r = Math.sqrt(rand(i + 101)) * maxR
      const mag = 0.35 + rand(i + 201) * 0.65
      stars.push({ ang, r, mag })
    }

    // Probe (infall) internal state — reset when params change.
    let probeR = 0 // radial coordinate in r_s units (so horizon = 1)
    let lastHash = ''

    function hashOf(p: Params): string {
      return [
        (p.mass as number).toFixed(3),
        p.showPhotonSphere ? 1 : 0,
        p.showISCO ? 1 : 0,
        p.lensing ? 1 : 0,
        p.infall ? 1 : 0,
      ].join('|')
    }

    return {
      step(t, p) {
        const massUnits = clamp(p.mass as number, 0.5, 3) // r_s in geometric units
        const showPhoton = p.showPhotonSphere as boolean
        const showISCO = p.showISCO as boolean
        const lensing = p.lensing as boolean
        const infall = p.infall as boolean

        const hash = hashOf(p)
        if (hash !== lastHash) {
          // Reset internal state on any param change.
          probeR = 8 // start the probe well outside (8 r_s)
          lastHash = hash
        }

        // Pixel radii of the key surfaces.
        const rs = massUnits * UNIT // event horizon, pixels
        const rPhoton = 1.5 * rs
        const rISCO = 3 * rs
        const bCrit = (3 * Math.sqrt(3) / 2) * rs // shadow / photon-ring radius (≈2.598 r_s)

        // --- background --------------------------------------------------------
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)

        // --- lensed star field -------------------------------------------------
        // For each star at flat-space radius r (impact parameter b≈r for a thin
        // 2-D screen), map to an apparent radius using the lensing relation.
        // Outside b_crit, an inbound ray is pulled inward by deflection; we invert
        // it as: apparent r' ≈ r − (deflection effect), bounded so it never crosses
        // the photon ring. Stars with b < b_crit are captured (hidden in shadow).
        const drawStars = () => {
          for (let i = 0; i < N_STARS; i++) {
            const s = stars[i]
            const b = s.r // impact parameter in pixels
            let rAppPx: number
            let brightness = s.mag

            if (!lensing) {
              rAppPx = b
            } else {
              if (b <= bCrit) {
                // Captured: this background star is hidden by the shadow.
                continue
              }
              // Deflection α = 2 r_s / b (weak field), magnification piles light up
              // just outside the photon ring. Apparent position moves inward by an
              // amount that grows as b → b_crit, so the sky appears compressed into
              // a bright ring hugging the shadow edge.
              const alpha = (2 * rs) / b
              // Apparent radius: pull the star inward proportional to deflection but
              // never inside the photon ring. Use a smooth map that → bCrit as
              // b → bCrit and → b as b → ∞.
              const pulled = b - alpha * b * 0.5
              rAppPx = clamp(pulled, bCrit + 0.5, maxR)
              // Magnification: brighten stars compressed near the ring.
              const compression = b / Math.max(rAppPx, 1e-3)
              brightness = clamp(s.mag * compression, 0, 1)
            }

            const x = cx + Math.cos(s.ang) * rAppPx
            const y = cy + Math.sin(s.ang) * rAppPx
            // Clamp to the plotting rect.
            if (x < 0 || x > w || y < 0 || y > h) continue
            const size = 0.6 + brightness * 1.1
            ctx.globalAlpha = clamp(0.25 + brightness * 0.6, 0, 1)
            ctx.fillStyle = theme.fg
            ctx.beginPath()
            ctx.arc(x, y, size, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.globalAlpha = 1
        }
        drawStars()

        // --- the shadow (filled black disc out to the critical impact param) ---
        if (lensing) {
          // Soft photon-ring glow just outside the shadow.
          const grad = ctx.createRadialGradient(cx, cy, bCrit * 0.92, cx, cy, bCrit * 1.18)
          grad.addColorStop(0, 'rgba(255, 196, 120, 0)')
          grad.addColorStop(0.5, 'rgba(255, 210, 150, 0.55)')
          grad.addColorStop(1, 'rgba(255, 196, 120, 0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(cx, cy, bCrit * 1.18, 0, Math.PI * 2)
          ctx.fill()
        }
        // The shadow disc itself (always opaque black — nothing escapes).
        ctx.fillStyle = '#000000'
        ctx.beginPath()
        ctx.arc(cx, cy, lensing ? bCrit : rs, 0, Math.PI * 2)
        ctx.fill()

        // --- ring overlays -----------------------------------------------------
        const ring = (
          radiusPx: number,
          color: string,
          alpha: number,
          dash: number[],
          lw: number,
        ) => {
          if (radiusPx <= 0 || radiusPx > maxR) return
          ctx.save()
          ctx.globalAlpha = alpha
          ctx.strokeStyle = color
          ctx.lineWidth = lw
          ctx.setLineDash(dash)
          ctx.beginPath()
          ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }

        // ISCO (outermost) — cool teal, accretion would start here.
        if (showISCO) ring(rISCO, '#34d3c0', 0.7, [5, 4], 1.4)
        // Photon sphere — amber, the unstable light-orbit radius.
        if (showPhoton) ring(rPhoton, '#facc15', 0.85, [], 1.6)
        // Event horizon — bright outline on the black disc.
        ring(rs, '#ff5a3c', 0.95, [], 2)
        // Critical impact parameter / shadow edge (only meaningful with lensing).
        if (lensing) ring(bCrit, '#ffd59e', 0.5, [2, 3], 1)

        // --- infalling probe ---------------------------------------------------
        let probeRedshift = 0
        if (infall) {
          // Integrate a slow radial coordinate descent (in r_s units, horizon=1).
          // Use a gentle proper-time-like descent that crawls near the horizon so
          // the redshift divergence is legible. Loop the demo by respawning.
          if (probeR <= 1.001) {
            probeR = 8 // respawn far out
          } else {
            // dr/dt slows as r→1 (mimics coordinate-time freezing at the horizon).
            const speed = 0.9 * (probeR - 1) / probeR
            probeR -= clamp(speed * 0.05, 0.0002, 0.2)
            if (probeR < 1.001) probeR = 1.001
          }

          // Gravitational + Doppler redshift. For a radial infaller measured by a
          // distant static observer, 1+z = 1/√(1 − r_s/r) · (Doppler). Here r in
          // r_s units, so r_s/r = 1/probeR. We fold a Doppler factor from the
          // free-fall velocity v = √(r_s/r)·c → β = 1/√probeR.
          const grav = 1 / Math.sqrt(Math.max(1 - 1 / probeR, 1e-6))
          const beta = clamp(1 / Math.sqrt(probeR), 0, 0.999)
          const doppler = Math.sqrt((1 + beta) / (1 - beta)) // recession Doppler
          const oneplusz = grav * doppler
          probeRedshift = oneplusz - 1

          // Place the probe along a fixed bearing, radius = probeR · r_s (pixels).
          const bearing = -Math.PI / 4
          const probePx = clamp(probeR * rs, rs, maxR)
          const px = clamp(cx + Math.cos(bearing) * probePx, 2, w - 2)
          const py = clamp(cy + Math.sin(bearing) * probePx, 2, h - 2)

          // Colour shifts from white → deep red as z grows; size shrinks; alpha
          // fades — the far-observer "freeze and redden".
          const reddening = clamp(probeRedshift / 4, 0, 1)
          const g = Math.round(220 * (1 - reddening))
          const bl = Math.round(220 * (1 - reddening) * 0.9)
          const probeAlpha = clamp(1 - reddening * 0.7, 0.18, 1)
          const probeSize = clamp(4 * (1 - reddening * 0.55), 1.4, 4)

          // Trail from start radius inward (faint dotted line along the bearing).
          ctx.save()
          ctx.globalAlpha = 0.2
          ctx.strokeStyle = theme.fg
          ctx.setLineDash([2, 4])
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(clamp(cx + Math.cos(bearing) * (8 * rs), 2, w - 2),
                     clamp(cy + Math.sin(bearing) * (8 * rs), 2, h - 2))
          ctx.lineTo(px, py)
          ctx.stroke()
          ctx.restore()

          ctx.save()
          ctx.globalAlpha = probeAlpha
          ctx.fillStyle = `rgb(255, ${g}, ${bl})`
          ctx.shadowColor = `rgba(255, ${g}, ${bl}, 0.8)`
          ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.arc(px, py, probeSize, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()

          // Redshift readout near the probe.
          ctx.save()
          ctx.globalAlpha = 0.8
          ctx.font = '10px monospace'
          ctx.fillStyle = theme.fg
          ctx.textAlign = 'left'
          const labelX = clamp(px + 8, 4, w - 110)
          const labelY = clamp(py - 6, 12, h - 4)
          ctx.fillText(`probe r = ${probeR.toFixed(2)} r_s`, labelX, labelY)
          ctx.fillText(`1+z = ${(probeRedshift + 1).toFixed(2)}`, labelX, labelY + 12)
          ctx.restore()
        }

        // --- legend / labels ---------------------------------------------------
        ctx.save()
        ctx.font = '10px monospace'
        ctx.textAlign = 'left'
        const legend: Array<[string, string]> = [
          ['#ff5a3c', `event horizon  r_s = ${massUnits.toFixed(1)}`],
        ]
        if (showPhoton) legend.push(['#facc15', 'photon sphere  1.5 r_s'])
        if (showISCO) legend.push(['#34d3c0', 'ISCO  3 r_s'])
        if (lensing) legend.push(['#ffd59e', `shadow  b_c ≈ 2.6 r_s`])
        let ly = 16
        for (const [col, text] of legend) {
          ctx.globalAlpha = 0.9
          ctx.fillStyle = col
          ctx.beginPath()
          ctx.arc(14, ly - 3, 3, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 0.6
          ctx.fillStyle = theme.fg
          ctx.fillText(text, 24, ly)
          ly += 14
        }
        ctx.restore()

        // Title line bottom-left.
        ctx.save()
        ctx.globalAlpha = 0.45
        ctx.font = '11px monospace'
        ctx.fillStyle = theme.fg
        ctx.textAlign = 'left'
        ctx.fillText('Schwarzschild black hole — r_s = 2GM/c²,  α = 2 r_s / b', 12, h - 12)
        ctx.restore()

        ctx.globalAlpha = 1
      },
    }
  },
}
