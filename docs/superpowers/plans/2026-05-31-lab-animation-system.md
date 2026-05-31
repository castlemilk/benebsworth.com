# Lab Animation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/lab` into a content system of efficient, live-tunable canvas animations — each a mini-post with knobs (URL-shareable) and an explainer — plus a tiny low-compute random mini-embed on the landing.

**Architecture:** Each effect is a pure-ish `createRenderer(ctx, dims)` module + a `ControlSpec[]`. A single shared `<EffectCanvas>` harness owns the rAF loop and all efficiency concerns (pause offscreen via IntersectionObserver + on tab-hidden + reduced-motion static frame + DPR/FPS caps). A TS registry (typed by a `LabEffect` protobuf message) drives the index, `[slug]` playground pages, and the home embed.

**Tech Stack:** Next.js 16 App Router (static export), React 19, Tailwind v4, Canvas 2D, MDX (`next-mdx-remote/rsc`), Protobuf (`buf`+`ts-proto`), Vitest, Playwright. No animation/noise libraries (hand-rolled value noise).

**Working branch:** `redesign`.

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `lib/lab/types.ts` | `ControlSpec`, `Params`, `EffectModule`, `LabEntry` types |
| `lib/lab/url-params.ts` | Pure `encodeParams` / `decodeParams` (clamp + validate) |
| `lib/lab/url-params.test.ts` | Unit tests for the above |
| `lib/lab/registry.ts` | Ordered `LAB_EFFECTS`, `getEffect`, `HOME_EMBED_EFFECTS` |
| `lib/lab/registry.test.ts` | Registry integrity tests |
| `lib/lab/noise.ts` | Tiny deterministic value-noise (for flow-field) |
| `components/lab/effect-canvas.tsx` | Shared harness (`'use client'`) |
| `components/lab/controls.tsx` | Knob panel (`'use client'`) |
| `components/lab/use-url-params.ts` | Client hook: params state ↔ URL |
| `components/lab/effect-playground.tsx` | Detail hero: wires hook → Controls + EffectCanvas |
| `components/lab/home-embed.tsx` | Tiny landing embed (random effect) |
| `components/lab/effects/orbits.ts` | Orbits renderer (ported) |
| `components/lab/effects/flow-field.ts` | Flow-field renderer |
| `components/lab/effects/starfield.ts` | Starfield renderer |
| `components/lab/effects/cyclic-automaton.ts` | Cyclic CA renderer |
| `components/lab/effects/ripple-grid.ts` | Ripple grid renderer |
| `app/lab/page.tsx` | Index grid (modify existing) |
| `app/lab/[slug]/page.tsx` | Playground + MDX explainer |
| `content/lab/<slug>.mdx` | Per-effect explainer prose |
| `proto/content.proto` | `LabEffect` message (modify) |
| `components/landing/grid-nav.tsx` | Mount `home-embed` in the lab tile (modify) |
| `e2e/lab.spec.ts` | E2E |

---

## Task 1: Types + URL params (TDD)

**Files:** Create `lib/lab/types.ts`, `lib/lab/url-params.ts`, `lib/lab/url-params.test.ts`.

- [ ] **Step 1: Create `lib/lab/types.ts`**

```ts
export type ParamValue = number | boolean | string
export type Params = Record<string, ParamValue>

export type ControlSpec =
  | { key: string; label: string; type: 'range'; min: number; max: number; step: number }
  | { key: string; label: string; type: 'toggle' }
  | { key: string; label: string; type: 'color' }
  | { key: string; label: string; type: 'select'; options: { label: string; value: string }[] }

export type Dims = { w: number; h: number; dpr: number }
export type Renderer = { step: (timeMs: number, params: Params) => void; destroy?: () => void }
export type EffectModule = {
  controls: ControlSpec[]
  defaults: Params
  createRenderer: (ctx: CanvasRenderingContext2D, dims: Dims) => Renderer
}
```

- [ ] **Step 2: Write the failing test `lib/lab/url-params.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { encodeParams, decodeParams } from './url-params'
import type { ControlSpec } from './types'

const specs: ControlSpec[] = [
  { key: 'speed', label: 'Speed', type: 'range', min: 0, max: 2, step: 0.1 },
  { key: 'glow', label: 'Glow', type: 'toggle' },
  { key: 'color', label: 'Color', type: 'color' },
  { key: 'mode', label: 'Mode', type: 'select', options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] },
]
const defaults = { speed: 1, glow: true, color: '#00e0b8', mode: 'a' }

describe('url-params', () => {
  it('round-trips encode → decode', () => {
    const p = { speed: 1.5, glow: false, color: '#ff7a59', mode: 'b' }
    expect(decodeParams(encodeParams(p), defaults, specs)).toEqual(p)
  })
  it('falls back to defaults for absent keys', () => {
    expect(decodeParams('speed=0.5', defaults, specs)).toEqual({ ...defaults, speed: 0.5 })
  })
  it('clamps out-of-range ranges', () => {
    expect(decodeParams('speed=99', defaults, specs).speed).toBe(2)
    expect(decodeParams('speed=-5', defaults, specs).speed).toBe(0)
  })
  it('rejects invalid color / select, keeps default', () => {
    expect(decodeParams('color=notacolor&mode=z', defaults, specs)).toEqual(defaults)
  })
  it('ignores unknown keys', () => {
    expect(decodeParams('bogus=1', defaults, specs)).toEqual(defaults)
  })
})
```

