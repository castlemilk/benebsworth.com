import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Transmission Line Pulse (Time Domain Reflectometry)
 *
 * A voltage pulse travels down a lossless transmission line of
 * characteristic impedance Z₀. At the far end, the line is terminated
 * in a load impedance Z_L (adjustable by the user).  The pulse
 * reflects at the load with a reflection coefficient
 *
 *     Γ = (Z_L - Z₀) / (Z_L + Z₀)
 *
 * producing the classic TDR patterns:
 *   - matched (Z_L = Z₀):  no reflection, pulse absorbed
 *   - short (Z_L = 0):     pulse inverts and reflects back
 *   - open (Z_L = ∞):      pulse reflects back in phase
 *   - mismatch (0 < Z_L < ∞): partial reflection with amplitude Γ·V_in
 *
 * The display shows the line as a horizontal strip. A coloured pulse
 * bar moves left→right, reaches the load, and either dies or reflects
 * back, with the amplitude changing per Γ.
 */
export const controls: ControlSpec[] = [
  {
    key: 'loadType',
    label: 'Load',
    type: 'select',
    options: [
      { label: 'Matched', value: 'matched' },
      { label: 'Short', value: 'short' },
      { label: 'Open', value: 'open' },
      { label: 'Z_L = 2 Z₀', value: 'z2x' },
      { label: 'Z_L = Z₀ / 2', value: 'zhalf' },
    ],
  },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.2, max: 3, step: 0.1 },
]

export const defaults: Params = {
  loadType: 'matched',
  speed: 1,
}

// Reflection coefficient Γ for each load type, assuming Z₀ = 50Ω.
function gamma(loadType: string): number {
  if (loadType === 'matched') return 0
  if (loadType === 'short') return -1
  if (loadType === 'open') return 1
  if (loadType === 'z2x') return 1 / 3   // Z_L = 100Ω → Γ = (100-50)/(100+50)
  if (loadType === 'zhalf') return -1 / 3 // Z_L = 25Ω  → Γ = (25-50)/(25+50)
  return 0
}

export const transmissionLine: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims
    const lineY = h * 0.45
    const lineH = 20
    const pulseW = 30
    const lineL = w * 0.75
    const lineX0 = w * 0.1
    const lineX1 = lineX0 + lineL

    return {
      step(t, p) {
        const loadType = p.loadType as string
        const speed = p.speed as number
        const G = gamma(loadType)

        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)

        // Normalized time: one round-trip = 2 * lineL, scaled by speed.
        // The pulse starts at the source (x=lineX0) and takes
        // lineL time to reach the load; reflects, takes another
        // lineL to return.  Then the cycle repeats.
        const period = 2 * lineL
        const phase = ((t / 10) * speed * 60) % period // px units

        // Draw the transmission line as two parallel wires.
        ctx.save()
        ctx.strokeStyle = theme.fg
        ctx.globalAlpha = 0.25
        ctx.lineWidth = 1.5
        // Top wire
        ctx.beginPath()
        ctx.moveTo(lineX0, lineY - 8)
        ctx.lineTo(lineX1, lineY - 8)
        ctx.stroke()
        // Bottom wire (ground)
        ctx.beginPath()
        ctx.moveTo(lineX0, lineY + 8)
        ctx.lineTo(lineX1, lineY + 8)
        ctx.stroke()
        ctx.restore()

        // Draw the source label
        ctx.save()
        ctx.font = '10px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.35
        ctx.fillText('source', lineX0 - 8, lineY - 18)
        ctx.fillText('Z₀ = 50Ω', lineX0 - 8, lineY + 26)
        ctx.restore()

        // Draw the load label
        const loadLabel: Record<string, string> = {
          matched: 'matched',
          short: 'short (Z_L = 0)',
          open: 'open (Z_L = ∞)',
          z2x: 'Z_L = 100Ω',
          zhalf: 'Z_L = 25Ω',
        }
        ctx.save()
        ctx.font = '10px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.5
        ctx.textAlign = 'right'
        ctx.fillText(loadLabel[loadType] ?? '', lineX1 + 8, lineY - 18)
        ctx.textAlign = 'start'
        ctx.restore()

        // Two pulses: the forward-traveling one and the reflected one.
        // Forward pulse: runs from x=0 to x=period in first half of period.
        const fwdX = lineX0 + Math.min(phase, lineL)

        // Reflected pulse: starts at x=lineL when phase > lineL, runs back.
        let refX = 0
        if (phase > lineL) {
          const refPhase = phase - lineL // 0 .. lineL during the return leg
          refX = lineX1 - refPhase       // moves backwards
        }

        // Draw forward pulse
        ctx.save()
        const pulseFill = '#00e0b8' // teal — engineering accent
        ctx.fillStyle = pulseFill
        ctx.globalAlpha = 0.85
        ctx.fillRect(fwdX - pulseW / 2, lineY - lineH / 2, pulseW, lineH)
        ctx.restore()

        // Draw reflected pulse (if present, amplitude Γ)
        if (phase > lineL && Math.abs(G) > 0.01) {
          ctx.save()
          ctx.fillStyle = G > 0 ? '#00e0b8' : '#ff7a59' // teal if in phase, orange if inverted
          ctx.globalAlpha = Math.abs(G) * 0.85
          const refH = lineH * Math.abs(G)
          ctx.fillRect(refX - pulseW / 2, lineY - refH / 2, pulseW, refH)
          ctx.restore()
        }

        // Draw Γ = ... label
        ctx.save()
        ctx.font = '11px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.5
        const gStr = G === 0 ? 'Γ = 0 (no reflection)' :
          G === -1 ? 'Γ = −1 (inverted, full reflection)' :
          G === 1 ? 'Γ = +1 (in-phase, full reflection)' :
          `Γ = ${G > 0 ? '+' : ''}${G.toFixed(3)}`
        ctx.fillText(gStr, lineX0, lineY + 48)
        ctx.restore()

        // Legend at bottom
        ctx.save()
        ctx.font = '10px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.35
        ctx.textAlign = 'center'
        ctx.fillText('Transmission line pulse — TDR', w / 2, h - 28)
        ctx.fillText('forward pulse (teal) → hits load → reflected pulse (teal if Γ>0, orange if Γ<0) ←', w / 2, h - 12)
        ctx.restore()
      },
    }
  },
}
