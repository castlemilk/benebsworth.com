'use client'

/**
 * Colour-legend block for the Neural Network Zoo blog post. Renders a
 * 3-column grid showing the full Asimov Institute node-type legend —
 * 14 cell types distinguished by colour (role), shape (cell type),
 * and fill (behaviour variant).
 *
 * The colours are imported from the same constants used by the
 * interactive NeuralGraph diagrams (components/mdx/neural-graph.tsx),
 * so a swatch change here propagates to the diagrams and vice versa.
 *
 * The legend covers 14 cell types across 5 colour families:
 *   - Yellow (input)        — Input, Backfed Input, Noisy Input
 *   - Green (hidden)         — Hidden, Probabilistic Hidden, Spiking, Capsule
 *   - Orange (output)        — Output, Match Input/Output
 *   - Blue (memory/recurrent) — Recurrent, Memory, Gated Memory
 *   - Pink (kernel)          — Kernel, Convolution or Pool
 *
 * Plus a generic "neuron" entry for cells whose role is defined by
 * their edges rather than by colour.
 */
import type { ReactElement } from 'react'
import { NODE_COLOURS } from './neural-graph'

/** A single legend entry. `render` is the SVG that draws the swatch. */
type LegendEntry = {
  group: string
  label: string
  description: string
  render: (key: string) => ReactElement
}

const STROKE = 'rgba(0,0,0,0.45)'

/**
 * Tiny inline SVGs that draw the actual Asimov cell shape and fill.
 * Each renders into a 18×18 viewBox, with the cell centred at (9, 9)
 * and a 7-unit radius (so circles/squares/triangles are visible at
 * the post's text size).
 */
function SolidCircle({ colour }: { colour: string }) {
  return <circle cx={9} cy={9} r={6.5} fill={colour} stroke={STROKE} strokeWidth={0.4} strokeOpacity={0.6} />
}
function HollowCircle({ colour }: { colour: string }) {
  return <circle cx={9} cy={9} r={6.5} fill="white" stroke={colour} strokeWidth={1.6} />
}
function SolidTriangle({ colour }: { colour: string }) {
  return <polygon points="9,2.5 15.5,15.5 2.5,15.5" fill={colour} stroke={STROKE} strokeWidth={0.4} strokeOpacity={0.6} />
}
function SolidSquare({ colour }: { colour: string }) {
  return <rect x={2.5} y={2.5} width={13} height={13} fill={colour} stroke={STROKE} strokeWidth={0.4} strokeOpacity={0.6} />
}
function RecurrentArc({ colour, fill = 'solid' }: { colour: string; fill?: 'solid' | 'hollow' }) {
  return (
    <g>
      {fill === 'hollow' ? (
        <HollowCircle colour={colour} />
      ) : (
        <SolidCircle colour={colour} />
      )}
      <path
        d="M 5 5 A 4.5 4.5 0 0 1 13 5"
        fill="none"
        stroke={colour}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </g>
  )
}

