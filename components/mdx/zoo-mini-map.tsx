'use client'

/**
 * Mini-map for the Neural Network Zoo blog post. Renders a single inline
 * SVG with six small architecture graphs arranged in a 3×2 grid; clicking
 * (or keyboard-activating) one of them smooth-scrolls to the corresponding
 * <NeuralGraph id="arch-..." /> figure in the post body.
 *
 * This is purely a navigation aid. The full interactive versions of the
 * architectures live in the post body; the mini-map is the "where in the
 * zoo am I" index.
 *
 * Accessibility:
 *   - Each architecture is a <g role="button" tabIndex={0}> with an
 *     aria-label.
 *   - Enter / Space activates the button (the <g> doesn't natively handle
 *     keyboard events, so we add onKeyDown for that).
 *   - The wrapper has a focus-within ring on the active subgraph so the
 *     user can see keyboard focus.
 */

import { useCallback } from 'react'

type Arch = 'ffnn' | 'rnn' | 'lstm' | 'vae' | 'gan' | 'transformer'

const COLOURS = {
  ink: 'currentColor',
  accent: 'var(--color-blog, #00e0b8)',
  input: '#7c5cff',
  hidden: '#00e0b8',
  output: '#ff7a59',
  gating: '#f5c542',
  memory: '#ff6f9c',
  latent: '#a0a4ff',
  gen: '#00e0b8',
  disc: '#ff7a59',
  attn: '#7c5cff',
  token: '#f5c542',
} as const

// Subgraph viewBox dimensions and inner coords. Each sub-graph is drawn
// within its own (0,0) -> (W,H) box and then translated into position by
// the parent <svg>'s row/column layout.
const SW = 120
const SH = 72

type NodeXY = { x: number; y: number; r?: number; fill?: string; label?: string }
type EdgeXY = { from: NodeXY; to: NodeXY }

function buildFfnn(): { nodes: NodeXY[]; edges: EdgeXY[]; label: string } {
  const dots = (xs: number[], colour: string) =>
    xs.map((x) => ({ x, y: SH / 2, r: 3.5, fill: colour })) as NodeXY[]
  const layers = [
    [20, 50, 80, 100],
    [40, 60, 80],
    [50, 70, 90],
  ]
  // Use 3 columns of 3 dots, all hidden colour. The "feed-forward" feel
  // is the dense edge mesh.
  const cols = [
    { x: 24, ys: [22, 36, 50] },
    { x: 60, ys: [22, 36, 50] },
    { x: 96, ys: [22, 36, 50] },
  ]
  const nodes: NodeXY[] = []
  cols.forEach((c, ci) =>
    c.ys.forEach((y, i) =>
      nodes.push({ x: c.x, y, r: 3, fill: ci === 0 ? COLOURS.input : ci === 2 ? COLOURS.output : COLOURS.hidden }),
    ),
  )
  const edges: EdgeXY[] = []
  for (let i = 0; i < cols.length - 1; i++) {
    for (const a of cols[i].ys) for (const b of cols[i + 1].ys)
      edges.push({ from: { x: cols[i].x, y: a }, to: { x: cols[i + 1].x, y: b } })
  }
  return { nodes, edges, label: 'Feed-forward' }
}

function buildRnn(): { nodes: NodeXY[]; edges: EdgeXY[]; label: string } {
  // 3 hidden columns + input, with a curved wrap edge from right to left
  const cols = [
    { x: 18, ys: [26, 38, 50] },
    { x: 42, ys: [26, 38, 50] },
    { x: 66, ys: [26, 38, 50] },
    { x: 90, ys: [26, 38, 50] },
  ]
  const nodes: NodeXY[] = []
  cols.forEach((c, ci) =>
    c.ys.forEach((y) =>
      nodes.push({ x: c.x, y, r: 3, fill: ci === 0 ? COLOURS.input : COLOURS.hidden }),
    ),
  )
  // forward edges
  const edges: EdgeXY[] = []
  for (let i = 0; i < cols.length - 1; i++) {
    for (const a of cols[i].ys) for (const b of cols[i + 1].ys)
      edges.push({ from: { x: cols[i].x, y: a }, to: { x: cols[i + 1].x, y: b } })
  }
  // recurrent wrap: a single curve from the rightmost column back to the
  // leftmost hidden column, drawn as a path (not a <line>).
  return {
    nodes,
    edges,
    label: 'Recurrent',
    // we'll handle the curve specially in the renderer
    recurve: { fromX: cols[cols.length - 1].x, toX: cols[1].x, y: 8 },
    recurvePath: true,
  } as { nodes: NodeXY[]; edges: EdgeXY[]; label: string; recurvePath: boolean; recurve: { fromX: number; toX: number; y: number } }
}

