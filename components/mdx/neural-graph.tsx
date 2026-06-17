'use client'

/**
 * NeuralGraph — parametric, animated SVG graph for the "Neural Network Zoo"
 * blog post. Renders the architecture as nodes laid out in named layers, runs
 * a small forward pass in JS each frame, and animates "data" particles along
 * the edges weighted by the activation magnitude.
 *
 * Architecture is selected via the `arch` prop. Each architecture has its own
 * layout, dynamics, readouts, and weight initialisation — see `ARCHS` below.
 * Per-architecture wrappers (FfnnFlow, RnnFlow, …) live in `neural-graphs.tsx`
 * and are the ones registered in `mdx-components.tsx`. This file is the
 * primitive; the wrappers are thin.
 *
 * Design goals:
 *   - Pure SVG, no external libs, deterministic-ish (Math.sin seeded PRNG).
 *   - Self-contained, SSR-safe (no top-level window access; rAF guarded).
 *   - Renders a meaningful "now" state even on the very first frame (the
 *     input is forwarded once before the loop starts) so static screenshots
 *     look right.
 *   - Honours prefers-reduced-motion (auto-pause; particles still drawn).
 *   - Weights are exposed as mutable state so the reader can re-roll or
 *     scale them and see the effect on activations.
 */

import { useEffect, useId, useMemo, useRef, useState, type ReactElement } from 'react'
import { ARCHS } from '@/lib/neural-graph/archs'
import type { NeuralGraphArch, Node, NodeRole, SimState, Weights } from '@/lib/neural-graph/types'
import { colourFor, fillFor, nodeStyleFor, nodeTooltipFor } from '@/lib/neural-graph/visuals'
import { useInViewport } from './use-in-viewport'
import { useScrollActivity } from './use-scroll-activity'
import { FigureLegend, NodeTooltip } from './neural-graph-legend'

/* ------------------------------------------------------------------ *
 * Public types
 * ------------------------------------------------------------------ */

export type { NeuralGraphArch }
export { NODE_COLOURS, type NodeStyle } from '@/lib/neural-graph/visuals'

export type NeuralGraphProps = {
  /** Which architecture to render. */
  arch: NeuralGraphArch
  /** Optional title shown above the graph. Defaults to a per-arch caption. */
  label?: string
  /** Initial input vector. Length and meaning is per-arch. */
  input?: number[]
  /** Optional PRNG seed for weight initialisation. */
  seed?: number
  /** Pause the simulation on mount. Defaults to false. */
  paused?: boolean
  /** Initial speed multiplier. Defaults to 0.5 (one step per 2 frames). */
  initialSpeed?: number
  /** Initial weight scale (multiplies all weights). Defaults to 1. */
  initialWeightScale?: number
  /**
   * DOM id for the figure element. Use this so the figure can be the target
   * of in-page navigation (e.g. a clickable mini-map at the top of the
   * post). If omitted, no id is rendered.
   */
  id?: string
}

const W = 760 // SVG viewBox width
const H = 360 // SVG viewBox height
const NODE_R = 9
const EDGE_OPACITY = 0.18

/* ------------------------------------------------------------------ *
 * The component
 * ------------------------------------------------------------------ */

const SPEED_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0.25, label: '0.25×' },
  { value: 0.5, label: '0.5×' },
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
]

