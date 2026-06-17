/**
 * Attention math + data for the "Attention, From the Inside Out" blog post.
 *
 * Pure, framework-free, SSR-safe. Shared by `<AttentionHeatmap>` and
 * `<SoftmaxLab>` so the two visualisations stay numerically in sync.
 *
 * ── Honesty note ───────────────────────────────────────────────────────
 * The raw "compatibility scores" below are hand-tuned to tell an
 * interpretable story (e.g. the pronoun "it" resolves to "cat"). They
 * stand in for the dot product QKᵀ that a real model would compute from
 * learned embeddings. The *mechanism* this post teaches — the 1/√dₖ
 * scaling and the row-wise softmax — is computed exactly, in real time,
 * by {@link softmaxRow}. This mirrors how `neural-graph.tsx` uses
 * hand-tuned "weights" with real forward-pass math: the data is
 * illustrative, the algorithm is exact.
 */

/** The toy sentence, tokenised. Self-attention: these are both keys and queries. */
export const TOKENS = ['the', 'cat', 'sat', 'because', 'it', 'napped'] as const

/** Per-head key dimension used for the scale factor √dₖ. Toy value. */
export const D_K = 4

/** Default scale (√dₖ) the UI opens at — the "correct" scaling for this toy. */
export const DEFAULT_SCALE = Math.sqrt(D_K) // 2

/** Slider bounds for the scale factor, in √dₖ units. */
export const SCALE_MIN = 1
export const SCALE_MAX = 16

/**
 * Raw compatibility scores S[i][j] = "how strongly query token i wants to
 * look at key token j". Stands in for QKᵀ. Tuned so the softmax produces a
 * linguistically-plausible attention pattern (subject→verb, pronoun→
 * antecedent, determiner→noun).
 *
 *      key →   the   cat   sat  because    it  napped
 * query ↓
 *   the      [ 1.0,  3.2,  0.4,   0.1,  0.0,   0.2]
 *   cat      [ 2.8,  1.2,  2.6,   0.3,  0.5,   1.4]
 *   sat      [ 0.6,  3.4,  1.0,   2.2,  0.4,   1.1]
 *   because  [ 0.2,  0.5,  2.9,   0.8,  1.6,   2.4]
 *   it       [ 0.3,  3.8,  0.6,   0.9,  1.1,   2.0]
 *   napped   [ 0.4,  1.8,  1.2,   0.7,  3.1,   0.9]
 */
export const RAW_SCORES: number[][] = [
  [1.0, 3.2, 0.4, 0.1, 0.0, 0.2],
  [2.8, 1.2, 2.6, 0.3, 0.5, 1.4],
  [0.6, 3.4, 1.0, 2.2, 0.4, 1.1],
  [0.2, 0.5, 2.9, 0.8, 1.6, 2.4],
  [0.3, 3.8, 0.6, 0.9, 1.1, 2.0],
  [0.4, 1.8, 1.2, 0.7, 3.1, 0.9],
]

/** One row of RAW_SCORES, indexed by query position. */
export function rawRow(i: number): number[] {
  return RAW_SCORES[i] ?? []
}

/**
 * Scaled dot-product attention scores, pre-softmax:
 *
 *     score[i][j] = S[i][j] / √dₖ
 *
 * `scale` is √dₖ (default {@link DEFAULT_SCALE}). Pass a smaller scale to
 * sharpen the distribution, larger to flatten it.
 */
export function scaledScores(scale: number = DEFAULT_SCALE): number[][] {
  const s = scale <= 0 ? DEFAULT_SCALE : scale
  return RAW_SCORES.map((row) => row.map((v) => v / s))
}

/**
 * Row-wise softmax. Exactly what a transformer computes:
 *
 *     p[i][j] = exp(score[i][j]) / Σ_k exp(score[i][k])
 *
 * Numerically stable: subtract the row max before exponentiating.
 * Returns a matrix of probabilities; each row sums to 1.
 */
export function attentionMatrix(scale: number = DEFAULT_SCALE): number[][] {
  const s = scale <= 0 ? DEFAULT_SCALE : scale
  return RAW_SCORES.map((row) => {
    const scaled = row.map((v) => v / s)
    const m = Math.max(...scaled)
    const exps = scaled.map((v) => Math.exp(v - m))
    const sum = exps.reduce((a, b) => a + b, 0)
    return exps.map((e) => e / sum)
  })
}

/** Softmax of a single row (used by `<SoftmaxLab>` to walk one row through
 *  the pipeline). Returns the four intermediate stages so the visualiser
 *  can morph between them. */
export type SoftmaxStages = {
  raw: number[]
  scaled: number[]
  exps: number[]
  probs: number[]
  /** Σ exps — the normalising denominator. */
  partition: number
}

export function softmaxStages(row: number[], scale: number = DEFAULT_SCALE): SoftmaxStages {
  const s = scale <= 0 ? DEFAULT_SCALE : scale
  const scaled = row.map((v) => v / s)
  const m = Math.max(...scaled)
  const exps = scaled.map((v) => Math.exp(v - m))
  const partition = exps.reduce((a, b) => a + b, 0)
  const probs = exps.map((e) => e / partition)
  return { raw: row.slice(), scaled, exps, probs, partition }
}

/** Index of the argmax token a query attends to (for callouts / annotations). */
export function attendsTo(rowIdx: number, scale: number = DEFAULT_SCALE): number {
  const probs = attentionMatrix(scale)[rowIdx]
  let best = 0
  for (let j = 1; j < probs.length; j++) if (probs[j] > probs[best]) best = j
  return best
}
