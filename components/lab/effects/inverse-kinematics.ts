import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'L1', label: 'Link L1 (normalised)', type: 'range', min: 0.3, max: 2, step: 0.05 },
  { key: 'L2', label: 'Link L2 (normalised)', type: 'range', min: 0.3, max: 2, step: 0.05 },
]

export const defaults: Params = { L1: 1, L2: 1 }

export const createRenderer = (
  ctx: CanvasRenderingContext2D,
  dims: { w: number; h: number; dpr: number },
  theme?: { bg?: string; fg?: string },
) => {
  const { w, h } = dims
  const bg = theme?.bg ?? '#0a0a12'
  const fg = theme?.fg ?? '#c8d8e8'
  const accent = '#00b4d8'

  const margin = { left: 60, right: 60, top: 80, bottom: 60 }
  const pw = w - margin.left - margin.right
  const ph = h - margin.top - margin.bottom

  // Base position (bottom of first link)
  const baseX = margin.left + pw * 0.3
  const baseY = margin.top + ph * 0.85

  // Target (draggable via sine-based animation)
  let lastTime = 0

  function solveIK(tx: number, ty: number, L1: number, L2: number): [number, number] {
    const dx = tx - baseX
    const dy = ty - baseY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const maxReach = L1 + L2
    const minReach = Math.abs(L1 - L2)

    const d = Math.min(dist, maxReach - 0.001)
    const clampedDist = Math.max(d, minReach + 0.001)

    const cosQ2 = (clampedDist * clampedDist - L1 * L1 - L2 * L2) / (2 * L1 * L2)
    const q2 = Math.acos(Math.max(-1, Math.min(1, cosQ2)))

    const k = L2 * Math.sin(q2)
    const q1 = Math.atan2(dy, dx) - Math.atan2(k, L1 + L2 * Math.cos(q2))

    return [q1, q2]
  }

  return {
    step(timeMs: number, params: Params) {
      const dt = Math.min((timeMs - lastTime) / 1000, 0.05)
      lastTime = timeMs

      const t = timeMs / 1000
      const L1 = (params.L1 ?? defaults.L1) as number
      const L2 = (params.L2 ?? defaults.L2) as number

      // Target moves in a figure-8 / Lissajous
      const tx = baseX + Math.sin(t * 0.7) * pw * 0.35 + Math.sin(t * 1.3) * pw * 0.15
      const ty = baseY - Math.abs(Math.sin(t * 0.5)) * ph * 0.6

      const [q1, q2] = solveIK(tx, ty, L1, L2)

      const j1X = baseX + L1 * Math.cos(q1) * (pw * 0.15)
      const j1Y = baseY - L1 * Math.sin(q1) * (ph * 0.15)
      const eeX = j1X + L2 * Math.cos(q1 + q2) * (pw * 0.15)
      const eeY = j1Y - L2 * Math.sin(q1 + q2) * (ph * 0.15)

      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      ctx.fillStyle = fg
      ctx.font = 'bold 13px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('2R Robot Arm — FABRIK IK', w / 2, 28)

      // Floor / base
      ctx.strokeStyle = '#2a3a4a'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(margin.left, baseY + 4)
      ctx.lineTo(margin.left + pw, baseY + 4)
      ctx.stroke()

      // Base pivot
      ctx.fillStyle = '#5a6a7a'
      ctx.beginPath()
      ctx.arc(baseX, baseY, 6, 0, Math.PI * 2)
      ctx.fill()

      // Link 1
      ctx.strokeStyle = accent
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(baseX, baseY)
      ctx.lineTo(j1X, j1Y)
      ctx.stroke()

      // Joint 1
      ctx.fillStyle = accent
      ctx.beginPath()
      ctx.arc(j1X, j1Y, 5, 0, Math.PI * 2)
      ctx.fill()

      // Link 2
      ctx.strokeStyle = '#ff7a59'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(j1X, j1Y)
      ctx.lineTo(eeX, eeY)
      ctx.stroke()

      // End effector
      ctx.fillStyle = '#ff7a59'
      ctx.beginPath()
      ctx.arc(eeX, eeY, 6, 0, Math.PI * 2)
      ctx.fill()

      // Target marker
      ctx.strokeStyle = 'rgba(255, 122, 89, 0.4)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(tx - 10, ty)
      ctx.lineTo(tx + 10, ty)
      ctx.moveTo(tx, ty - 10)
      ctx.lineTo(tx, ty + 10)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.strokeStyle = 'rgba(255, 122, 89, 0.3)'
      ctx.beginPath()
      ctx.arc(tx, ty, 8, 0, Math.PI * 2)
      ctx.stroke()

      // Joint angle arcs
      ctx.strokeStyle = '#2a3a4a'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])

      function arc(cx: number, cy: number, r: number, start: number, end: number) {
        ctx.beginPath()
        ctx.arc(cx, cy, r, start, end)
        ctx.stroke()
      }

      const rArc = Math.min(L1, L2) * pw * 0.05
      arc(baseX, baseY, rArc, -Math.PI / 2, -Math.PI / 2 + q1)
      ctx.setLineDash([])

      // Angle labels
      ctx.fillStyle = '#5a6a7a'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      const q1Deg = (q1 * 180 / Math.PI).toFixed(1)
      const q2Deg = (q2 * 180 / Math.PI).toFixed(1)
      ctx.fillText(`θ₁ = ${q1Deg}°`, baseX + (j1X - baseX) * 0.4, baseY - (baseY - j1Y) * 0.4 - 12)
      ctx.fillText(`θ₂ = ${q2Deg}°`, j1X + (eeX - j1X) * 0.4, j1Y - (j1Y - eeY) * 0.4 - 12)

      // Link length labels
      ctx.fillStyle = '#3a4a5a'
      ctx.font = '10px monospace'
      const mid1x = (baseX + j1X) / 2, mid1y = (baseY + j1Y) / 2
      ctx.fillText(`L₁=${L1.toFixed(2)}`, mid1x + 12, mid1y - 8)
      const mid2x = (j1X + eeX) / 2, mid2y = (j1Y + eeY) / 2
      ctx.fillText(`L₂=${L2.toFixed(2)}`, mid2x + 12, mid2y - 8)

      ctx.fillStyle = '#00b4d8'
      ctx.font = 'bold 11px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`θ₁=${q1Deg}°  θ₂=${q2Deg}°`, w - margin.right, 50)
    },
  }
}

export const inverseKinematics: EffectModule = { controls, defaults, createRenderer }
