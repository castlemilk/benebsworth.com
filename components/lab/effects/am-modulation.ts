import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * AM Modulation
 *
 * Amplitude modulation of a sinusoidal carrier by a lower-frequency
 * message signal:
 *
 *   s(t) = A_c [1 + m · m(t)] cos(2π f_c t)
 *
 * where m is the modulation index (0 to 1), m(t) is the normalized
 * message signal (−1 … 1), and f_c is the carrier frequency.
 *
 * The display shows three stacked waveforms:
 *   top:    message signal (the information)
 *   middle: modulated output — carrier whose envelope follows |1 + m · m(t)|
 *   bottom: spectrum — carrier with symmetric AM sidebands at f_c ± f_m
 *
 * Overmodulation (m > 1) clips the carrier envelope, producing distortion
 * and additional sidebands — visible in the spectrum display.
 */
export const controls: ControlSpec[] = [
  { key: 'modIndex', label: 'Mod index (m)', type: 'range', min: 0.1, max: 1.5, step: 0.05 },
  { key: 'carrierHz', label: 'Carrier freq', type: 'range', min: 1, max: 8, step: 0.1 },
  { key: 'messageHz', label: 'Message freq', type: 'range', min: 0.5, max: 3, step: 0.1 },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.2, max: 3, step: 0.1 },
]

export const defaults: Params = {
  modIndex: 0.5,
  carrierHz: 4,
  messageHz: 1,
  speed: 1,
}

export const amModulation: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims

    const marginLeft = 50
    const marginRight = 20
    const plotW = w - marginLeft - marginRight

    // Three stacked plots each taking ~h/3.5
    const plotH = (h - 60) / 3.5
    const gap = 8

    return {
      step(t, p) {
        const m = p.modIndex as number
        const fc = p.carrierHz as number
        const fm = p.messageHz as number
        const speed = p.speed as number

        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)

        const tSec = (t / 1000) * speed

        // Plot 1: Message signal
        const y0 = 20
        drawWaveform(ctx, marginLeft, y0, plotW, plotH, theme.fg, 0.2, true, (tx) => {
          return Math.sin(2 * Math.PI * fm * (tSec + tx))
        })

        ctx.save()
        ctx.font = '9px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.5
        ctx.fillText(`Message: f_m = ${fm.toFixed(1)} Hz`, marginLeft, y0 - 4)
        ctx.fillText('+1', marginLeft - 20, y0 + plotH * 0.25)
        ctx.fillText('0', marginLeft - 12, y0 + plotH * 0.5 + 4)
        ctx.fillText('−1', marginLeft - 20, y0 + plotH * 0.75 + 4)
        ctx.restore()

        // Plot 2: Modulated signal s(t)
        const y1 = y0 + plotH + gap
        drawWaveform(ctx, marginLeft, y1, plotW, plotH, '#ff7a59', 0.7, true, (tx) => {
          const msg = Math.sin(2 * Math.PI * fm * tx)
          return (1 + m * msg) * Math.cos(2 * Math.PI * fc * tx)
        })

        // Draw envelope curves (the outline that the message traces on the carrier)
        ctx.save()
        ctx.strokeStyle = theme.fg
        ctx.globalAlpha = 0.12
        ctx.lineWidth = 0.8
        ctx.setLineDash([2, 4])
        // Upper envelope
        ctx.beginPath()
        let started = false
        for (let px = 0; px <= plotW; px += 2) {
          const tx = tSec + (px / plotW) * (2 / fc)
          const msg = Math.sin(2 * Math.PI * fm * tx)
          const env = (1 + m * msg)
          const sy = y1 + plotH / 2 - (plotH / 2) * env
          if (!started) { ctx.moveTo(marginLeft + px, sy); started = true }
          else ctx.lineTo(marginLeft + px, sy)
        }
        ctx.stroke()
        // Lower envelope
        ctx.beginPath()
        started = false
        for (let px = 0; px <= plotW; px += 2) {
          const tx = tSec + (px / plotW) * (2 / fc)
          const msg = Math.sin(2 * Math.PI * fm * tx)
          const env = -(1 + m * msg)
          const sy = y1 + plotH / 2 - (plotH / 2) * env
          if (!started) { ctx.moveTo(marginLeft + px, sy); started = true }
          else ctx.lineTo(marginLeft + px, sy)
        }
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()

        ctx.save()
        ctx.font = '9px monospace'
        ctx.fillStyle = '#ff7a59'
        ctx.globalAlpha = 0.6
        ctx.fillText(`Modulated: f_c = ${fc.toFixed(1)} Hz, m = ${m.toFixed(2)}`, marginLeft, y1 - 4)
        if (m > 1) {
          ctx.fillStyle = '#ff5555'
          ctx.fillText('⚠ Overmodulated — carrier clips', marginLeft + 260, y1 - 4)
        }
        ctx.restore()

        // Plot 3: Spectrum (simplified — shows carrier + sidebands)
        const y2 = y1 + plotH + gap
        drawSpectrum(ctx, marginLeft, y2, plotW, plotH, fc, fm, m, theme.fg)

        ctx.save()
        ctx.font = '9px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.5
        ctx.fillText(`Spectrum: carrier at ±f_c, sidebands at f_c ± f_m`, marginLeft, y2 - 4)
        ctx.restore()

        // Labels
        ctx.save()
        ctx.font = '10px monospace'
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.3
        ctx.textAlign = 'center'
        ctx.fillText('AM Modulation', w / 2, h - 8)
        ctx.restore()
      },
    }
  },
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, w: number, h: number,
  color: string, alpha: number, fillZero: boolean,
  fn: (tx: number) => number,
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.globalAlpha = alpha
  ctx.lineWidth = 1.2
  ctx.beginPath()
  let started = false
  const midY = y0 + h / 2
  for (let px = 0; px <= w; px += 2) {
    const val = fn(px / 100) // scale time to get a few cycles visible
    const sy = midY - (h / 2) * val * 0.9
    if (!started) { ctx.moveTo(x0 + px, sy); started = true }
    else ctx.lineTo(x0 + px, sy)
  }
  ctx.stroke()

  // Zero line
  if (fillZero) {
    ctx.strokeStyle = color
    ctx.globalAlpha = 0.15
    ctx.lineWidth = 0.5
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    ctx.moveTo(x0, midY)
    ctx.lineTo(x0 + w, midY)
    ctx.stroke()
    ctx.setLineDash([])
  }
  ctx.restore()
}