- [ ] **Step 3: Run it (expect FAIL)**

Run: `npm test -- url-params`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `lib/lab/url-params.ts`**

```ts
import type { ControlSpec, Params, ParamValue } from './types'

export function encodeParams(params: Params): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) sp.set(k, String(v))
  return sp.toString()
}

function coerce(spec: ControlSpec, raw: string, fallback: ParamValue): ParamValue {
  switch (spec.type) {
    case 'range': {
      const n = Number(raw)
      if (!Number.isFinite(n)) return fallback
      return Math.min(spec.max, Math.max(spec.min, n))
    }
    case 'toggle':
      return raw === 'true' || raw === '1'
    case 'color':
      return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback
    case 'select':
      return spec.options.some((o) => o.value === raw) ? raw : fallback
  }
}

export function decodeParams(search: string, defaults: Params, specs: ControlSpec[]): Params {
  const sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const out: Params = { ...defaults }
  for (const spec of specs) {
    if (!sp.has(spec.key)) continue
    out[spec.key] = coerce(spec, sp.get(spec.key)!, defaults[spec.key])
  }
  return out
}
```

- [ ] **Step 5: Run it (expect PASS)** — `npm test -- url-params` → PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/lab/types.ts lib/lab/url-params.ts lib/lab/url-params.test.ts
git commit -m "feat(lab): control types + url param encode/decode (tested)"
```

---

## Task 2: Protobuf `LabEffect` + codegen

**Files:** Modify `proto/content.proto`; regenerate `lib/gen/content.ts`.

- [ ] **Step 1: Append to `proto/content.proto`** (new message, after the existing ones)

```protobuf
message LabEffect {
  string slug = 1;
  string title = 2;
  string blurb = 3;
  repeated string tags = 4;
  bool home_embed_safe = 5;
}
```

- [ ] **Step 2: Regenerate + typecheck**

Run: `npm run proto:gen && npx tsc --noEmit`
Expected: `lib/gen/content.ts` now exports `LabEffect` (camelCase `homeEmbedSafe`); typecheck clean.

- [ ] **Step 3: Commit**

```bash
git add proto/content.proto lib/gen/content.ts
git commit -m "feat(lab): LabEffect protobuf model"
```

---

## Task 3: Value-noise helper (TDD)

**Files:** Create `lib/lab/noise.ts`, `lib/lab/noise.test.ts`.

- [ ] **Step 1: Write failing test `lib/lab/noise.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { makeNoise2D } from './noise'

