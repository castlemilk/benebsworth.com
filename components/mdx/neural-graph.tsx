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
import { createPortal } from 'react-dom'
import { useScrollActivity } from './use-scroll-activity'
import { useInViewport } from './use-in-viewport'

/* ------------------------------------------------------------------ *
 * Public types
 * ------------------------------------------------------------------ */

export type NeuralGraphArch =
  | 'ffnn'
  | 'rnn'
  | 'lstm'
  | 'vae'
  | 'gan'
  | 'transformer'

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

type NodeRole =
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

type Node = {
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

type Edge = {
  from: string
  to: string
}

type Layer = {
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
type Weights = number[]

type ArchSpec = {
  caption: string
  layers: Layer[]
  /** Number of input values. */
  inputDim: number
  /**
   * Labels for the input sliders, in order. Default: `x0`, `x1`, ...
   * Architectures should override with semantically meaningful labels
   * (e.g. `x(t-1)`, `x(t)`, `x(t+1)` for an RNN; `z₁`, `z₂`, `z₃` for a
   * GAN's noise vector; `t₁`, `t₂`, `t₃` for a Transformer's tokens).
   * The last label can be the right panel's "what does this mean" hint
   * (rendered to the right of the Input heading), but the convention is
   * to put the hint in `inputHint` instead.
   */
  inputLabels?: string[]
  /**
   * Short hint shown in the right panel next to the "Input" heading.
   * E.g. "−1 … +1" for generic inputs, "noise" for a GAN, "per time
   * step" for an RNN.
   */
  inputHint?: string
  /**
   * Initial values for the input sliders, in order. Default: all 0.3.
   * Each architecture should override this with values that make the
   * diagram interesting from the first frame — e.g. a step-like input
   * for an RNN so the hidden state evolves visibly across time steps,
   * or asymmetric noise for a GAN so the generator's output varies
   * per-dimension.
   */
  defaultInput?: number[]
  /**
   * Initialise a weight vector. `seed` is the integer PRNG seed the user
   * (or the reroll button) picked. The returned array must be indexed by
   * `edges[].index` in the order produced by the spec's layers.
   */
  initWeights: (seed: number) => Weights
  /**
   * Step function: given state + input + weights + weightScale, return the
   * next state. `t` is the frame index (for any time-dependent noise like
   * the VAE's reparameterisation).
   */
  step: (
    state: SimState,
    input: number[],
    weights: Weights,
    weightScale: number,
    t: number,
  ) => SimState
}

type SimState = {
  /** activations[i][j] is the activation of node j in layer i. */
  activations: number[][]
  /** Architecture-defined aux state, e.g. running time for VAE noise. */
  aux: Record<string, number[]>
}

/* ------------------------------------------------------------------ *
 * Tiny PRNG (deterministic; no external dep)
 * ------------------------------------------------------------------ */

function mulberry32(a: number) {
  let t = a >>> 0
  return function () {
    t = (t + 0x6d2b79f5) >>> 0
    let r = t
    r = Math.imul(r ^ (r >>> 15), r | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const EMPTY_AUX: Record<string, number[]> = {}

/* ------------------------------------------------------------------ *
 * Per-architecture specs
 * ------------------------------------------------------------------ */

const W = 760 // SVG viewBox width
const H = 360 // SVG viewBox height
const NODE_R = 9
const EDGE_OPACITY = 0.18

/**
 * Build a fully-connected feed-forward spec with `sizes` neurons per layer
 * and per-edge random weights. The first layer is the input, the last is
 * the output. Weights live in a flat array indexed by the order of edges
 * (layer i → layer i+1, row-major).
 */
function makeFcSpec(
  arch: NeuralGraphArch,
  titles: string[],
  sizes: number[],
  roles: NodeRole[],
  caption: string,
  seedSalt: number,
  inputLabels?: string[],
  inputHint?: string,
  defaultInput?: number[],
): ArchSpec {
  const layers: Layer[] = titles.map((title, i) => ({
    id: `L${i}`,
    title,
    x: 0.08 + (0.84 * i) / Math.max(1, titles.length - 1),
    nodes: [],
    edges: [],
  }))
  layers.forEach((layer, i) => {
    const n = sizes[i]
    const role = roles[i]
    for (let r = 0; r < n; r++) {
      layer.nodes.push({
        id: `${layer.id}-${r}`,
        layer: i,
        row: r,
        tag: r === 0 ? layer.title : undefined,
        role,
      })
    }
  })
  for (let i = 0; i < layers.length - 1; i++) {
    const a = layers[i]
    const b = layers[i + 1]
    for (const na of a.nodes) for (const nb of b.nodes) a.edges.push({ from: na.id, to: nb.id })
  }
  return {
    caption,
    inputDim: sizes[0],
    layers,
    ...(inputLabels ? { inputLabels } : {}),
    ...(inputHint ? { inputHint } : {}),
    ...(defaultInput ? { defaultInput } : {}),
    initWeights: (seed) => {
      const total = layers.slice(0, -1).reduce((s, l, i) => s + l.nodes.length * layers[i + 1].nodes.length, 0)
      const rand = mulberry32((seed * 1009 + seedSalt) >>> 0)
      const w: number[] = new Array(total)
      for (let i = 0; i < total; i++) w[i] = rand() * 2 - 1
      return w
    },
    step: (state, input, weights, weightScale) => {
      if (state.activations.length === 0) {
        const acts: number[][] = []
        const prev = input.slice(0, sizes[0])
        while (prev.length < sizes[0]) prev.push(0)
        acts.push(prev)
        for (let i = 1; i < layers.length; i++) acts.push(new Array(layers[i].nodes.length).fill(0))
        return { activations: acts, aux: EMPTY_AUX }
      }
      const acts = state.activations.map((a) => a.slice())
      let wIdx = 0
      for (let i = 1; i < layers.length; i++) {
        const prev = acts[i - 1]
        const cur = acts[i]
        for (let j = 0; j < cur.length; j++) {
          let s = 0
          for (let k = 0; k < prev.length; k++) {
            s += prev[k] * (weights[wIdx] ?? 0) * weightScale
            wIdx++
          }
          // squash: tanh for hidden, linear for output
          acts[i][j] = roles[i] === 'output' ? Math.tanh(s * 0.5) : Math.tanh(s)
        }
      }
      return { activations: acts, aux: EMPTY_AUX }
    },
  }
}

function makeFfnn(): ArchSpec {
  return makeFcSpec(
    'ffnn',
    ['Input', 'Hidden 1', 'Hidden 2', 'Output'],
    [4, 5, 4, 2],
    ['input', 'hidden', 'hidden', 'output'],
    'Feed-forward: a value at the input is weighted, summed, and pushed forward to the next layer.',
    7,
    ['x₀', 'x₁', 'x₂', 'x₃'],
    '−1 … +1',
    // Mixed-sign, varied magnitudes — every input neuron should
    // contribute something different, so different hidden units light
    // up and the final output depends on all four inputs.
    [0.8, 0.2, -0.5, 0.6],
  )
}

function makeRnn(): ArchSpec {
  // Unroll the RNN across 3 time steps. Same hidden column shifted in time.
  const layers: Layer[] = [
    { id: 'in', title: 'Input', x: 0.10, nodes: [], edges: [] },
    { id: 'h0', title: 'h(t-1)', x: 0.30, nodes: [], edges: [] },
    { id: 'h1', title: 'h(t)', x: 0.50, nodes: [], edges: [] },
    { id: 'h2', title: 'h(t+1)', x: 0.70, nodes: [], edges: [] },
    { id: 'out', title: 'Output', x: 0.90, nodes: [], edges: [] },
  ]
  const sizes = [3, 4, 4, 4, 2]
  // The three hidden layers are the *same* cell unrolled across time.
  // In the Asimov legend they would be "Recurrent Cell" (blue, solid,
  // with a self-loop arc on top) — see colour legend at the top of
  // the post. We tag them `recurrent` so the renderer draws the
  // self-loop arc and uses the blue memory/recurrent colour.
  const roles: NodeRole[] = ['input', 'recurrent', 'recurrent', 'recurrent', 'output']
  layers.forEach((layer, i) => {
    const n = sizes[i]
    const role = roles[i]
    for (let r = 0; r < n; r++) {
      layer.nodes.push({ id: `${layer.id}-${r}`, layer: i, row: r, tag: r === 0 ? layer.title : undefined, role })
    }
  })
  // forward connections input -> h0 -> h1 -> h2 -> out
  for (let i = 0; i < layers.length - 1; i++) {
    const a = layers[i]
    const b = layers[i + 1]
    for (const na of a.nodes) for (const nb of b.nodes) a.edges.push({ from: na.id, to: nb.id })
  }
  // recurrent wrap: h2 -> h0
  const h2 = layers[3]
  const h0 = layers[1]
  for (const na of h2.nodes) for (const nb of h0.nodes) h2.edges.push({ from: na.id, to: nb.id })

  const totalEdges = layers.reduce((s, l) => s + l.edges.length, 0)
  return {
    caption: 'Recurrent: the hidden state at time t+1 depends on h(t) as well as the current input. The curved edge on top is the recurrence.',
    inputDim: 3,
    inputLabels: ['x(t−1)', 'x(t)', 'x(t+1)'],
    inputHint: 'per time step',
    // Step-like input — a clear rising signal across the three time
    // steps, so the hidden state visibly evolves as t increases. With
    // all-equal inputs the recurrent recurrence is invisible.
    defaultInput: [-0.5, 0.0, 0.5],
    layers,
    initWeights: (seed) => {
      const rand = mulberry32((seed * 1009 + 42) >>> 0)
      const w: number[] = new Array(totalEdges)
      for (let i = 0; i < totalEdges; i++) w[i] = rand() * 2 - 1
      return w
    },
    step: (state, input, weights, weightScale) => {
      if (state.activations.length === 0) {
        const acts: number[][] = []
        const prev = input.slice(0, 3)
        while (prev.length < 3) prev.push(0)
        acts.push(prev)
        for (let i = 1; i < layers.length; i++) acts.push(new Array(layers[i].nodes.length).fill(0))
        return { activations: acts, aux: EMPTY_AUX }
      }
      const acts = state.activations.map((a) => a.slice())
      let wIdx = 0
      // input -> h0
      for (let j = 0; j < acts[1].length; j++) {
        let s = 0
        for (let k = 0; k < acts[0].length; k++) {
          s += acts[0][k] * (weights[wIdx++] ?? 0) * weightScale
        }
        acts[1][j] = Math.tanh(s)
      }
      // hN-1 -> hN, hN -> hN+1 (forward)
      for (let i = 2; i < layers.length - 1; i++) {
        for (let j = 0; j < acts[i].length; j++) {
          let s = 0
          for (let k = 0; k < acts[i - 1].length; k++) {
            s += acts[i - 1][k] * (weights[wIdx++] ?? 0) * weightScale
          }
          acts[i][j] = Math.tanh(s * 0.7)
        }
      }
      // recurrent wrap h_last -> h0
      const hLast = acts[layers.length - 2]
      for (let j = 0; j < acts[1].length; j++) {
        let s = 0
        for (let k = 0; k < hLast.length; k++) {
          s += hLast[k] * (weights[wIdx++] ?? 0) * weightScale
        }
        // fold the recurrent influence into h0
        acts[1][j] = Math.tanh(acts[1][j] * 0.6 + s * 0.4)
      }
      // output
      const out = acts[layers.length - 1]
      for (let j = 0; j < out.length; j++) {
        let s = 0
        for (let k = 0; k < acts[layers.length - 2].length; k++) {
          s += acts[layers.length - 2][k] * (weights[wIdx++] ?? 0) * weightScale
        }
        out[j] = Math.tanh(s)
      }
      return { activations: acts, aux: EMPTY_AUX }
    },
  }
}

function makeLstm(): ArchSpec {
  // 3 input nodes, 1 node per gate, 1 memory cell, 2 output nodes. Edges
  // are: input -> {i,f,o}, {i,f,o} -> memory, memory -> out[0,1].
  const layers: Layer[] = [
    { id: 'in', title: 'Input x', x: 0.10, nodes: [], edges: [] },
    { id: 'ig', title: 'Input gate i', x: 0.32, nodes: [], edges: [] },
    { id: 'fog', title: 'Forget gate f', x: 0.50, nodes: [], edges: [] },
    { id: 'og', title: 'Output gate o', x: 0.68, nodes: [], edges: [] },
    { id: 'mem', title: 'Cell state c', x: 0.82, nodes: [], edges: [] },
    { id: 'out', title: 'Output h', x: 0.94, nodes: [], edges: [] },
  ]
  for (let r = 0; r < 3; r++) layers[0].nodes.push({ id: `in-${r}`, layer: 0, row: r, tag: r === 0 ? 'x' : undefined, role: 'input' })
  layers[1].nodes.push({ id: 'ig-0', layer: 1, row: 0, tag: 'i', role: 'gating' })
  layers[2].nodes.push({ id: 'fog-0', layer: 2, row: 0, tag: 'f', role: 'gating' })
  layers[3].nodes.push({ id: 'og-0', layer: 3, row: 0, tag: 'o', role: 'gating' })
  layers[4].nodes.push({ id: 'mem-0', layer: 4, row: 0, tag: 'c', role: 'memory' })
  layers[5].nodes.push({ id: 'out-0', layer: 5, row: 0, tag: 'h', role: 'output' })
  layers[5].nodes.push({ id: 'out-1', layer: 5, row: 1, tag: 'h', role: 'output' })

  for (const na of layers[0].nodes) {
    layers[0].edges.push({ from: na.id, to: 'ig-0' })
    layers[0].edges.push({ from: na.id, to: 'fog-0' })
    layers[0].edges.push({ from: na.id, to: 'og-0' })
  }
  layers[1].edges.push({ from: 'ig-0', to: 'mem-0' })
  layers[2].edges.push({ from: 'fog-0', to: 'mem-0' })
  layers[3].edges.push({ from: 'og-0', to: 'mem-0' })
  layers[4].edges.push({ from: 'mem-0', to: 'out-0' })
  layers[4].edges.push({ from: 'mem-0', to: 'out-1' })
  const totalEdges = layers.reduce((s, l) => s + l.edges.length, 0)
  return {
    caption: 'LSTM cell: input, forget and output gates (i, f, o) control what enters and leaves the memory cell c. The cell carries state across time.',
    inputDim: 3,
    inputLabels: ['x(t−1)', 'x(t)', 'x(t+1)'],
    inputHint: 'per time step',
    // Same rising step as the RNN — lets the user see how the gates
    // and memory cell respond to a coherent time-varying signal.
    defaultInput: [-0.5, 0.0, 0.5],
    layers,
    initWeights: (seed) => {
      const rand = mulberry32((seed * 1009 + 99) >>> 0)
      const w: number[] = new Array(totalEdges)
      for (let i = 0; i < totalEdges; i++) w[i] = rand() * 2 - 1
      return w
    },
    step: (state, input, weights, weightScale) => {
      if (state.activations.length === 0) {
        const acts: number[][] = []
        const prev = input.slice(0, 3)
        while (prev.length < 3) prev.push(0)
        acts.push(prev)
        for (let i = 1; i < layers.length; i++) acts.push(new Array(layers[i].nodes.length).fill(0))
        return { activations: acts, aux: EMPTY_AUX }
      }
      const acts = state.activations.map((a) => a.slice())
      let wIdx = 0
      // Each gate gets a noisy function of the input, with its own weights.
      for (let g = 1; g <= 3; g++) {
        let s = 0
        for (let k = 0; k < acts[0].length; k++) {
          s += acts[0][k] * (weights[wIdx++] ?? 0) * weightScale
        }
        acts[g][0] = 1 / (1 + Math.exp(-s))
      }
      // memory cell
      let mem = 0
      for (let k = 0; k < acts[0].length; k++) {
        mem += acts[0][k] * (weights[wIdx++] ?? 0) * weightScale
      }
      wIdx += 2 // skip the i and o gate->mem weights (we use gates from the activations above)
      mem = Math.tanh(mem) * (0.5 + acts[2][0] * 0.5)
      acts[4][0] = mem
      // output
      for (let j = 0; j < acts[5].length; j++) {
        acts[5][j] = Math.tanh(mem * (0.5 + acts[3][0] * 0.5))
      }
      return { activations: acts, aux: EMPTY_AUX }
    },
  }
}

function makeVae(): ArchSpec {
  // Show the hourglass: input → encoder → latent (μ, σ) → sample z → decoder → output.
  const layers: Layer[] = [
    { id: 'in', title: 'Input', x: 0.08, nodes: [], edges: [] },
    { id: 'e1', title: 'Encoder', x: 0.28, nodes: [], edges: [] },
    { id: 'mu', title: 'μ', x: 0.48, nodes: [], edges: [] },
    { id: 'sg', title: 'σ', x: 0.56, nodes: [], edges: [] },
    { id: 'z', title: 'z ~ N(μ,σ²)', x: 0.66, nodes: [], edges: [] },
    { id: 'd1', title: 'Decoder', x: 0.84, nodes: [], edges: [] },
    { id: 'out', title: 'Output', x: 0.95, nodes: [], edges: [] },
  ]
  const cfg: Array<[string, number, NodeRole, string?]> = [
    ['in', 3, 'input'],
    ['e1', 4, 'hidden'],
    ['mu', 1, 'latent', 'μ'],
    ['sg', 1, 'latent', 'σ'],
    ['z', 1, 'sample', 'z'],
    ['d1', 4, 'hidden'],
    ['out', 3, 'output'],
  ]
  cfg.forEach(([lid, n, role, tag], i) => {
    const layer = layers[i]
    for (let r = 0; r < n; r++) {
      layer.nodes.push({ id: `${lid}-${r}`, layer: i, row: r, tag: r === 0 ? (tag ?? lid) : undefined, role })
    }
  })
  for (const na of layers[0].nodes) for (const nb of layers[1].nodes) layers[0].edges.push({ from: na.id, to: nb.id })
  for (const na of layers[1].nodes) {
    layers[1].edges.push({ from: na.id, to: 'mu-0' })
    layers[1].edges.push({ from: na.id, to: 'sg-0' })
  }
  layers[2].edges.push({ from: 'mu-0', to: 'z-0' })
  layers[3].edges.push({ from: 'sg-0', to: 'z-0' })
  for (const na of layers[4].nodes) for (const nb of layers[5].nodes) layers[4].edges.push({ from: na.id, to: nb.id })
  for (const na of layers[5].nodes) for (const nb of layers[6].nodes) layers[5].edges.push({ from: na.id, to: nb.id })
  const totalEdges = layers.reduce((s, l) => s + l.edges.length, 0)
  return {
    caption: 'Variational autoencoder: encode input to a distribution (μ, σ), sample a code z from N(μ, σ²), then decode z to a reconstruction.',
    inputDim: 3,
    inputLabels: ['x₁', 'x₂', 'x₃'],
    inputHint: 'input features',
    // One high, one near-zero, one negative — gives the encoder a
    // non-trivial (μ, σ) pair to compute, so the sampling step
    // produces visible noise in z.
    defaultInput: [0.8, 0.0, -0.6],
    layers,
    initWeights: (seed) => {
      const rand = mulberry32((seed * 1009 + 7) >>> 0)
      const w: number[] = new Array(totalEdges)
      for (let i = 0; i < totalEdges; i++) w[i] = rand() * 2 - 1
      return w
    },
    step: (state, input, weights, weightScale, _t) => {
      const tPrev = state.aux['t']?.[0] ?? 0
      if (state.activations.length === 0) {
        const acts: number[][] = []
        const prev = input.slice(0, 3)
        while (prev.length < 3) prev.push(0)
        acts.push(prev)
        for (let i = 1; i < layers.length; i++) acts.push(new Array(layers[i].nodes.length).fill(0))
        return { activations: acts, aux: { t: [0] } }
      }
      const acts = state.activations.map((a) => a.slice())
      // encoder
      for (let j = 0; j < acts[1].length; j++) {
        let s = 0
        for (let k = 0; k < acts[0].length; k++) s += acts[0][k]
        s *= weightScale
        acts[1][j] = Math.tanh(s * 0.6)
      }
      // mu, sigma (decorative, not really weight-driven — just visualise)
      let mu = 0
      for (let k = 0; k < acts[1].length; k++) mu += acts[1][k]
      acts[2][0] = Math.tanh(mu * 0.5)
      let sg = 0
      for (let k = 0; k < acts[1].length; k++) sg += acts[1][k] * 0.7
      acts[3][0] = 0.4 + 0.5 / (1 + Math.exp(-sg))
      // z = mu + sigma * eps
      const eps = Math.sin(tPrev) * 0.8
      acts[4][0] = Math.tanh(acts[2][0] + acts[3][0] * eps)
      // decoder
      for (let j = 0; j < acts[5].length; j++) {
        let s = 0
        for (let k = 0; k < acts[4].length; k++) s += acts[4][k]
        s *= weightScale
        acts[5][j] = Math.tanh(s * 0.6)
      }
      // output
      for (let j = 0; j < acts[6].length; j++) {
        let s = 0
        for (let k = 0; k < acts[5].length; k++) s += acts[5][k]
        acts[6][j] = Math.tanh(s * 0.3)
      }
      return { activations: acts, aux: { t: [tPrev + 0.13] } }
    },
  }
}

function makeGan(): ArchSpec {
  const layers: Layer[] = [
    { id: 'z', title: 'Noise z', x: 0.08, nodes: [], edges: [] },
    { id: 'g', title: 'Generator G', x: 0.30, nodes: [], edges: [] },
    { id: 'gs', title: 'G(z) sample', x: 0.46, nodes: [], edges: [] },
    { id: 'r', title: 'Real data', x: 0.46, nodes: [], edges: [] },
    { id: 'd', title: 'Discriminator D', x: 0.72, nodes: [], edges: [] },
    { id: 'o', title: 'P(real)', x: 0.92, nodes: [], edges: [] },
  ]
  for (let r = 0; r < 3; r++) layers[0].nodes.push({ id: `z-${r}`, layer: 0, row: r, tag: r === 0 ? 'z' : undefined, role: 'input' })
  for (let r = 0; r < 4; r++) layers[1].nodes.push({ id: `g-${r}`, layer: 1, row: r, tag: r === 0 ? 'G' : undefined, role: 'gen' })
  for (let r = 0; r < 3; r++) layers[2].nodes.push({ id: `gs-${r}`, layer: 2, row: r, tag: r === 0 ? 'G(z)' : undefined, role: 'gen' })
  for (let r = 0; r < 3; r++) layers[3].nodes.push({ id: `r-${r}`, layer: 3, row: r, tag: r === 0 ? 'real' : undefined, role: 'input' })
  for (let r = 0; r < 4; r++) layers[4].nodes.push({ id: `d-${r}`, layer: 4, row: r, tag: r === 0 ? 'D' : undefined, role: 'disc' })
  layers[5].nodes.push({ id: 'o-0', layer: 5, row: 0, tag: 'p', role: 'output' })

  for (const na of layers[0].nodes) for (const nb of layers[1].nodes) layers[0].edges.push({ from: na.id, to: nb.id })
  for (const na of layers[1].nodes) for (const nb of layers[2].nodes) layers[1].edges.push({ from: na.id, to: nb.id })
  for (const na of layers[2].nodes) for (const nb of layers[4].nodes) layers[2].edges.push({ from: na.id, to: nb.id })
  for (const na of layers[3].nodes) for (const nb of layers[4].nodes) layers[3].edges.push({ from: na.id, to: nb.id })
  for (const na of layers[4].nodes) for (const nb of layers[5].nodes) layers[4].edges.push({ from: na.id, to: nb.id })
  const totalEdges = layers.reduce((s, l) => s + l.edges.length, 0)
  return {
    caption: "GAN: G maps noise to fake samples, D scores samples as real or fake. D's loss becomes G's signal.",
    inputDim: 3,
    inputLabels: ['z₁', 'z₂', 'z₃'],
    inputHint: 'noise vector',
    // Asymmetric noise — different magnitude and sign in each dim, so
    // the generator's output varies per-dimension. With all-equal
    // noise the generator produces a uniform output that doesn't
    // illustrate the architecture.
    defaultInput: [0.6, -0.4, 0.2],
    layers,
    initWeights: (seed) => {
      const rand = mulberry32((seed * 1009 + 1234) >>> 0)
      const w: number[] = new Array(totalEdges)
      for (let i = 0; i < totalEdges; i++) w[i] = rand() * 2 - 1
      return w
    },
    step: (state, input, weights, weightScale, _t) => {
      const tPrev = state.aux['t']?.[0] ?? 0
      if (state.activations.length === 0) {
        const acts: number[][] = []
        const prev = input.slice(0, 3)
        while (prev.length < 3) prev.push(0)
        acts.push(prev)
        for (let i = 1; i < layers.length; i++) acts.push(new Array(layers[i].nodes.length).fill(0))
        acts[3] = [0.7, 0.4, -0.2]
        return { activations: acts, aux: { t: [0] } }
      }
      const acts = state.activations.map((a) => a.slice())
      // G
      for (let j = 0; j < acts[1].length; j++) {
        let s = 0
        for (let k = 0; k < acts[0].length; k++) s += acts[0][k] * 0.8
        s *= weightScale
        acts[1][j] = Math.tanh(s)
      }
      // G(z)
      for (let j = 0; j < acts[2].length; j++) {
        let s = 0
        for (let k = 0; k < acts[1].length; k++) s += acts[1][k] * 0.8
        acts[2][j] = Math.tanh(s)
      }
      // D — average of the two inputs
      const dIn: number[] = new Array(3).fill(0).map((_, j) => 0.5 * (acts[2][j] + acts[3][j]))
      for (let j = 0; j < acts[4].length; j++) {
        let s = 0
        for (let k = 0; k < dIn.length; k++) s += dIn[k] * 0.8
        acts[4][j] = Math.tanh(s)
      }
      // P(real): distance between fake and real, in [0,1]
      let diff = 0
      for (let j = 0; j < acts[2].length; j++) diff += Math.abs(acts[2][j] - acts[3][j])
      diff /= acts[2].length
      acts[5][0] = 1 / (1 + diff)
      // slowly drift the real data column
      acts[3] = acts[3].map((v, j) => v * 0.99 + 0.01 * Math.sin(tPrev + j))
      return { activations: acts, aux: { t: [tPrev + 0.2] } }
    },
  }
}

function makeTransformer(): ArchSpec {
  // Multi-head self-attention. 3 input tokens, 3 attention heads, 3 outputs.
  const layers: Layer[] = [
    { id: 'tok', title: 'Tokens', x: 0.10, nodes: [], edges: [] },
    { id: 'emb', title: 'Embeddings', x: 0.26, nodes: [], edges: [] },
    { id: 'h1', title: 'Head 1', x: 0.50, nodes: [], edges: [] },
    { id: 'h2', title: 'Head 2', x: 0.62, nodes: [], edges: [] },
    { id: 'h3', title: 'Head 3', x: 0.74, nodes: [], edges: [] },
    { id: 'out', title: 'Output', x: 0.92, nodes: [], edges: [] },
  ]
  for (let r = 0; r < 3; r++) {
    layers[0].nodes.push({ id: `tok-${r}`, layer: 0, row: r, tag: r === 0 ? 'x₁' : r === 1 ? 'x₂' : 'x₃', role: 'token' })
    layers[1].nodes.push({ id: `emb-${r}`, layer: 1, row: r, tag: undefined, role: 'hidden' })
  }
  for (let r = 0; r < 3; r++) {
    layers[2].nodes.push({ id: `h1-${r}`, layer: 2, row: r, role: 'attn' })
    layers[3].nodes.push({ id: `h2-${r}`, layer: 3, row: r, role: 'attn' })
    layers[4].nodes.push({ id: `h3-${r}`, layer: 4, row: r, role: 'attn' })
    layers[5].nodes.push({ id: `out-${r}`, layer: 5, row: r, tag: r === 0 ? 'y' : undefined, role: 'output' })
  }
  for (let r = 0; r < 3; r++) layers[0].edges.push({ from: `tok-${r}`, to: `emb-${r}` })
  for (let r = 0; r < 3; r++) for (let h = 0; h < 3; h++) {
    layers[1].edges.push({ from: `emb-${r}`, to: `h1-${h}` })
    layers[1].edges.push({ from: `emb-${r}`, to: `h2-${h}` })
    layers[1].edges.push({ from: `emb-${r}`, to: `h3-${h}` })
  }
  for (let h = 0; h < 3; h++) for (let r = 0; r < 3; r++) {
    layers[2].edges.push({ from: `h1-${r}`, to: `out-${h}` })
    layers[3].edges.push({ from: `h2-${r}`, to: `out-${h}` })
    layers[4].edges.push({ from: `h3-${r}`, to: `out-${h}` })
  }
  const totalEdges = layers.reduce((s, l) => s + l.edges.length, 0)
  return {
    caption: 'Transformer (multi-head attention): every token attends to every other token across several parallel heads.',
    inputDim: 3,
    inputLabels: ['t₁', 't₂', 't₃'],
    inputHint: 'token embeddings',
    // Three different tokens — the attention mechanism should weight
    // them differently. With all-equal tokens, attention weights
    // collapse to 1/n and the architecture's signature is invisible.
    defaultInput: [0.7, 0.2, -0.5],
    layers,
    initWeights: (seed) => {
      const rand = mulberry32((seed * 1009 + 31) >>> 0)
      const w: number[] = new Array(totalEdges)
      for (let i = 0; i < totalEdges; i++) w[i] = rand() * 2 - 1
      return w
    },
    step: (state, input, weights, weightScale) => {
      if (state.activations.length === 0) {
        const acts: number[][] = []
        const prev = input.slice(0, 3)
        while (prev.length < 3) prev.push(0)
        acts.push(prev)
        for (let i = 1; i < layers.length; i++) acts.push(new Array(layers[i].nodes.length).fill(0))
        return { activations: acts, aux: EMPTY_AUX }
      }
      const acts = state.activations.map((a) => a.slice())
      // embeddings
      for (let j = 0; j < acts[1].length; j++) {
        acts[1][j] = Math.tanh(acts[0][j] * 1.1)
      }
      // heads
      for (let h = 0; h < 3; h++) {
        const idx = 2 + h
        for (let j = 0; j < acts[idx].length; j++) {
          let s = 0
          for (let k = 0; k < acts[1].length; k++) s += acts[1][k] * 0.8
          s *= weightScale
          acts[idx][j] = 1 / (1 + Math.exp(-s))
        }
      }
      // output
      for (let j = 0; j < acts[5].length; j++) {
        let s = 0
        for (let h = 0; h < 3; h++) s += acts[2 + h][j] * 0.8
        acts[5][j] = Math.tanh(s - 0.5)
      }
      return { activations: acts, aux: EMPTY_AUX }
    },
  }
}

const ARCHS: Record<NeuralGraphArch, () => ArchSpec> = {
  ffnn: makeFfnn,
  rnn: makeRnn,
  lstm: makeLstm,
  vae: makeVae,
  gan: makeGan,
  transformer: makeTransformer,
}

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

function colourFor(role: NodeRole | undefined): string {
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

function nodeStyleFor(role: NodeRole | undefined): NodeStyle {
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
function roleLabel(role: NodeRole | undefined): string {
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
function roleDescription(role: NodeRole | undefined): string {
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
function nodeTooltipFor(n: Node, l: Layer, v: number): string {
  const label = roleLabel(n.role)
  const where = `${l.title} · row ${n.row + 1}`
  const act = `activation: ${v.toFixed(2)}`
  return `${label}\n${where}\n${act}`
}

function fillFor(role: NodeRole | undefined, v: number): string {
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

/**
 * Tiny SVG swatch that mirrors the colour/shape/fill/arc encoding
 * used in the post's main colour-legend block, but for ONE role.
 * Rendered inside the per-figure inline legend below the toolbar.
 */
function SwatchSVG({ role, size = 14 }: { role: NodeRole; size?: number }) {
  const colour = colourFor(role)
  const style = nodeStyleFor(role)
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.35
  const stroke = colour
  const isHollow = style.fill === 'hollow'
  const fill = isHollow ? 'var(--color-surface, #0f0f0f)' : colour
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {style.shape === 'circle' && (
        <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={isHollow ? 1.2 : 0.4} />
      )}
      {style.shape === 'square' && (
        <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={fill} stroke={stroke} strokeWidth={isHollow ? 1.2 : 0.4} />
      )}
      {style.shape === 'triangle' && (
        <polygon
          points={`${cx},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={isHollow ? 1.2 : 0.4}
        />
      )}
      {style.selfLoop && (
        <path
          d={`M ${cx - r * 0.5} ${cy - r * 0.9} A ${r * 0.7} ${r * 0.7} 0 0 1 ${cx + r * 0.5} ${cy - r * 0.9}`}
          fill="none"
          stroke={stroke}
          strokeWidth={1}
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

/**
 * Floating, styled tooltip that pops up when the user hovers a node
 * (in the graph) or a value in the activations panel. Renders into
 * a portal at the document body so it escapes any `overflow: hidden`
 * ancestors and any stacking-context quirks.
 *
 * The tooltip is element-anchored (not cursor-following): when the
 * user hovers a node, the tooltip appears above that node, centered
 * horizontally. It flips below the node if it would overflow the top
 * of the viewport. There's a small caret pointing at the node.
 *
 * Renders nothing if there's no hovered node, or if we're on the
 * server (no document.body to portal into).
 */
const TOOLTIP_WIDTH = 280
const TOOLTIP_GAP = 10

function NodeTooltip({
  data,
}: {
  data: {
    node: Node
    layer: Layer
    activation: number
    anchor: { left: number; top: number; width: number; height: number }
  } | null
}) {
  const [pos, setPos] = useState<{
    left: number
    top: number
    placement: 'above' | 'below'
  } | null>(null)

  useEffect(() => {
    if (!data) {
      setPos(null)
      return
    }
    const { anchor } = data
    // Center horizontally on the anchor. Clamp to viewport.
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    let left = anchor.left + anchor.width / 2 - TOOLTIP_WIDTH / 2
    left = Math.max(8, Math.min(viewportW - TOOLTIP_WIDTH - 8, left))
    // Default: above the anchor. Flip below if there isn't enough
    // room. We don't know the tooltip's exact rendered height, so
    // we estimate it (~150px for the 5-row layout) and adjust on
    // a second pass if needed via state.
    let top = anchor.top - 150 - TOOLTIP_GAP
    let placement: 'above' | 'below' = 'above'
    if (top < 8) {
      top = anchor.top + anchor.height + TOOLTIP_GAP
      placement = 'below'
    }
    // Clamp vertically to viewport.
    top = Math.max(8, Math.min(viewportH - 160, top))
    setPos({ left, top, placement })
  }, [data?.node.id, data?.anchor.left, data?.anchor.top])

  if (typeof document === 'undefined') return null
  if (!data || !pos) return null
  const { node, layer, activation } = data
  const role: NodeRole = node.role ?? 'hidden'
  const colour = colourFor(role)
  const style = nodeStyleFor(role)
  // Caret x: relative to the tooltip, how far from its left edge is
  // the anchor's centre? The tooltip was placed so that
  // (left + TOOLTIP_WIDTH/2) ≈ (anchor.left + anchor.width/2), so
  // the caret should be at TOOLTIP_WIDTH/2. But if the tooltip was
  // clamped, this shifts. Recompute from the actual positions.
  const anchorCenterX = data.anchor.left + data.anchor.width / 2
  const caretX = Math.max(12, Math.min(TOOLTIP_WIDTH - 12, anchorCenterX - pos.left))

  return createPortal(
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        width: TOOLTIP_WIDTH,
        zIndex: 100,
        pointerEvents: 'none',
      }}
      className="rounded-md border border-[var(--color-border)] bg-surface text-fg shadow-2xl"
    >
      {/* Caret pointing at the node */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: caretX - 6,
          width: 0,
          height: 0,
          ...(pos.placement === 'above'
            ? {
                bottom: -6,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid var(--color-border)',
              }
            : {
                top: -6,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: '6px solid var(--color-border)',
              }),
        }}
      />
      <div className="px-3.5 py-2.5">
        {/* Header: swatch + role label */}
        <div className="flex items-center gap-2">
          <SwatchSVG role={role} size={18} />
          <div className="font-mono text-[0.78rem] font-semibold uppercase tracking-wider text-fg">
            {roleLabel(role)}
          </div>
        </div>
        {/* Description */}
        <p className="mt-1.5 text-[0.78rem] leading-snug text-fg/70">
          {roleDescription(role)}
        </p>
        {/* Divider */}
        <div className="my-2 h-px bg-[var(--color-border)]" />
        {/* Data rows */}
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[0.72rem]">
          <span className="text-muted">Layer</span>
          <span className="text-fg/85">{layer.title}</span>
          <span className="text-muted">Row</span>
          <span className="text-fg/85">{node.row + 1}</span>
          <span className="text-muted">Role colour</span>
          <span className="flex items-center gap-1.5 text-fg/85">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: colour, border: `1px solid ${colour}55` }}
            />
            {colour}
          </span>
          <span className="text-muted">Activation</span>
          <span
            className="font-semibold"
            style={{ color: activation >= 0 ? '#7ed4a3' : '#ff8a8a' }}
          >
            {activation >= 0 ? '+' : ''}
            {activation.toFixed(3)}
          </span>
          {node.tag && (
            <>
              <span className="text-muted">Tag</span>
              <span className="text-fg/85">{node.tag}</span>
            </>
          )}
          {style.selfLoop && (
            <>
              <span className="text-muted">Recurrent</span>
              <span className="text-fg/85">yes</span>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Inline legend strip for one figure. Lists the unique NodeRole
 * values used in this figure's spec, in the order they first appear
 * (input → output direction). Each entry is a clickable button —
 * clicking it toggles a "highlight" mode where only nodes of that
 * role stay at full opacity, and other roles are dimmed. Clicking
 * the same swatch again (or the "All" button) clears the highlight.
 *
 * Deduplicates roles that appear in multiple layers (e.g. multiple
 * hidden layers all share the "hidden" role).
 */
function FigureLegend({
  spec,
  highlightRole,
  onToggle,
}: {
  spec: ArchSpec
  highlightRole: NodeRole | null
  onToggle: (r: NodeRole | null) => void
}) {
  const seen = new Set<NodeRole>()
  const roles: NodeRole[] = []
  for (const l of spec.layers) {
    for (const n of l.nodes) {
      const r = n.role ?? 'hidden'
      if (!seen.has(r)) {
        seen.add(r)
        roles.push(r)
      }
    }
  }
  if (roles.length === 0) return null
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--color-border)] bg-surface-2/40 px-5 py-1.5 text-[0.7rem]"
      aria-label="Cell types in this diagram"
    >
      <span className="font-mono uppercase tracking-wider text-muted">Legend</span>
      {roles.map((r) => {
        const active = highlightRole === r
        return (
          <button
            key={r}
            type="button"
            onClick={() => onToggle(active ? null : r)}
            aria-pressed={active}
            title={
              active
                ? `Click to clear highlight on ${roleLabel(r)}`
                : `Click to highlight all ${roleLabel(r)} nodes`
            }
            className={`flex items-center gap-1.5 rounded font-mono text-fg/75 transition-colors px-1.5 py-0.5 ${
              active
                ? 'bg-blog/15 text-blog ring-1 ring-blog/40'
                : 'hover:bg-surface-2'
            }`}
          >
            <SwatchSVG role={r} size={14} />
            <span className="text-[0.7rem]">{roleLabel(r)}</span>
          </button>
        )
      })}
      {highlightRole !== null && (
        <button
          type="button"
          onClick={() => onToggle(null)}
          className="ml-1 rounded border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted transition-colors hover:border-blog hover:text-blog"
        >
          Show all
        </button>
      )}
    </div>
  )
}

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