function buildLstm(): { nodes: NodeXY[]; edges: EdgeXY[]; label: string } {
  // 3 input dots on the left, 3 small "gate" dots in the middle, 1 memory
  // dot on the right. The visual signature is gates + memory cell.
  const nodes: NodeXY[] = [
    { x: 18, y: 22, r: 3, fill: COLOURS.input },
    { x: 18, y: 36, r: 3, fill: COLOURS.input },
    { x: 18, y: 50, r: 3, fill: COLOURS.input },
    { x: 50, y: 18, r: 2.5, fill: COLOURS.gating },
    { x: 50, y: 36, r: 2.5, fill: COLOURS.gating },
    { x: 50, y: 54, r: 2.5, fill: COLOURS.gating },
    { x: 90, y: 36, r: 4, fill: COLOURS.memory },
    { x: 108, y: 36, r: 3, fill: COLOURS.output },
  ]
  const edges: EdgeXY[] = []
  // every input -> every gate
  for (const yi of [22, 36, 50]) for (const yg of [18, 36, 54])
    edges.push({ from: { x: 18, y: yi }, to: { x: 50, y: yg } })
  // gates -> memory
  for (const yg of [18, 36, 54]) edges.push({ from: { x: 50, y: yg }, to: { x: 90, y: 36 } })
  // memory -> output
  edges.push({ from: { x: 90, y: 36 }, to: { x: 108, y: 36 } })
  return { nodes, edges, label: 'LSTM' }
}

function buildVae(): { nodes: NodeXY[]; edges: EdgeXY[]; label: string } {
  // Hourglass: 3 input -> 2 hidden -> narrow (μ/σ) -> sample -> 2 hidden -> 3 output
  const nodes: NodeXY[] = [
    { x: 14, y: 22, r: 3, fill: COLOURS.input },
    { x: 14, y: 36, r: 3, fill: COLOURS.input },
    { x: 14, y: 50, r: 3, fill: COLOURS.input },
    { x: 34, y: 28, r: 2.5, fill: COLOURS.hidden },
    { x: 34, y: 44, r: 2.5, fill: COLOURS.hidden },
    { x: 50, y: 36, r: 2.5, fill: COLOURS.latent },
    { x: 62, y: 36, r: 2.5, fill: COLOURS.latent },
    { x: 74, y: 36, r: 3, fill: COLOURS.memory },
    { x: 88, y: 28, r: 2.5, fill: COLOURS.hidden },
    { x: 88, y: 44, r: 2.5, fill: COLOURS.hidden },
    { x: 108, y: 22, r: 3, fill: COLOURS.output },
    { x: 108, y: 36, r: 3, fill: COLOURS.output },
    { x: 108, y: 50, r: 3, fill: COLOURS.output },
  ]
  const edges: EdgeXY[] = [
    { from: { x: 14, y: 22 }, to: { x: 34, y: 28 } },
    { from: { x: 14, y: 22 }, to: { x: 34, y: 44 } },
    { from: { x: 14, y: 36 }, to: { x: 34, y: 28 } },
    { from: { x: 14, y: 36 }, to: { x: 34, y: 44 } },
    { from: { x: 14, y: 50 }, to: { x: 34, y: 28 } },
    { from: { x: 14, y: 50 }, to: { x: 34, y: 44 } },
    { from: { x: 34, y: 28 }, to: { x: 50, y: 36 } },
    { from: { x: 34, y: 28 }, to: { x: 62, y: 36 } },
    { from: { x: 34, y: 44 }, to: { x: 50, y: 36 } },
    { from: { x: 34, y: 44 }, to: { x: 62, y: 36 } },
    { from: { x: 50, y: 36 }, to: { x: 74, y: 36 } },
    { from: { x: 62, y: 36 }, to: { x: 74, y: 36 } },
    { from: { x: 74, y: 36 }, to: { x: 88, y: 28 } },
    { from: { x: 74, y: 36 }, to: { x: 88, y: 44 } },
    { from: { x: 88, y: 28 }, to: { x: 108, y: 22 } },
    { from: { x: 88, y: 28 }, to: { x: 108, y: 36 } },
    { from: { x: 88, y: 28 }, to: { x: 108, y: 50 } },
    { from: { x: 88, y: 44 }, to: { x: 108, y: 22 } },
    { from: { x: 88, y: 44 }, to: { x: 108, y: 36 } },
    { from: { x: 88, y: 44 }, to: { x: 108, y: 50 } },
  ]
  return { nodes, edges, label: 'VAE' }
}

