import type { EffectModule } from '@/lib/lab/types'

/**
 * Holographic Bound
 *
 * The maximum information that can be packed into a region of space scales
 * with the AREA of its boundary, not the VOLUME it encloses. Counter-
 * intuitively, a bigger box does NOT hold proportionally more bits.
 *
 * For a region bounded by a surface of area A (measured in Planck areas,
 * ℓ_P² ≈ 2.61 × 10⁻⁷⁰ m²), the Bekenstein–Hawking bound gives the entropy
 * of the densest possible state — a black hole filling the region:
 *
 *   S = A / 4         (in units of k_B, with A in Planck areas)
 *
 * and the information content in bits is
 *
 *   I = S / ln 2 = A / (4 ln 2).
 *
 * With the radius r expressed in Planck lengths:
 *
 *   A = 4 π r²        (surface area, Planck areas)   →  grows as r²
 *   V = (4/3) π r³    (enclosed volume, Planck cells) →  grows as r³
 *
 * Naïvely you might expect the storable information to track V (one bit per
 * Planck cell). It does not: it tracks A. As r grows, V/A = r/3 diverges, so
 * the "wasted" volume — cells whose state can never be independently set —
 * grows without bound. The world behaves like a hologram: a 3D bulk fully
 * described on its 2D boundary.
 *
 * This effect tiles a sphere's surface into Planck-area pixels (a discretised
 * horizon) and reads out r² area-growth against r³ volume-growth side by side,
 * together with S = A/4. The `pixelScale` knob sets how many physical Planck
 * lengths one drawn tile stands for, so the tiling stays legible.
 */
