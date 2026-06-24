'use client'

/**
 * DiffusionLoop / NoiseSchedule — the two interactives for
 * "How to paint with noise" (how diffusion image generators work).
 *
 * A diffusion model has a FIXED forward process that adds Gaussian noise to an
 * image one step at a time until it's pure static, and a LEARNED reverse process
 * that removes a little noise at a time to recover an image from noise.
 *
 *   forward:  x_t = sqrt(ᾱ_t)·x0 + sqrt(1−ᾱ_t)·ε        (ε ~ N(0,1), fixed)
 *   schedule: linear β from 1e-4 to 0.02 over T steps, ᾱ_t = Π_{s≤t}(1−β_s)
 *
 * DiffusionLoop renders a 28×28 smiley as x0 and lets you scrub / play the
 * timestep forward (add noise) and back (denoise). The noise field ε is sampled
 * ONCE with a seeded PRNG (mulberry32) so it's deterministic and SSR-safe — we
 * never call Math.random during render. Reverse just replays the same stored ε
 * backward; a real model PREDICTS ε and subtracts it, here we already know it.
 *
 * NoiseSchedule is a small line chart of signal = sqrt(ᾱ_t) and
 * noise = sqrt(1−ᾱ_t) over t, with the current t marked. signal²+noise² = 1 at
 * every step, so the two curves cross where ᾱ_t = 0.5.
 *
 * Canvas rAF is gated on in-view + playing + reduced-motion; cancelled on unmount.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInViewport } from './use-in-viewport'

// ── schedule ──────────────────────────────────────────────────────────────
const GRID = 28 // 28×28 image
const T = 40 // diffusion steps
// Real DDPM uses linear β from 1e-4 → 0.02 over T=1000 steps, which drives
// ᾱ_T to ≈0 (pure noise). We compress to T=40 so it's scrubbable; over so few
// steps β must ramp harder to reach the same near-zero endpoint, so β_T is
// widened to 0.25 (ᾱ_T ≈ 0.004). The shape is identical: linear β, ᾱ the
// cumulative product, ᾱ_0 = 1 (clean) → ᾱ_T ≈ 0 (static).
const BETA_0 = 1e-4
const BETA_T = 0.25

const accent = 'var(--color-blog)'
const NOISE_COLOR = '#d98b5f'

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

// ᾱ_t for t = 0..T (index 0 is the clean image: ᾱ_0 = 1).
function alphaBars(): number[] {
  const out: number[] = [1]
  let acc = 1
  for (let t = 1; t <= T; t++) {
    const beta = BETA_0 + ((BETA_T - BETA_0) * (t - 1)) / (T - 1)
    acc *= 1 - beta
    out.push(acc)
  }
  return out
}

// ── deterministic PRNG (mulberry32) — never Math.random during render ───────
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Box–Muller standard normal from a uniform PRNG.
function makeNoiseField(seed: number, n: number): Float32Array {
  const rand = mulberry32(seed)
  const eps = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let u = 0
    let v = 0
    while (u === 0) u = rand()
    while (v === 0) v = rand()
    eps[i] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  return eps
}

// ── x0: a procedural smiley (filled circle, two eye dots, a smile arc) ───────
function makeSmiley(): Float32Array {
  const x0 = new Float32Array(GRID * GRID)
  const c = (GRID - 1) / 2 // center 13.5
  const faceR = 12.5
  const at = (gx: number, gy: number) => gy * GRID + gx
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const dx = gx - c
      const dy = gy - c
      const r = Math.hypot(dx, dy)
      // face fill: dark disc on a light field → value near 0 inside, ~1 outside
      let v = r <= faceR ? 0.16 : 0.96

      // eyes: two filled dots near the top, punched back to light
      const eyeY = c - 2.4
      const eyeDX = 4.8
      const eyeR = 1.6
      if (Math.hypot(gx - (c - eyeDX), gy - eyeY) <= eyeR) v = 0.96
      if (Math.hypot(gx - (c + eyeDX), gy - eyeY) <= eyeR) v = 0.96

      // smile: the lower arc of a large circle centered high, so only the
      // bottom of the ring shows — an upturned "U" in the lower half of the face
      const smileCY = c - 7.0
      const smileR = 13.0
      const md = Math.hypot(dx, gy - smileCY)
      if (Math.abs(md - smileR) <= 1.3 && dy > 3.0) v = 0.96

      x0[at(gx, gy)] = v
    }
  }
  return x0
}

// ─────────────────────────────────────────────────────────────────────────────
//  DiffusionLoop
// ─────────────────────────────────────────────────────────────────────────────
export function DiffusionLoop() {
  const [inViewRef, inView] = useInViewport<HTMLDivElement>('120px')
  const [t, setT] = useState(0)
  const [running, setRunning] = useState(false)
  // direction: +1 adds noise (forward), -1 denoises (reverse)
  const [dir, setDir] = useState<1 | -1>(1)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const tRef = useRef(0) // float timestep for smooth animation

  const abar = useMemo(() => alphaBars(), [])
  const x0 = useMemo(() => makeSmiley(), [])
  const eps = useMemo(() => makeNoiseField(0x9e3779b9, GRID * GRID), [])

  const alphaBarAt = (tt: number) => {
    const lo = Math.floor(tt)
    const hi = Math.min(T, lo + 1)
    const f = tt - lo
    return abar[lo] * (1 - f) + abar[hi] * f
  }

  // draw x_t onto the canvas at the current (float) timestep
  const draw = (tt: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const cssSize = canvas.clientWidth || 280
    const px = Math.round(cssSize * dpr)
    if (canvas.width !== px || canvas.height !== px) {
      canvas.width = px
      canvas.height = px
    }

    // build a tiny 28×28 ImageData then blit it scaled with NN smoothing off
    const ab = alphaBarAt(tt)
    const sa = Math.sqrt(ab)
    const sn = Math.sqrt(Math.max(0, 1 - ab))

    const off = document.createElement('canvas')
    off.width = GRID
    off.height = GRID
    const octx = off.getContext('2d')
    if (!octx) return
    const img = octx.createImageData(GRID, GRID)
    for (let i = 0; i < GRID * GRID; i++) {
      let val = sa * x0[i] + sn * eps[i]
      val = val < 0 ? 0 : val > 1 ? 1 : val // clamp [0,1]
      const g = Math.round(val * 255)
      const o = i * 4
      img.data[o] = g
      img.data[o + 1] = g
      img.data[o + 2] = g
      img.data[o + 3] = 255
    }
    octx.putImageData(img, 0, 0)

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(off, 0, 0, GRID, GRID, 0, 0, canvas.width, canvas.height)
  }

  // redraw whenever the (committed) timestep or layout changes
  useEffect(() => {
    tRef.current = t
    draw(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t])

  // redraw on resize so the scaled-up pixels stay crisp
  useEffect(() => {
    const onResize = () => draw(tRef.current)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // animation clock: march t toward an endpoint in the current direction
  useEffect(() => {
    if (!running || !inView || reducedMotion()) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastRef.current = null
      return
    }
    const STEPS_PER_SEC = 22
    const tick = (now: number) => {
      if (lastRef.current == null) lastRef.current = now
      const dt = (now - lastRef.current) / 1000
      lastRef.current = now
      let next = tRef.current + dir * STEPS_PER_SEC * dt
      let stop = false
      if (dir === 1 && next >= T) {
        next = T
        stop = true
      } else if (dir === -1 && next <= 0) {
        next = 0
        stop = true
      }
      tRef.current = next
      draw(next)
      setT(next)
      if (stop) {
        setRunning(false)
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, inView, dir])

  const ab = alphaBarAt(t)
  const tInt = Math.round(t)

  // play button: add noise if we're not already at the noisy end, else denoise.
  const onPlay = () => {
    if (running) {
      setRunning(false)
      return
    }
    const goForward = t < T - 0.5
    const d: 1 | -1 = goForward ? 1 : -1
    setDir(d)
    if (reducedMotion()) {
      // no auto-play under reduced motion — jump to the endpoint instead
      setT(goForward ? T : 0)
      return
    }
    lastRef.current = null
    setRunning(true)
  }

  const label =
    tInt <= 0
      ? 'clean image'
      : tInt >= T
        ? 'pure noise'
        : t < 12
          ? 'mostly signal'
          : t > 28
            ? 'mostly noise'
            : 'signal + noise'

  return (
    <figure
      ref={inViewRef}
      className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          forward diffusion · add → remove noise
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPlay}
            className="rounded-md border border-[var(--color-border)] bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider text-fg transition-colors hover:border-[var(--color-muted)]"
          >
            {running
              ? 'pause'
              : t < T - 0.5
                ? 'add noise ▶'
                : 'denoise ◀'}
          </button>
        </div>
      </div>

      <div className="px-2 py-5 sm:px-4">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3">
          <div
            className="w-full max-w-[300px] overflow-hidden rounded-xl border border-[var(--color-border)]"
            style={{ background: 'var(--color-bg)' }}
          >
            <canvas
              ref={canvasRef}
              className="block w-full"
              style={{ aspectRatio: '1 / 1', imageRendering: 'pixelated' }}
              role="img"
              aria-label="A 28 by 28 pixel smiley face with Gaussian noise added according to the diffusion timestep."
            />
          </div>

          <div className="flex w-full max-w-[300px] items-center justify-between font-mono text-[0.7rem] text-muted">
            <span>
              t = <span className="tabular-nums text-fg">{tInt}</span> / {T}
            </span>
            <span className="text-blog">{label}</span>
            <span>
              ᾱ<sub>t</sub> ={' '}
              <span className="tabular-nums text-fg">{ab.toFixed(3)}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex items-center gap-4">
          <label
            htmlFor="dl-t"
            className="whitespace-nowrap font-mono text-[0.7rem] uppercase tracking-wider text-muted"
          >
            timestep
          </label>
          <input
            id="dl-t"
            type="range"
            min={0}
            max={T}
            step={1}
            value={tInt}
            onChange={(e) => {
              setRunning(false)
              setT(Number(e.target.value))
            }}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)]"
          />
          <span className="w-16 text-right font-mono text-[0.78rem] tabular-nums text-fg">
            {tInt} / {T}
          </span>
        </div>
        <p className="mt-2 font-mono text-[0.66rem] leading-snug text-muted">
          The forward process is fixed: x<sub>t</sub> ={' '}
          <span className="text-blog">√ᾱ</span>
          <sub>t</sub>·x<sub>0</sub> +{' '}
          <span style={{ color: NOISE_COLOR }}>√(1−ᾱ</span>
          <sub>t</sub>
          <span style={{ color: NOISE_COLOR }}>)</span>·ε, marching a clean image
          to pure static. Denoise just replays the <em>same</em> stored ε
          backward — a real model can&rsquo;t cheat like that: it{' '}
          <em>predicts</em> ε at each step and subtracts it, which is the only
          thing it ever learns.
        </p>
      </div>
    </figure>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  NoiseSchedule
// ─────────────────────────────────────────────────────────────────────────────
export function NoiseSchedule({ t }: { t?: number }) {
  const abar = useMemo(() => alphaBars(), [])

  const VB_W = 520
  const VB_H = 240
  const ML = 44
  const MR = 18
  const MT = 18
  const MB = 38
  const plotW = VB_W - ML - MR
  const plotH = VB_H - MT - MB

  const tx = (tt: number) => ML + (tt / T) * plotW
  const ty = (v: number) => MT + (1 - v) * plotH // v in [0,1]

  const signal = abar.map((a) => Math.sqrt(a))
  const noise = abar.map((a) => Math.sqrt(Math.max(0, 1 - a)))

  const path = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${tx(i)} ${ty(v)}`).join(' ')

  const tCur = Math.max(0, Math.min(T, t ?? T / 2))
  const sigCur = Math.sqrt(abar[Math.round(tCur)])
  const noiCur = Math.sqrt(Math.max(0, 1 - abar[Math.round(tCur)]))

  return (
    <figure className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          noise schedule · signal vs noise
        </span>
        <div className="flex items-center gap-3 font-mono text-[0.66rem] uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-muted">
            <span
              className="inline-block h-0.5 w-3"
              style={{ background: accent }}
            />
            signal
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            <span
              className="inline-block h-0.5 w-3"
              style={{ background: NOISE_COLOR }}
            />
            noise
          </span>
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full"
          style={{ maxWidth: 580, margin: '0 auto' }}
          role="img"
          aria-label="A line chart of signal = sqrt(alpha-bar) and noise = sqrt(1 minus alpha-bar) against the diffusion timestep. The curves cross near the middle where alpha-bar equals one half."
        >
          {/* gridlines + y axis labels at 0, 0.5, 1 */}
          {[0, 0.5, 1].map((v) => (
            <g key={`g-${v}`}>
              <line
                x1={ML}
                y1={ty(v)}
                x2={ML + plotW}
                y2={ty(v)}
                stroke="color-mix(in srgb, var(--color-border) 70%, transparent)"
                strokeWidth={1}
                strokeDasharray={v === 0 || v === 1 ? undefined : '3 4'}
              />
              <text
                x={ML - 8}
                y={ty(v) + 3.5}
                textAnchor="end"
                className="font-mono"
                style={{ fontSize: 10, fill: 'var(--color-muted)' }}
              >
                {v.toFixed(1)}
              </text>
            </g>
          ))}

          {/* x axis ticks */}
          {[0, T / 2, T].map((v) => (
            <text
              key={`x-${v}`}
              x={tx(v)}
              y={VB_H - 14}
              textAnchor="middle"
              className="font-mono"
              style={{ fontSize: 10, fill: 'var(--color-muted)' }}
            >
              {v === 0 ? 't=0' : v === T ? `t=${T}` : `t=${T / 2}`}
            </text>
          ))}

          {/* current-t marker */}
          <line
            x1={tx(tCur)}
            y1={MT}
            x2={tx(tCur)}
            y2={MT + plotH}
            stroke="var(--color-fg)"
            strokeWidth={1}
            strokeDasharray="2 3"
            style={{ opacity: 0.5 }}
          />

          {/* curves */}
          <path d={path(signal)} fill="none" stroke={accent} strokeWidth={2.2} />
          <path
            d={path(noise)}
            fill="none"
            stroke={NOISE_COLOR}
            strokeWidth={2.2}
          />

          {/* current-t dots */}
          <circle cx={tx(tCur)} cy={ty(sigCur)} r={3.5} fill={accent} />
          <circle cx={tx(tCur)} cy={ty(noiCur)} r={3.5} fill={NOISE_COLOR} />

          {/* axis frame */}
          <line
            x1={ML}
            y1={MT}
            x2={ML}
            y2={MT + plotH}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
        </svg>
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <p className="font-mono text-[0.66rem] leading-snug text-muted">
          <span className="text-blog">signal = √ᾱ</span>
          <sub>t</sub> fades as{' '}
          <span style={{ color: NOISE_COLOR }}>noise = √(1−ᾱ</span>
          <sub>t</sub>
          <span style={{ color: NOISE_COLOR }}>)</span> grows. They always sum in
          quadrature to 1, so the image is a weighted blend at every step and the
          two curves cross exactly where ᾱ<sub>t</sub> = 0.5.
        </p>
      </div>
    </figure>
  )
}
