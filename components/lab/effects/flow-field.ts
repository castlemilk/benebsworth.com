import type { EffectModule } from '@/lib/lab/types'
import { makeNoise2D } from '@/lib/lab/noise'

export const flowField: EffectModule = {
  controls: [
    { key: 'particles', label: 'Particles', type: 'range', min: 100, max: 1200, step: 50 },
    { key: 'scale', label: 'Noise scale', type: 'range', min: 0.001, max: 0.02, step: 0.001 },
    { key: 'speed', label: 'Speed', type: 'range', min: 0.2, max: 3, step: 0.1 },
    { key: 'trail', label: 'Trail', type: 'range', min: 0.01, max: 0.2, step: 0.01 },
    { key: 'color', label: 'Color', type: 'color' },
  ],
  defaults: { particles: 500, scale: 0.006, speed: 1, trail: 0.06, color: '#00e0b8' },
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const noise = makeNoise2D(1337)
    let pts: { x: number; y: number }[] = []
    const seed = () => { pts = Array.from({ length: 1200 }, () => ({ x: Math.random() * dims.w, y: Math.random() * dims.h })) }
    seed()
    let prevT = 0
    return {
      step(t, p) {
        const { w, h } = dims
        const dt = Math.min(50, t - prevT) / 16.67 || 1; prevT = t
        ctx.save(); ctx.globalAlpha = p.trail as number; ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h); ctx.restore()
        ctx.strokeStyle = p.color as string; ctx.lineWidth = 1
        const n = p.particles as number, sc = p.scale as number, sp = (p.speed as number) * dt
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const pt = pts[i]
          const ang = noise(pt.x * sc, pt.y * sc + t * 0.0002) * Math.PI * 2
          const nx = pt.x + Math.cos(ang) * sp, ny = pt.y + Math.sin(ang) * sp
          ctx.moveTo(pt.x, pt.y); ctx.lineTo(nx, ny)
          pt.x = nx < 0 ? w : nx > w ? 0 : nx
          pt.y = ny < 0 ? h : ny > h ? 0 : ny
        }
        ctx.stroke()
      },
    }
  },
}
