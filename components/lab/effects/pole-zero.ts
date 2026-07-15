import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Pole-Zero Explorer: a conjugate pole pair on the complex s-plane, mapped
 * live to the unit step response and Bode magnitude of the second-order system
 * H(s) = ωn²/(s² + 2ζωn·s + ωn²) (with an optional real zero). Poles sit at
 * s = -ζωn ± jωn√(1-ζ²). Push ζ below zero and the pair crosses into the right
 * half-plane: the step response diverges and the plane shades red.
 */
export const controls: ControlSpec[] = [
  { key: 'wn', label: 'Natural freq ωn', type: 'range', min: 0.5, max: 4, step: 0.1 },
  { key: 'zeta', label: 'Damping ζ', type: 'range', min: -0.2, max: 1.5, step: 0.05 },
  { key: 'addZero', label: 'Add real zero', type: 'toggle' },
  { key: 'zeroLoc', label: 'Zero location', type: 'range', min: -4, max: -0.2, step: 0.1 },
  { key: 'showBode', label: 'Show Bode magnitude', type: 'toggle' },
]

export const defaults: Params = {
  wn: 1.5,
  zeta: 0.4,
  addZero: false,
  zeroLoc: -1,
  showBode: true,
}

const CYAN = '#00b4d8'
const AMBER = '#f5a623'
const VIOLET = '#a78bfa'
const RED = '#ff5c8a'

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
// x1' = x2 ; x2' = -ωn² x1 - 2ζωn x2 + u   (u = 1, unit step)
const accel = (x1: number, x2: number, wn: number, zeta: number) =>
  -wn * wn * x1 - 2 * zeta * wn * x2 + 1

