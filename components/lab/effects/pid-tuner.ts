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

  // Plant: 2nd order Butterworth, ωn=2 rad/s
  // G(s) = 4 / (s² + 2.828s + 4)
  interface PidState {
    setpoints: Float32Array
    outputs: Float32Array
    controlSig: Float32Array
    stepIdx: number
    y: number
    yDot: number
    integral: number
    prevErr: number
    stepCount: number
    peak: number       // runtime-detected max plant output
    settledFor: number // consecutive samples with |err| small
    retriggerAt: number // timeMs at which to re-kick the step (0 = not armed)
  }

  function freshState(): PidState {
    return {
      setpoints: new Float32Array(MAX_STEPS),
      outputs: new Float32Array(MAX_STEPS),
      controlSig: new Float32Array(MAX_STEPS),
      stepIdx: 0,
      y: 0, yDot: 0,
      integral: 0, prevErr: 0,
      stepCount: 0,
      peak: 0,
      settledFor: 0,
      retriggerAt: 0,
    }
  }

  let state = freshState()
  let lastParams = ''

  return {
    step(_timeMs: number, params: Params) {
      const dt = 0.016
      const SP = (params.setpoint ?? defaults.setpoint) as number
      const Kp = (params.Kp ?? defaults.Kp) as number
      const Ki = (params.Ki ?? defaults.Ki) as number
      const Kd = (params.Kd ?? defaults.Kd) as number

      // ── Reset on parameter change ──────────────────────────────
      // Hash the gains + setpoint; on mismatch reinitialise ALL state so
      // the buffers/integrator don't blend old and new behaviour.
      const paramKey = `${Kp.toFixed(2)}_${Ki.toFixed(2)}_${Kd.toFixed(2)}_${SP.toFixed(1)}`
      if (paramKey !== lastParams) {
        state = freshState()
        lastParams = paramKey
      }

      // ── Auto-retrigger: once the response has settled (|err| small for
      //     a while) the plot would otherwise sit flat forever. After ~2s
      //     re-kick the step so the transient is always on show. ────────
      if (state.retriggerAt !== 0 && _timeMs > state.retriggerAt) {
        state = freshState()
        lastParams = paramKey // re-arm so the change-detector doesn't fire
      }

      for (let rep = 0; rep < 3; rep++) {
        const err = SP - state.y
        state.integral = Math.max(-10, Math.min(10, state.integral + err * dt))
        const deriv = (err - state.prevErr) / dt
        state.prevErr = err
        const u = Kp * err + Ki * state.integral + Kd * deriv
        const uClamped = Math.max(-10, Math.min(10, u))
        const yDD = 4 * uClamped - 2.828 * state.yDot - 4 * state.y
        state.yDot += yDD * dt
        state.y += state.yDot * dt
        if (state.y > state.peak) state.peak = state.y

        // Settlement detection: |err| within 2% of setpoint for ~120
        // recorded samples (~2s of plot) arms the auto-retrigger.
        if (Math.abs(err) < SP * 0.02 + 0.01) {
          state.settledFor++
          if (state.settledFor > 120 && state.retriggerAt === 0) {
            state.retriggerAt = _timeMs + 2000
          }
        } else {
          state.settledFor = 0
        }

        if (state.stepCount % 4 === 0) {
          state.setpoints[state.stepIdx] = SP
          state.outputs[state.stepIdx] = state.y
          state.controlSig[state.stepIdx] = uClamped
          state.stepIdx = (state.stepIdx + 1) % MAX_STEPS
        }
        state.stepCount++
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

      // Underdamped / aggressive gains overshoot well past the setpoint, so
      // size the axis to ~2*SP and widen to the runtime peak if it climbs
      // higher. Pixel fractions are still clamped below as a backstop.
      const yMax = Math.max(SP * 2, state.peak * 1.05)
      const yMin = -0.5
      const uMin = -4, uMax = 4
      const clamp01 = (f: number) => Math.max(0, Math.min(1, f))

      ctx.fillStyle = '#5a6a7a'
      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('Plant Output / Setpoint', margin.left, margin.top - 6)

      ctx.strokeStyle = '#1a2a3a'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      const yMid = margin.top + plotH * clamp01(1 - (SP - yMin) / (yMax - yMin))
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
        const yv = state.setpoints[(state.stepIdx + i) % MAX_STEPS]
        const yi = margin.top + plotH * clamp01(1 - (yv - yMin) / (yMax - yMin))
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
        const yv = state.outputs[(state.stepIdx + i) % MAX_STEPS]
        const yi = margin.top + plotH * clamp01(1 - (yv - yMin) / (yMax - yMin))
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
        const uv = state.controlSig[(state.stepIdx + i) % MAX_STEPS]
        const yi = ctrlTop + ctrlH * clamp01(1 - (uv - uMin) / (uMax - uMin))
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