export function NeuralGraph({
  arch,
  label,
  input,
  // Different per-arch starting seed so the first frame of each
  // diagram has its own character (different initial weights mean
  // different edge thicknesses and different activation patterns).
  // The Reroll button re-seeds with a new random value anyway, so
  // this only affects the first impression.
  seed = arch === 'ffnn' ? 1
    : arch === 'rnn' ? 7
    : arch === 'lstm' ? 13
    : arch === 'vae' ? 23
    : arch === 'gan' ? 31
    : arch === 'transformer' ? 41
    : 1,
  paused = false,
  // Default speed is 0.25× — slow enough that the particle flow and the
  // network state are easy to follow with the eye, but fast enough that
  // you can still see motion. The 0.5× / 1× / 2× / 4× options in the
  // toolbar let the user crank it up for visual richness. Lower speed =
  // less work per frame = less jank when multiple graphs are visible.
  initialSpeed = 0.25,
  initialWeightScale = 1,
  id,
}: NeuralGraphProps) {
  const baseId = useId()
  const spec = useMemo(() => ARCHS[arch](), [arch])

  // Pre-compute node coordinates deterministically.
  const positions = useMemo(() => {
    const out: Record<string, { x: number; y: number }> = {}
    spec.layers.forEach((layer) => {
      const n = layer.nodes.length
      const pad = 0.18
      const usable = 1 - 2 * pad
      layer.nodes.forEach((node, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1)
        out[node.id] = { x: layer.x * W, y: (pad + t * usable) * H }
      })
    })
    return out
  }, [spec])

  // Build a flat edges list with per-edge weight index, in the same order
  // that `initWeights` returns its vector.
  const edges = useMemo(() => {
    const list: { from: string; to: string; idx: number }[] = []
    let idx = 0
    spec.layers.forEach((layer) => {
      for (const e of layer.edges) {
        list.push({ from: e.from, to: e.to, idx })
        idx++
      }
    })
    return list
  }, [spec])

  // Map node id → node object.
  const nodeById = useMemo(() => {
    const m: Record<string, Node> = {}
    spec.layers.forEach((l) => l.nodes.forEach((n) => (m[n.id] = n)))
    return m
  }, [spec])

  // Per-arch default input — each architecture provides its own
  // defaults via spec.defaultInput (mixed signs, varied magnitudes, or
  // a step-like signal across time steps, depending on what makes the
  // architecture's behaviour visible from the first frame). Falls back
  // to all 0.3 for any architecture that doesn't override.
  const defaultInput = useMemo<number[]>(() => {
    if (spec.defaultInput && spec.defaultInput.length === spec.inputDim) {
      return spec.defaultInput
    }
    return new Array(spec.inputDim).fill(0.3)
  }, [spec])

  const [inVec, setInVec] = useState<number[]>(input && input.length === defaultInput.length ? input : defaultInput)
  const [tick, setTick] = useState(0)
  const [running, setRunning] = useState(!paused)
  const [speed, setSpeed] = useState(initialSpeed)
  const [weightSeed, setWeightSeed] = useState(seed)
  const [weightScale, setWeightScale] = useState(initialWeightScale)
  const [renderTick, setRenderTick] = useState(0) // increments per sim step, used to retrigger the SVG
  // Auto-pause while the user is scrolling. Without this, all six graphs
  // on the page run their rAF loops at ~60Hz during a TOC click
  // (smoothScrollTo) or a wheel scroll, fighting the browser for the
  // frame budget and producing visible jank. 300ms idle delay means the
  // simulation smoothly resumes a moment after the scroll settles.
  const scrolling = useScrollActivity(300)
  // Pause the rAF loops entirely when this graph is fully out of the
  // viewport. With 6 graphs on the page, the ones the user isn't reading
  // shouldn't burn CPU cycles. The 100px rootMargin gives a "buffer
  // zone" so the simulation doesn't stop the moment the bottom edge
  // crosses the viewport — the user might be reading a paragraph just
  // below the figure and the graph should still be live.
  const [figureRef, inView] = useInViewport<HTMLElement>('100px')
  // Pause while the user is dragging a slider. When the user is
  // actively moving an input slider, they're watching the value
  // change, not the particle flow. Letting the rAF keep running while
  // they drag means the slider fights the state-stepping loop for the
  // React state update queue. By pausing for the duration of the drag,
  // each `onChange` from the slider gets a clean React commit and the
  // graph re-renders the new activations without race conditions.
  // Releases on `pointerup` / `pointercancel` / `pointerleave` so we
  // recover if the user drags off the slider and releases elsewhere.
  const [dragging, setDragging] = useState(false)
  // When set, only nodes of this role are rendered at full opacity —
  // others are dimmed. Lets the user isolate one cell-type family
  // (e.g. all recurrent cells, all gates) without losing the layout.
  const [highlightRole, setHighlightRole] = useState<NodeRole | null>(null)
  // Index of the node the user is hovering, used to highlight the
  // matching row in the activations panel and vice versa.
  const [hoverNode, setHoverNode] = useState<{ layer: number; row: number } | null>(null)
  // Screen-space position of the hovered element, captured on
  // mouseenter so the floating tooltip can position itself next to
  // the node (not the cursor) and stay anchored as the user moves
  // the mouse within the node's hit area.
  const [hoverAnchor, setHoverAnchor] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

  const stateRef = useRef<SimState>({ activations: [], aux: {} })
  const weightsRef = useRef<Weights>(spec.initWeights(seed))
  const rafRef = useRef<number | null>(null)
  const frameAccumRef = useRef(0) // for sub-1x speeds
  const prefersReducedMotion = useRef(false)

  // Reset sim + weights when any structural input changes. The state we
  // re-derive: activations (empty), aux (empty). We also re-init weights if
  // the seed changed.
  useEffect(() => {
    stateRef.current = { activations: [], aux: {} }
    stateRef.current = spec.step(stateRef.current, inVec, weightsRef.current, weightScale, 0)
    setRenderTick((x) => x + 1)
  }, [spec, inVec, weightSeed, weightScale])

  // Reroll weights helper.
  const onReroll = () => {
    setWeightSeed((s) => s + 1)
    weightsRef.current = spec.initWeights(weightSeed + 1)
  }

  // Reduced-motion: pause on mount and on media-query changes.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.current = mq.matches
    if (mq.matches) setRunning(false)
    const onChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches
      if (e.matches) setRunning(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Animation loop. Each frame:
  //   - if speed >= 1: run `speed` steps, but cap at 4 to bound CPU.
  //   - if speed < 1: accumulate fractional frames; only run a step when
  //     the accumulator >= 1. This produces the slow, readable default.
  // We also bump `renderTick` once per step so the React tree re-renders the
  // activation text in the side panel.
  useEffect(() => {
    if (!running || scrolling || !inView || dragging) return
    let mounted = true
    const loop = () => {
      if (!mounted) return
      const stepCount =
        speed >= 1
          ? Math.min(4, Math.floor(speed))
          : (() => {
              frameAccumRef.current += speed
              if (frameAccumRef.current >= 1) {
                frameAccumRef.current -= 1
                return 1
              }
              return 0
            })()
      if (stepCount > 0) {
        for (let i = 0; i < stepCount; i++) {
          stateRef.current = spec.step(stateRef.current, inVec, weightsRef.current, weightScale, tick + i + 1)
        }
        setTick((t) => t + stepCount)
        setRenderTick((x) => x + 1)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      mounted = false
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, scrolling, inView, dragging, spec, inVec, weightScale, speed])

  const state = stateRef.current
  // We need renderTick as a dep so this `useMemo` re-runs after a step.
  void renderTick

  // Particle model: each edge carries N particles at different positions
  // along the edge. We shift them by an amount proportional to |src act|,
  // wrapping when they reach the destination. Speed scales with the user
  // speed setting too.
  const particles = useMemo(() => {
    const out: Array<{ id: string; edgeKey: string; pos: number }> = []
    edges.forEach((e) => {
      for (let i = 0; i < 2; i++) {
        out.push({
          id: `${baseId}-p-${e.from}-${e.to}-${i}`,
          edgeKey: `${e.from}->${e.to}`,
          pos: (i + 0.3) / 2,
        })
      }
    })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseId, edges.length])

  const particlePosRef = useRef(particles)
  useEffect(() => {
    particlePosRef.current = particles
  }, [particles])

  // Per-frame particle advance — directly updates DOM via ref so we don't
  // trigger React reconciliation for the SVG.
  const particleGroupRef = useRef<SVGGElement | null>(null)

  useEffect(() => {
    // Skip the loop entirely when paused OR while the user is scrolling
    // OR while the graph is out of the viewport. The scroll-pause is the
    // key fix for TOC-click jank: when the user clicks a TOC anchor, the
    // browser does a smooth scroll that fires `scroll` events for
    // ~500ms. Without this guard, every graph on the page keeps painting
    // particles at 60Hz during that scroll, fighting the browser for
    // the same frame budget and producing visible jank. The viewport
    // check means graphs the user isn't reading don't burn CPU at all.
    if (!running || scrolling || !inView || dragging) return
    let mounted = true
    let last = performance.now()
    // Throttle to ~30Hz by skipping every other rAF callback. At 60Hz
    // we were calling `setAttribute` ~6 times per particle per frame
    // (cx, cy, fill, r) for ~10-30 particles per graph = thousands of
    // setAttribute calls per second per graph. Halving the rate halves
    // the paint work, and at 0.25× default speed the visual difference
    // is imperceptible.
    let frame = 0
    const loop = (now: number) => {
      if (!mounted) return
      frame++
      // Only update on even frames (~30Hz). The first frame after a
      // restart is always processed so the simulation doesn't appear
      // frozen for an extra 16ms on resume.
      if (frame % 2 === 0) {
        const dt = Math.min(48, now - last) / 16.67 // ~1.0 at 60fps
        last = now
        const group = particleGroupRef.current
        if (group) {
          const children = group.children
          for (let i = 0; i < particlePosRef.current.length; i++) {
            const p = particlePosRef.current[i]
            const e = edges.find((ed) => `${ed.from}->${ed.to}` === p.edgeKey)
            if (!e) continue
            const a = positions[e.from]
            const b = positions[e.to]
            if (!a || !b) continue
            const fromNode = nodeById[e.from]
            const fromLayer = fromNode ? stateRef.current.activations[fromNode.layer]?.[fromNode.row] : 0
            const speedFactor = 0.004 + 0.025 * Math.min(1, Math.abs(fromLayer ?? 0))
            const move = speedFactor * speed * dt
            p.pos += move
            if (p.pos > 1) p.pos -= 1
            const x = a.x + (b.x - a.x) * p.pos
            const y = a.y + (b.y - a.y) * p.pos
            const el = children[i] as SVGCircleElement | undefined
            if (el) {
              el.setAttribute('cx', x.toFixed(1))
              el.setAttribute('cy', y.toFixed(1))
              el.setAttribute('fill', fillFor(fromNode?.role, fromLayer ?? 0))
              el.setAttribute('r', (2.4 + 2.6 * Math.min(1, Math.abs(fromLayer ?? 0))).toFixed(1))
            }
          }
        }
      }
      requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      mounted = false
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
     
  }, [running, scrolling, inView, dragging, edges, positions, nodeById, speed])

  const onReset = () => {
    stateRef.current = { activations: [], aux: {} }
    stateRef.current = spec.step(stateRef.current, inVec, weightsRef.current, weightScale, 0)
    setTick(0)
    setRenderTick((x) => x + 1)
  }

  const heading = label ?? spec.caption

  return (
    <figure
      ref={figureRef}
      id={id}
      style={
        id
          ? { scrollMarginTop: '1rem' }
          : // content-visibility: auto makes the browser skip layout
            // and paint work for off-screen figures. With 6 graphs on
            // the page, only the 1-2 near the viewport are actually
            // laid out — the others don't pay the cost. The
            // `contain-intrinsic-size` hint tells the browser what the
            // placeholder size should be (avoids layout shift when the
            // figure comes into view). 600px is roughly the height of
            // a figure when rendered.
            { contentVisibility: 'auto', containIntrinsicSize: '0 600px' }
      }
      className="not-prose my-8 overflow-hidden rounded-lg border border-[var(--color-border)] bg-surface"
      aria-roledescription="interactive neural network graph"
      aria-label={heading}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-3">
        <div className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">
          {arch} · frame {tick}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1" role="group" aria-label="Speed">
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSpeed(opt.value)}
                aria-label={`Speed ${opt.label}`}
                aria-pressed={speed === opt.value}
                className={`rounded border px-2 py-0.5 font-mono text-[0.7rem] transition-colors ${
                  speed === opt.value
                    ? 'border-blog text-blog'
                    : 'border-[var(--color-border)] text-fg/70 hover:border-blog/50 hover:text-fg'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-[var(--color-border)]" aria-hidden />
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            aria-label={running ? 'Pause' : 'Play'}
            className="rounded border border-[var(--color-border)] px-2.5 py-1 font-mono text-xs text-fg/80 transition-colors hover:border-blog hover:text-blog"
          >
            {running ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset"
            className="rounded border border-[var(--color-border)] px-2.5 py-1 font-mono text-xs text-fg/80 transition-colors hover:border-blog hover:text-blog"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onReroll}
            aria-label="Reroll weights"
            className="rounded border border-[var(--color-border)] px-2.5 py-1 font-mono text-xs text-fg/80 transition-colors hover:border-blog hover:text-blog"
          >
            Reroll weights
          </button>
        </div>
      </div>

      {/* Per-figure inline legend: shows the unique cell-type
          combinations used in this diagram, so the reader can decode
          the colours without scrolling back to the post's main legend
          block. Each entry is a tiny SVG swatch (matching the
          colour/shape/fill/arc encoding) + the cell-type label, and
          is clickable to highlight only that role in the diagram. */}
      <FigureLegend spec={spec} highlightRole={highlightRole} onToggle={setHighlightRole} />

      <div className="grid gap-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Graph */}
        <div className="flex items-center justify-center border-b border-[var(--color-border)] p-3 md:border-b-0 md:border-r">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full max-w-[640px]"
            role="img"
            aria-label={heading}
          >
            {/* edges: strokeWidth and opacity scale with |weight| * weightScale */}
            <g>
              {edges.map((e, i) => {
                const a = positions[e.from]
                const b = positions[e.to]
                if (!a || !b) return null
                const w = (weightsRef.current[e.idx] ?? 0) * weightScale
                const wMag = Math.min(1, Math.abs(w))
                return (
                  <line
                    key={`${baseId}-e-${i}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="currentColor"
                    strokeOpacity={EDGE_OPACITY + 0.42 * wMag}
                    strokeWidth={0.6 + 1.6 * wMag}
                  />
                )
              })}
            </g>
            {/* particles (animated via rAF, see particleGroupRef) */}
            <g ref={particleGroupRef}>
              {particles.map((p) => (
                <circle key={p.id} cx={0} cy={0} r={2} fill="#888" />
              ))}
            </g>
            {/* nodes */}
            <g>
              {spec.layers.flatMap((l) =>
                l.nodes.map((n) => {
                  const pos = positions[n.id]
                  if (!pos) return null
                  const v = state.activations[n.layer]?.[n.row] ?? 0
                  const fill = fillFor(n.role, v)
                  const style = nodeStyleFor(n.role)
                  // For hollow cells, the fill is the background colour
                  // (the cell's "stroke" is its semantic colour) so the
                  // node reads as a ring rather than a filled disc.
                  // We use the page background to make the hollow
                  // visible. The page bg is a Tailwind semantic token;
                  // we read it from the same CSS var the surface uses.
                  const ringStroke = fill
                  const ringFill = style.fill === 'hollow' ? 'var(--color-surface, #0f0f0f)' : fill
                  // Highlight mode: when a role is selected in the
                  // inline legend, dim the other roles so the
                  // selected family stands out.
                  const dimmed = highlightRole !== null && n.role !== highlightRole
                  const op = dimmed ? 0.18 : 1
                  // Hover: a brighter stroke + a soft outer halo, so
                  // the linked-highlight from the activations panel
                  // shows up visually on the graph.
                  const hovered = hoverNode !== null && hoverNode.layer === n.layer && hoverNode.row === n.row
                  const strokeW = style.fill === 'hollow' ? 1.5 : 0.5
                  const strokeWActive = hovered ? (style.fill === 'hollow' ? 2.5 : 1.5) : strokeW
                  // Recurrent cells get a small self-loop arc on top.
                  // We draw the arc as a stroked path centred on the
                  // node. It's purely cosmetic.
                  return (
                    <g
                      key={n.id}
                      opacity={op}
                      onMouseEnter={(e) => {
                        setHoverNode({ layer: n.layer, row: n.row })
                        // Capture the bounding rect of the *node* (not
                        // the parent group, which can be much larger).
                        // We measure the first child shape so the
                        // tooltip anchor matches what the user sees.
                        const target = e.currentTarget as SVGGElement
                        const shape = target.querySelector('circle, rect, polygon')
                        const r = (shape ?? target).getBoundingClientRect()
                        setHoverAnchor({ left: r.left, top: r.top, width: r.width, height: r.height })
                      }}
                      onMouseLeave={() => {
                        setHoverNode((h) => (h && h.layer === n.layer && h.row === n.row ? null : h))
                        setHoverAnchor(null)
                      }}
                      style={{ cursor: 'help' }}
                    >
                      {/* SVG <title> renders a native browser tooltip on
                          hover. Multi-line content uses newlines and is
                          preserved by browsers that support it. */}
                      <title>
                        {nodeTooltipFor(n, l, v)}
                      </title>
                      {style.shape === 'circle' && (
                        <circle cx={pos.x} cy={pos.y} r={NODE_R} fill={ringFill} stroke={ringStroke} strokeWidth={strokeWActive} strokeOpacity={hovered ? 1 : (style.fill === 'hollow' ? 1 : 0.25)} />
                      )}
                      {style.shape === 'square' && (
                        <rect
                          x={pos.x - NODE_R}
                          y={pos.y - NODE_R}
                          width={NODE_R * 2}
                          height={NODE_R * 2}
                          fill={ringFill}
                          stroke={ringStroke}
                          strokeWidth={strokeWActive}
                          strokeOpacity={hovered ? 1 : (style.fill === 'hollow' ? 1 : 0.25)}
                        />
                      )}
                      {style.shape === 'triangle' && (
                        <polygon
                          points={`${pos.x},${pos.y - NODE_R} ${pos.x + NODE_R},${pos.y + NODE_R} ${pos.x - NODE_R},${pos.y + NODE_R}`}
                          fill={ringFill}
                          stroke={ringStroke}
                          strokeWidth={strokeWActive}
                          strokeOpacity={hovered ? 1 : (style.fill === 'hollow' ? 1 : 0.25)}
                        />
                      )}
                      {style.selfLoop && (
                        <path
                          d={`M ${pos.x - NODE_R * 0.4} ${pos.y - NODE_R * 0.95} A ${NODE_R * 0.7} ${NODE_R * 0.7} 0 0 1 ${pos.x + NODE_R * 0.4} ${pos.y - NODE_R * 0.95}`}
                          fill="none"
                          stroke={ringStroke}
                          strokeWidth={1.2}
                        />
                      )}
                      {n.tag ? (
                        <text
                          x={pos.x}
                          y={pos.y + NODE_R + 12}
                          textAnchor="middle"
                          className="fill-fg/80 font-mono"
                          fontSize={10}
                        >
                          {n.tag}
                        </text>
                      ) : null}
                    </g>
                  )
                }),
              )}
            </g>
            {/* layer labels (top) */}
            <g>
              {spec.layers.map((l) => {
                const x = l.x * W
                return (
                  <text
                    key={l.id}
                    x={x}
                    y={16}
                    textAnchor="middle"
                    className="fill-muted font-mono"
                    fontSize={10}
                  >
                    {l.title}
                  </text>
                )
              })}
            </g>
          </svg>
        </div>

        {/* Controls + values */}
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm leading-6 text-fg/80">{heading}</p>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">Input</span>
              <span className="font-mono text-[0.65rem] text-muted">{spec.inputHint ?? '−1 … +1'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {inVec.map((v, i) => (
                <label key={i} className="flex flex-col gap-1">
                  <span className="font-mono text-[0.65rem] text-muted">
                    {spec.inputLabels?.[i] ?? `x${i}`}
                  </span>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.05}
                    value={v}
                    onPointerDown={() => setDragging(true)}
                    onPointerUp={() => setDragging(false)}
                    onPointerCancel={() => setDragging(false)}
                    onPointerLeave={() => setDragging(false)}
                    onChange={(e) => {
                      const next = inVec.slice()
                      next[i] = parseFloat(e.target.value)
                      setInVec(next)
                    }}
                    className="accent-blog"
                  />
                  <span className="font-mono text-[0.7rem] text-fg/70">{v.toFixed(2)}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">Weight scale</span>
              <span className="font-mono text-[0.7rem] text-fg/70">{weightScale.toFixed(2)}×</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={weightScale}
              onPointerDown={() => setDragging(true)}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
              onPointerLeave={() => setDragging(false)}
              onChange={(e) => setWeightScale(parseFloat(e.target.value))}
              className="w-full accent-blog"
              aria-label="Weight scale"
            />
            <p className="mt-1 font-mono text-[0.65rem] text-muted">
              try 0.1× (everything goes to zero) or 2× (saturates to ±1)
            </p>
          </div>

          <div>
            <div className="mb-2 font-mono text-[0.7rem] uppercase tracking-wider text-muted">Activations</div>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-[var(--color-border)] bg-surface-2 p-2 font-mono text-[0.7rem]">
              {spec.layers.map((l, i) => {
                const layerNodes = l.nodes
                // Primary role for this layer's colour chip — pick the
                // most common role in the layer, or 'hidden' as a
                // sensible default. Used to colour the layer title.
                const roleCounts: Partial<Record<NodeRole, number>> = {}
                for (const n of layerNodes) {
                  const r = (n.role ?? 'hidden') as NodeRole
                  roleCounts[r] = (roleCounts[r] ?? 0) + 1
                }
                let primaryRole: NodeRole = 'hidden'
                let primaryCount = 0
                for (const [r, c] of Object.entries(roleCounts)) {
                  if ((c ?? 0) > primaryCount) {
                    primaryRole = r as NodeRole
                    primaryCount = c ?? 0
                  }
                }
                const primaryColour = colourFor(primaryRole)
                return (
                  <div key={l.id} className="flex items-baseline gap-2">
                    <span className="flex w-24 shrink-0 items-center gap-1.5 text-muted">
                      <span
                        aria-hidden
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: primaryColour }}
                      />
                      {l.title}
                    </span>
                    <span className="text-fg/80">
                      {(state.activations[i] ?? new Array(l.nodes.length).fill(0))
                        .map((v, r) => {
                          const isHovered = hoverNode !== null && hoverNode.layer === i && hoverNode.row === r
                          return (
                            <span
                              key={r}
                              onMouseEnter={(e) => {
                                setHoverNode({ layer: i, row: r })
                                const r0 = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                setHoverAnchor({ left: r0.left, top: r0.top, width: r0.width, height: r0.height })
                              }}
                              onMouseLeave={() => {
                                setHoverNode((h) => (h && h.layer === i && h.row === r ? null : h))
                                setHoverAnchor(null)
                              }}
                              className={`cursor-help rounded px-0.5 transition-colors ${
                                isHovered ? 'bg-blog/20 text-blog' : 'hover:bg-surface'
                              }`}
                            >
                              {v.toFixed(2).padStart(5, ' ')}
                            </span>
                          )
                        })
                        .reduce<ReactElement[]>((acc, el, idx) => {
                          if (idx > 0) acc.push(<span key={`s${idx}`}> </span>)
                          acc.push(el)
                          return acc
                        }, [])}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      {/* Floating, element-anchored tooltip. Reads `hoverNode` and
          `hoverAnchor` from the same state as the activations-panel
          highlight, so hovering a node OR a value in the panel
          triggers the same styled popover. Renders into a portal at
          document.body, so it escapes any `overflow: hidden` on the
          figure ancestor. */}
      <NodeTooltip
        data={
          hoverNode && hoverAnchor
            ? (() => {
                const layer = spec.layers[hoverNode.layer]
                const node = layer?.nodes[hoverNode.row]
                if (!layer || !node) return null
                const v = state.activations[hoverNode.layer]?.[hoverNode.row] ?? 0
                return { node, layer, activation: v, anchor: hoverAnchor }
              })()
            : null
        }
      />
    </figure>
  )
}
