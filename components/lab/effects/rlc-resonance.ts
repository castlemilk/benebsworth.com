import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'R', label: 'Resistance R (Ω)', type: 'range', min: 0.1, max: 5, step: 0.1 },
  { key: 'L', label: 'Inductance L (H)', type: 'range', min: 0.01, max: 1, step: 0.01 },
  { key: 'C', label: 'Capacitance C (F)', type: 'range', min: 0.0001, max: 0.01, step: 0.0001 },
  { key: 'amplitude', label: 'Step amplitude (V)', type: 'range', min: 0.5, max: 5, step: 0.1 },
]

export const defaults: Params = { R: 1, L: 0.5, C: 0.001, amplitude: 2 }

// ── Schematic drawing helpers ──────────────────────────────────────────

function drawResistor(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number) {
  const segs = 6, amp = 6, hw = w / 2
  ctx.beginPath(); ctx.moveTo(cx - hw, cy)
  for (let i = 0; i < segs; i++) {
    const px = cx - hw + (i + 0.25) * (w / segs)
    ctx.lineTo(px, cy + (i % 2 === 0 ? -amp : amp))
  }
  ctx.lineTo(cx + hw, cy); ctx.stroke()
}

function drawInductor(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number) {
  const loops = 4, hw = w / 2, loopW = w / loops
  ctx.beginPath(); ctx.moveTo(cx - hw, cy)
  for (let i = 0; i < loops; i++) {
    ctx.arc(cx - hw + i * loopW + loopW / 2, cy, loopW / 2, Math.PI, 0, false)
  }
  ctx.stroke()
}

function drawCapacitor(ctx: CanvasRenderingContext2D, cx: number, cy: number, gap: number, plateH: number) {
  const hg = gap / 2
  ctx.beginPath(); ctx.moveTo(cx - hg, cy - plateH / 2); ctx.lineTo(cx - hg, cy + plateH / 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx + hg, cy - plateH / 2); ctx.lineTo(cx + hg, cy + plateH / 2); ctx.stroke()
}

function drawVoltageSource(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, fg: string) {
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('+', cx, cy - r * 0.35)
  ctx.fillText('−', cx, cy + r * 0.35)
}

// ── RLC State ─────────────────────────────────────────────────────────

interface RlcState {
  Vc: number
  iL: number
  t: number
  stepIdx: number
  // Ring buffer for the last MAX_STEPS voltage samples
  buf: Float32Array
  settled: boolean
}

const MAX_STEPS = 480
const DT = 0.0005

function freshState(): RlcState {
  return {
    Vc: 0, iL: 0, t: 0, stepIdx: 0,
    buf: new Float32Array(MAX_STEPS),
    settled: false,
  }
}

// ── Main renderer ────────────────────────────────────────────────────

