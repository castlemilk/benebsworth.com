import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'count', label: 'Orbiters', type: 'range', min: 3, max: 24, step: 1 },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.1, max: 3, step: 0.1 },
  { key: 'radius', label: 'Radius', type: 'range', min: 0.2, max: 0.95, step: 0.05 },
  { key: 'trail', label: 'Trail', type: 'range', min: 0.02, max: 0.4, step: 0.01 },
  { key: 'color', label: 'Color', type: 'color' },
]

export const defaults: Params = { count: 3, speed: 1, radius: 0.7, trail: 0.12, color: '#7c5cff' }

export const orbits: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    return {
      step(t, p) {
        const { w, h } = dims
        const cx = w / 2, cy = h / 2
        const R = Math.min(w, h) / 2 * (p.radius as number)
        // trail: translucent clear to the themed stage colour
        ctx.save(); ctx.globalAlpha = p.trail as number; ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h); ctx.restore()
        const n = p.count as number
        const time = (t / 1000) * (p.speed as number)
        for (let i = 0; i < n; i++) {
          const a = time + (i / n) * Math.PI * 2
          const x = cx + Math.cos(a) * R
          const y = cy + Math.sin(a) * R
          ctx.beginPath()
          ctx.arc(x, y, Math.max(2, Math.min(w, h) * 0.012), 0, Math.PI * 2)
          ctx.fillStyle = p.color as string
          ctx.shadowColor = p.color as string
          ctx.shadowBlur = 12
          ctx.fill()
          ctx.shadowBlur = 0
        }
        // core
        ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, Math.min(w, h) * 0.01), 0, Math.PI * 2)
        ctx.fillStyle = theme.fg; ctx.fill()
      },
    }
  },
}
