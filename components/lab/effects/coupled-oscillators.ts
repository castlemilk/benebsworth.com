import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Coupled Oscillators
 *
 * Two identical mass-spring systems connected by a weak coupling
 * spring. Energy sloshes back and forth between the two masses —
 * a beat phenomenon where amplitude transfers completely from one
 * mass to the other and back, with a frequency equal to the
 * difference of the two normal-mode frequencies.
 *
 * Physics:
 *   m₁ x₁'' = −k x₁ − k_c (x₁ − x₂)
 *   m₂ x₂'' = −k x₂ − k_c (x₂ − x₁)
 *
 * The two normal modes are:
 *   ω₁ = √(k/m)            (in phase — both masses move together)
 *   ω₂ = √((k + 2k_c)/m)   (out of phase — masses oppose)
 *
 * With weak coupling (k_c << k), energy beats between the masses
 * at the frequency (ω₂ − ω₁) / 2.
 */
export const controls: ControlSpec[] = [
  {
    key: 'initMode',
    label: 'Initial condition',
    type: 'select',
    options: [
      { label: 'Left displaced', value: 'left' },
      { label: 'Both displaced', value: 'both' },
      { label: 'Normal mode 1', value: 'nm1' },
      { label: 'Normal mode 2', value: 'nm2' },
    ],
  },
  { key: 'coupling', label: 'Coupling k_c', type: 'range', min: 0.05, max: 1.5, step: 0.05 },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.2, max: 4, step: 0.1 },
]

export const defaults: Params = {
  initMode: 'left',
  coupling: 0.3,
  speed: 1,
}

// Spring constant
const K = 1
const M = 1

export const coupledOscillators: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims

    let x1 = 0, v1 = 0  // mass 1 displacement & velocity
    let x2 = 0, v2 = 0  // mass 2
    let lastInit = ''
    let lastCoup = 0

    return {
      step(t, p) {
        const initMode = p.initMode as string
        const kc = p.coupling as number
        const speed = p.speed as number

        // Re-initialize on param change
        if (initMode !== lastInit || kc !== lastCoup) {
          if (initMode === 'left')      { x1 = 60; v1 = 0; x2 = 0; v2 = 0 }
          else if (initMode === 'both') { x1 = 60; v1 = 0; x2 = 60; v2 = 0 }
          else if (initMode === 'nm1')  { x1 = 60; v1 = 0; x2 = 60; v2 = 0 }
          else if (initMode === 'nm2')  { x1 = 60; v1 = 0; x2 = -60; v2 = 0 }
          lastInit = initMode
          lastCoup = kc
        }

        // Integrate with semi-implicit Euler (symplectic, stable)
        const dt = 0.02 * speed
        const steps = 4
        for (let s = 0; s < steps; s++) {
          const a1 = (-K * x1 - kc * (x1 - x2)) / M
          const a2 = (-K * x2 - kc * (x2 - x1)) / M
          v1 += a1 * dt
          v2 += a2 * dt
          x1 += v1 * dt
          x2 += v2 * dt
        }

        // Clamp to reasonable range
        x1 = Math.max(-80, Math.min(80, x1))
        x2 = Math.max(-80, Math.min(80, x2))

        // Layout
        const centerY = h * 0.5
        const leftX = w * 0.2
        const rightX = w * 0.6
        const springLen = 120
        const massW = 40, massH = 40

        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)

        // Fixed walls
        ctx.save()
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.3
        ctx.fillRect(50, centerY - 80, 8, 160)
        ctx.fillRect(w - 58, centerY - 80, 8, 160)
        ctx.restore()

        // Coupling spring between the two masses
        const couplX1 = leftX + x1 + massW / 2
        const couplX2 = rightX + x2 - massW / 2
        drawSpring(ctx, couplX1, centerY, couplX2, centerY, 12, 6, 2, '#ff7a59', 0.4)

        // Spring: wall to mass 1
        drawSpring(ctx, 58, centerY, leftX + x1 - massW / 2, centerY, 16, 8, 2, theme.fg, 0.3)

        // Spring: mass 2 to wall
        drawSpring(ctx, rightX + x2 + massW / 2, centerY, w - 58, centerY, 10, 6, 2, theme.fg, 0.3)

        // Mass 1
        drawMass(ctx, leftX + x1, centerY, massW, massH, '#00e0b8', 0.9, 'm₁', theme.fg)

        // Mass 2
        drawMass(ctx, rightX + x2, centerY, massW, massH, '#7c5cff', 0.9, 'm₂', theme.fg)

        // Labels
        ctx.save()
        ctx.font = '10px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.35
        ctx.fillText('k', 130, centerY + 50)
        ctx.fillText('k_c', leftX + springLen / 2 - 20, centerY + 50)
        ctx.fillText('k', rightX + 60, centerY + 50)
        ctx.restore()

        // Description
        const w1 = Math.sqrt(K / M)
        const w2_calc = Math.sqrt((K + 2 * kc) / M)
        const beatFreq = Math.abs(w2_calc - w1) / 2

        ctx.save()
        ctx.font = '11px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.45
        ctx.fillText(`Coupled oscillators — k = ${K}, k_c = ${kc.toFixed(2)}`, 12, h - 32)
        ctx.fillText(`Normal modes: ω₁ = ${w1.toFixed(1)}, ω₂ = ${w2_calc.toFixed(1)} | beat freq = ${beatFreq.toFixed(2)}`, 12, h - 16)
        ctx.restore()
      },
    }
  },
}

function drawSpring(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  coils: number, amplitude: number, lineWidth: number,
  color: string, alpha: number,
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.globalAlpha = alpha
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'

  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 2) { ctx.restore(); return }
  const ux = dx / len
  const uy = dy / len
  const nx = -uy, ny = ux // perpendicular

  ctx.beginPath()
  const segments = coils * 2 + 2
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const px = x0 + dx * t + nx * amplitude * Math.sin(i * Math.PI * 2 / (segments / coils))
    const py = y0 + dy * t + ny * amplitude * Math.sin(i * Math.PI * 2 / (segments / coils))
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.restore()
}

function drawMass(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, w: number, h: number,
  color: string, alpha: number, label: string,
  fg: string,
) {
  ctx.save()
  ctx.fillStyle = color
  ctx.globalAlpha = alpha
  const x = cx - w / 2
  const y = cy - h / 2
  ctx.fillRect(x, y, w, h)
  // Highlight
  ctx.strokeStyle = '#fff'
  ctx.globalAlpha = 0.15
  ctx.lineWidth = 1
  ctx.strokeRect(x, y, w, h)
  // Label
  ctx.fillStyle = fg
  ctx.globalAlpha = 0.8
  ctx.font = 'bold 11px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(label, cx, cy + 5)
  ctx.restore()
}
