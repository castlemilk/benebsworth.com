import type { Layer, Node, NodeRole } from './types'

/* ------------------------------------------------------------------ *
 * Visual helpers
 * ------------------------------------------------------------------ */

/**
 * Node colours for the interactive NeuralGraph diagrams. These match
 * the Asimov Institute's Neural Network Zoo poster palette: yellow
 * for input, green for hidden, orange for output, blue for memory
 * and recurrent state, pink for kernel / conv / pool. The same
 * constants are used by the colour legend in
 * components/mdx/color-legend.tsx — keep them in sync.
 */
export const NODE_COLOURS = {
  // Yellow — input family
  input: '#f5c542',
  // Green — hidden family
  hidden: '#3aaa35',
  // Orange — output family
  output: '#ff7a59',
  // Blue — memory / recurrent family
  memory: '#3a85e8',
  recurrent: '#3a85e8',
  // Yellow (gate triangle) — also used for gating
  gating: '#f5c542',
  // Pink — kernel / conv family
  kernel: '#ff6f9c',
  conv: '#ff6f9c',
  // Light purple — probabilistic / sampling
  probabilistic: '#a0a4ff',
  // GAN-specific (kept for compatibility with the existing code paths)
  gen: '#3aaa35',
  disc: '#ff7a59',
  // Transformer-specific
  attn: '#3a85e8',
  token: '#f5c542',
  // Latent (VAE sample) — same as probabilistic
  latent: '#a0a4ff',
  sample: '#a0a4ff',
  // Generic
  default: '#888888',
} as const

export function colourFor(role: NodeRole | undefined): string {
  switch (role) {
    // Yellow family — input
    case 'input':
    case 'backfed':
    case 'noisy':
    case 'token':
      return NODE_COLOURS.input
    // Green family — hidden
    case 'hidden':
    case 'gen':
      return NODE_COLOURS.hidden
    case 'latent':
      return NODE_COLOURS.latent
    case 'spiking':
      return NODE_COLOURS.hidden
    case 'capsule':
      return NODE_COLOURS.hidden
    // Orange family — output
    case 'output':
    case 'disc':
      return NODE_COLOURS.output
    case 'match':
      return NODE_COLOURS.output
    // Blue family — memory / recurrent
    case 'recurrent':
    case 'memory':
    case 'attn':
      return NODE_COLOURS.memory
    case 'gating':
      return NODE_COLOURS.gating
    // Pink family — kernel / conv / pool
    case 'kernel':
    case 'conv':
    case 'pool':
      return NODE_COLOURS.kernel
    // Probabilistic / sampling
    case 'sample':
      return NODE_COLOURS.sample
    default:
      return NODE_COLOURS.default
  }
}

function intensity(v: number): number {
  return Math.max(0, Math.min(1, Math.abs(v)))
}

/**
 * Visual encoding for a node, derived from its role. Mirrors the
 * Asimov Institute's Neural Network Zoo poster legend:
 *
 *   shape = circle (●)  |  triangle (▲)  |  square (■)
 *     circle = standard neuron
 *     triangle = noisy / spiking / gated (specialised dynamics)
 *     square = capsule
 *
 *   fill = solid | hollow
 *     solid = standard behaviour
 *     hollow = probabilistic / memory / match / convolution-pool
 *              variant (the cell's value is sampled, persistent, or
 *              represents a different type of computation)
 *
 *   selfLoop = true → the cell is recurrent (small arc on top)
 */
export type NodeStyle = {
  shape: 'circle' | 'triangle' | 'square'
  fill: 'solid' | 'hollow'
  selfLoop: boolean
}

export function nodeStyleFor(role: NodeRole | undefined): NodeStyle {
  switch (role) {
    // Yellow family — input
    case 'input':
      return { shape: 'circle', fill: 'solid', selfLoop: false }
    case 'backfed':
      return { shape: 'circle', fill: 'hollow', selfLoop: false }
    case 'noisy':
      return { shape: 'triangle', fill: 'solid', selfLoop: false }

    // Green family — hidden
    case 'hidden':
      return { shape: 'circle', fill: 'solid', selfLoop: false }
    case 'gen':
      return { shape: 'circle', fill: 'solid', selfLoop: false }
    case 'latent':
      return { shape: 'circle', fill: 'hollow', selfLoop: false }
    case 'spiking':
      return { shape: 'triangle', fill: 'solid', selfLoop: false }
    case 'capsule':
      return { shape: 'square', fill: 'solid', selfLoop: false }

    // Orange family — output
    case 'output':
      return { shape: 'circle', fill: 'solid', selfLoop: false }
    case 'disc':
      return { shape: 'circle', fill: 'solid', selfLoop: false }
    case 'match':
      return { shape: 'circle', fill: 'hollow', selfLoop: false }

    // Blue family — memory / recurrent
    case 'recurrent':
      return { shape: 'circle', fill: 'solid', selfLoop: true }
    case 'memory':
      return { shape: 'circle', fill: 'hollow', selfLoop: true }
    case 'gating':
      return { shape: 'triangle', fill: 'solid', selfLoop: true }
    case 'attn':
      return { shape: 'circle', fill: 'solid', selfLoop: true }

    // Pink family — kernel / conv / pool
    case 'kernel':
    case 'conv':
      return { shape: 'circle', fill: 'solid', selfLoop: false }
    case 'pool':
      return { shape: 'circle', fill: 'hollow', selfLoop: false }

    // Probabilistic / sampling (light purple)
    case 'sample':
      return { shape: 'circle', fill: 'hollow', selfLoop: false }

    // Transformer tokens
    case 'token':
      return { shape: 'circle', fill: 'solid', selfLoop: false }

    default:
      return { shape: 'circle', fill: 'solid', selfLoop: false }
  }
}

