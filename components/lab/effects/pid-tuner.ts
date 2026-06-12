import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'Kp', label: 'Proportional Kp', type: 'range', min: 0, max: 5, step: 0.05 },
  { key: 'Ki', label: 'Integral Ki', type: 'range', min: 0, max: 2, step: 0.02 },
  { key: 'Kd', label: 'Derivative Kd', type: 'range', min: 0, max: 2, step: 0.02 },
  { key: 'setpoint', label: 'Setpoint', type: 'range', min: 0.1, max: 5, step: 0.1 },
]

export const defaults: Params = { Kp: 1.5, Ki: 0.3, Kd: 0.8, setpoint: 2 }

export const createRenderer = (
  ctx: CanvasRenderingContext2D,
  dims: { w: number; h: number; dpr: number },
  theme?: { bg?: string; fg?: string },
) => {
  const { w, h } = dims
  const bg = theme?.bg ?? '#0a0a12'
  const fg = theme?.fg ?? '#c8d8e8'
  const accent = '#00b4d8'

  const MAX_STEPS = 500
  const setpoints = new Float32Array(MAX_STEPS)
  const outputs = new Float32Array(MAX_STEPS)
  const controlSig = new Float32Array(MAX_STEPS)
  let stepIdx = 0

  // Plant: 2nd order Butterworth, ωn=2 rad/s
  // G(s) = 4 / (s² + 2.828s + 4)
  let y = 0, yDot = 0
  let integral = 0, prevErr = 0
  let stepCount = 0

  return {
    step(_timeMs: number, params: Params) {
      const dt = 0.016
      const SP = (params.setpoint ?? defaults.setpoint) as number
      const Kp = (params.Kp ?? defaults.Kp) as number
      const Ki = (params.Ki ?? defaults.Ki) as number
      const Kd = (params.Kd ?? defaults.Kd) as number

      for (let rep = 0; rep < 3; rep++) {
        const err = SP - y
        integral = Math.max(-10, Math.min(10, integral + err * dt))
        const deriv = (err - prevErr) / dt
        prevErr = err
        const u = Kp * err + Ki * integral + Kd * deriv
        const uClamped = Math.max(-10, Math.min(10, u))
        const yDD = 4 * uClamped - 2.828 * yDot - 4 * y
        yDot += yDD * dt
        y += yDot * dt

        if (stepCount % 4 === 0) {
          setpoints[stepIdx] = SP
          outputs[stepIdx] = y
          controlSig[stepIdx] = uClamped
          stepIdx = (stepIdx + 1) % MAX_STEPS
        }
        stepCount++
      }

      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      ctx.fillStyle = fg
      ctx.font = 'bold 13px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('PID Controller — 2nd Order Plant', w / 2, 28)

      const margin = { left: 60, right: 30, top: 40, bottom: 40 }
      const pw = w - margin.left - margin.right
      const ph = h - margin.top - margin.bottom
      const plotH = ph * 0.52
      const ctrlTop = margin.top + plotH + 28
      const ctrlH = ph * 0.32

      const yMax = ((params.setpoint ?? defaults.setpoint) as number) * 1.4
      const yMin = -0.5
      const uMin = -4, uMax = 4

      ctx.fillStyle = '#5a6a7a'
      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('Plant Output / Setpoint', margin.left, margin.top - 6)

      ctx.strokeStyle = '#1a2a3a'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      const yMid = margin.top + plotH * (1 - (SP - yMin) / (yMax - yMin))
      ctx.beginPath()
      ctx.moveTo(margin.left, yMid)
      ctx.lineTo(margin.left + pw, yMid)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.strokeStyle = '#2a4a3a'
      ctx.lineWidth = 1
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      for (let i = 0; i < MAX_STEPS; i++) {
        const xi = margin.left + (i / (MAX_STEPS - 1)) * pw
        const yv = setpoints[(stepIdx + i) % MAX_STEPS]
        const yi = margin.top + plotH * (1 - (yv - yMin) / (yMax - yMin))
        if (i === 0) ctx.moveTo(xi, yi)
        else ctx.lineTo(xi, yi)
      }
      ctx.stroke()
      ctx.setLineDash([])

      ctx.strokeStyle = accent
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < MAX_STEPS; i++) {
        const xi = margin.left + (i / (MAX_STEPS - 1)) * pw
        const yv = outputs[(stepIdx + i) % MAX_STEPS]
        const yi = margin.top + plotH * (1 - (yv - yMin) / (yMax - yMin))
        if (i === 0) ctx.moveTo(xi, yi)
        else ctx.lineTo(xi, yi)
      }
      ctx.stroke()

      ctx.fillStyle = '#5a6a7a'
      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('Control Signal u(t)', margin.left, ctrlTop - 6)

      ctx.strokeStyle = '#2a3a4a'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      const uMid = ctrlTop + ctrlH / 2
      ctx.beginPath()
      ctx.moveTo(margin.left, uMid)
      ctx.lineTo(margin.left + pw, uMid)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.strokeStyle = '#ff7a59'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < MAX_STEPS; i++) {
        const xi = margin.left + (i / (MAX_STEPS - 1)) * pw
        const uv = controlSig[(stepIdx + i) % MAX_STEPS]
        const yi = ctrlTop + ctrlH * (1 - (uv - uMin) / (uMax - uMin))
        if (i === 0) ctx.moveTo(xi, yi)
        else ctx.lineTo(xi, yi)
      }
      ctx.stroke()

      ctx.fillStyle = '#5a6a7a'
      ctx.font = '9px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`${yMax.toFixed(1)}`, margin.left - 4, margin.top + 4)
      ctx.fillText(`${yMin.toFixed(1)}`, margin.left - 4, margin.top + plotH - 4)
      ctx.fillText(`${uMax}`, margin.left - 4, ctrlTop + 4)
      ctx.fillText(`${uMin}`, margin.left - 4, ctrlTop + ctrlH - 4)

      ctx.fillStyle = '#3a4a5a'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Time →', margin.left + pw / 2, h - 10)

      ctx.fillStyle = '#00b4d8'
      ctx.font = 'bold 11px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`Kp=${Kp.toFixed(2)}  Ki=${Ki.toFixed(2)}  Kd=${Kd.toFixed(2)}`, w - margin.right, 48)
    },
  }
}

export const pidTuner: EffectModule = { controls, defaults, createRenderer }
