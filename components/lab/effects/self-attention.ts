import type { ControlSpec, EffectModule, Params } from '@/lib/lab/types'

/**
 * Self-Attention — a live, multi-head attention network.
 *
 * Tokens sit in a row; the active query token cycles through the sequence
 * and, for each head, draws curved connection arcs to every key whose
 * brightness and particle-flow density ∝ the (softmax) attention weight.
 * Each head has a slowly drifting "preferred relative offset," so the
 * patterns feel alive and interpretable — some heads attend locally,
 * some reach further, and the preference drifts over time.
 *
 * The companion to the "Attention, From the Inside Out" post: where the
 * post's heatmap is a precise, hand-tuned matrix you read, this lab is a
 * generative, always-on picture of the same mechanism in motion.
 */

export const controls: ControlSpec[] = [
  { key: 'tokens', label: 'Tokens', type: 'range', min: 4, max: 9, step: 1 },
  { key: 'heads', label: 'Heads', type: 'range', min: 1, max: 4, step: 1 },
  { key: 'temperature', label: 'Temperature', type: 'range', min: 0.3, max: 2, step: 0.05 },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.2, max: 2, step: 0.1 },
  { key: 'color', label: 'Color', type: 'color' },
]

export const defaults: Params = {
  tokens: 6,
  heads: 3,
  temperature: 0.8,
  speed: 1,
  color: '#7c5cff',
}

// ── colour helpers ─────────────────────────────────────────────────────
// Parse the chosen hex into HSL, then rotate the hue per head so each
// head reads as a distinct stream while staying within one palette.
function hexToHsl(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return [263, 70, 60]
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 255) / 255,
    g = ((n >> 8) & 255) / 255,
    b = (n & 255) / 255
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b)
  let h = 0,
    s = 0
  const l = (mx + mn) / 2
  if (mx !== mn) {
    const d = mx - mn
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
    else if (mx === g) h = ((b - r) / d + 2) * 60
    else h = ((r - g) / d + 4) * 60
  }
  return [h, s, l]
}
function hsl([h, s, l]: [number, number, number], alpha = 1): string {
  return `hsla(${h.toFixed(0)},${(s * 100).toFixed(0)}%,${(l * 100).toFixed(0)}%,${alpha})`
}

interface Particle {
  fromI: number
  toI: number
  head: number
  s: number // 0..1 progress along the arc
  v: number // speed along the arc
}

