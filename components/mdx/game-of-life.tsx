'use client'

/**
 * GameOfLife — Conway's Game of Life for the "Three rules build a computer" post.
 *
 * A toroidal (wrap-around) 50×30 grid running B3/S23: a live cell with 2 or 3
 * live neighbours survives, a dead cell with exactly 3 live neighbours is born,
 * everything else dies. Three local rules, no global plan — and out of them fall
 * gliders, oscillators, and the Gosper gun, enough machinery to be Turing-complete.
 *
 * Click/drag to draw your own cells, stamp named patterns from the library, or
 * randomise and watch. The grid is drawn to a <canvas> (1500 cells, many fps —
 * SVG would choke) with devicePixelRatio handling for crisp cells, and colours
 * read from CSS custom properties so they follow the light/dark theme.
 *
 * The rAF loop is gated on in-view + running + reduced-motion; a time accumulator
 * advances exactly one generation every (1000/speed) ms. Step/clear/random/draw
 * all work manually even under reduced motion.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useInViewport } from './use-in-viewport'

const COLS = 50
const ROWS = 30
const SIZE = COLS * ROWS

type Speed = 4 | 10 | 24
const SPEEDS: { label: string; value: Speed }[] = [
  { label: 'slow', value: 4 },
  { label: 'med', value: 10 },
  { label: 'fast', value: 24 },
]

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

/** Flat index into the COLS×ROWS grid (no wrap — caller wraps). */
const idx = (c: number, r: number) => r * COLS + c

/**
 * One generation of B3/S23 on a toroidal grid. Reads `src`, writes into `dst`,
 * returns the new live population. Double-buffered: caller swaps the arrays.
 */
function stepInto(src: Uint8Array, dst: Uint8Array): number {
  let pop = 0
  for (let r = 0; r < ROWS; r++) {
    const rUp = (r - 1 + ROWS) % ROWS
    const rDn = (r + 1) % ROWS
    for (let c = 0; c < COLS; c++) {
      const cL = (c - 1 + COLS) % COLS
      const cR = (c + 1) % COLS
      const n =
        src[idx(cL, rUp)] +
        src[idx(c, rUp)] +
        src[idx(cR, rUp)] +
        src[idx(cL, r)] +
        src[idx(cR, r)] +
        src[idx(cL, rDn)] +
        src[idx(c, rDn)] +
        src[idx(cR, rDn)]
      const alive = src[idx(c, r)]
      const next = n === 3 || (n === 2 && alive === 1) ? 1 : 0
      dst[idx(c, r)] = next as 0 | 1
      pop += next
    }
  }
  return pop
}

/** Live-cell offsets (column, row) for each named pattern, anchored at top-left. */
const PATTERNS: Record<string, { w: number; h: number; cells: [number, number][] }> = {
  // Classic glider — travels diagonally, period 4, displaces by (1,1) every 4 gens.
  Glider: {
    w: 3,
    h: 3,
    cells: [
      [1, 0],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ],
  },
  // Lightweight spaceship — travels horizontally (left), period 4.
  LWSS: {
    w: 5,
    h: 4,
    cells: [
      [1, 0],
      [4, 0],
      [0, 1],
      [0, 2],
      [4, 2],
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
    ],
  },
  // Pulsar — period-3 oscillator, 13×13 bounding box.
  Pulsar: {
    w: 13,
    h: 13,
    cells: ((): [number, number][] => {
      const base = [2, 3, 4, 8, 9, 10]
      const out: [number, number][] = []
      // horizontal bars at rows 0,5,7,12 over the four column triplets
      for (const r of [0, 5, 7, 12]) for (const c of base) out.push([c, r])
      // vertical bars at cols 0,5,7,12 over the four row triplets
      for (const c of [0, 5, 7, 12]) for (const r of base) out.push([c, r])
      return out
    })(),
  },
  // Gosper glider gun — emits a glider every 30 generations.
  'Gosper Gun': {
    w: 36,
    h: 9,
    cells: [
      // left block
      [0, 4],
      [1, 4],
      [0, 5],
      [1, 5],
      // left ship
      [10, 4],
      [10, 5],
      [10, 6],
      [11, 3],
      [12, 2],
      [13, 2],
      [11, 7],
      [12, 8],
      [13, 8],
      [14, 5],
      [15, 3],
      [16, 4],
      [16, 5],
      [16, 6],
      [17, 5],
      // right ship
      [20, 2],
      [20, 3],
      [20, 4],
      [21, 2],
      [21, 3],
      [21, 4],
      [22, 1],
      [22, 5],
      [24, 0],
      [24, 1],
      [24, 5],
      [24, 6],
      // right block
      [34, 2],
      [34, 3],
      [35, 2],
      [35, 3],
    ],
  },
}

type PatternName = keyof typeof PATTERNS

