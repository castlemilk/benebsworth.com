export type NeuralGraphArch =
  | 'ffnn'
  | 'rnn'
  | 'lstm'
  | 'vae'
  | 'gan'
  | 'transformer'

export type NodeRole =
  // Yellow family — input variants
  | 'input'
  | 'backfed'
  | 'noisy'
  // Green family — hidden variants
  | 'hidden'
  | 'gen'
  | 'latent'
  | 'spiking'
  | 'capsule'
  // Orange family — output variants
  | 'output'
  | 'disc'
  | 'match'
  // Blue family — memory / recurrent
  | 'recurrent'
  | 'memory'
  | 'gating'
  | 'attn'
  // Pink family — kernel / conv / pool
  | 'kernel'
  | 'conv'
  | 'pool'
  // Probabilistic / sampling
  | 'sample'
  // Transformer tokens
  | 'token'

export type Node = {
  id: string
  layer: number
  row: number
  /** A short label, e.g. "h₁", "μ", "G". */
  tag?: string
  /**
   * A semantic role, used for colour. The NodeRole determines both
   * the colour and the visual encoding (shape, fill, self-loop arc)
   * via `nodeStyleFor` below. New roles should be added to BOTH
   * the NodeRole union and the switch in `nodeStyleFor`.
   */
  role?: NodeRole
}

export type Edge = {
  from: string
  to: string
}

export type Layer = {
  id: string
  title: string
  /** Nodes placed in this layer, top to bottom. */
  nodes: Node[]
  /** Edges originating FROM this layer's nodes (i.e. to the next layer). */
  edges: Edge[]
  /** Where this layer sits on screen, in normalised SVG units (0..1 of width). */
  x: number
}

/**
 * A weight matrix for the network. For FFNN-style fully connected layers we
 * store one weight per (from, to) edge — `weights[edgeIndex]` is a number in
 * roughly [-1, 1]. For architectures that have ad-hoc inner weights (e.g.
 * VAE's μ/σ projection, transformer's per-head projection) we expose a single
 * scale by giving them a synthetic "weight" per edge too; the architecture
 * decides how to use it.
 */
export type Weights = number[]

export type SimState = {
  /** activations[i][j] is the activation of node j in layer i. */
  activations: number[][]
  /** Architecture-defined aux state, e.g. running time for VAE noise. */
  aux: Record<string, number[]>
}
