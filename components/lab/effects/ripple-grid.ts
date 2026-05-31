import type { EffectModule } from '@/lib/lab/types'

const MAX_SOURCES = 4

export const rippleGrid: EffectModule = {
  controls: [
    { key: 'gap', label: 'Dot spacing', type: 'range', min: 12, max: 48, step: 2 },
    { key: 'amp', label: 'Amplitude', type: 'range', min: 1, max: 8, step: 0.5 },
    { key: 'freq', label: 'Frequency', type: 'range', min: 0.005, max: 0.06, step: 0.005 },
    { key: 'speed', label: 'Speed', type: 'range', min: 0.2, max: 3, step: 0.1 },
    { key: 'sources', label: 'Sources', type: 'range', min: 1, max: 4, step: 1 },
    { key: 'color', label: 'Color', type: 'color' },
  ],
  defaults: { gap: 24, amp: 4, freq: 0.02, speed: 1, sources: 2, color: '#00e0b8' },
  createRenderer(ctx, dims, _theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    void _theme // clears to transparent; accent dots read on both the light and dark stage
    // Preallocate source positions; mutated in place each frame (allocation-free step).
    const srcs = Array.from({ length: MAX_SOURCES }, () => ({ x: 0, y: 0 }))
    return {
      step(t, p) {
        const { w, h } = dims
        ctx.clearRect(0, 0, w, h)
        const gap = p.gap as number, amp = p.amp as number, freq = p.freq as number
        const time = (t / 1000) * (p.speed as number)
        const ns = Math.min(MAX_SOURCES, p.sources as number)
        for (let i = 0; i < ns; i++) {
          srcs[i].x = w * (0.3 + 0.4 * Math.sin(time * 0.4 + i))
          srcs[i].y = h * (0.3 + 0.4 * Math.cos(time * 0.5 + i * 1.7))
        }
        for (let y = gap / 2; y < h; y += gap) for (let x = gap / 2; x < w; x += gap) {
          let v = 0
          for (let i = 0; i < ns; i++) {
            const s = srcs[i]
            const d = Math.hypot(x - s.x, y - s.y)
            v += Math.sin(d * freq - time * 2)
          }
          v /= ns
          const r = 1 + (v * 0.5 + 0.5) * amp
          const alpha = 0.25 + (v * 0.5 + 0.5) * 0.75
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fillStyle = (p.color as string)
          ctx.globalAlpha = alpha; ctx.fill(); ctx.globalAlpha = 1
        }
      },
    }
  },
}
