import type { Layer, NeuralGraphArch, NodeRole, SimState, Weights } from './types'

export type ArchSpec = {
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

export function makeFfnn(): ArchSpec {
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

export function makeRnn(): ArchSpec {
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

export function makeLstm(): ArchSpec {
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

export function makeVae(): ArchSpec {
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

export function makeGan(): ArchSpec {
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

export function makeTransformer(): ArchSpec {
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

export const ARCHS: Record<NeuralGraphArch, () => ArchSpec> = {
  ffnn: makeFfnn,
  rnn: makeRnn,
  lstm: makeLstm,
  vae: makeVae,
  gan: makeGan,
  transformer: makeTransformer,
}