describe('makeNoise2D', () => {
  it('is deterministic per seed and in [-1,1]', () => {
    const a = makeNoise2D(42), b = makeNoise2D(42)
    for (let i = 0; i < 50; i++) {
      const x = i * 0.3, y = i * 0.7
      const v = a(x, y)
      expect(v).toBe(b(x, y))
      expect(v).toBeGreaterThanOrEqual(-1)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
  it('varies smoothly (small step → small change)', () => {
    const n = makeNoise2D(1)
    expect(Math.abs(n(0, 0) - n(0.01, 0))).toBeLessThan(0.2)
  })
})
```

- [ ] **Step 2: Run (expect FAIL)** — `npm test -- noise` → FAIL.

- [ ] **Step 3: Implement `lib/lab/noise.ts`** (gradient-free value noise with smoothstep interpolation)

```ts
/** Tiny deterministic 2D value noise in [-1,1]. No deps. */
export function makeNoise2D(seed: number): (x: number, y: number) => number {
  const hash = (x: number, y: number) => {
    let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0
    h = (h ^ (h >>> 13)) * 1274126177
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295 // [0,1)
  }
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  return (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y)
    const fx = smooth(x - x0), fy = smooth(y - y0)
    const v00 = hash(x0, y0), v10 = hash(x0 + 1, y0)
    const v01 = hash(x0, y0 + 1), v11 = hash(x0 + 1, y0 + 1)
    const top = lerp(v00, v10, fx), bot = lerp(v01, v11, fx)
    return lerp(top, bot, fy) * 2 - 1
  }
}
```

- [ ] **Step 4: Run (expect PASS)** — `npm test -- noise` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/lab/noise.ts lib/lab/noise.test.ts
git commit -m "feat(lab): deterministic value noise (tested)"
```

---

## Task 4: `<EffectCanvas>` harness

**Files:** Create `components/lab/effect-canvas.tsx`.

- [ ] **Step 1: Create `components/lab/effect-canvas.tsx`**

```tsx
'use client'
import { useEffect, useRef } from 'react'
import type { EffectModule, Params, Dims } from '@/lib/lab/types'

type Props = {
  effect: EffectModule
  params: Params
  quality?: 'full' | 'mini'
  className?: string
  ariaLabel?: string
}

export function EffectCanvas({ effect, params, quality = 'full', className, ariaLabel }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // live params: step() reads the latest without recreating the renderer
  const paramsRef = useRef(params)
  paramsRef.current = params

  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = quality === 'mini' ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    const minFrameMs = quality === 'mini' ? 1000 / 30 : 0

    let dims: Dims = { w: 0, h: 0, dpr }
    let renderer = effect.createRenderer(ctx, dims)
    let raf = 0
    let last = -Infinity
    let visible = true
    let onscreen = true

    function size() {
      const r = wrap!.getBoundingClientRect()
      const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height))
      if (w === dims.w && h === dims.h) return
      canvas!.width = w * dpr; canvas!.height = h * dpr
      canvas!.style.width = `${w}px`; canvas!.style.height = `${h}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      dims = { w, h, dpr }
      renderer.destroy?.()
      renderer = effect.createRenderer(ctx!, dims)
      if (reduce) renderer.step(0, paramsRef.current) // static frame after resize
    }

    function loop(t: number) {
      raf = requestAnimationFrame(loop)
      if (minFrameMs && t - last < minFrameMs) return
      last = t
      renderer.step(t, paramsRef.current)
    }
    function start() { if (!raf && !reduce && visible && onscreen) raf = requestAnimationFrame(loop) }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0 } }

    const ro = new ResizeObserver(size); ro.observe(wrap)
    size()

    const io = new IntersectionObserver(
      ([e]) => { onscreen = e.isIntersecting; onscreen ? start() : stop() },
      { threshold: 0 },
    )
    io.observe(wrap)
    const onVis = () => { visible = !document.hidden; visible ? start() : stop() }
    document.addEventListener('visibilitychange', onVis)

    if (reduce) renderer.step(0, paramsRef.current)
    else start()

    return () => {
      stop(); ro.disconnect(); io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      renderer.destroy?.()
    }
    // effect identity + quality are the only structural deps; params are live via ref
  }, [effect, quality])

  return (
    <div ref={wrapRef} className={className} role="img" aria-label={ariaLabel}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → clean.

- [ ] **Step 3: Commit**

```bash
git add components/lab/effect-canvas.tsx
git commit -m "feat(lab): EffectCanvas harness (offscreen/hidden/reduced-motion/dpr/fps)"
```

---

## Task 5: Orbits effect (ported into the contract)

**Files:** Create `components/lab/effects/orbits.ts`. (Leave the old `components/lab/orbits.tsx` for now; removed in Task 11.)

- [ ] **Step 1: Create `components/lab/effects/orbits.ts`**

```ts
import type { EffectModule } from '@/lib/lab/types'

export const controls = [
  { key: 'count', label: 'Orbiters', type: 'range', min: 3, max: 24, step: 1 },
  { key: 'speed', label: 'Speed', type: 'range', min: 0.1, max: 3, step: 0.1 },
  { key: 'radius', label: 'Radius', type: 'range', min: 0.2, max: 0.95, step: 0.05 },
  { key: 'trail', label: 'Trail', type: 'range', min: 0.02, max: 0.4, step: 0.01 },
  { key: 'color', label: 'Color', type: 'color' },
] as const

export const defaults = { count: 3, speed: 1, radius: 0.7, trail: 0.12, color: '#7c5cff' }

export const orbits: EffectModule = {
  controls: controls as any,
  defaults,
  createRenderer(ctx, dims) {
    return {
      step(t, p) {
        const { w, h } = dims
        const cx = w / 2, cy = h / 2
        const R = Math.min(w, h) / 2 * (p.radius as number)
        // trail: translucent clear
        ctx.fillStyle = `rgba(10,10,12,${p.trail})`
        ctx.fillRect(0, 0, w, h)
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
        ctx.fillStyle = '#ececf0'; ctx.fill()
      },
    }
  },
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → clean.

- [ ] **Step 3: Commit**

```bash
git add components/lab/effects/orbits.ts
git commit -m "feat(lab): orbits effect in the renderer contract"
```

---

## Task 6: Remaining four effects

**Files:** Create `components/lab/effects/{flow-field,starfield,cyclic-automaton,ripple-grid}.ts`.

- [ ] **Step 1: Create `components/lab/effects/flow-field.ts`**

```ts
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
  createRenderer(ctx, dims) {
    const noise = makeNoise2D(1337)
    let pts: { x: number; y: number }[] = []
    const seed = () => { pts = Array.from({ length: 1200 }, () => ({ x: Math.random() * dims.w, y: Math.random() * dims.h })) }
    seed()
    let prevT = 0
    return {
      step(t, p) {
        const { w, h } = dims
        const dt = Math.min(50, t - prevT) / 16.67 || 1; prevT = t
        ctx.fillStyle = `rgba(10,10,12,${p.trail})`; ctx.fillRect(0, 0, w, h)
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
```

- [ ] **Step 2: Create `components/lab/effects/starfield.ts`**

```ts
import type { EffectModule } from '@/lib/lab/types'

export const starfield: EffectModule = {
  controls: [
    { key: 'count', label: 'Stars', type: 'range', min: 80, max: 800, step: 20 },
    { key: 'speed', label: 'Warp', type: 'range', min: 0.2, max: 4, step: 0.1 },
    { key: 'streak', label: 'Streak', type: 'range', min: 0, max: 1, step: 0.05 },
    { key: 'color', label: 'Color', type: 'color' },
  ],
  defaults: { count: 300, speed: 1, streak: 0.4, color: '#ececf0' },
  createRenderer(ctx, dims) {
    type S = { x: number; y: number; z: number }
    const N = 800
    let stars: S[] = []
    const reset = () => { stars = Array.from({ length: N }, () => ({ x: (Math.random() * 2 - 1) * dims.w, y: (Math.random() * 2 - 1) * dims.h, z: Math.random() * dims.w })) }
    reset()
    return {
      step(t, p) {
        const { w, h } = dims, cx = w / 2, cy = h / 2
        ctx.fillStyle = `rgba(10,10,12,${1 - (p.streak as number) * 0.9})`; ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = p.color as string; ctx.strokeStyle = p.color as string
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
          if (p.streak as number > 0.02) { ctx.lineWidth = r; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke() }
          else { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill() }
        }
      },
    }
  },
}
```

- [ ] **Step 3: Create `components/lab/effects/cyclic-automaton.ts`**

```ts
import type { EffectModule } from '@/lib/lab/types'

export const cyclicAutomaton: EffectModule = {
  controls: [
    { key: 'cell', label: 'Cell size', type: 'range', min: 4, max: 24, step: 1 },
    { key: 'states', label: 'States', type: 'range', min: 3, max: 16, step: 1 },
    { key: 'threshold', label: 'Threshold', type: 'range', min: 1, max: 4, step: 1 },
    { key: 'tickMs', label: 'Tick (ms)', type: 'range', min: 30, max: 300, step: 10 },
    { key: 'color', label: 'Hue base', type: 'color' },
  ],
  defaults: { cell: 10, states: 8, threshold: 2, tickMs: 90, color: '#7c5cff' },
  createRenderer(ctx, dims) {
    let cols = 0, rows = 0, grid: Int8Array, next: Int8Array, cell = 0, states = 0
    let lastTick = 0
    function rebuild(p: { cell: number; states: number }) {
      cell = p.cell; states = p.states
      cols = Math.max(1, Math.ceil(dims.w / cell)); rows = Math.max(1, Math.ceil(dims.h / cell))
      grid = new Int8Array(cols * rows); next = new Int8Array(cols * rows)
      for (let i = 0; i < grid.length; i++) grid[i] = Math.floor(Math.random() * states)
    }
    const baseHue = () => { const c = (cyclicAutomaton.defaults.color as string); return c } // hue derived below
    return {
      step(t, p) {
        if (p.cell !== cell || p.states !== states) rebuild(p as any)
        const th = p.threshold as number, tickMs = p.tickMs as number
        if (t - lastTick >= tickMs) {
          lastTick = t
          for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
            const i = y * cols + x, cur = grid[i], nv = (cur + 1) % states
            let cnt = 0
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]] as const) {
              const nx = (x + dx + cols) % cols, ny = (y + dy + rows) % rows
              if (grid[ny * cols + nx] === nv) cnt++
            }
            next[i] = cnt >= th ? nv : cur
          }
          grid.set(next)
        }
        // draw (hue cycles around the base color's hue)
        const { w, h } = dims
        ctx.clearRect(0, 0, w, h)
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const v = grid[y * cols + x]
          const hue = (v / states) * 360
          ctx.fillStyle = `hsl(${hue} 70% 60%)`
          ctx.fillRect(x * cell, y * cell, cell, cell)
        }
      },
      destroy() {},
    }
  },
}
```

> Note: `cyclic-automaton` uses HSL hue cycling; the `color` knob is retained as a control but the palette derives from state index (document this in the explainer). Keep the control for consistency / future use.

- [ ] **Step 4: Create `components/lab/effects/ripple-grid.ts`**

```ts
import type { EffectModule } from '@/lib/lab/types'

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
  createRenderer(ctx, dims) {
    return {
      step(t, p) {
        const { w, h } = dims
        ctx.clearRect(0, 0, w, h)
        const gap = p.gap as number, amp = p.amp as number, freq = p.freq as number
        const time = (t / 1000) * (p.speed as number), ns = p.sources as number
        const srcs = Array.from({ length: ns }, (_, i) => ({
          x: w * (0.3 + 0.4 * Math.sin(time * 0.4 + i)),
          y: h * (0.3 + 0.4 * Math.cos(time * 0.5 + i * 1.7)),
        }))
        for (let y = gap / 2; y < h; y += gap) for (let x = gap / 2; x < w; x += gap) {
          let v = 0
          for (const s of srcs) { const d = Math.hypot(x - s.x, y - s.y); v += Math.sin(d * freq - time * 2) }
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
```

- [ ] **Step 5: Typecheck** — `npx tsc --noEmit` → clean. Fix any control-literal type widening by annotating arrays `as EffectModule['controls']` if needed.

- [ ] **Step 6: Commit**

```bash
git add components/lab/effects/
git commit -m "feat(lab): flow-field, starfield, cyclic-automaton, ripple-grid effects"
```

---

## Task 7: Registry + integrity tests

**Files:** Create `lib/lab/registry.ts`, `lib/lab/registry.test.ts`.

- [ ] **Step 1: Create `lib/lab/registry.ts`**

```ts
import type { LabEffect } from '@/lib/gen/content'
import type { EffectModule, ControlSpec, Params } from './types'
import { orbits } from '@/components/lab/effects/orbits'
import { flowField } from '@/components/lab/effects/flow-field'
import { starfield } from '@/components/lab/effects/starfield'
import { cyclicAutomaton } from '@/components/lab/effects/cyclic-automaton'
import { rippleGrid } from '@/components/lab/effects/ripple-grid'

export type LabEntry = LabEffect & {
  module: EffectModule
  controls: ControlSpec[]
  defaults: Params
}

function entry(meta: LabEffect, module: EffectModule): LabEntry {
  return { ...meta, module, controls: module.controls, defaults: module.defaults }
}

export const LAB_EFFECTS: LabEntry[] = [
  entry({ slug: 'orbits', title: 'Orbits', blurb: 'Bodies tracing a shared circle, leaving light trails.', tags: ['trails', 'trig'], homeEmbedSafe: true }, orbits),
  entry({ slug: 'flow-field', title: 'Flow Field', blurb: 'Particles advected by a value-noise vector field.', tags: ['noise', 'particles'], homeEmbedSafe: false }, flowField),
  entry({ slug: 'starfield', title: 'Starfield', blurb: 'Parallax warp toward a vanishing point.', tags: ['3d', 'parallax'], homeEmbedSafe: true }, starfield),
  entry({ slug: 'cyclic-automaton', title: 'Cyclic Automaton', blurb: 'Cells advancing in a colour cycle when enough neighbours lead.', tags: ['automata', 'grid'], homeEmbedSafe: false }, cyclicAutomaton),
  entry({ slug: 'ripple-grid', title: 'Ripple Grid', blurb: 'A dot grid pulsing with summed sine-wave interference.', tags: ['waves', 'grid'], homeEmbedSafe: true }, rippleGrid),
]

export function getEffect(slug: string): LabEntry | undefined {
  return LAB_EFFECTS.find((e) => e.slug === slug)
}
export const HOME_EMBED_EFFECTS = LAB_EFFECTS.filter((e) => e.homeEmbedSafe)
```

- [ ] **Step 2: Write `lib/lab/registry.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { LAB_EFFECTS, HOME_EMBED_EFFECTS, getEffect } from './registry'

describe('lab registry', () => {
  it('has unique slugs', () => {
    const s = LAB_EFFECTS.map((e) => e.slug)
    expect(new Set(s).size).toBe(s.length)
  })
  it('every default key has a matching in-range control', () => {
    for (const e of LAB_EFFECTS) {
      const byKey = Object.fromEntries(e.controls.map((c) => [c.key, c]))
      for (const [k, v] of Object.entries(e.defaults)) {
        const spec = byKey[k]
        expect(spec, `${e.slug}.${k} has a control`).toBeTruthy()
        if (spec.type === 'range') { expect(v).toBeGreaterThanOrEqual(spec.min); expect(v).toBeLessThanOrEqual(spec.max) }
        if (spec.type === 'select') expect(spec.options.some((o) => o.value === v)).toBe(true)
      }
    }
  })
  it('home embed subset is non-empty', () => { expect(HOME_EMBED_EFFECTS.length).toBeGreaterThan(0) })
  it('getEffect resolves a known slug and rejects unknown', () => {
    expect(getEffect('orbits')?.title).toBe('Orbits')
    expect(getEffect('nope')).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run (expect PASS after impl)** — `npm test -- registry` → PASS. Fix mismatches the test catches (defaults out of range, missing controls).

- [ ] **Step 4: Commit**

```bash
git add lib/lab/registry.ts lib/lab/registry.test.ts
git commit -m "feat(lab): effect registry + integrity tests"
```

---

## Task 8: Controls panel + URL hook

**Files:** Create `components/lab/controls.tsx`, `components/lab/use-url-params.ts`.

- [ ] **Step 1: Create `components/lab/use-url-params.ts`**

```ts
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ControlSpec, Params, ParamValue } from '@/lib/lab/types'
import { decodeParams, encodeParams } from '@/lib/lab/url-params'

export function useUrlParams(defaults: Params, specs: ControlSpec[]) {
  const [params, setParams] = useState<Params>(defaults)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    setParams(decodeParams(window.location.search, defaults, specs))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sync = useCallback((p: Params) => {
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const qs = encodeParams(p)
      window.history.replaceState(null, '', `${window.location.pathname}?${qs}`)
    }, 150)
  }, [])

  const setParam = useCallback((key: string, value: ParamValue) => {
    setParams((prev) => { const nextP = { ...prev, [key]: value }; sync(nextP); return nextP })
  }, [sync])

  const reset = useCallback(() => { setParams(defaults); window.history.replaceState(null, '', window.location.pathname) }, [defaults])

  const permalink = useCallback(() => `${window.location.origin}${window.location.pathname}?${encodeParams(params)}`, [params])

  return { params, setParam, reset, permalink }
}
```

- [ ] **Step 2: Create `components/lab/controls.tsx`**

```tsx
'use client'
import type { ControlSpec, Params, ParamValue } from '@/lib/lab/types'

type Props = {
  specs: ControlSpec[]
  params: Params
  onChange: (key: string, value: ParamValue) => void
  onReset: () => void
  onCopy: () => void
}

export function Controls({ specs, params, onChange, onReset, onCopy }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 font-mono">
      <div className="mb-4 flex items-center justify-between">
        <span className="type-label text-muted">knobs</span>
        <div className="flex gap-2">
          <button onClick={onCopy} className="rounded-md border border-white/10 px-2 py-1 text-xs text-fg/70 hover:text-fg">⧉ copy</button>
          <button onClick={onReset} className="rounded-md border border-white/10 px-2 py-1 text-xs text-fg/70 hover:text-fg">↺ reset</button>
        </div>
      </div>
      <div className="space-y-3">
        {specs.map((s) => (
          <label key={s.key} className="flex items-center justify-between gap-4 text-xs">
            <span className="text-fg/70">{s.label}</span>
            {s.type === 'range' && (
              <span className="flex items-center gap-2">
                <input type="range" min={s.min} max={s.max} step={s.step} value={Number(params[s.key])}
                  onChange={(e) => onChange(s.key, Number(e.target.value))} className="accent-project" />
                <span className="w-10 text-right tabular-nums text-fg/50">{Number(params[s.key])}</span>
              </span>
            )}
            {s.type === 'toggle' && (
              <input type="checkbox" checked={Boolean(params[s.key])} onChange={(e) => onChange(s.key, e.target.checked)} className="accent-project" />
            )}
            {s.type === 'color' && (
              <input type="color" value={String(params[s.key])} onChange={(e) => onChange(s.key, e.target.value)} className="h-6 w-10 rounded bg-transparent" />
            )}
            {s.type === 'select' && (
              <select value={String(params[s.key])} onChange={(e) => onChange(s.key, e.target.value)} className="rounded bg-white/5 px-2 py-1 text-fg">
                {s.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
          </label>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck** — `npx tsc --noEmit` → clean.

- [ ] **Step 4: Commit**

```bash
git add components/lab/controls.tsx components/lab/use-url-params.ts
git commit -m "feat(lab): controls panel + url-synced params hook"
```

---

## Task 9: Lab pages (index + playground) + explainers

**Files:** Create `components/lab/effect-playground.tsx`, `content/lab/<slug>.mdx` (×5); modify `app/lab/page.tsx`; create `app/lab/[slug]/page.tsx`.

- [ ] **Step 1: Create `components/lab/effect-playground.tsx`**

```tsx
'use client'
import { getEffect } from '@/lib/lab/registry'
import { EffectCanvas } from './effect-canvas'
import { Controls } from './controls'
import { useUrlParams } from './use-url-params'

export function EffectPlayground({ slug }: { slug: string }) {
  const entry = getEffect(slug)!
  const { params, setParam, reset, permalink } = useUrlParams(entry.defaults, entry.controls)
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <EffectCanvas effect={entry.module} params={params} quality="full"
        ariaLabel={`${entry.title} animation`}
        className="aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0c]" />
      <Controls specs={entry.controls} params={params} onChange={setParam} onReset={reset}
        onCopy={() => navigator.clipboard?.writeText(permalink())} />
    </div>
  )
}
```

- [ ] **Step 2: Create `content/lab/orbits.mdx`** (repeat the pattern for each slug; content below is per-effect)

```mdx
## How it works

Each orbiter is placed on a shared circle at angle `time * speed + i/n * 2π`, so they
stay evenly spaced and sweep together. Every frame we paint a translucent
`rgba(10,10,12,trail)` rectangle over the whole canvas instead of clearing it — the
leftover ghost of previous frames becomes the trail. A lower **Trail** value = longer tails.

## Knobs
- **Orbiters** — how many bodies share the circle.
- **Speed** — angular velocity.
- **Radius** — circle size relative to the canvas.
- **Trail** — per-frame fade; lower = longer light trails.
- **Color** — orbiter + glow colour.
```

- [ ] **Step 3: Create the other four explainers** with matching prose:
  - `content/lab/flow-field.mdx` — particles sample a value-noise field for a flow angle each frame; trail fade as above; knobs: Particles, Noise scale (zoom of the field), Speed, Trail, Color.
  - `content/lab/starfield.mdx` — stars fly toward the viewer (`z` decreases); screen position = world × (width / z); streak draws a line from last to current projection; knobs: Stars, Warp, Streak, Color.
  - `content/lab/cyclic-automaton.mdx` — a cell with state `s` flips to `(s+1) % states` once at least **Threshold** of its 4 neighbours already hold the next state; colour = state index around the hue wheel; knobs: Cell size, States, Threshold, Tick.
  - `content/lab/ripple-grid.mdx` — each dot sums `sin(distance·freq − time)` from a few moving sources (wave interference); the sum drives radius + opacity; knobs: Dot spacing, Amplitude, Frequency, Speed, Sources, Color.

  Each file: a `## How it works` section + a `## Knobs` list, mirroring Step 2.

- [ ] **Step 4: Replace `app/lab/page.tsx`** (index grid)

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { LAB_EFFECTS } from '@/lib/lab/registry'
import { LabCard } from '@/components/lab/lab-card'

export const metadata: Metadata = { title: 'Lab' }

export default function LabPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl px-6 py-20 sm:px-8">
        <p className="type-label text-muted">00 · the lab</p>
        <h1 className="mt-3 type-h1">Generative experiments</h1>
        <p className="mt-4 max-w-prose type-body text-fg/70">
          Small canvas animations, each with live knobs and a note on how it works. Tune them, share a link, steal the idea.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {LAB_EFFECTS.map((e) => (
            <Link key={e.slug} href={`/lab/${e.slug}/`} className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/25">
              <LabCard slug={e.slug} />
              <h2 className="mt-4 type-h3">{e.title}</h2>
              <p className="mt-1 type-body text-fg/65">{e.blurb}</p>
              <ul className="mt-3 flex gap-2">{e.tags.map((t) => <li key={t} className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted">{t}</li>)}</ul>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
```

- [ ] **Step 5: Create `components/lab/lab-card.tsx`** (client mini preview used by the index)

```tsx
'use client'
import { getEffect } from '@/lib/lab/registry'
import { EffectCanvas } from './effect-canvas'

export function LabCard({ slug }: { slug: string }) {
  const e = getEffect(slug)!
  return (
    <EffectCanvas effect={e.module} params={e.defaults} quality="mini"
      ariaLabel={`${e.title} preview`}
      className="aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/5 bg-[#0a0a0c]" />
  )
}
```

- [ ] **Step 6: Create `app/lab/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import fs from 'node:fs'
import path from 'node:path'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { LAB_EFFECTS, getEffect } from '@/lib/lab/registry'
import { EffectPlayground } from '@/components/lab/effect-playground'
import { MdxContent } from '@/components/mdx/mdx-content'

export function generateStaticParams() {
  return LAB_EFFECTS.map((e) => ({ slug: e.slug }))
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const e = getEffect(slug)
  return { title: e ? `${e.title} · Lab` : 'Lab', description: e?.blurb }
}

function explainer(slug: string): string {
  const p = path.join(process.cwd(), 'content/lab', `${slug}.mdx`)
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''
}

export default async function LabEffectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const e = getEffect(slug)
  if (!e) notFound()
  const body = explainer(slug)
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8">
        <p className="type-label text-muted">lab · experiment</p>
        <h1 className="mt-3 type-h1">{e.title}</h1>
        <p className="mt-3 max-w-prose type-body text-fg/70">{e.blurb}</p>
        <div className="mt-10"><EffectPlayground slug={slug} /></div>
        {body && <article className="mt-14 max-w-[44rem]"><MdxContent source={body} /></article>}
      </main>
      <SiteFooter />
    </>
  )
}
```

- [ ] **Step 7: Build + verify**

Run: `npm run build`
Expected: green; `out/lab/index.html` + `out/lab/orbits/index.html` (and the other four) produced. Serve `out/`, open `/lab/` and `/lab/flow-field/`, confirm canvases animate and knobs retune + update `?…` in the URL.

- [ ] **Step 8: Commit**

```bash
git add app/lab content/lab components/lab/effect-playground.tsx components/lab/lab-card.tsx
git commit -m "feat(lab): index grid + playground pages + explainers"
```

---

## Task 10: Home-page mini embed

**Files:** Create `components/lab/home-embed.tsx`; modify `components/landing/grid-nav.tsx`.

- [ ] **Step 1: Create `components/lab/home-embed.tsx`**

```tsx
'use client'
import { HOME_EMBED_EFFECTS } from '@/lib/lab/registry'
import { EffectCanvas } from './effect-canvas'

/** Tiny landing embed. `index` is chosen by the caller (client-side) so SSR/CSR match. */
export function HomeEmbed({ index, px }: { index: number; px: number }) {
  const e = HOME_EMBED_EFFECTS[index % HOME_EMBED_EFFECTS.length]
  return (
    <EffectCanvas effect={e.module} params={e.defaults} quality="mini"
      ariaLabel={`${e.title} preview`}
      className="h-full w-full" />
  )
}
export function homeEmbedSlug(index: number): string {
  return HOME_EMBED_EFFECTS[index % HOME_EMBED_EFFECTS.length].slug
}
```

- [ ] **Step 2: Modify `components/landing/grid-nav.tsx`** — render the embed in the lab artifact tile via `foreignObject`.

In the artifact-tile rendering (the `gaps.map` that draws tiles), when `a.id === 'doodle'` (the lab artifact), render a `foreignObject` mini-canvas instead of the static glyph, and point the link at the chosen effect. Add near the top of the component (after the `seed` effect that randomizes, so it's client-only):

```tsx
import { HomeEmbed, homeEmbedSlug } from '@/components/lab/home-embed'
// inside component:
const embedIndex = useMemo(() => Math.floor(mulberry32(seed + 7)() * 1e6), [seed])
```

Then, where the lab/doodle tile's inner content is built, replace its inner with:

```tsx
// s = tile size already computed for ArtifactTile; reuse the same geometry
const labLink = `/lab/${homeEmbedSlug(embedIndex)}/`
// ...for the gap tile whose artifact id is 'doodle':
<Link key={i} href={labLink} aria-label="generative lab" {...active}>
  <g>
    <rect x={cx(c) - s/2} y={cy(r) - s/2} width={s} height={s} rx={s*0.16}
          className="fill-[#0d0d12] stroke-white/10" />
    <foreignObject x={cx(c) - s/2} y={cy(r) - s/2} width={s} height={s}>
      <div style={{ width: '100%', height: '100%', borderRadius: `${s*0.16}px`, overflow: 'hidden' }}>
        <HomeEmbed index={embedIndex} px={s} />
      </div>
    </foreignObject>
  </g>
</Link>
```

> Keep the existing `ArtifactTile` for all OTHER artifacts; only the `doodle` artifact becomes the live embed. Preserve `s` (tile size = `cell * 0.84`) and the hover/focus handlers (`active`). If `foreignObject` causes hydration issues, gate the `<HomeEmbed>` behind a mounted flag and render the prior static glyph until mounted.

- [ ] **Step 3: Build + verify**

Run: `npm run build && npx serve out -l 4321` then load `/` a few times.
Expected: the lab tile shows a tiny live effect (varies across reloads), clicking it lands on `/lab/<slug>/`; reduced-motion shows a static frame; no console errors; no hydration warning.

- [ ] **Step 4: Commit**

```bash
git add components/lab/home-embed.tsx components/landing/grid-nav.tsx
git commit -m "feat(lab): efficient random mini-embed on the landing"
```

---

## Task 11: Remove the legacy orbits component + E2E + final gates

**Files:** Delete `components/lab/orbits.tsx`; create `e2e/lab.spec.ts`.

- [ ] **Step 1: Confirm nothing imports the old component**

Run: `grep -rn "lab/orbits'" app components | grep -v effects` → expect no matches (the page now uses the registry). Then `git rm components/lab/orbits.tsx`.

- [ ] **Step 2: Create `e2e/lab.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test('lab index lists effects and links to a detail page', async ({ page }) => {
  await page.goto('/lab/')
  await expect(page.getByRole('heading', { name: 'Generative experiments' })).toBeVisible()
  await page.getByRole('link', { name: /Orbits preview|Orbits/ }).first().click()
  await expect(page).toHaveURL(/\/lab\/[a-z-]+\/?/)
})

test('a knob updates the URL', async ({ page }) => {
  await page.goto('/lab/orbits/')
  const slider = page.locator('input[type="range"]').first()
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/\?/)
})

test('reduced motion renders without error', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/lab/starfield/')
  await expect(page.getByRole('img', { name: /Starfield animation/ })).toBeVisible()
  expect(errors).toEqual([])
})
```

- [ ] **Step 3: Run gates**

Run: `npx tsc --noEmit && npm test && npm run build && npm run e2e`
Expected: tsc clean; all unit tests (incl. url-params, noise, registry) pass; build green with all `out/lab/*` pages; E2E green.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(lab): remove legacy orbits, add lab e2e"
```

---

## Self-Review Notes
- **Spec coverage:** effect contract + harness (Task 4), 5 effects (5,6), controls+URL+copy+reset (8), registry+`LabEffect` proto (2,7), index+`[slug]`+MDX explainers (9), random low-compute home embed via foreignObject (10), tests unit+E2E (1,3,7,11). Efficiency (offscreen/hidden/reduced-motion/DPR/FPS) centralized in Task 4.
- **Type consistency:** `EffectModule.createRenderer → Renderer.step(timeMs, params)`, `ControlSpec`, `Params`, `LabEntry`, `getEffect`, `HOME_EMBED_EFFECTS`, `homeEmbedSlug` used consistently across tasks.
- **Known follow-ups flagged inline:** control-literal type widening may need `as` annotations (Task 6 Step 5); `foreignObject` hydration fallback (Task 10 Step 2); `cyclic-automaton` color knob is documented as palette-derived.
