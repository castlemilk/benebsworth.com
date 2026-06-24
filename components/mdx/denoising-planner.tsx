'use client'

/**
 * DenoisingPlanner — the headline interactive for "Robots that act by denoising"
 * (diffusion policy). It visualises why a policy that *denoises* a whole
 * trajectory beats a policy that *regresses* a single action, when the demos
 * are MULTIMODAL.
 *
 * The scene is a 2D top-down field (the conditioning observation o_t): a teal
 * start dot bottom-left, an orange goal dot top-right, and one purple circular
 * obstacle in the middle. There are TWO equally-good expert trajectories — one
 * routing ABOVE the obstacle, one BELOW — each a clean polyline of H = 24
 * waypoints. Both are asserted in-module to keep clearance > the obstacle radius
 * at every waypoint and to terminate within ε of the goal.
 *
 * The "denoising" here is a SCRIPTED reverse process (honest: it's a replay, not
 * a learned network). Each of N sample trajectories carries a FIXED stored noise
 * field ε (seeded mulberry32, sampled once in useMemo — never Math.random at
 * render). At diffusion step k we render, per waypoint:
 *
 *   x_k = sqrt(ᾱ_k)·x_clean + sqrt(1−ᾱ_k)·ε            (DDPM eqn 2, run backward)
 *
 * over a fixed cosine-ish ᾱ schedule. At k = K the trajectories are a Gaussian
 * tangle; at k = 0 they snap onto the two clean expert paths. With multimodal on,
 * half the samples denoise to the upper route and half to the lower — two clean
 * modes visibly separate.
 *
 * The regression baseline overlays the POINTWISE MEAN of the two experts. The
 * average of an above-route and a below-route is a path straight through the
 * middle — it drives through the obstacle. We paint it red where it intersects
 * the disc and show a COLLISION chip. That's mode-averaging: the thing a
 * single-action regressor does when the demos disagree.
 *
 * A step slider scrubs k from K→0; Play rAF-animates k downward. The rAF loop is
 * gated on in-view + running + reduced-motion and cancelled on cleanup; we pause
 * during slider drag. Under reduced motion we jump straight to the clean k = 0
 * frame instead of animating. Computed metrics (currentK, minClearance,
 * goalReachFraction) are mirrored to data-* attributes for DOM tests.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInViewport } from './use-in-viewport'

// ── scene constants (world units; the canvas maps these to pixels) ──────────
const WORLD = 100 // square world, 0..100 in both axes (y up)
const START = { x: 12, y: 14 } // teal start, bottom-left
const GOAL = { x: 88, y: 86 } // orange goal, top-right
const OBSTACLE = { x: 50, y: 50, r: 16 } // purple disc in the middle
const CLEARANCE_MARGIN = 4 // experts must clear the disc by at least this much
const GOAL_EPS = 4 // expert / sample endpoints must land within this of goal

const H = 24 // waypoints per trajectory
const N = 40 // diffusion sample trajectories
const K = 32 // number of reverse diffusion steps (slider runs K → 0)

// ── colour encodings (accent is always the post desk colour via --color-blog)
const ACCENT = 'var(--color-blog)' // green desk accent (clean modes / samples)
const COL_START = '#2dd4bf' // teal start dot
const COL_GOAL = '#f59e0b' // orange goal dot
const COL_OBSTACLE = '#a855f7' // purple obstacle
const COL_UPPER = '#34d399' // upper mode tint (green)
const COL_LOWER = '#22d3ee' // lower mode tint (cyan) — distinct from upper
const COL_NOISE = '#8b7bd8' // purple-ish tint for noisy (high-k) samples
const COL_REG_OK = '#f59e0b' // regression path clear → orange
const COL_REG_HIT = '#ef4444' // regression path through obstacle → red

type Pt = { x: number; y: number }

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
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
function makeStandardNormal(rand: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = rand()
  while (v === 0) v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// ── diffusion schedule: ᾱ_k for k = 0..K (ᾱ_0 = 1 clean, ᾱ_K ≈ 0 pure noise) ─
// A cosine schedule (Nichol & Dhariwal): ᾱ_k = cos²((k/K + s)/(1+s) · π/2),
// normalised so ᾱ_0 = 1. Smooth, the standard choice for low step counts.
function alphaBars(): number[] {
  const s = 0.008
  const f = (k: number) => Math.cos(((k / K + s) / (1 + s)) * (Math.PI / 2)) ** 2
  const f0 = f(0)
  const out: number[] = []
  for (let k = 0; k <= K; k++) out.push(f(k) / f0)
  return out
}

// ── ground-truth experts: two clean trajectories that avoid the obstacle ────
// Both are smooth arcs from START to GOAL. The upper one bows above the disc,
// the lower one below. Each is H waypoints; index 0 = start, H-1 = goal.
function buildExpert(side: 1 | -1): Pt[] {
  const pts: Pt[] = []
  // perpendicular to the straight start→goal line, used to push the arc out
  const dx = GOAL.x - START.x
  const dy = GOAL.y - START.y
  const len = Math.hypot(dx, dy)
  const nx = -dy / len // unit normal
  const ny = dx / len
  const BOW = 30 // how far the arc bows off the straight line, in world units
  for (let i = 0; i < H; i++) {
    const u = i / (H - 1) // 0..1 along the path
    // straight-line interpolation
    const lx = START.x + dx * u
    const ly = START.y + dy * u
    // bow: a half-sine bump, zero at the ends, max in the middle
    const bow = BOW * Math.sin(Math.PI * u)
    pts.push({ x: lx + side * nx * bow, y: ly + side * ny * bow })
  }
  return pts
}

// distance from a point to the obstacle CENTRE minus its radius = signed
// clearance (negative ⇒ inside the disc).
function clearanceAt(p: Pt): number {
  return Math.hypot(p.x - OBSTACLE.x, p.y - OBSTACLE.y) - OBSTACLE.r
}

function minClearanceOf(path: Pt[]): number {
  let m = Infinity
  for (const p of path) m = Math.min(m, clearanceAt(p))
  return m
}

// pointwise mean of the two experts — the path a single-action regressor would
// learn when it tries to average two valid-but-opposite demonstrations.
function pointwiseMean(a: Pt[], b: Pt[]): Pt[] {
  return a.map((p, i) => ({ x: (p.x + b[i].x) / 2, y: (p.y + b[i].y) / 2 }))
}

// ── in-module assertions (dev only): the experts must be valid ──────────────
// Throwing here surfaces a broken scene immediately rather than rendering a
// silently-wrong visual. Stripped from production by the bundler's NODE_ENV
// dead-code elimination.
const EXPERT_UPPER = buildExpert(1)
const EXPERT_LOWER = buildExpert(-1)
if (process.env.NODE_ENV !== 'production') {
  for (const [name, path] of [
    ['upper', EXPERT_UPPER],
    ['lower', EXPERT_LOWER],
  ] as const) {
    // clearance is measured from the disc EDGE, so a valid expert needs it to
    // stay ≥ the safety margin (i.e. its true clearance from the disc edge is
    // already > obstacle radius worth of separation when margin is added).
    const mc = minClearanceOf(path)
    if (mc < CLEARANCE_MARGIN) {
      throw new Error(
        `DenoisingPlanner: ${name} expert min-clearance ${mc.toFixed(
          2,
        )} < required margin ${CLEARANCE_MARGIN}`,
      )
    }
    const end = path[path.length - 1]
    const goalErr = Math.hypot(end.x - GOAL.x, end.y - GOAL.y)
    if (goalErr > GOAL_EPS) {
      throw new Error(
        `DenoisingPlanner: ${name} expert ends ${goalErr.toFixed(
          2,
        )} from goal (> ε=${GOAL_EPS})`,
      )
    }
  }
}

// ── one diffusion sample: a target expert + its fixed per-waypoint noise ────
type Sample = {
  side: 1 | -1 // which mode this sample denoises onto
  target: Pt[] // the clean expert it lands on
  noise: Pt[] // stored ε per waypoint (standard normal, world-scaled)
}

// Build the N samples with a fixed seed so server and client render identically.
function buildSamples(seed: number, multimodal: boolean): Sample[] {
  const rand = mulberry32(seed)
  const NOISE_SCALE = 26 // world-unit std of the ε field at k = K
  const out: Sample[] = []
  for (let i = 0; i < N; i++) {
    // half to the upper mode, half to the lower; if not multimodal, all upper.
    const side: 1 | -1 = !multimodal ? 1 : i % 2 === 0 ? 1 : -1
    const target = side === 1 ? EXPERT_UPPER : EXPERT_LOWER
    const noise: Pt[] = []
    for (let j = 0; j < H; j++) {
      // endpoints get LESS noise so samples still cluster near start/goal — a
      // boundary-conditioned trajectory, the realistic case for a policy whose
      // first action is fixed by the current state and last by the goal.
      const u = j / (H - 1)
      const taper = 0.25 + 0.75 * Math.sin(Math.PI * u) // small at ends
      noise.push({
        x: makeStandardNormal(rand) * NOISE_SCALE * taper,
        y: makeStandardNormal(rand) * NOISE_SCALE * taper,
      })
    }
    out.push({ side, target, noise })
  }
  return out
}

// position of a sample's waypoint j at diffusion step k:
//   x_k = √ᾱ_k · x_clean + √(1−ᾱ_k) · ε
function sampleWaypoint(s: Sample, j: number, sqrtA: number, sqrtOneMinusA: number): Pt {
  return {
    x: sqrtA * s.target[j].x + sqrtOneMinusA * s.noise[j].x,
    y: sqrtA * s.target[j].y + sqrtOneMinusA * s.noise[j].y,
  }
}

export function DenoisingPlanner({
  multimodal: multimodalProp = true,
  mode: modeProp = 'diffusion',
}: {
  multimodal?: boolean
  mode?: 'diffusion' | 'regression'
}) {
  const [inViewRef, inView] = useInViewport<HTMLDivElement>('120px')
  const [k, setK] = useState(K) // start fully noisy
  const [running, setRunning] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [multimodal, setMultimodal] = useState(multimodalProp)
  const [showRegression, setShowRegression] = useState(modeProp === 'regression')

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const kRef = useRef(K) // float step for smooth animation

  const abar = useMemo(() => alphaBars(), [])
  const samples = useMemo(
    () => buildSamples(0x5eed1234, multimodal),
    [multimodal],
  )
  const meanPath = useMemo(() => pointwiseMean(EXPERT_UPPER, EXPERT_LOWER), [])
  const meanMinClearance = useMemo(() => minClearanceOf(meanPath), [meanPath])

  // ᾱ at a (possibly fractional) step, interpolated for smooth animation
  const alphaBarAt = (kk: number) => {
    const lo = Math.floor(kk)
    const hi = Math.min(K, lo + 1)
    const f = kk - lo
    return abar[lo] * (1 - f) + abar[hi] * f
  }

  // ── world→pixel mapping (y is up in world, down in canvas) ────────────────
  const drawScene = (kk: number, w: number, h: number, ctx: CanvasRenderingContext2D) => {
    const pad = 10
    const sx = (x: number) => pad + (x / WORLD) * (w - 2 * pad)
    const sy = (y: number) => h - pad - (y / WORLD) * (h - 2 * pad)
    const sr = (r: number) => (r / WORLD) * Math.min(w - 2 * pad, h - 2 * pad)

    // near-black field
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, w, h)

    // faint grid
    ctx.strokeStyle = 'rgba(255,255,255,0.045)'
    ctx.lineWidth = 1
    for (let g = 0; g <= WORLD; g += 10) {
      ctx.beginPath()
      ctx.moveTo(sx(g), sy(0))
      ctx.lineTo(sx(g), sy(WORLD))
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(sx(0), sy(g))
      ctx.lineTo(sx(WORLD), sy(g))
      ctx.stroke()
    }

    const ab = alphaBarAt(kk)
    const sqrtA = Math.sqrt(Math.max(0, ab))
    const sqrtOneMinusA = Math.sqrt(Math.max(0, 1 - ab))
    const noisiness = sqrtOneMinusA // 1 at k=K, 0 at k=0

    // ── diffusion samples (skip when the regression baseline is the focus) ──
    if (!showRegression) {
      for (const s of samples) {
        ctx.beginPath()
        for (let j = 0; j < H; j++) {
          const p = sampleWaypoint(s, j, sqrtA, sqrtOneMinusA)
          const px = sx(p.x)
          const py = sy(p.y)
          if (j === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        // colour: noisy → purple, clean → mode tint (green upper / cyan lower)
        const clean = s.side === 1 ? COL_UPPER : COL_LOWER
        ctx.strokeStyle = lerpColor(clean, COL_NOISE, noisiness)
        ctx.globalAlpha = 0.16 + 0.16 * (1 - noisiness) // crisper as it cleans up
        ctx.lineWidth = 1.4
        ctx.lineJoin = 'round'
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    // ── regression baseline: the pointwise mean, red where it hits the disc ─
    if (showRegression) {
      ctx.lineWidth = 3.4
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      for (let j = 0; j < H - 1; j++) {
        const a = meanPath[j]
        const b = meanPath[j + 1]
        const hit = clearanceAt(a) < 0 || clearanceAt(b) < 0
        ctx.beginPath()
        ctx.moveTo(sx(a.x), sy(a.y))
        ctx.lineTo(sx(b.x), sy(b.y))
        ctx.strokeStyle = hit ? COL_REG_HIT : COL_REG_OK
        ctx.stroke()
      }
    }

    // ── obstacle disc (purple) ──────────────────────────────────────────────
    ctx.beginPath()
    ctx.arc(sx(OBSTACLE.x), sy(OBSTACLE.y), sr(OBSTACLE.r), 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(168,85,247,0.18)'
    ctx.fill()
    ctx.strokeStyle = COL_OBSTACLE
    ctx.lineWidth = 1.6
    ctx.stroke()

    // ── start (teal) and goal (orange) dots ────────────────────────────────
    const dot = (p: Pt, color: string, label: string) => {
      ctx.beginPath()
      ctx.arc(sx(p.x), sy(p.y), 6, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = '#0a0a0f'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '600 10px ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.fillText(label, sx(p.x), sy(p.y) - 11)
    }
    dot(START, COL_START, 'start')
    dot(GOAL, COL_GOAL, 'goal')
  }

  // draw at the current canvas size
  const render = (kk: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const cssW = canvas.clientWidth || 320
    const cssH = canvas.clientHeight || 320
    const pxW = Math.round(cssW * dpr)
    const pxH = Math.round(cssH * dpr)
    if (canvas.width !== pxW || canvas.height !== pxH) {
      canvas.width = pxW
      canvas.height = pxH
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawScene(kk, cssW, cssH, ctx)
  }

  // redraw whenever committed k / toggles change
  useEffect(() => {
    kRef.current = k
    render(k)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, multimodal, showRegression])

  // redraw on resize
  useEffect(() => {
    const onResize = () => render(kRef.current)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── rAF clock: march k downward (K → 0), the reverse denoising process ────
  useEffect(() => {
    if (!running || !inView || dragging || reducedMotion()) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastRef.current = null
      return
    }
    const STEPS_PER_SEC = 11
    const tick = (now: number) => {
      if (lastRef.current == null) lastRef.current = now
      const dt = (now - lastRef.current) / 1000
      lastRef.current = now
      let next = kRef.current - STEPS_PER_SEC * dt
      let stop = false
      if (next <= 0) {
        next = 0
        stop = true
      }
      kRef.current = next
      render(next)
      setK(next)
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
  }, [running, inView, dragging])

  const onPlay = () => {
    if (running) {
      setRunning(false)
      return
    }
    // if already denoised, restart from full noise
    const restart = kRef.current <= 0.5
    if (reducedMotion()) {
      // no animation under reduced motion — jump straight to the clean frame
      kRef.current = 0
      setK(0)
      return
    }
    if (restart) {
      kRef.current = K
      setK(K)
    }
    lastRef.current = null
    setRunning(true)
  }

  // ── live metrics ──────────────────────────────────────────────────────────
  const kInt = Math.round(k)
  // fraction of diffusion samples whose endpoint lands within ε of the goal at
  // the CURRENT step — 0 when fully noisy, → 1 as it cleans up.
  const goalReachFraction = useMemo(() => {
    const ab = alphaBarAt(k)
    const sqrtA = Math.sqrt(Math.max(0, ab))
    const sqrtOneMinusA = Math.sqrt(Math.max(0, 1 - ab))
    let reached = 0
    for (const s of samples) {
      const end = sampleWaypoint(s, H - 1, sqrtA, sqrtOneMinusA)
      if (Math.hypot(end.x - GOAL.x, end.y - GOAL.y) <= GOAL_EPS) reached += 1
    }
    return reached / samples.length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, samples])

  // endpoints split into two route bands (upper/lower) at k = 0 — multimodal proof
  const endpointBands = useMemo(() => {
    if (!multimodal) return { upper: 0, lower: 0 }
    let upper = 0
    let lower = 0
    for (const s of samples) (s.side === 1 ? (upper += 1) : (lower += 1))
    return { upper, lower }
  }, [multimodal, samples])

  // the readout's min-clearance: the regression mean when the baseline is shown,
  // otherwise the cleaner of the diffusion modes (always positive — they avoid it)
  const readoutClearance = showRegression
    ? meanMinClearance
    : Math.min(minClearanceOf(EXPERT_UPPER), minClearanceOf(EXPERT_LOWER))
  const collision = showRegression && meanMinClearance < 0

  return (
    <figure
      ref={inViewRef}
      className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
      data-current-k={kInt}
      data-min-clearance={readoutClearance.toFixed(2)}
      data-goal-reach-fraction={goalReachFraction.toFixed(3)}
      data-mode={showRegression ? 'regression' : 'diffusion'}
      data-multimodal={multimodal ? 'true' : 'false'}
      data-endpoint-upper={endpointBands.upper}
      data-endpoint-lower={endpointBands.lower}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          diffusion policy · denoise a trajectory
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowRegression((v) => !v)
              setRunning(false)
            }}
            aria-pressed={showRegression}
            className={`rounded-md px-3 py-1 font-mono text-[0.68rem] uppercase tracking-wider transition-colors ${
              showRegression
                ? 'border border-[#ef4444] text-[#ef4444]'
                : 'border border-[var(--color-border)] text-muted hover:text-fg'
            }`}
          >
            regression baseline
          </button>
          <button
            type="button"
            onClick={onPlay}
            disabled={showRegression}
            className="rounded-md border border-[var(--color-border)] bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider text-fg transition-colors hover:border-[var(--color-muted)] disabled:opacity-40"
          >
            {running ? 'pause' : kInt <= 0 ? 'replay ◀' : 'denoise ◀'}
          </button>
        </div>
      </div>

      <div className="px-2 py-5 sm:px-4">
        <div className="mx-auto flex max-w-[460px] flex-col gap-3">
          <div
            ref={wrapRef}
            className="w-full overflow-hidden rounded-xl border border-[var(--color-border)]"
            style={{ background: '#0a0a0f' }}
          >
            <canvas
              ref={canvasRef}
              className="block h-auto w-full"
              style={{ aspectRatio: '1 / 1' }}
              role="img"
              aria-label={
                showRegression
                  ? 'A 2D top-down scene with a teal start, an orange goal, and a purple obstacle in the middle. A single bold regression path — the average of two valid routes — drives straight through the obstacle and is painted red, marked as a collision.'
                  : `A 2D top-down scene with a teal start, an orange goal, and a purple obstacle in the middle. ${N} sample trajectories denoise from a Gaussian tangle at high diffusion step toward ${
                      multimodal ? 'two clean routes — one above and one below' : 'one clean route'
                    } the obstacle. Currently at diffusion step ${kInt} of ${K}.`
              }
            />
          </div>

          {/* live readout */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[0.7rem] text-muted">
            <span>
              k = <span className="tabular-nums text-fg">{kInt}</span> / {K}
            </span>
            <span>
              min-clearance:{' '}
              <span
                className="tabular-nums"
                style={{ color: readoutClearance < 0 ? COL_REG_HIT : 'var(--color-fg)' }}
              >
                {readoutClearance.toFixed(1)}
              </span>
            </span>
            {!showRegression && (
              <span>
                reach goal:{' '}
                <span className="tabular-nums text-blog">
                  {Math.round(goalReachFraction * 100)}%
                </span>
              </span>
            )}
            {collision && (
              <span className="rounded-sm bg-[#ef4444]/15 px-1.5 py-0.5 font-semibold uppercase tracking-wider text-[#ef4444]">
                collision
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-1 items-center gap-4">
            <label
              htmlFor="dp-k"
              className="whitespace-nowrap font-mono text-[0.7rem] uppercase tracking-wider text-muted"
            >
              step k
            </label>
            <input
              id="dp-k"
              type="range"
              min={0}
              max={K}
              step={1}
              value={kInt}
              disabled={showRegression}
              onPointerDown={() => {
                setDragging(true)
                setRunning(false)
              }}
              onPointerUp={() => setDragging(false)}
              onChange={(e) => {
                const v = Number(e.target.value)
                kRef.current = v
                setK(v)
              }}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-blog)] disabled:opacity-40"
            />
            <span className="w-14 text-right font-mono text-[0.78rem] tabular-nums text-fg">
              {kInt} / {K}
            </span>
          </div>
          <label className="flex cursor-pointer items-center gap-2 font-mono text-[0.68rem] uppercase tracking-wider text-muted">
            <input
              type="checkbox"
              checked={multimodal}
              disabled={showRegression}
              onChange={(e) => {
                setMultimodal(e.target.checked)
                setRunning(false)
              }}
              className="h-3.5 w-3.5 accent-[var(--color-blog)] disabled:opacity-40"
            />
            multimodal
          </label>
        </div>
        <p className="mt-2.5 font-mono text-[0.66rem] leading-snug text-muted">
          Each sample trajectory is{' '}
          <span className="text-blog">√ᾱ</span>
          <sub>k</sub>·x<sub>clean</sub> +{' '}
          <span style={{ color: COL_NOISE }}>√(1−ᾱ</span>
          <sub>k</sub>
          <span style={{ color: COL_NOISE }}>)</span>·ε — a Gaussian tangle at
          high k that <em>denoises</em> onto the expert paths at k = 0. With{' '}
          <span style={{ color: COL_UPPER }}>two valid routes</span>{' '}
          (above/below), diffusion keeps both modes. A single-action{' '}
          <span style={{ color: COL_REG_OK }}>regression</span> can only learn
          their <em>average</em> — a path straight{' '}
          <span style={{ color: COL_REG_HIT }}>through the obstacle</span>. That
          mode-averaging is the failure diffusion policies were built to avoid.
        </p>
      </div>
    </figure>
  )
}

// ── tiny hex colour lerp (for noisy → clean sample tint) ────────────────────
function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  const r = Math.round(ca.r + (cb.r - ca.r) * t)
  const g = Math.round(ca.g + (cb.g - ca.g) * t)
  const bl = Math.round(ca.b + (cb.b - ca.b) * t)
  return `rgb(${r}, ${g}, ${bl})`
}
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}