function buildGan(): { nodes: NodeXY[]; edges: EdgeXY[]; label: string } {
  // 2 parallel columns: G (teal) and D (orange). The D column receives
  // from both G's output and a separate "real" source.
  const nodes: NodeXY[] = [
    // noise (top-left)
    { x: 16, y: 18, r: 2.5, fill: COLOURS.input },
    { x: 16, y: 30, r: 2.5, fill: COLOURS.input },
    // generator (G)
    { x: 38, y: 22, r: 3, fill: COLOURS.gen },
    { x: 38, y: 36, r: 3, fill: COLOURS.gen },
    // G(z) sample
    { x: 60, y: 28, r: 3, fill: COLOURS.gen },
    // real data
    { x: 60, y: 52, r: 3, fill: COLOURS.input },
    // discriminator
    { x: 84, y: 24, r: 3, fill: COLOURS.disc },
    { x: 84, y: 44, r: 3, fill: COLOURS.disc },
    // P(real)
    { x: 106, y: 34, r: 3.5, fill: COLOURS.output },
  ]
  const edges: EdgeXY[] = [
    { from: { x: 16, y: 18 }, to: { x: 38, y: 22 } },
    { from: { x: 16, y: 18 }, to: { x: 38, y: 36 } },
    { from: { x: 16, y: 30 }, to: { x: 38, y: 22 } },
    { from: { x: 16, y: 30 }, to: { x: 38, y: 36 } },
    { from: { x: 38, y: 22 }, to: { x: 60, y: 28 } },
    { from: { x: 38, y: 36 }, to: { x: 60, y: 28 } },
    { from: { x: 60, y: 28 }, to: { x: 84, y: 24 } },
    { from: { x: 60, y: 28 }, to: { x: 84, y: 44 } },
    { from: { x: 60, y: 52 }, to: { x: 84, y: 24 } },
    { from: { x: 60, y: 52 }, to: { x: 84, y: 44 } },
    { from: { x: 84, y: 24 }, to: { x: 106, y: 34 } },
    { from: { x: 84, y: 44 }, to: { x: 106, y: 34 } },
  ]
  return { nodes, edges, label: 'GAN' }
}

function buildTransformer(): { nodes: NodeXY[]; edges: EdgeXY[]; label: string } {
  // 3 input tokens, 3 attention heads in middle, 3 outputs. The signature
  // is the dense cross-column edges.
  const cols = [
    { x: 18, ys: [22, 36, 50] },
    { x: 50, ys: [22, 36, 50] },
    { x: 102, ys: [22, 36, 50] },
  ]
  const nodes: NodeXY[] = []
  cols.forEach((c, ci) =>
    c.ys.forEach((y) =>
      nodes.push({ x: c.x, y, r: 3, fill: ci === 0 ? COLOURS.token : ci === 2 ? COLOURS.output : COLOURS.attn }),
    ),
  )
  const edges: EdgeXY[] = []
  for (let i = 0; i < cols.length - 1; i++) {
    for (const a of cols[i].ys) for (const b of cols[i + 1].ys)
      edges.push({ from: { x: cols[i].x, y: a }, to: { x: cols[i + 1].x, y: b } })
  }
  return { nodes, edges, label: 'Transformer' }
}

const BUILDERS: Record<Arch, () => any> = {
  ffnn: buildFfnn,
  rnn: buildRnn,
  lstm: buildLstm,
  vae: buildVae,
  gan: buildGan,
  transformer: buildTransformer,
}