export const holographicBound: EffectModule = {
  controls: [
    { key: 'radius', label: 'Radius r (ℓ_P)', type: 'range', min: 1, max: 12, step: 0.1 },
    { key: 'showVolume', label: 'Show volume cells', type: 'toggle' },
    { key: 'pixelScale', label: 'Pixel scale', type: 'range', min: 1, max: 6, step: 0.5 },
  ],
  defaults: {
    radius: 6,
    showVolume: true,
    pixelScale: 3,
  },
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims

    // --- params hash so internal animation state resets cleanly on change ---
    let lastHash = ''
    let spin = 0 // accumulated view rotation (radians)

    // A pleasant indigo accent (the cosmology section colour) that reads on
    // both light and dark stages.
    const ACCENT = '#6366f1'
    const AREA_COL = '#6366f1' // r² — boundary information (kept)
    const VOL_COL = '#f59e0b' // r³ — volume cells (the "wasted" interior)

    /** Rotate a unit-sphere point about Y then X, return [screenX, screenY, depthZ]. */
    function project(
      ux: number, uy: number, uz: number,
      ay: number, ax: number,
      cx: number, cy: number, R: number,
    ): [number, number, number] {
      // rotate around Y
      const x1 = ux * Math.cos(ay) + uz * Math.sin(ay)
      const z1 = -ux * Math.sin(ay) + uz * Math.cos(ay)
      // rotate around X
      const y1 = uy * Math.cos(ax) - z1 * Math.sin(ax)
      const z2 = uy * Math.sin(ax) + z1 * Math.cos(ax)
      // orthographic projection (z toward viewer = +)
      return [cx + x1 * R, cy - y1 * R, z2]
    }

    function clamp(v: number, lo: number, hi: number) {
      return v < lo ? lo : v > hi ? hi : v
    }

    return {
      step(t, p) {
        const radius = p.radius as number
        const showVolume = p.showVolume as boolean
        const pixelScale = p.pixelScale as number

        const hash = `${radius}|${showVolume}|${pixelScale}`
        if (hash !== lastHash) {
          lastHash = hash
          // reset the slow spin so a parameter nudge gives a fresh, steady view
          spin = 0
        }
        spin += 0.0035

        // --- background ---
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)

        // --- layout: sphere on the left, readout panel on the right -------
        const panelW = clamp(w * 0.34, 150, 230)
        const sceneW = w - panelW
        const cx = sceneW * 0.5
        const cy = h * 0.5
        // sphere radius in screen px — leave margin for the tiles + labels
        const R = clamp(Math.min(sceneW, h) * 0.34, 30, Math.min(sceneW, h))

        // ---------------------------------------------------------------
        // Physics quantities (r in Planck lengths)
        // ---------------------------------------------------------------
        const area = 4 * Math.PI * radius * radius // Planck areas
        const volume = (4 / 3) * Math.PI * radius * radius * radius // Planck cells
        const entropy = area / 4 // S = A/4  (units of k_B)
        const bits = area / (4 * Math.LN2) // information bound, in bits

        // ---------------------------------------------------------------
        // Tile the sphere surface into ~Planck-area pixels.
        // The number of tiles tracks A/pixelScale² so the count IS the area
        // story; pixelScale trades resolution for legibility.
        // We lay the tiles out on a lat/long grid sized so each tile subtends
        // roughly a square patch of side (pixelScale) Planck lengths.
        // ---------------------------------------------------------------
        const tileArc = clamp(pixelScale / Math.max(radius, 0.5), 0.12, 1.2) // radians per tile (~ side/r)
        const nLat = clamp(Math.round(Math.PI / tileArc), 4, 48)

        const ay = spin
        const ax = 0.5 // fixed tilt so poles read

        // collect tiles with depth for painter's-algorithm ordering
        type Tile = { x: number; y: number; z: number; r: number; bright: number }
        const tiles: Tile[] = []
        let tileCount = 0

        for (let i = 0; i < nLat; i++) {
          // latitude band centre
          const theta = ((i + 0.5) / nLat) * Math.PI // 0..π
          const sinT = Math.sin(theta)
          const cosT = Math.cos(theta)
          // number of longitudinal tiles in this band ∝ circumference (sinθ)
          const nLon = clamp(Math.round(nLat * 2 * sinT), 1, 96)
          for (let j = 0; j < nLon; j++) {
            const phi = ((j + 0.5) / nLon) * Math.PI * 2
            const ux = sinT * Math.cos(phi)
            const uy = cosT
            const uz = sinT * Math.sin(phi)
            const [sx, sy, sz] = project(ux, uy, uz, ay, ax, cx, cy, R)
            // shade by facing the viewer (sz>0) — simple Lambert-ish term
            const bright = clamp(0.25 + 0.75 * (sz * 0.5 + 0.5), 0.18, 1)
            // tile radius in screen px, from its angular size, clamped so tiles
            // never spill outside the plotting circle
            const tr = clamp((tileArc * R) * 0.42, 1, R * 0.5)
            tiles.push({ x: sx, y: sy, z: sz, r: tr, bright })
            tileCount++
          }
        }

        // back-to-front so near tiles overdraw far ones
        tiles.sort((a, b) => a.z - b.z)

        // faint sphere disc behind the tiles for solidity
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, R, 0, Math.PI * 2)
        ctx.fillStyle = ACCENT
        ctx.globalAlpha = 0.06
        ctx.fill()
        ctx.restore()

        // draw the Planck-area pixels
        const [ar, ag, ab] = [99, 102, 241] // ACCENT rgb
        for (const tl of tiles) {
          // clamp every tile centre to the plotting circle's bounding box
          const px = clamp(tl.x, cx - R, cx + R)
          const py = clamp(tl.y, cy - R, cy + R)
          ctx.beginPath()
          ctx.arc(px, py, tl.r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${ar},${ag},${ab},${(0.35 + 0.55 * tl.bright).toFixed(3)})`
          ctx.fill()
        }

        // sphere outline
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, R, 0, Math.PI * 2)
        ctx.strokeStyle = theme.fg
        ctx.globalAlpha = 0.22
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.restore()

        // ---------------------------------------------------------------
        // Optional: a slice of the interior volume cells (r³) — the bits you
        // might NAIVELY expect to be able to use, shown as a faded equatorial
        // grid behind the surface to contrast with the boundary tiling.
        // ---------------------------------------------------------------
        if (showVolume) {
          const cells = clamp(Math.round((R * 2) / Math.max(tileArc * R, 4)), 2, 40)
          const cellPx = (R * 2) / cells
          ctx.save()
          ctx.strokeStyle = VOL_COL
          ctx.globalAlpha = 0.16
          ctx.lineWidth = 0.6
          // clip to the sphere disc so the grid reads as the interior
          ctx.beginPath()
          ctx.arc(cx, cy, R - 1, 0, Math.PI * 2)
          ctx.clip()
          ctx.beginPath()
          for (let gx = 0; gx <= cells; gx++) {
            const x = clamp(cx - R + gx * cellPx, cx - R, cx + R)
            ctx.moveTo(x, cy - R)
            ctx.lineTo(x, cy + R)
          }
          for (let gy = 0; gy <= cells; gy++) {
            const y = clamp(cy - R + gy * cellPx, cy - R, cy + R)
            ctx.moveTo(cx - R, y)
            ctx.lineTo(cx + R, y)
          }
          ctx.stroke()
          ctx.restore()
        }

        // scene caption
        ctx.save()
        ctx.font = '10px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.5
        ctx.textAlign = 'center'
        ctx.fillText(
          `horizon tiled into ${tileCount.toLocaleString()} Planck pixels`,
          cx, clamp(cy + R + 18, 0, h - 6),
        )
        ctx.restore()

        // ===============================================================
        // Right-hand readout panel: r² (area) vs r³ (volume) growth bars
        // ===============================================================
        const px0 = sceneW + 14
        const pw = panelW - 28
        let yCursor = 22

        ctx.save()
        ctx.textAlign = 'left'

        // panel title
        ctx.font = 'bold 11px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.85
        ctx.fillText('r = ' + radius.toFixed(1) + ' ℓ_P', px0, yCursor)
        yCursor += 22

        // helper to draw a labelled growth bar with a log-scaled fill so both
        // r² and r³ stay on-panel across the whole radius range.
        function bar(label: string, value: number, color: string, maxLog: number) {
          ctx.font = '10px monospace'
          ctx.fillStyle = theme.fg
          ctx.globalAlpha = 0.7
          ctx.fillText(label, px0, yCursor)
          yCursor += 12
          const barH = 12
          // track
          ctx.fillStyle = theme.fg
          ctx.globalAlpha = 0.08
          ctx.fillRect(px0, yCursor, pw, barH)
          // fill — log scale, clamped to the track width
          const frac = clamp(Math.log10(Math.max(value, 1)) / maxLog, 0, 1)
          ctx.fillStyle = color
          ctx.globalAlpha = 0.85
          ctx.fillRect(px0, yCursor, pw * frac, barH)
          // numeric value
          ctx.fillStyle = theme.fg
          ctx.globalAlpha = 0.85
          ctx.font = '10px monospace'
          const valStr = value >= 1000 ? value.toExponential(2) : value.toFixed(1)
          ctx.fillText(valStr, px0 + 2, yCursor + barH + 11)
          yCursor += barH + 22
        }

        // shared log ceiling so the bars are directly comparable
        const maxLog = Math.log10((4 / 3) * Math.PI * 12 * 12 * 12) // V at r=12

        bar('Boundary  A = 4πr²  (∝ r²)', area, AREA_COL, maxLog)
        bar('Interior  V = 4/3·πr³  (∝ r³)', volume, VOL_COL, maxLog)

        // the ratio that diverges
        ctx.font = '10px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.6
        ctx.fillText(`V / A = r/3 = ${(radius / 3).toFixed(2)}`, px0, yCursor)
        yCursor += 20

        // Bekenstein–Hawking entropy + information bound
        ctx.fillStyle = ACCENT
        ctx.globalAlpha = 0.95
        ctx.font = 'bold 11px monospace'
        ctx.fillText('S = A/4 = ' + entropy.toFixed(1), px0, yCursor)
        yCursor += 16
        ctx.font = '10px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.7
        ctx.fillText('I = A/(4 ln2)', px0, yCursor)
        yCursor += 13
        ctx.globalAlpha = 0.85
        const bitStr = bits >= 1000 ? bits.toExponential(2) : bits.toFixed(0)
        ctx.fillText('  ≈ ' + bitStr + ' bits', px0, yCursor)

        ctx.restore()

        // bottom strap caption
        ctx.save()
        ctx.font = '10px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.42
        ctx.textAlign = 'left'
        ctx.fillText('information scales with the boundary, not the volume', 12, h - 10)
        ctx.restore()
      },
    }
  },
}