function drawSpectrum(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, w: number, h: number,
  fc: number, fm: number, m: number, fg: string,
) {
  const midY = y0 + h - 10
  const maxH = h - 15

  // Frequency axis layout: show 0 to 2*fc range
  const freqMax = fc * 2.5
  const toX = (freq: number) => x0 + (freq / freqMax) * w

  // Baseline
  ctx.save()
  ctx.strokeStyle = fg
  ctx.globalAlpha = 0.15
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(toX(0), midY)
  ctx.lineTo(toX(freqMax), midY)
  ctx.stroke()

  // Carrier spike
  const carrierH = maxH * 0.7
  drawSpike(ctx, toX(fc), midY, carrierH, '#ff7a59', 0.8)
  ctx.fillText(`${fc.toFixed(0)}`, toX(fc) - 6, midY + 14)

  // Sideband spikes: amplitude proportional to m/2
  const sbH = maxH * 0.7 * (m / 2)
  if (fc - fm > 0) {
    drawSpike(ctx, toX(fc - fm), midY, sbH, 'rgba(255,255,255,0.5)', 0.6)
  }
  drawSpike(ctx, toX(fc + fm), midY, sbH, 'rgba(255,255,255,0.5)', 0.6)
  ctx.fillText(`f_c − f_m`, toX(fc - fm) - 30, midY - sbH - 6)
  ctx.fillText(`f_c + f_m`, toX(fc + fm) + 4, midY - sbH - 6)

  // Frequency axis ticks
  ctx.font = '8px monospace'
  ctx.fillStyle = fg
  ctx.globalAlpha = 0.35
  ctx.fillText('0', toX(0) - 6, midY + 14)

  ctx.restore()
}

function drawSpike(
  ctx: CanvasRenderingContext2D,
  x: number, baseY: number, h: number,
  color: string, alpha: number,
) {
  ctx.save()
  ctx.fillStyle = color
  ctx.globalAlpha = alpha
  ctx.beginPath()
  ctx.moveTo(x - 3, baseY)
  ctx.lineTo(x, baseY - h)
  ctx.lineTo(x + 3, baseY)
  ctx.fill()
  ctx.restore()
}