const ENTRIES: LegendEntry[] = [
  // Yellow family — input
  {
    group: 'yellow',
    label: 'Input cell',
    description: 'Holds one element of the input vector',
    render: (_) => <SolidCircle key={_} colour={NODE_COLOURS.input} />,
  },
  {
    group: 'yellow',
    label: 'Backfed input cell',
    description: 'Receives a connection back from a downstream cell',
    render: (_) => <HollowCircle key={_} colour={NODE_COLOURS.input} />,
  },
  {
    group: 'yellow',
    label: 'Noisy input cell',
    description: 'Input with added noise (e.g. VAE sampling step)',
    render: (_) => <SolidTriangle key={_} colour={NODE_COLOURS.input} />,
  },
  // Green family — hidden
  {
    group: 'green',
    label: 'Hidden cell',
    description: 'A standard learned intermediate neuron',
    render: (_) => <SolidCircle key={_} colour={NODE_COLOURS.hidden} />,
  },
  {
    group: 'green',
    label: 'Probabilistic hidden cell',
    description: 'Holds a sampled value (RBM, DBN, VAE μ/σ)',
    render: (_) => <HollowCircle key={_} colour={NODE_COLOURS.hidden} />,
  },
  {
    group: 'green',
    label: 'Spiking hidden cell',
    description: 'Integrate-and-fire dynamics (LSM)',
    render: (_) => <SolidTriangle key={_} colour={NODE_COLOURS.hidden} />,
  },
  {
    group: 'green',
    label: 'Capsule cell',
    description: 'Vector-valued activation (CapsNet)',
    render: (_) => <SolidSquare key={_} colour={NODE_COLOURS.hidden} />,
  },
  // Orange family — output
  {
    group: 'orange',
    label: 'Output cell',
    description: 'A standard output neuron',
    render: (_) => <SolidCircle key={_} colour={NODE_COLOURS.output} />,
  },
  {
    group: 'orange',
    label: 'Match input/output cell',
    description: 'Self-organising: best-matching unit (Kohonen)',
    render: (_) => <HollowCircle key={_} colour={NODE_COLOURS.output} />,
  },
  // Blue family — memory / recurrent
  {
    group: 'blue',
    label: 'Recurrent cell',
    description: 'Feeds back to itself (RNN hidden state)',
    render: (_) => <RecurrentArc key={_} colour={NODE_COLOURS.recurrent} />,
  },
  {
    group: 'blue',
    label: 'Memory cell',
    description: 'Persistent state carried across time steps',
    render: (_) => <RecurrentArc key={_} colour={NODE_COLOURS.memory} fill="hollow" />,
  },
  {
    group: 'blue',
    label: 'Gated memory cell',
    description: 'Memory with a learned gate (LSTM input/forget/output)',
    render: (_) => (
      <g>
        <SolidTriangle colour={NODE_COLOURS.gating} />
        <path d="M 5 5 A 4.5 4.5 0 0 1 13 5" fill="none" stroke={NODE_COLOURS.gating} strokeWidth={1.4} strokeLinecap="round" />
      </g>
    ),
  },
  // Pink family — kernel / conv
  {
    group: 'pink',
    label: 'Kernel cell',
    description: 'A shared-weight receptive field (CNN)',
    render: (_) => <SolidCircle key={_} colour={NODE_COLOURS.kernel} />,
  },
  {
    group: 'pink',
    label: 'Convolution or pooling cell',
    description: 'A conv or pool operation, hollow = pool',
    render: (_) => <HollowCircle key={_} colour={NODE_COLOURS.kernel} />,
  },
  // Generic
  {
    group: 'other',
    label: 'Neuron (unspecified)',
    description: 'Generic neuron — role defined by its edges',
    render: (_) => <SolidCircle key={_} colour={NODE_COLOURS.default} />,
  },
]

export function ColorLegend() {
  return (
    <div className="not-prose rounded-lg border border-[var(--color-border)] bg-surface px-5 py-4 my-6">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-3">
        {ENTRIES.map((e) => (
          <div key={e.label} className="flex items-start gap-3">
            <svg
              width="20"
              height="20"
              viewBox="0 0 18 18"
              className="mt-0.5 shrink-0"
              aria-hidden
            >
              {e.render(e.label)}
            </svg>
            <div>
              <div className="font-mono text-[0.78rem] uppercase tracking-wider text-fg/85">
                {e.label}
              </div>
              <div className="text-xs text-fg/60 leading-snug">{e.description}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-fg/55">
        Colour = role (yellow input, green hidden, orange output, blue memory, pink kernel). Shape = cell type (circle = standard neuron, triangle = specialised dynamics, square = capsule). Fill = behaviour variant (hollow ring = probabilistic, memory, or pool). A small arc on top marks a recurrent cell.
      </p>
    </div>
  )
}