export const PoleZero: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims
    const fg = theme.fg

    const TRACE = 1200
    const BODE_N = 240
    const trace = new Float32Array(TRACE)
    const bodeDb = new Float32Array(BODE_N)

    // Step-response integrator state (reset on any structural change).
    let x1 = 0, x2 = 0, filled = 0, hold = 0
    let dt = 0.01, stepsPerFrame = 9, Tmax = 10, lastKey = ''

    function reset(wn: number, zeta: number, addZero: boolean, zeroLoc: number) {
      x1 = 0; x2 = 0; filled = 0; hold = 0
      Tmax = 16 / wn
      dt = Tmax / TRACE
      stepsPerFrame = Math.max(4, Math.round(TRACE / 140))
      // Bode magnitude sketch |H(jω)| in dB, ω log-spaced around ωn.
      const b = -zeroLoc
      const logMin = Math.log10(wn) - 2
      const logMax = Math.log10(wn) + 2
      for (let i = 0; i < BODE_N; i++) {
        const omega = Math.pow(10, logMin + (i / (BODE_N - 1)) * (logMax - logMin))
        const re = wn * wn - omega * omega
        const im = 2 * zeta * wn * omega
        let mag = (wn * wn) / Math.sqrt(re * re + im * im)
        if (addZero) mag *= Math.sqrt((omega / b) * (omega / b) + 1)
        bodeDb[i] = 20 * Math.log10(mag + 1e-9)
      }
    }

    // Small canvas helpers ------------------------------------------------
    function markX(cx: number, cy: number, r: number, color: string) {
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r)
      ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r)
      ctx.stroke()
      ctx.restore()
    }
    function markO(cx: number, cy: number, r: number, color: string) {
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
    function label(text: string, x: number, y: number, alpha: number, align: CanvasTextAlign = 'left') {
      ctx.save()
      ctx.fillStyle = fg
      ctx.globalAlpha = alpha
      ctx.font = '10px monospace'
      ctx.textAlign = align
      ctx.fillText(text, x, y)
      ctx.restore()
    }
    // theme.fg line segment (grid / axes / reference lines)
    function seg(ax: number, ay: number, bx: number, by: number, alpha: number, width = 1, dash: number[] = []) {
      ctx.save()
      ctx.strokeStyle = fg; ctx.globalAlpha = alpha; ctx.lineWidth = width; ctx.setLineDash(dash)
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke()
      ctx.restore()
    }
    // sampled polyline from index space
    function curve(n: number, fx: (i: number) => number, fy: (i: number) => number, color: string, width: number) {
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath()
      for (let i = 0; i < n; i++) { const px = fx(i), py = fy(i); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py) }
      ctx.stroke(); ctx.restore()
    }

    return {
      step(_t, p) {
        const wn = p.wn as number
        const zeta = p.zeta as number
        const addZero = p.addZero as boolean
        const zeroLoc = p.zeroLoc as number
        const showBode = p.showBode as boolean

        const key = `${wn}|${zeta}|${addZero}|${zeroLoc}`
        if (key !== lastKey) { reset(wn, zeta, addZero, zeroLoc); lastKey = key }
        const b = -zeroLoc

        // ── advance the step-response integrator (RK4) ─────────────────
        if (filled < TRACE) {
          for (let s = 0; s < stepsPerFrame && filled < TRACE; s++) {
            const k1v = x2, k1a = accel(x1, x2, wn, zeta)
            const k2v = x2 + 0.5 * dt * k1a, k2a = accel(x1 + 0.5 * dt * k1v, x2 + 0.5 * dt * k1a, wn, zeta)
            const k3v = x2 + 0.5 * dt * k2a, k3a = accel(x1 + 0.5 * dt * k2v, x2 + 0.5 * dt * k2a, wn, zeta)
            const k4v = x2 + dt * k3a, k4a = accel(x1 + dt * k3v, x2 + dt * k3a, wn, zeta)
            x1 += (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v)
            x2 += (dt / 6) * (k1a + 2 * k2a + 2 * k3a + k4a)
            // Output = ωn²·x1 (+ zero adds a scaled ωn²/b·x2 term); DC gain = 1.
            trace[filled++] = wn * wn * x1 + (addZero ? (wn * wn / b) * x2 : 0)
          }
        } else if (++hold > 45) {
          // Settle, pause, then auto-retrigger the transient.
          x1 = 0; x2 = 0; filled = 0; hold = 0
        }

        // ── clear + header ─────────────────────────────────────────────
        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)
        const zeroTxt = addZero ? `·(s/${(-zeroLoc).toFixed(1)}+1)` : ''
        label(`H(s) = ωn²${zeroTxt} / (s² + 2ζωn·s + ωn²)`, 12, 15, 0.7)
        const readout = `ωn=${wn.toFixed(1)}  ζ=${zeta.toFixed(2)}`
        if (zeta < 0) {
          ctx.save(); ctx.fillStyle = RED; ctx.globalAlpha = 0.9; ctx.font = '10px monospace'
          ctx.textAlign = 'right'; ctx.fillText(`${readout}  UNSTABLE`, w - 12, 15); ctx.restore()
        } else {
          label(readout, w - 12, 15, 0.5, 'right')
        }

        const top = 26
        const bottom = h - 18

        // ── LEFT: s-plane ──────────────────────────────────────────────
        const Lx0 = 30, Lx1 = Math.round(w * 0.47)
        const pw = Lx1 - Lx0, ph = bottom - top
        const poleReC = -zeta * wn
        let poleIm = 0
        const reals: number[] = []
        if (zeta < 1) { poleIm = wn * Math.sqrt(1 - zeta * zeta); reals.push(poleReC) }
        else { const d = wn * Math.sqrt(zeta * zeta - 1); reals.push(poleReC + d, poleReC - d) }
        const zeros = addZero ? [zeroLoc] : []
        const minRe = Math.min(-2, ...reals, ...zeros) - 0.5
        const maxRe = Math.max(2, poleReC) + 0.5
        const maxIm = Math.max(2, poleIm) + 0.5
        const sx = (re: number) => Lx0 + clamp01((re - minRe) / (maxRe - minRe)) * pw
        const sy = (im: number) => bottom - clamp01((im + maxIm) / (2 * maxIm)) * ph

        // right half-plane shading (instability region)
        const x0zero = sx(0)
        ctx.save(); ctx.fillStyle = RED; ctx.globalAlpha = 0.07
        ctx.fillRect(x0zero, top, Lx1 - x0zero, ph); ctx.restore()

        // integer gridlines
        for (let re = Math.ceil(minRe); re <= Math.floor(maxRe); re++) seg(sx(re), top, sx(re), bottom, 0.08)
        for (let im = Math.ceil(-maxIm); im <= Math.floor(maxIm); im++) seg(Lx0, sy(im), Lx1, sy(im), 0.08)

        // σ and jω axes
        seg(Lx0, sy(0), Lx1, sy(0), 0.4, 1.5)
        seg(sx(0), top, sx(0), bottom, 0.4, 1.5)
        label('σ', Lx1 - 4, sy(0) - 4, 0.5, 'right')
        label('jω', sx(0) + 4, top + 10, 0.5)

        // poles (×, cyan) and zero (○, amber)
        if (zeta < 1) {
          markX(sx(poleReC), sy(poleIm), 5, CYAN)
          markX(sx(poleReC), sy(-poleIm), 5, CYAN)
        } else {
          for (const re of reals) markX(sx(re), sy(0), 5, CYAN)
        }
        if (addZero) markO(sx(zeroLoc), sy(0), 5, AMBER)
        label('s-plane', Lx0 + 4, bottom - 5, 0.45)

        // ── RIGHT panels ───────────────────────────────────────────────
        const Rx0 = Math.round(w * 0.53), Rx1 = w - 14
        const mid = Math.round((top + bottom) / 2)
        const stepRect = showBode
          ? { x0: Rx0, y0: top, x1: Rx1, y1: mid - 10 }
          : { x0: Rx0, y0: top, x1: Rx1, y1: bottom }

        // (a) step response
        {
          const { x0, y0, x1: rx1, y1 } = stepRect
          const rpw = rx1 - x0, rph = y1 - y0
          const aMin = -0.6, aMax = 2.4
          const ax = (i: number) => x0 + (i / (TRACE - 1)) * rpw
          const ay = (v: number) => y1 - clamp01((v - aMin) / (aMax - aMin)) * rph
          ctx.save(); ctx.strokeStyle = fg; ctx.globalAlpha = 0.25; ctx.strokeRect(x0, y0, rpw, rph); ctx.restore()
          seg(x0, ay(0), rx1, ay(0), 0.25, 1, [4, 4]) // zero baseline
          seg(x0, ay(1), rx1, ay(1), 0.25, 1, [4, 4]) // unity target
          const traceCol = zeta < 0 ? RED : CYAN
          curve(filled, ax, (i) => ay(trace[i]), traceCol, 1.6)
          if (filled > 0) { // moving playhead dot
            ctx.save(); ctx.fillStyle = traceCol
            ctx.beginPath(); ctx.arc(ax(filled - 1), ay(trace[filled - 1]), 2.5, 0, Math.PI * 2); ctx.fill(); ctx.restore()
          }
          label('step response  y(t)', x0 + 4, y0 + 12, 0.5)
          label('1', x0 - 2, ay(1) + 3, 0.4, 'right')
          label('t →', rx1 - 2, y1 - 4, 0.4, 'right')
        }

        // (b) Bode magnitude
        if (showBode) {
          const x0 = Rx0, y0 = mid + 8, rx1 = Rx1, y1 = bottom
          const rpw = rx1 - x0, rph = y1 - y0
          const dbMin = -48, dbMax = 24
          const by = (db: number) => y1 - clamp01((db - dbMin) / (dbMax - dbMin)) * rph
          ctx.save(); ctx.strokeStyle = fg; ctx.globalAlpha = 0.25; ctx.strokeRect(x0, y0, rpw, rph); ctx.restore()
          for (let db = dbMin; db <= dbMax; db += 24) seg(x0, by(db), rx1, by(db), 0.12, 1, [2, 4])
          // ωn marker (log-centre of the sweep)
          const wnX = x0 + 0.5 * rpw
          ctx.save(); ctx.strokeStyle = AMBER; ctx.globalAlpha = 0.5; ctx.setLineDash([3, 3])
          ctx.beginPath(); ctx.moveTo(wnX, y0); ctx.lineTo(wnX, y1); ctx.stroke(); ctx.restore()
          curve(BODE_N, (i) => x0 + (i / (BODE_N - 1)) * rpw, (i) => by(bodeDb[i]), VIOLET, 1.6)
          label('|H(jω)| dB', x0 + 4, y0 + 12, 0.5)
          label('0', x0 - 2, by(0) + 3, 0.4, 'right')
          label('ωn', wnX, y1 - 4, 0.45, 'center')
          label('log ω →', rx1 - 2, y1 - 4, 0.4, 'right')
        }
      },
    }
  },
}
