import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Logistic Bifurcation — bifurcation diagram of x_{n+1} = r·x·(1−x).
 * Each column (a value of r) iterates from x = 0.5, discards the transient,
 * and plots the surviving attractor values, revealing the period-doubling
 * cascade into chaos. The diagram is static for a given rMin/rMax/iterations,
 * so it is rendered ONCE into a persistent offscreen buffer and recomputed
 * only when those change; each frame just blits it and overlays a live
 * orange r-marker and a small animating cobweb inset.
 */
export const controls: ControlSpec[] = [
  { key: 'rMin', label: 'r min', type: 'range', min: 2.5, max: 3.5, step: 0.01 },
  { key: 'rMax', label: 'r max', type: 'range', min: 3.5, max: 4.0, step: 0.01 },
  { key: 'r', label: 'Current r', type: 'range', min: 2.5, max: 4.0, step: 0.001 },
  { key: 'iterations', label: 'Iterations', type: 'range', min: 200, max: 800, step: 50 },
  { key: 'showCobweb', label: 'Cobweb inset', type: 'toggle' },
]

export const defaults: Params = { rMin: 2.5, rMax: 4.0, r: 3.7, iterations: 500, showCobweb: true }

const PURPLE = [124, 92, 255] as const // #7c5cff attractor points
const ORANGE = '#ff7a59', CYAN = '#00b4d8', VIOLET = '#a78bfa' // marker / parabola / cobweb
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