/**
 * Human-readable label for a node's role. Mirrors the Asimov legend
 * entries from the post's colour-legend component, so hovering a node
 * tells the user exactly what kind of cell they're looking at.
 */
export function roleLabel(role: NodeRole | undefined): string {
  switch (role) {
    case 'input': return 'Input cell'
    case 'backfed': return 'Backfed input cell'
    case 'noisy': return 'Noisy input cell'
    case 'hidden': return 'Hidden cell'
    case 'gen': return 'Generator cell'
    case 'latent': return 'Latent code cell'
    case 'spiking': return 'Spiking hidden cell'
    case 'capsule': return 'Capsule cell'
    case 'output': return 'Output cell'
    case 'disc': return 'Discriminator cell'
    case 'match': return 'Match cell (best-matching unit)'
    case 'recurrent': return 'Recurrent cell'
    case 'memory': return 'Memory cell'
    case 'gating': return 'Gated memory cell'
    case 'attn': return 'Attention head cell'
    case 'kernel': return 'Kernel cell'
    case 'conv': return 'Convolution cell'
    case 'pool': return 'Pooling cell'
    case 'sample': return 'Probabilistic sample cell'
    case 'token': return 'Token cell'
    default: return 'Neuron'
  }
}

/**
 * One-line description for a node's role, used in the hover tooltip
 * and the per-figure inline legend. Mirrors the descriptions in the
 * post's colour-legend block.
 */
export function roleDescription(role: NodeRole | undefined): string {
  switch (role) {
    case 'input': return 'Holds one element of the input vector'
    case 'backfed': return 'Receives a connection back from a downstream cell'
    case 'noisy': return 'Input with added noise (e.g. VAE sampling step)'
    case 'hidden': return 'A standard learned intermediate neuron'
    case 'gen': return 'A neuron inside the generator network'
    case 'latent': return 'Holds a sampled value (μ, σ) from the encoder'
    case 'spiking': return 'Integrate-and-fire dynamics (LSM)'
    case 'capsule': return 'Vector-valued activation (CapsNet)'
    case 'output': return 'A standard output neuron'
    case 'disc': return 'A neuron inside the discriminator network'
    case 'match': return 'Self-organising: best-matching unit (Kohonen)'
    case 'recurrent': return 'Feeds back to itself (RNN hidden state)'
    case 'memory': return 'Persistent state carried across time steps'
    case 'gating': return 'Memory with a learned gate (LSTM input/forget/output)'
    case 'attn': return 'A multi-head attention output (one per head)'
    case 'kernel': return 'A shared-weight receptive field (CNN)'
    case 'conv': return 'A convolution operation'
    case 'pool': return 'A max- or average-pool operation'
    case 'sample': return 'A value sampled from a learned distribution'
    case 'token': return 'A discrete input token (embedded before attention)'
    default: return 'Generic neuron — role defined by its edges'
  }
}

/**
 * Multi-line tooltip for a node, used inside an SVG <title> element
 * so browsers render it as a native hover tooltip. Format:
 *
 *   <role>                  e.g. "Recurrent cell"
 *   <layer title> · row <n> e.g. "h(t) · row 2"
 *   activation: <value>     2-decimal, signed
 */
export function nodeTooltipFor(n: Node, l: Layer, v: number): string {
  const label = roleLabel(n.role)
  const where = `${l.title} · row ${n.row + 1}`
  const act = `activation: ${v.toFixed(2)}`
  return `${label}\n${where}\n${act}`
}

export function fillFor(role: NodeRole | undefined, v: number): string {
  const base = colourFor(role)
  const k = intensity(v)
  const m = base.match(/^#([0-9a-f]{6})$/i)
  if (!m) return base
  const r = parseInt(m[1].slice(0, 2), 16)
  const g = parseInt(m[1].slice(2, 4), 16)
  const b = parseInt(m[1].slice(4, 6), 16)
  const dim = 0.35 + 0.65 * k
  return `rgb(${Math.round(r * dim)}, ${Math.round(g * dim)}, ${Math.round(b * dim)})`
}
