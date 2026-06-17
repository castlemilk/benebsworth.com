import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

export const controls: ControlSpec[] = [
  { key: 'count', label: 'Stars', type: 'range', min: 80, max: 800, step: 20 },
  { key: 'speed', label: 'Warp', type: 'range', min: 0.2, max: 4, step: 0.1 },
  { key: 'streak', label: 'Streak', type: 'range', min: 0, max: 1, step: 0.05 },
  { key: 'color', label: 'Color', type: 'color' },
]

export const defaults: Params = { count: 300, speed: 1, streak: 0.4, color: '#ececf0' }

export const starfield: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    type S = { x: number; y: number; z: number }
    const N = 800
    let stars: S[] = []
    const reset = () => { stars = Array.from({ length: N }, () => ({ x: (Math.random() * 2 - 1) * dims.w, y: (Math.random() * 2 - 1) * dims.h, z: Math.random() * dims.w })) }
    reset()
    return {
      step(t, p) {
        const { w, h } = dims, cx = w / 2, cy = h / 2
        ctx.save(); ctx.globalAlpha = 1 - (p.streak as number) * 0.9; ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h); ctx.restore()
        // Stars use the neutral knob when the user has set a custom (non-default)
        // colour; otherwise track the themed fg so they read on light + dark stages.
        const star = (p.color as string) === '#ececf0' ? theme.fg : (p.color as string)
        ctx.fillStyle = star; ctx.strokeStyle = star
        const n = p.count as number, sp = (p.speed as number) * 6
        for (let i = 0; i < n; i++) {
          const s = stars[i]
          const z0 = s.z
          s.z -= sp
          if (s.z <= 1) { s.x = (Math.random() * 2 - 1) * w; s.y = (Math.random() * 2 - 1) * h; s.z = w; continue }
          const k = w / s.z, k0 = w / z0
          const x = cx + s.x * k, y = cy + s.y * k
          const x0 = cx + s.x * k0, y0 = cy + s.y * k0
          const r = Math.max(0.5, (1 - s.z / w) * 2.5)
          if ((p.streak as number) > 0.02) { ctx.lineWidth = r; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke() }
          else { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill() }
        }
      },
    }
  },
}