export const selfAttention: EffectModule = {
  controls,
  defaults,
  createRenderer(ctx, dims, theme = { bg: '#0a0a0c', fg: '#ececf0' }) {
    const { w, h } = dims
    const particles: Particle[] = []
    let prevTokens = 0
    let prevHeads = 0
    const MAX_PARTICLES = 140

    return {
      step(t, p) {
        const tokenCount = Math.max(2, Math.round(p.tokens as number))
        const headCount = Math.max(1, Math.round(p.heads as number))
        const temperature = Math.max(0.05, p.temperature as number)
        const speed = Math.max(0.05, p.speed as number)
        const baseHsl = hexToHsl(p.color as string)

        // reset particles when the graph shape changes (old particles
        // belong to a different node layout)
        if (tokenCount !== prevTokens || headCount !== prevHeads) {
          particles.length = 0
          prevTokens = tokenCount
          prevHeads = headCount
        }

        ctx.fillStyle = theme.bg
        ctx.fillRect(0, 0, w, h)

        const time = (t / 1000) * speed
        const rowY = h * 0.66
        const padX = w * 0.1
        const usableW = w - padX * 2
        const tokenX = (i: number) => padX + (usableW * (i + 0.5)) / tokenCount
        const tokenR = Math.max(7, Math.min(13, usableW / tokenCount * 0.18))

        // active query cycles through the sequence
        const cycleMs = 1700 / speed
        const activeQ = Math.floor((t / cycleMs) % tokenCount)
        const intoCycle = (t % cycleMs) / cycleMs // 0..1 within this query's reign

        // per-head preferred relative offset, drifting over time so the
        // patterns feel alive. head 0 ≈ local, higher heads reach further.
        const headPref = (hh: number) => {
          const base = (hh + 1) * 0.9
          const drift = Math.sin(time * 0.35 + hh * 1.7) * (1 + hh)
          return base + drift
        }
        // compatibility(query i, key j, head h): peaks when |j-i| ≈ pref(h)
        const compat = (i: number, j: number, hh: number) => {
          const pref = headPref(hh)
          const d = Math.abs((j - i) - Math.sign(j - i || 1) * pref)
          return Math.exp(-(d * d) / (2 * 1.6 * 1.6)) + 0.12
        }

        // softmax weights for the active query, per head
        const weights: number[][] = []
        for (let hh = 0; hh < headCount; hh++) {
          const raw: number[] = []
          for (let j = 0; j < tokenCount; j++) raw.push(compat(activeQ, j, hh) / temperature)
          const mx = Math.max(...raw)
          const exps = raw.map((r) => Math.exp(r - mx))
          const sum = exps.reduce((a, b) => a + b, 0)
          weights.push(exps.map((e) => e / sum))
        }

        // bow height per head, stacked so heads separate visually
        const maxBow = rowY * 0.82
        const bowFor = (hh: number) => maxBow * (0.42 + (hh / Math.max(1, headCount)) * 0.58)

        // bezier point along arc i→j for head hh at param s
        const arcPoint = (i: number, j: number, hh: number, s: number) => {
          const ax = tokenX(i),
            ay = rowY
          const bx = tokenX(j),
            by = rowY
          const mx = (ax + bx) / 2,
            my = rowY - bowFor(hh)
          const u = 1 - s
          return {
            x: u * u * ax + 2 * u * s * mx + s * s * bx,
            y: u * u * ay + 2 * u * s * my + s * s * by,
          }
        }

        // ── draw arcs for the active query (additive glow) ─────────────
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.lineCap = 'round'
        for (let hh = 0; hh < headCount; hh++) {
          const hue = baseHsl.slice() as [number, number, number]
          hue[0] = (baseHsl[0] + hh * 42) % 360
          for (let j = 0; j < tokenCount; j++) {
            if (j === activeQ) continue
            const wt = weights[hh][j]
            if (wt < 0.04) continue
            const segs = 18
            ctx.beginPath()
            for (let s = 0; s <= segs; s++) {
              const pt = arcPoint(activeQ, j, hh, s / segs)
              if (s === 0) ctx.moveTo(pt.x, pt.y)
              else ctx.lineTo(pt.x, pt.y)
            }
            ctx.strokeStyle = hsl(hue, 0.1 + wt * 0.55)
            ctx.lineWidth = 0.6 + wt * 3.2
            ctx.stroke()
          }
        }
        ctx.restore()

        // ── spawn particles on the brighter arcs ───────────────────────
        const dt = 16 / 1000
        for (let hh = 0; hh < headCount; hh++) {
          for (let j = 0; j < tokenCount; j++) {
            if (j === activeQ) continue
            const wt = weights[hh][j]
            if (wt < 0.08) continue
            // spawn probability scales with weight; tighter when fewer tokens
            if (Math.random() < wt * dt * 14 * (tokenCount / 6) && particles.length < MAX_PARTICLES) {
              particles.push({ fromI: activeQ, toI: j, head: hh, s: 0, v: 0.5 + Math.random() * 0.5 })
            }
          }
        }
        // advance + cull
        for (let k = particles.length - 1; k >= 0; k--) {
          const pt = particles[k]
          pt.s += pt.v * dt * speed * 1.2
          if (pt.s >= 1) particles.splice(k, 1)
        }
        // draw particles
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        for (const pt of particles) {
          const pos = arcPoint(pt.fromI, pt.toI, pt.head, Math.min(1, pt.s))
          const hue = baseHsl.slice() as [number, number, number]
          hue[0] = (baseHsl[0] + pt.head * 42) % 360
          const fade = 1 - Math.abs(pt.s - 0.5) * 0.8
          ctx.fillStyle = hsl(hue, 0.9 * fade)
          ctx.beginPath()
          ctx.arc(pos.x, pos.y, 2.1, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()

        // ── token nodes ────────────────────────────────────────────────
        for (let i = 0; i < tokenCount; i++) {
          const x = tokenX(i),
            y = rowY
          const isActive = i === activeQ
          const pulse = isActive ? 1 + Math.sin(time * 6) * 0.08 : 1
          // halo for active query
          if (isActive) {
            ctx.save()
            ctx.globalCompositeOperation = 'lighter'
            const grad = ctx.createRadialGradient(x, y, 0, x, y, tokenR * 3.4)
            grad.addColorStop(0, hsl(baseHsl, 0.35))
            grad.addColorStop(1, hsl(baseHsl, 0))
            ctx.fillStyle = grad
            ctx.beginPath()
            ctx.arc(x, y, tokenR * 3.4, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
          }
          ctx.save()
          ctx.fillStyle = isActive ? hsl(baseHsl, 0.95) : theme.bg
          ctx.strokeStyle = isActive ? hsl(baseHsl, 0.9) : theme.fg
          ctx.globalAlpha = isActive ? 1 : 0.55
          ctx.lineWidth = isActive ? 2 : 1
          ctx.beginPath()
          ctx.arc(x, y, tokenR * pulse, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
          ctx.restore()
          // label
          ctx.save()
          ctx.font = `${Math.max(9, tokenR * 0.9)}px ui-monospace, monospace`
          ctx.fillStyle = isActive ? theme.bg : theme.fg
          ctx.globalAlpha = isActive ? 1 : 0.5
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(`t${i + 1}`, x, y)
          ctx.restore()
        }

        // ── head legend ────────────────────────────────────────────────
        ctx.save()
        ctx.font = '10px ui-monospace, monospace'
        ctx.textBaseline = 'middle'
        let lx = 14
        const ly = 16
        ctx.fillStyle = theme.fg
        ctx.globalAlpha = 0.4
        ctx.fillText(`${headCount} head${headCount > 1 ? 's' : ''} · q = t${activeQ + 1}`, lx, ly)
        lx += ctx.measureText(`${headCount} heads · q = t${activeQ + 1}    `).width
        for (let hh = 0; hh < headCount; hh++) {
          const hue = baseHsl.slice() as [number, number, number]
          hue[0] = (baseHsl[0] + hh * 42) % 360
          ctx.globalAlpha = 0.9
          ctx.fillStyle = hsl(hue, 0.9)
          ctx.beginPath()
          ctx.arc(lx + 4, ly, 3.5, 0, Math.PI * 2)
          ctx.fill()
          lx += 14
        }
        ctx.restore()

        // restart cycle fade-in cue: brighten active halo as it begins
        // (intoCycle near 0) — gives a sense of the "spotlight" moving.
        // (visual subtlety handled by pulse above)
        void intoCycle
      },
    }
  },
}