export const LogisticBifurcation: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims

    // Plot rectangle in CSS px. The cobweb inset overlays the top-right.
    const PL = 46, PR = 14, PT = 14, PB = 28
    const PW = Math.max(1, w - PL - PR)
    const PH = Math.max(1, h - PT - PB)

    // Persistent offscreen buffers (created once, reused across frames).
    // `buf` holds the whole rendered diagram; `pts` is a scratch layer used
    // to composite the semi-transparent point density over theme.bg.
    const buf = document.createElement('canvas')
    buf.width = Math.max(1, w); buf.height = Math.max(1, h)
    const bctx = buf.getContext('2d')!
    const pts = document.createElement('canvas')
    pts.width = PW; pts.height = PH
    const pctx = pts.getContext('2d')!

    let lastKey = ''

    // Render the diagram ONCE into `buf`. Heavy nested loop; guarded by
    // lastKey so it only re-runs when rMin/rMax/iterations change.
    function computeDiagram(rMin: number, rMax: number, iterations: number) {
      bctx.fillStyle = theme.bg
      bctx.fillRect(0, 0, buf.width, buf.height)

      const span = rMax - rMin
      const transient = Math.min(200, Math.floor(iterations * 0.4))
      const samples = Math.max(1, iterations - transient)
      const density = new Float32Array(PW * PH)
      for (let col = 0; col < PW; col++) {
        const rr = rMin + (PW > 1 ? col / (PW - 1) : 0) * span
        let x = 0.5
        for (let i = 0; i < transient; i++) x = rr * x * (1 - x)
        for (let i = 0; i < samples; i++) {
          x = rr * x * (1 - x)
          // x = 1 maps to the top of the plot, x = 0 to the bottom.
          const py = ((1 - clamp01(x)) * (PH - 1)) | 0
          density[py * PW + col] += 1
        }
      }

      const img = pctx.createImageData(PW, PH)
      const data = img.data
      for (let i = 0, n = PW * PH; i < n; i++) {
        const den = density[i]
        if (den <= 0) continue
        // Dense attractors (period-1/2/4…) saturate; chaotic spread stays faint.
        const a = Math.min(1, 0.06 + 0.15 * Math.log2(1 + den))
        const o = i * 4
        data[o] = PURPLE[0]
        data[o + 1] = PURPLE[1]
        data[o + 2] = PURPLE[2]
        data[o + 3] = (a * 255) | 0
      }
      pctx.putImageData(img, 0, 0)
      bctx.drawImage(pts, PL, PT) // source-over composite of points onto bg
    }

    // Map an r value onto its clamped x-pixel in the main plot.
    const rToX = (rv: number, rMin: number, span: number) =>
      PL + clamp01((rv - rMin) / (span < 1e-6 ? 1e-6 : span)) * PW

    // Draw the cobweb inset: y=x line, the parabola, and an animating
    // staircase of iterations for the current r.
    function drawCobweb(t: number, r: number) {
      const IW = w * 0.34, IH = h * 0.40
      const iRight = w - 10, iTop = 10
      const iLeft = iRight - IW, iBottom = iTop + IH
      const pad = 10
      const gx = (x: number) => iLeft + pad + clamp01(x) * (IW - 2 * pad)
      const gy = (y: number) => iBottom - pad - clamp01(y) * (IH - 2 * pad)

      // Opaque panel so the diagram behind does not bleed through.
      ctx.save()
      ctx.globalAlpha = 0.92; ctx.fillStyle = theme.bg
      ctx.fillRect(iLeft, iTop, IW, IH)
      ctx.globalAlpha = 0.3; ctx.strokeStyle = theme.fg; ctx.lineWidth = 1
      ctx.strokeRect(iLeft, iTop, IW, IH)
      // y = x reference line
      ctx.beginPath(); ctx.moveTo(gx(0), gy(0)); ctx.lineTo(gx(1), gy(1)); ctx.stroke()
      ctx.restore()

      // Parabola y = r·x·(1−x)
      ctx.save()
      ctx.strokeStyle = CYAN; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let k = 0; k <= 48; k++) {
        const x = k / 48
        const y = r * x * (1 - x)
        if (k === 0) ctx.moveTo(gx(x), gy(y)); else ctx.lineTo(gx(x), gy(y))
      }
      ctx.stroke()
      ctx.restore()

      // Build the staircase vertices, then reveal them over a looping cycle so
      // the inset animates continuously (period-1/2 collapse, chaos wanders).
      const nIter = 16
      const verts: number[] = []
      let cx = 0.12
      verts.push(cx, cx)
      for (let k = 0; k < nIter; k++) {
        const y = clamp01(r * cx * (1 - cx))
        verts.push(cx, y, y, y)
        cx = y
      }
      const segCount = verts.length / 2 - 1
      const phase = (t % 4200) / 4200
      const head = Math.min(1, phase / 0.82) * segCount
      const full = Math.floor(head)
      const frac = head - full

      ctx.save()
      ctx.strokeStyle = VIOLET; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.4
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(gx(verts[0]), gy(verts[1]))
      let hx = gx(verts[0]), hy = gy(verts[1])
      for (let s = 0; s < full; s++) {
        hx = gx(verts[(s + 1) * 2]); hy = gy(verts[(s + 1) * 2 + 1])
        ctx.lineTo(hx, hy)
      }
      if (full < segCount) {
        const ax = gx(verts[full * 2]), ay = gy(verts[full * 2 + 1])
        const bx = gx(verts[(full + 1) * 2]), by = gy(verts[(full + 1) * 2 + 1])
        hx = ax + (bx - ax) * frac; hy = ay + (by - ay) * frac
        ctx.lineTo(hx, hy)
      }
      ctx.stroke()
      ctx.fillStyle = ORANGE; ctx.globalAlpha = 1
      ctx.beginPath(); ctx.arc(hx, hy, 2.5, 0, Math.PI * 2); ctx.fill()
      // Inset caption
      ctx.globalAlpha = 0.6; ctx.fillStyle = theme.fg
      ctx.font = '9px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'
      ctx.fillText(`cobweb  r=${r.toFixed(3)}`, iLeft + 6, iTop + 5)
      ctx.restore()
    }

    return {
      step(t, p) {
        // 1) Read params
        const rMin = p.rMin as number, rMax = p.rMax as number, r = p.r as number
        const iterations = Math.round(p.iterations as number)
        const showCobweb = p.showCobweb !== false
        const span = rMax - rMin

        // 2) Recompute the offscreen diagram only when structural params change
        const key = `${rMin.toFixed(2)}_${rMax.toFixed(2)}_${iterations}`
        if (key !== lastKey) { computeDiagram(rMin, rMax, iterations); lastKey = key }

        // 3) Clear and blit the cached diagram (covers the whole canvas)
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(buf, 0, 0, w, h)

        // 4) Axes + labels in theme.fg
        ctx.save()
        ctx.strokeStyle = theme.fg; ctx.globalAlpha = 0.35; ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(PL, PT); ctx.lineTo(PL, PT + PH); ctx.lineTo(PL + PW, PT + PH)
        ctx.stroke()
        ctx.globalAlpha = 0.5; ctx.fillStyle = theme.fg; ctx.font = '10px monospace'
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
        ctx.fillText('1.0', PL - 6, PT)
        ctx.fillText('0.5', PL - 6, PT + PH / 2)
        ctx.fillText('0', PL - 6, PT + PH)
        ctx.save()
        ctx.translate(13, PT + PH / 2); ctx.rotate(-Math.PI / 2)
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('population x', 0, 0)
        ctx.restore()
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'
        ctx.fillText(rMin.toFixed(2), PL, PT + PH + 5)
        ctx.fillText(((rMin + rMax) / 2).toFixed(2), PL + PW / 2, PT + PH + 5)
        ctx.fillText(rMax.toFixed(2), PL + PW, PT + PH + 5)
        ctx.globalAlpha = 0.4
        ctx.fillText('growth rate r', PL + PW / 2, PT + PH + 16)
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
        ctx.fillText('map:  x → r·x·(1−x)', PL + 6, PT + 14)
        ctx.restore()

        // 5) Bright orange marker at the current r (full plot height)
        const mx = rToX(r, rMin, span)
        ctx.save()
        ctx.strokeStyle = ORANGE; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(mx, PT); ctx.lineTo(mx, PT + PH); ctx.stroke()
        ctx.restore()

        // 6) Cobweb inset (overlays the top-right)
        if (showCobweb) drawCobweb(t, r)

        // 7) Marker tick + label near the x-axis (always visible below inset)
        const mfrac = clamp01((r - rMin) / (span < 1e-6 ? 1e-6 : span))
        ctx.save()
        ctx.fillStyle = ORANGE; ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.moveTo(mx, PT + PH - 6); ctx.lineTo(mx - 4, PT + PH + 2); ctx.lineTo(mx + 4, PT + PH + 2)
        ctx.closePath(); ctx.fill()
        ctx.font = '10px monospace'; ctx.textBaseline = 'bottom'
        ctx.textAlign = mfrac > 0.8 ? 'right' : 'left'
        ctx.fillText(`r=${r.toFixed(3)}`, mfrac > 0.8 ? mx - 5 : mx + 5, PT + PH - 6)
        ctx.restore()
      },
    }
  },
}