const ORDER: Arch[] = ['ffnn', 'rnn', 'lstm', 'vae', 'gan', 'transformer']
const TARGET_ID: Record<Arch, string> = {
  ffnn: 'arch-ffnn',
  rnn: 'arch-rnn',
  lstm: 'arch-lstm',
  vae: 'arch-vae',
  gan: 'arch-gan',
  transformer: 'arch-transformer',
}

/**
 * Vertical offset (in pixels) between the viewport top and the target
 * figure when scrolled. Chosen to leave a small breathing room between
 * the figure toolbar and the top of the viewport — `scrollIntoView({
 * block: 'start' })` would put the toolbar flush with the edge, which
 * feels cramped. 16px matches the type-leading of the figure header.
 */
const SCROLL_OFFSET_PX = 16

export function ZooMiniMap() {
  const go = useCallback((arch: Arch) => {
    const id = TARGET_ID[arch]
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null
    if (!el) return
    // Compute the figure's top relative to the document, then scroll so it
    // sits SCROLL_OFFSET_PX below the viewport top. Using
    // `scrollIntoView({ block: 'start' })` puts the figure's top flush
    // with the viewport top, which hides the section heading above it
    // and feels like the click "landed in the wrong place". A fixed
    // offset above the figure keeps the section heading + intro
    // paragraph visible.
    const rect = el.getBoundingClientRect()
    const absoluteTop = rect.top + window.scrollY
    const target = Math.max(0, absoluteTop - SCROLL_OFFSET_PX)
    window.scrollTo({ top: target, behavior: 'smooth' })
  }, [])

  return (
    <figure
      className="not-prose my-10 overflow-hidden rounded-lg border border-[var(--color-border)] bg-surface"
      aria-label="Neural network zoo — click an architecture to jump to its interactive diagram"
    >
      <figcaption className="border-b border-[var(--color-border)] px-5 py-3">
        <div className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">
          The zoo, at a glance
        </div>
        <p className="mt-1 text-sm text-fg/80">
          Six architectures, one click each. Pick one to jump straight to its interactive diagram further down.
        </p>
      </figcaption>
      <div className="grid grid-cols-2 gap-px bg-[var(--color-border)] sm:grid-cols-3">
        {ORDER.map((arch) => {
          const { nodes, edges, label, recurve, recurvePath } = BUILDERS[arch]()
          return (
            <button
              key={arch}
              type="button"
              onClick={() => go(arch)}
              aria-label={`Jump to ${label} diagram`}
              className="group relative flex flex-col items-stretch gap-2 bg-surface p-3 text-left transition-colors hover:bg-[var(--color-border)]/30 focus:bg-[var(--color-border)]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blog"
            >
              <svg
                viewBox={`0 0 ${SW} ${SH + 6}`}
                className="h-20 w-full text-fg/70 transition-colors group-hover:text-fg"
                aria-hidden
              >
                {edges.map((e: EdgeXY, i: number) => (
                  <line
                    key={`${arch}-e-${i}`}
                    x1={e.from.x}
                    y1={e.from.y}
                    x2={e.to.x}
                    y2={e.to.y}
                    stroke="currentColor"
                    strokeOpacity={0.22}
                    strokeWidth={0.7}
                  />
                ))}
                {recurvePath && recurve && (
                  <path
                    d={`M ${recurve.fromX} 22 Q ${(recurve.fromX + recurve.toX) / 2} ${recurve.y} ${recurve.toX} 22`}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity={0.45}
                    strokeWidth={0.9}
                    strokeDasharray="2 1.5"
                  />
                )}
                {nodes.map((n: NodeXY, i: number) => (
                  <circle
                    key={`${arch}-n-${i}`}
                    cx={n.x}
                    cy={n.y}
                    r={n.r ?? 3}
                    fill={n.fill ?? COLOURS.hidden}
                    fillOpacity={0.85}
                  />
                ))}
              </svg>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[0.7rem] uppercase tracking-wider text-fg/80 group-hover:text-fg">
                  {label}
                </span>
                <span className="font-mono text-[0.65rem] text-muted group-hover:text-fg/80" aria-hidden>
                  ↘
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </figure>
  )
}
