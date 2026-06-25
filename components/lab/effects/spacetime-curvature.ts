import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Spacetime Curvature — an embedding-diagram ("rubber sheet") view of the
 * curved geometry around a central mass, in geometrised units (G = c = 1).
 *
 * THE SHEET (Flamm's paraboloid)
 *   The spatial geometry of a Schwarzschild slice, embedded in a flat 3D
 *   space, is the surface of revolution
 *
 *       z(r) = 2 √( r_s (r − r_s) )      for r > r_s
 *
 *   where r_s = 2M is the Schwarzschild radius. Far away it flattens out
 *   (z ∝ √r) and it dives toward the horizon as r → r_s. We render a smooth,
 *   legible funnel of this shape so the depth of the well reads at a glance.
 *
 * GEODESICS (test particles)
 *   Massive particles in the equatorial plane obey the relativistic orbit
 *   equation in u = 1/r:
 *
 *       d²u/dφ² + u = M/L² + 3 M u²
 *
 *   The first source term is plain Newtonian gravity; the 3Mu² term is the
 *   General-Relativistic correction that makes bound orbits PRECESS (this is
 *   what explains Mercury's perihelion advance). We integrate it directly.
 *
 * LIGHT RAYS (null geodesics)
 *   Photons drop the Newtonian source term entirely:
 *
 *       d²u/dφ² + u = 3 M u²
 *
 *   Integrating an incoming ray with impact parameter b bends it by the
 *   famous deflection angle  Δφ ≈ 4M / b  (= 4GM/c²b), twice the value a
 *   naive Newtonian "photon" would give — the 1919 eclipse result.
 *
 * SPIN (frame dragging / Lense–Thirring)
 *   A rotating mass drags inertial frames around with it. We add an
 *   azimuthal twist to the sheet and a co-rotating Lense–Thirring term
 *   ω_LT ∝ a M / r³ to the orbits and rays, so prograde paths get whipped
 *   forward and the whole well visibly swirls.
 *
 * Everything is mapped through an oblique (axonometric) projection and every
 * value→pixel mapping is clamped to the plotting rect.
 */

export const controls: ControlSpec[] = [
  { key: 'mass', label: 'Mass M', type: 'range', min: 0.2, max: 3, step: 0.1 },
  { key: 'geodesics', label: 'Geodesics', type: 'toggle' },
  { key: 'lightRays', label: 'Light rays', type: 'toggle' },
  { key: 'spin', label: 'Spin a', type: 'range', min: 0, max: 1, step: 0.05 },
]

export const defaults: Params = {
  mass: 1.2,
  geodesics: true,
  lightRays: true,
  spin: 0.3,
}

// ── Oblique projection ──────────────────────────────────────────────────
// World coords: (x, y) on the flat plane, z = depth (down into the well).
// We tilt the plane so the funnel reads as 3D, and lift -z up the screen.
const TILT = 0.52 // how flat the plane lies (0 = top-down, 1 = edge-on)

type Theme = { bg: string; fg: string }

function project(
  x: number, y: number, z: number,
  cx: number, cy: number, scale: number,
): [number, number] {
  const sx = cx + x * scale
  const sy = cy + y * scale * TILT - z * scale
  return [sx, sy]
}

// Flamm-style well depth: smooth, finite, ∝ √-ish far out, diving near r_s.
// We avoid the true singular form for legibility and clamp the bottom.
function wellDepth(r: number, M: number): number {
  const rs = 2 * M // Schwarzschild radius (geometrised)
  // Softened funnel: deep near the centre, tapering ∝ M/r far away,
  // capped so the sheet never punches through the floor.
  const soft = Math.max(r, rs * 1.05)
  return (2.4 * M) / Math.sqrt(soft) + (1.6 * M) / soft
}

export const spacetimeCurvature: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme: Theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims

    // Plotting rect (CSS px). DPR is handled by the host transform; we draw
    // in CSS pixels and clamp every mapping to this rect.
    const pad = { l: 14, r: 14, t: 16, b: 30 }
    const rect = {
      x0: pad.l,
      y0: pad.t,
      x1: w - pad.r,
      y1: h - pad.b,
    }
    const cx = (rect.x0 + rect.x1) / 2
    const cy = (rect.y0 + rect.y1) / 2 - (rect.y1 - rect.y0) * 0.06
    // World half-extent we want to fit; scale so it lands inside the rect.
    const WORLD = 9
    const scale = Math.min(rect.x1 - rect.x0, rect.y1 - rect.y0) / (WORLD * 1.9)

    const clampX = (x: number) => Math.max(rect.x0, Math.min(rect.x1, x))
    const clampY = (y: number) => Math.max(rect.y0, Math.min(rect.y1, y))

    // ── geodesic state (massive test particles) ──
    type Orbit = { r: number; phi: number; u: number; du: number; hue: number; L: number }
    let orbits: Orbit[] = []

    // hash of params that require a state reset
    let lastHash = ''

    function buildOrbits(M: number) {
      orbits = []
      // A few bound orbits at different radii; L chosen for near-circular
      // orbits so precession is visible without escaping the rect.
      const specs = [
        { r0: 3.0, hue: 18 },   // tight, strong precession
        { r0: 4.6, hue: 200 },  // mid
        { r0: 6.6, hue: 150 },  // wide
      ]
      for (const s of specs) {
        const r0 = s.r0
        // Angular momentum for a circular-ish orbit + slight eccentricity.
        // Newtonian circular L = √(M r); nudge so the orbit is elliptical.
        const L = Math.sqrt(M * r0) * 1.06
        orbits.push({
          r: r0,
          phi: Math.random() * Math.PI * 2,
          u: 1 / r0,
          du: 0, // start at apo/peri-ish; small du gives a gentle ellipse
          hue: s.hue,
          L,
        })
      }
    }

    function paramHash(M: number, geo: boolean, light: boolean, a: number) {
      return `${M.toFixed(2)}|${geo ? 1 : 0}|${light ? 1 : 0}|${a.toFixed(2)}`
    }

    // ── Integrate a null geodesic (light ray) once, return polyline in (x,y) ──
    // Ray comes in from the left at impact parameter b, we sweep φ and use the
    // photon orbit equation  u'' + u = 3 M u²  (geometrised). Lense–Thirring
    // adds a small spin-dependent azimuthal drift for prograde rays.
    function traceRay(b: number, M: number, a: number): Array<[number, number]> {
      const pts: Array<[number, number]> = []
      // Parametrise by φ from ~π (incoming, far left) down past 0 (outgoing).
      // Straight-line asymptote: u = sin(φ)/b, du/dφ = cos(φ)/b. The 3Mu²
      // term then bends the ray as it sweeps past the mass.
      const phi0 = Math.PI - 0.001
      let u = Math.sin(phi0) / b
      let du = Math.cos(phi0) / b
      let phi = phi0
      const dphi = -0.012
      let guard = 0
      while (phi > -Math.PI * 0.6 && guard < 4000) {
        guard++
        // photon orbit equation: u'' + u = 3 M u²
        const ddu = -u + 3 * M * u * u
        du += ddu * dphi
        u += du * dphi
        // frame dragging: prograde rays get an extra azimuthal kick ∝ a M u²
        phi += dphi + a * M * u * u * 0.6 * dphi
        const r = 1 / Math.max(u, 1e-4)
        if (r > WORLD * 2.4) {
          if (pts.length > 1) break
        }
        if (r < 2 * M * 1.02) break // captured by the horizon
        const x = r * Math.cos(phi)
        const y = r * Math.sin(phi)
        pts.push([x, y])
      }
      return pts
    }

    return {
      step(t, p) {
        const M = p.mass as number
        const showGeo = p.geodesics as boolean
        const showLight = p.lightRays as boolean
        const a = p.spin as number // dimensionless-ish spin parameter

        const hash = paramHash(M, showGeo, showLight, a)
        if (hash !== lastHash) {
          buildOrbits(M)
          lastHash = hash
        }

        const rs = 2 * M

        // ── clear ──
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)

        // The whole well slowly swirls when spinning (frame dragging look).
        const swirl = (t / 1000) * a * 0.35

        // helper: project a flat-plane polar point onto the depressed sheet
        const sheet = (r: number, phi: number): [number, number] => {
          // frame-dragging twist: deeper points are dragged further round
          const drag = swirl * (rs / Math.max(r, rs)) * 4
          const ang = phi + drag
          const x = r * Math.cos(ang)
          const y = r * Math.sin(ang)
          const z = wellDepth(r, M)
          const [sx, sy] = project(x, y, z, cx, cy, scale)
          return [clampX(sx), clampY(sy)]
        }

        // ── 1. Rubber-sheet grid ──────────────────────────────────────────
        ctx.lineWidth = 1
        // radial spokes
        const RINGS = 11
        const SPOKES = 24
        ctx.strokeStyle = theme.fg + '22'
        for (let s = 0; s < SPOKES; s++) {
          const phi = (s / SPOKES) * Math.PI * 2
          ctx.beginPath()
          let started = false
          for (let ri = 0; ri <= 60; ri++) {
            const r = rs * 1.02 + (WORLD - rs * 1.02) * (ri / 60)
            const [sx, sy] = sheet(r, phi)
            if (!started) { ctx.moveTo(sx, sy); started = true }
            else ctx.lineTo(sx, sy)
          }
          ctx.stroke()
        }
        // concentric rings — brighter near the centre to read the curvature
        for (let ring = 1; ring <= RINGS; ring++) {
          const r = rs * 1.02 + (WORLD - rs * 1.02) * (ring / RINGS)
          const depthShade = Math.round(18 + 26 * (1 - ring / RINGS))
          ctx.strokeStyle = theme.fg + depthShade.toString(16).padStart(2, '0')
          ctx.beginPath()
          let started = false
          for (let s = 0; s <= SPOKES; s++) {
            const phi = (s / SPOKES) * Math.PI * 2
            const [sx, sy] = sheet(r, phi)
            if (!started) { ctx.moveTo(sx, sy); started = true }
            else ctx.lineTo(sx, sy)
          }
          ctx.closePath()
          ctx.stroke()
        }

        // ── 2. Central mass + horizon ─────────────────────────────────────
        const zc = wellDepth(rs * 1.05, M)
        const [mx, my] = project(0, 0, zc, cx, cy, scale)
        const mr = Math.max(5, scale * rs * 0.5)
        // horizon glow
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 2.6)
        grad.addColorStop(0, '#6366f1')
        grad.addColorStop(0.45, 'rgba(99,102,241,0.35)')
        grad.addColorStop(1, 'rgba(99,102,241,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(clampX(mx), clampY(my), mr * 2.6, 0, Math.PI * 2)
        ctx.fill()
        // mass body
        ctx.fillStyle = '#0b0b14'
        ctx.strokeStyle = '#8b8ff5'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(clampX(mx), clampY(my), mr, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        // spin indicator: a little rotation arrow when a > 0
        if (a > 0.001) {
          ctx.strokeStyle = '#facc15'
          ctx.lineWidth = 1.5
          const ar = mr + 5
          const a0 = swirl * 6
          ctx.beginPath()
          ctx.arc(clampX(mx), clampY(my), ar, a0, a0 + Math.PI * 1.4)
          ctx.stroke()
          // arrowhead
          const ah = a0 + Math.PI * 1.4
          const hx = clampX(mx) + ar * Math.cos(ah)
          const hy = clampY(my) + ar * Math.sin(ah)
          ctx.beginPath()
          ctx.moveTo(hx, hy)
          ctx.lineTo(hx - 5 * Math.cos(ah - 0.5), hy - 5 * Math.sin(ah - 0.5))
          ctx.moveTo(hx, hy)
          ctx.lineTo(hx - 5 * Math.cos(ah + 0.5), hy - 5 * Math.sin(ah + 0.5))
          ctx.stroke()
        }

        // ── 3. Light rays (null geodesics) ────────────────────────────────
        if (showLight) {
          const impacts = [1.4, 2.4, 3.6, 5.0].map((k) => k * Math.max(M, 0.4) + rs)
          for (let i = 0; i < impacts.length; i++) {
            const b = impacts[i]
            const ray = traceRay(b, M, a)
            if (ray.length < 2) continue
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)'
            ctx.lineWidth = 1.4
            ctx.beginPath()
            let started = false
            for (const [x, y] of ray) {
              const r = Math.hypot(x, y)
              const phi = Math.atan2(y, x)
              const [sx, sy] = sheet(r, phi)
              if (!started) { ctx.moveTo(sx, sy); started = true }
              else ctx.lineTo(sx, sy)
            }
            ctx.stroke()
            // arrowhead at the exit end
            const end = ray[ray.length - 1]
            const prev = ray[ray.length - 2]
            const er = Math.hypot(end[0], end[1])
            const ep = Math.atan2(end[1], end[0])
            const [ex, ey] = sheet(er, ep)
            const pr = Math.hypot(prev[0], prev[1])
            const pp = Math.atan2(prev[1], prev[0])
            const [px2, py2] = sheet(pr, pp)
            const ang = Math.atan2(ey - py2, ex - px2)
            ctx.fillStyle = 'rgba(250, 204, 21, 0.9)'
            ctx.beginPath()
            ctx.moveTo(ex, ey)
            ctx.lineTo(ex - 6 * Math.cos(ang - 0.4), ey - 6 * Math.sin(ang - 0.4))
            ctx.lineTo(ex - 6 * Math.cos(ang + 0.4), ey - 6 * Math.sin(ang + 0.4))
            ctx.closePath()
            ctx.fill()
          }
        }

        // ── 4. Geodesics (massive test particles) ─────────────────────────
        if (showGeo) {
          // Integrate the relativistic orbit equation a few sub-steps/frame.
          const sub = 6
          for (const o of orbits) {
            for (let s = 0; s < sub; s++) {
              const dphi = 0.045
              // u'' + u = M/L² + 3 M u²   (relativistic orbit equation)
              const ddu = -o.u + M / (o.L * o.L) + 3 * M * o.u * o.u
              o.du += ddu * dphi
              o.u += o.du * dphi
              // frame dragging: prograde Lense–Thirring kick ∝ a M u³
              const ltShift = a * M * o.u * o.u * o.u * 18 * dphi
              o.phi += dphi + ltShift
              o.u = Math.max(1 / (WORLD * 0.98), Math.min(1 / (rs * 1.06), o.u))
            }
            o.r = 1 / o.u

            // Draw a fading trail of the orbit by sampling its current ellipse
            // analytically would be ideal; instead we trace forward a short arc
            // for a clean, self-contained path indicator.
            const hue = o.hue
            // path arc: sample ahead along the same equation (non-mutating copy)
            let uu = o.u, dd = o.du, ph = o.phi
            ctx.strokeStyle = `hsla(${hue}, 80%, 62%, 0.55)`
            ctx.lineWidth = 1.4
            ctx.beginPath()
            let started = false
            for (let k = 0; k < 150; k++) {
              const dphi = 0.045
              const ddu = -uu + M / (o.L * o.L) + 3 * M * uu * uu
              dd += ddu * dphi
              uu += dd * dphi
              const lt = a * M * uu * uu * uu * 18 * dphi
              ph += dphi + lt
              uu = Math.max(1 / (WORLD * 0.98), Math.min(1 / (rs * 1.06), uu))
              const rr = 1 / uu
              const [sx, sy] = sheet(rr, ph)
              if (!started) { ctx.moveTo(sx, sy); started = true }
              else ctx.lineTo(sx, sy)
            }
            ctx.stroke()

            // the particle itself, sitting on the sheet
            const [px, py] = sheet(o.r, o.phi)
            ctx.fillStyle = `hsl(${hue}, 85%, 64%)`
            ctx.beginPath()
            ctx.arc(px, py, 3.2, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = theme.bg
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }

        // ── 5. Labels / readout ───────────────────────────────────────────
        ctx.font = '11px monospace'
        ctx.textAlign = 'left'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.5
        // deflection angle for the tightest light ray (Δφ ≈ 4M/b)
        const bMin = 1.4 * Math.max(M, 0.4) + rs
        const deflDeg = (4 * M / bMin) * (180 / Math.PI)
        ctx.fillText(
          `Schwarzschild embedding — M = ${M.toFixed(1)}, r_s = 2M = ${rs.toFixed(1)} (G = c = 1)`,
          rect.x0,
          rect.y1 + 14,
        )
        const bits: string[] = []
        if (showLight) bits.push(`light bend Δφ ≈ 4M/b ≈ ${deflDeg.toFixed(0)}°`)
        if (showGeo) bits.push('orbits precess (3Mu² term)')
        if (a > 0.001) bits.push(`spin a = ${a.toFixed(2)} (frame dragging)`)
        if (bits.length) ctx.fillText(bits.join('  ·  '), rect.x0, rect.y1 + 26)
        ctx.globalAlpha = 1

        // legend dots
        ctx.textAlign = 'right'
        let ly = rect.y0 + 12
        if (showLight) {
          ctx.fillStyle = 'rgba(250,204,21,0.9)'
          ctx.fillText('— light rays', rect.x1, ly)
          ly += 14
        }
        if (showGeo) {
          ctx.fillStyle = 'hsl(200, 80%, 62%)'
          ctx.fillText('● test particles (geodesics)', rect.x1, ly)
        }
        ctx.textAlign = 'left'
      },
      destroy() {
        orbits = []
        lastHash = ''
      },
    }
  },
}