/** Stamp a pattern onto a cleared grid, centred (gun anchored near top-left). */
function stamp(name: PatternName): Uint8Array {
  const g = new Uint8Array(SIZE)
  const p = PATTERNS[name]
  const offC =
    name === 'Gosper Gun' ? 1 : Math.max(0, Math.floor((COLS - p.w) / 2))
  const offR =
    name === 'Gosper Gun' ? 1 : Math.max(0, Math.floor((ROWS - p.h) / 2))
  for (const [c, r] of p.cells) {
    const cc = offC + c
    const rr = offR + r
    if (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS) g[idx(cc, rr)] = 1
  }
  return g
}

function randomGrid(density = 0.25): Uint8Array {
  const g = new Uint8Array(SIZE)
  let pop = 0
  for (let i = 0; i < SIZE; i++) {
    const on = Math.random() < density ? 1 : 0
    g[i] = on
    pop += on
  }
  // guarantee non-empty
  if (pop === 0) g[idx(COLS >> 1, ROWS >> 1)] = 1
  return g
}

function countPop(g: Uint8Array): number {
  let pop = 0
  for (let i = 0; i < SIZE; i++) pop += g[i]
  return pop
}

interface Palette {
  live: string
  dead: string
  grid: string
}

export function GameOfLife() {
  const [inViewRef, inView] = useInViewport<HTMLElement>('120px')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)

  // Grid + scratch buffer live in refs (mutated every frame; not React state).
  const gridRef = useRef<Uint8Array>(stamp('Gosper Gun'))
  const scratchRef = useRef<Uint8Array>(new Uint8Array(SIZE))
  const paletteRef = useRef<Palette>({
    live: '#00e0b8',
    dead: 'transparent',
    grid: 'rgba(127,127,127,0.18)',
  })

  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState<Speed>(10)
  const [gen, setGen] = useState(0)
  const [pop, setPop] = useState(() => countPop(gridRef.current))

  const rafRef = useRef<number | null>(null)
  const accRef = useRef(0)
  const lastRef = useRef<number | null>(null)
  // pointer-drag state: which value we're painting, and whether the last cell
  // was already that value (so a click toggles but a drag paints uniformly)
  const paintRef = useRef<0 | 1 | null>(null)

  // ── colour palette from the theme ───────────────────────────────────────
  const readPalette = useCallback(() => {
    const el = probeRef.current
    if (!el) return
    const cs = getComputedStyle(el)
    const live = cs.getPropertyValue('--color-blog').trim() || '#00e0b8'
    const grid = cs.getPropertyValue('--color-border').trim() || 'rgba(127,127,127,0.18)'
    paletteRef.current = { live, dead: 'transparent', grid }
  }, [])

  // ── draw the whole grid to the canvas (dpr-aware, crisp cells) ──────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const cssW = wrap.clientWidth
    if (cssW < 10) return
    const cssH = (cssW * ROWS) / COLS
    const dpr = window.devicePixelRatio || 1

    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)
      canvas.style.height = `${cssH}px`
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const cw = cssW / COLS
    const ch = cssH / ROWS
    const pal = paletteRef.current
    const g = gridRef.current

    ctx.clearRect(0, 0, cssW, cssH)

    // grid lines (subtle)
    ctx.strokeStyle = pal.grid
    ctx.globalAlpha = 0.5
    ctx.lineWidth = 0.5
    ctx.beginPath()
    for (let c = 0; c <= COLS; c++) {
      const x = Math.round(c * cw) + 0.25
      ctx.moveTo(x, 0)
      ctx.lineTo(x, cssH)
    }
    for (let r = 0; r <= ROWS; r++) {
      const y = Math.round(r * ch) + 0.25
      ctx.moveTo(0, y)
      ctx.lineTo(cssW, y)
    }
    ctx.stroke()
    ctx.globalAlpha = 1

    // live cells (small inset so they read as discrete blocks)
    ctx.fillStyle = pal.live
    const inset = cw > 7 ? 1 : 0.5
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (g[idx(c, r)]) {
          ctx.fillRect(c * cw + inset, r * ch + inset, cw - inset * 2, ch - inset * 2)
        }
      }
    }
  }, [])

  // advance one generation (shared by rAF + manual step)
  const advance = useCallback(() => {
    const next = scratchRef.current
    const p = stepInto(gridRef.current, next)
    scratchRef.current = gridRef.current
    gridRef.current = next
    setPop(p)
    setGen((x) => x + 1)
    draw()
  }, [draw])

  // ── mount: read palette, draw initial frame, redraw on resize ───────────
  useEffect(() => {
    readPalette()
    draw()
    const onResize = () => {
      readPalette()
      draw()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [readPalette, draw])

  // ── rAF loop: gated on in-view + running + reduced-motion ───────────────
  useEffect(() => {
    if (!running || !inView || reducedMotion()) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastRef.current = null
      return
    }
    const interval = 1000 / speed
    const tick = (now: number) => {
      if (lastRef.current == null) lastRef.current = now
      accRef.current += now - lastRef.current
      lastRef.current = now
      // cap catch-up so a backgrounded tab doesn't fast-forward thousands of gens
      let steps = 0
      while (accRef.current >= interval && steps < 8) {
        const next = scratchRef.current
        stepInto(gridRef.current, next)
        scratchRef.current = gridRef.current
        gridRef.current = next
        accRef.current -= interval
        steps++
      }
      if (steps > 0) {
        setGen((x) => x + steps)
        setPop(countPop(gridRef.current))
        draw()
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastRef.current = null
    }
  }, [running, inView, speed, draw])

  // ── controls ────────────────────────────────────────────────────────────
  const toggleRun = useCallback(() => {
    if (reducedMotion()) {
      // no auto-run under reduced motion — a press just advances one gen
      advance()
      return
    }
    accRef.current = 0
    lastRef.current = null
    setRunning((r) => !r)
  }, [advance])

  const clear = useCallback(() => {
    setRunning(false)
    gridRef.current = new Uint8Array(SIZE)
    scratchRef.current = new Uint8Array(SIZE)
    setGen(0)
    setPop(0)
    draw()
  }, [draw])

  const randomise = useCallback(() => {
    setRunning(false)
    gridRef.current = randomGrid(0.25)
    scratchRef.current = new Uint8Array(SIZE)
    setGen(0)
    setPop(countPop(gridRef.current))
    draw()
  }, [draw])

  const loadPattern = useCallback(
    (name: PatternName) => {
      setRunning(false)
      gridRef.current = stamp(name)
      scratchRef.current = new Uint8Array(SIZE)
      setGen(0)
      setPop(countPop(gridRef.current))
      draw()
    },
    [draw],
  )

  // ── pointer → cell mapping (account for canvas scaling) ─────────────────
  const cellFromEvent = useCallback((e: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return null
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * COLS)
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * ROWS)
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null
    return { c, r }
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const cell = cellFromEvent(e)
      if (!cell) return
      e.currentTarget.setPointerCapture(e.pointerId)
      const i = idx(cell.c, cell.r)
      const next = gridRef.current[i] ? 0 : 1
      paintRef.current = next as 0 | 1
      gridRef.current[i] = next
      setPop(countPop(gridRef.current))
      draw()
    },
    [cellFromEvent, draw],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (paintRef.current == null) return
      const cell = cellFromEvent(e)
      if (!cell) return
      const i = idx(cell.c, cell.r)
      if (gridRef.current[i] === paintRef.current) return
      gridRef.current[i] = paintRef.current
      setPop(countPop(gridRef.current))
      draw()
    },
    [cellFromEvent, draw],
  )

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    paintRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }, [])

  const ctrlBtn =
    'rounded-md border border-[var(--color-border)] bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider text-fg transition-colors hover:border-[var(--color-muted)]'

  const patternNames = useMemo(() => Object.keys(PATTERNS) as PatternName[], [])

  return (
    <figure
      ref={inViewRef}
      className="not-prose my-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-surface"
    >
      {/* hidden probe element to read theme custom properties from */}
      <span ref={probeRef} aria-hidden className="hidden text-blog" />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          conway&rsquo;s game of life
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={toggleRun} className={ctrlBtn}>
            {running ? 'pause ❚❚' : 'play ▶'}
          </button>
          <button type="button" onClick={advance} className={ctrlBtn}>
            step
          </button>
          <button type="button" onClick={clear} className={ctrlBtn}>
            clear
          </button>
          <button type="button" onClick={randomise} className={ctrlBtn}>
            random
          </button>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-surface p-0.5">
            {SPEEDS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSpeed(s.value)}
                aria-pressed={speed === s.value}
                className={`rounded-md px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-wider transition-colors ${
                  speed === s.value
                    ? 'bg-blog/15 text-blog ring-1 ring-blog/40'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        <div
          ref={wrapRef}
          className="mx-auto overflow-hidden rounded-lg border border-[var(--color-border)] bg-bg"
          style={{ maxWidth: 720 }}
        >
          <canvas
            ref={canvasRef}
            className="block w-full cursor-crosshair touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            role="img"
            aria-label="Conway's Game of Life grid. Click or drag to toggle cells."
          />
        </div>
        <div className="mx-auto mt-2 flex max-w-[720px] items-center justify-between font-mono text-[0.72rem] tabular-nums text-muted">
          <span>
            gen <span className="text-fg">{gen}</span>
          </span>
          <span>
            live <span className="text-fg">{pop}</span> / {SIZE}
          </span>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] bg-surface-2/40 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[0.66rem] uppercase tracking-wider text-muted">
            stamp
          </span>
          {patternNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => loadPattern(name)}
              className={ctrlBtn}
            >
              {name}
            </button>
          ))}
        </div>
        <p className="mt-2 font-mono text-[0.66rem] leading-snug text-muted">
          Three local rules (B3/S23): a live cell with 2 or 3 neighbours survives, a dead
          cell with exactly 3 is born, all else dies. Edges wrap (a torus). From those rules
          alone come gliders, oscillators, and the Gosper gun — and gliders plus guns are
          enough to build logic gates, which is why Life is Turing-complete.
        </p>
      </div>
    </figure>
  )
}