export const rlcResonance: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims
    const fg = theme.fg
    const bg = theme.bg
    const accent = '#00b4d8'
    const indColor = '#ff7a59'
    const capColor = '#6bcb77'
    const resColor = '#ffd93d'
    const wireColor = '#3a5a6a'

    let state = freshState()
    let lastParams = ''
    let lastTime = 0
    let autoRetriggerTime = 0

    // Current-flow particles along the circuit path
    const PARTICLE_COUNT = 20
    const particlePhase = new Float32Array(PARTICLE_COUNT)
    for (let i = 0; i < PARTICLE_COUNT; i++) particlePhase[i] = Math.random()

    return {
      step(timeMs, p) {
        const dt = Math.min((timeMs - lastTime) / 1000, 0.05)
        lastTime = timeMs

        const R = (p.R ?? defaults.R) as number
        const L = (p.L ?? defaults.L) as number
        const C = (p.C ?? defaults.C) as number
        const A = (p.amplitude ?? defaults.amplitude) as number

        const paramKey = `${R.toFixed(1)}_${L.toFixed(3)}_${C.toFixed(4)}`

        // ── Reset on parameter change ──────────────────────────────
        if (paramKey !== lastParams) {
          state = freshState()
          lastParams = paramKey
        }

        // ── Auto-retrigger: after the transient visibly decays,
        //     restart the step response so the user always sees the
        //     ringing / damping behaviour. ─────────────────────────
        const omega0 = 1 / Math.sqrt(L * C)
        const zeta = R / (2 * Math.sqrt(L / C))
        const dampedOmega = omega0 * Math.sqrt(Math.max(0, 1 - zeta * zeta))
        // Decay envelope: amplitude decays as exp(-zeta * omega0 * t)
        // Consider settled when the envelope is < 0.01 * A
        const decayEnv = A * Math.exp(-zeta * omega0 * state.t)
        if (state.t > 0 && decayEnv < A * 0.008 && !state.settled) {
          state.settled = true
          autoRetriggerTime = timeMs + 2000 // wait 2s then restart
        }
        if (state.settled && timeMs > autoRetriggerTime) {
          state = freshState()
          lastParams = paramKey // re-arm so it doesn't reset again immediately
        }

        // ── Simulate ──────────────────────────────────────────────
        const stepsNow = Math.max(1, Math.floor(dt / DT))
        for (let s = 0; s < stepsNow; s++) {
          const Vin = state.t < 0.001 ? 0 : A
          const dVc = state.iL / C
          const diL = (Vin - state.Vc - R * state.iL) / L
          state.Vc += dVc * DT
          state.iL += diL * DT
          // Record every 4th step for the waveform display
          if ((state.stepIdx === 0 || Math.floor(state.t / DT) % 4 === 0) && state.stepIdx < MAX_STEPS) {
            state.buf[state.stepIdx] = state.Vc
            state.stepIdx++
          }
          state.t += DT
        }

        // ── Draw ──────────────────────────────────────────────────
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, w, h)

        // Compact layout: circuit + tanks in top 20%, plot in bottom.
        // The circuit scales down to a fixed height so it never crowds
        // the plot, even on small canvases (card previews).
        const topH = Math.min(h * 0.20, 90)
        const gap = 10
        const circuitRect = { x: 14, y: 26, w: w * 0.50, h: topH }
        const tankRect = { x: w * 0.53, y: 26, w: w * 0.45, h: topH }
        const plotY = 26 + topH + gap
        const plotH = h - plotY - 10
        const plotRect = { x: 14, y: plotY, w: w - 28, h: plotH }

        // ── Title & stats ────────────────────────────────────────────
        ctx.font = 'bold 10px monospace'
        ctx.fillStyle = fg
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText('RLC Series — Step Response', w / 2, 2)

        ctx.font = '8px monospace'
        ctx.fillStyle = accent
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
        const statsY = 16
        ctx.fillText(
          `R=${R.toFixed(1)}Ω  L=${(L * 1000).toFixed(0)}mH  C=${(C * 1e6).toFixed(0)}µF`,
          circuitRect.x, statsY,
        )
        ctx.fillStyle = '#6a7a8a'
        ctx.fillText(
          `ζ=${zeta.toFixed(3)}  ω₀=${((omega0) / 1e3).toFixed(1)}k`,
          circuitRect.x + 220, statsY,
        )

        // ── CIRCUIT SCHEMATIC ──────────────────────────────────────
        const cr = circuitRect
        const pad = 10
        const cLeft = cr.x + pad
        const cRight = cr.x + cr.w - pad
        const cTop = cr.y + pad
        const cBot = cr.y + cr.h - pad

        // Component positions along the top wire
        const rStart = cLeft + (cRight - cLeft) * 0.10
        const rEnd   = cLeft + (cRight - cLeft) * 0.28
        const lStart = cLeft + (cRight - cLeft) * 0.34
        const lEnd   = cLeft + (cRight - cLeft) * 0.52

        ctx.strokeStyle = wireColor; ctx.lineWidth = 1.8

        // Top wire: source → R
        ctx.beginPath(); ctx.moveTo(cLeft + 14, cTop); ctx.lineTo(rStart, cTop); ctx.stroke()
        // R
        ctx.strokeStyle = resColor; ctx.lineWidth = 2
        drawResistor(ctx, (rStart + rEnd) / 2, cTop, rEnd - rStart)
        ctx.strokeStyle = wireColor; ctx.lineWidth = 1.8
        // R → L
        ctx.beginPath(); ctx.moveTo(rEnd, cTop); ctx.lineTo(lStart, cTop); ctx.stroke()
        // L
        ctx.strokeStyle = indColor; ctx.lineWidth = 2
        drawInductor(ctx, (lStart + lEnd) / 2, cTop, lEnd - lStart)
        ctx.strokeStyle = wireColor; ctx.lineWidth = 1.8
        // L → right
        ctx.beginPath(); ctx.moveTo(lEnd, cTop); ctx.lineTo(cRight, cTop); ctx.stroke()
        // Right side → C
        const capY = cBot - 6
        ctx.beginPath(); ctx.moveTo(cRight, cTop); ctx.lineTo(cRight, capY - 10); ctx.stroke()
        ctx.strokeStyle = capColor; ctx.lineWidth = 2
        drawCapacitor(ctx, cRight, capY, 8, 18)
        ctx.strokeStyle = wireColor; ctx.lineWidth = 1.8
        ctx.beginPath(); ctx.moveTo(cRight, capY + 10); ctx.lineTo(cRight, cBot); ctx.stroke()
        // Bottom
        ctx.beginPath(); ctx.moveTo(cRight, cBot); ctx.lineTo(cLeft, cBot); ctx.stroke()
        // Left side
        const vsY = (cTop + cBot) / 2
        ctx.beginPath(); ctx.moveTo(cLeft, cBot); ctx.lineTo(cLeft, vsY + 12); ctx.stroke()
        ctx.strokeStyle = accent; ctx.lineWidth = 2
        drawVoltageSource(ctx, cLeft, vsY, 10, fg)
        ctx.strokeStyle = wireColor; ctx.lineWidth = 1.8
        ctx.beginPath(); ctx.moveTo(cLeft, vsY - 12); ctx.lineTo(cLeft, cTop); ctx.stroke()

        // Component labels
        ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
        ctx.fillStyle = resColor
        ctx.fillText(`R ${R.toFixed(1)}Ω`, (rStart + rEnd) / 2, cTop - 10)
        ctx.fillStyle = indColor
        ctx.fillText(`L ${(L * 1000).toFixed(0)}mH`, (lStart + lEnd) / 2, cTop - 10)
        ctx.fillStyle = capColor; ctx.textAlign = 'left'
        ctx.fillText(`C ${(C * 1e6).toFixed(0)}µF`, cRight + 6, capY + 4)

        // Current flow particles
        const perimeter = 2 * (cRight - cLeft) + 2 * (cBot - cTop)
        function pathPoint(phase: number): [number, number] {
          let d = ((phase % 1) + 1) % 1 * perimeter
          const topLen = cRight - cLeft
          if (d < topLen) return [cLeft + d, cTop]
          d -= topLen
          const rightLen = cBot - cTop
          if (d < rightLen) return [cRight, cTop + d]
          d -= rightLen
          if (d < topLen) return [cRight - d, cBot]
          d -= topLen
          return [cLeft, cBot - d]
        }
        const iNorm = Math.min(Math.abs(state.iL) / Math.max(A / R, 0.001), 1.5)
        const particleAlpha = 0.1 + 0.9 * iNorm
        ctx.fillStyle = accent
        for (let p = 0; p < PARTICLE_COUNT; p++) {
          const [px, py] = pathPoint(particlePhase[p] + state.iL * 0.001)
          if (px === undefined) continue
          ctx.globalAlpha = particleAlpha * (0.4 + 0.6 * Math.abs(Math.sin(p * 2.1 + state.t * 4)))
          ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill()
        }
        ctx.globalAlpha = 1

        // Direction arrow
        if (Math.abs(state.iL) > 0.001) {
          const dir = state.iL > 0 ? 1 : -1
          const ax = (lEnd + cRight) / 2, ay = cTop
          ctx.fillStyle = accent; ctx.globalAlpha = 0.6
          ctx.beginPath()
          ctx.moveTo(ax + dir * 5, ay); ctx.lineTo(ax - dir * 2, ay - 3); ctx.lineTo(ax - dir * 2, ay + 3)
          ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1
        }

        // ── ENERGY TANKS ────────────────────────────────────────────
        const tr = tankRect
        const E_L = 0.5 * L * state.iL * state.iL
        const E_C = 0.5 * C * state.Vc * state.Vc
        const E_max = 0.5 * C * A * A * 1.3
        const tankW = tr.w * 0.22
        const tankH = tr.h * 0.65
        const tankY = tr.y + 10

        function tank(x: number, color: string, label: string, val: number, max: number) {
          ctx.save()
          // background
          ctx.fillStyle = '#101420'
          ctx.beginPath()
          const r = 3
          ctx.moveTo(x + r, tankY); ctx.lineTo(x + tankW - r, tankY)
          ctx.arcTo(x + tankW, tankY, x + tankW, tankY + r, r)
          ctx.lineTo(x + tankW, tankY + tankH - r)
          ctx.arcTo(x + tankW, tankY + tankH, x + tankW - r, tankY + tankH, r)
          ctx.lineTo(x + r, tankY + tankH)
          ctx.arcTo(x, tankY + tankH, x, tankY + tankH - r, r)
          ctx.lineTo(x, tankY + r)
          ctx.arcTo(x, tankY, x + r, tankY, r)
          ctx.closePath()
          ctx.fill()
          // fill
          const frac = Math.min(val / (max + 0.001), 1)
          const fillH = tankH * frac
          ctx.fillStyle = color; ctx.globalAlpha = 0.7
          ctx.fillRect(x, tankY + tankH - fillH, tankW, fillH)
          ctx.globalAlpha = 1; ctx.fillStyle = color
          ctx.fillRect(x, tankY + tankH - fillH - 1, tankW, 2)
          // border
          ctx.strokeStyle = '#1e2e3e'; ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x + r, tankY); ctx.lineTo(x + tankW - r, tankY)
          ctx.arcTo(x + tankW, tankY, x + tankW, tankY + r, r)
          ctx.lineTo(x + tankW, tankY + tankH - r)
          ctx.arcTo(x + tankW, tankY + tankH, x + tankW - r, tankY + tankH, r)
          ctx.lineTo(x + r, tankY + tankH)
          ctx.arcTo(x, tankY + tankH, x, tankY + tankH - r, r)
          ctx.lineTo(x, tankY + r)
          ctx.arcTo(x, tankY, x + r, tankY, r)
          ctx.closePath()
          ctx.stroke()
          // label
          ctx.font = '8px monospace'; ctx.fillStyle = '#7a8a9a'; ctx.textAlign = 'center'
          ctx.fillText(label, x + tankW / 2, tankY + tankH + 12)
          ctx.fillStyle = color; ctx.font = 'bold 8px monospace'
          ctx.fillText(val.toFixed(2) + 'J', x + tankW / 2, tankY - 6)
          ctx.restore()
        }

        tank(tr.x + tr.w * 0.05, indColor, 'E(L)', E_L, E_max)
        tank(tr.x + tr.w * 0.28, capColor, 'E(C)', E_C, E_max)
        const E_R = Math.max(0, 0.5 * C * A * A - E_L - E_C)
        tank(tr.x + tr.w * 0.51, resColor, 'R loss', E_R, E_max)

        // ── WAVEFORM PLOT ───────────────────────────────────────────
        const pr = plotRect
        const mx = 42, mr = 12, mt = 14, mb = 22
        const pw = pr.w - mx - mr
        const ph = pr.h - mt - mb
        const px = pr.x + mx
        const py = pr.y + mt

        // Subtle divider between circuit area and plot
        ctx.strokeStyle = '#1a2a3a'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(pr.x, pr.y - 8)
        ctx.lineTo(pr.x + pr.w, pr.y - 8)
        ctx.stroke()

        // Y-axis: map voltage values so the trace stays inside the plot
        // rectangle. vMax (= A*2.0) → top of plot, vMin (= -A*0.3) → bottom.
        // Underdamped circuits can overshoot well past A (Vc peak ≈ A*(1+e^{-πζ}))
        // so we use a generous range, then clamp to keep everything in-bounds.
        const vMax = A * 2.0
        const vMin = -A * 0.3
        const vScale = (v: number) => {
          const frac = Math.max(0, Math.min(1, (v - vMin) / (vMax - vMin))) // clamped 0..1
          return py + ph - frac * ph // top..bottom
        }

        // Axes
        ctx.strokeStyle = '#1a2a3a'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke()

        // Zero line (clamped to visible area)
        const y0v = vScale(0)
        ctx.setLineDash([3, 5]); ctx.strokeStyle = '#1e2e3e'
        ctx.beginPath(); ctx.moveTo(px, y0v); ctx.lineTo(px + pw, y0v); ctx.stroke()
        ctx.setLineDash([])

        // Step target line
        const yAv = vScale(A)
        ctx.setLineDash([2, 3]); ctx.strokeStyle = accent + '44'
        ctx.beginPath(); ctx.moveTo(px, yAv); ctx.lineTo(px + pw, yAv); ctx.stroke()
        ctx.setLineDash([])

        // Y-axis labels
        ctx.font = '8px monospace'; ctx.fillStyle = '#4a5a6a'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
        ctx.fillText('0', px - 4, y0v)
        ctx.fillText(`${A.toFixed(1)}V`, px - 4, yAv)

        // ── Draw voltage trace (oldest → newest, ring-buffer order) ──
        const nSamples = state.stepIdx
        if (nSamples > 1) {
          // Buffer indices: 0 is oldest, stepIdx-1 is newest. Draw all valid samples.
          const hScale = pw / (nSamples - 1)
          ctx.strokeStyle = accent; ctx.lineWidth = 1.6; ctx.beginPath()
          for (let i = 0; i < nSamples; i++) {
            const x = px + i * hScale
            const y = vScale(state.buf[i])
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }

        // ── Current trace (transparent, on same axis) ──
        if (nSamples > 1) {
          const iMax = A / (R + 0.001)
          const hScale = pw / (nSamples - 1)
          ctx.strokeStyle = indColor + '66'; ctx.lineWidth = 1; ctx.beginPath()
          for (let i = 0; i < nSamples; i++) {
            // Approximate: reconstruct current from voltage in buffer
            // For simplicity, just overlay a damped sinusoid hint
          }
          // Skip current trace for now — too complex to reconstruct from Vc buffer alone.
          // The energy tanks already show the inductor-capacitor exchange.
        }

        // Legend
        ctx.fillStyle = accent; ctx.font = '9px monospace'; ctx.textAlign = 'left'
        ctx.fillText('Vc(t)', px + pw - 50, py + 6)

        // Time label
        ctx.fillStyle = '#4a5a6a'; ctx.textAlign = 'center'; ctx.font = '8px monospace'
        ctx.fillText('time →', px + pw / 2, py + ph + 14)

        // ── Particle motion ────────────────────────────────────────
        const pSpeed = state.iL / Math.max(A / R, 0.001) * 0.01
        for (let p = 0; p < PARTICLE_COUNT; p++) {
          particlePhase[p] = (particlePhase[p] + pSpeed + 1) % 1
        }
      },
    }
  },
}
