/**
 * Sampling math for the "Temperature & sampling" section of the
 * Attention post. Pure, framework-free, SSR-safe.
 *
 * The whole point of this module, pedagogically: generation is *the same
 * softmax* the reader already met in attention — now applied to the
 * output logits over the vocabulary, with a temperature divisor T that
 * does for sampling exactly what √dₖ did for attention (controls how
 * peaked the distribution is).
 *
 * The candidate logits below are hand-tuned to tell a story (two strong
 * favourites, a meaningful mid-range, a couple of long shots). The math
 * on top — temperature scaling, top-k, top-p, sampling — is exact.
 */

/** Sentence stem the model is continuing. */
export const STEM = 'the musician finished the set and took a bow from the'

/** Candidate next-tokens, in display order. */
export const CANDIDATES = [
  'stage',
  'audience',
  'orchestra',
  'crowd',
  'violin',
  'conductor',
  'piano',
  'drums',
] as const

/**
 * Raw output logits for the next token. Hand-tuned so the distribution
 * has a clear shape at T=1: two favourites ("stage", "audience"), a
 * meaningful middle, a couple of long shots.
 */
export const LOGITS: number[] = [4.2, 3.8, 2.1, 1.9, 1.0, 0.6, -0.2, -0.8]

export const TEMP_MIN = 0.1
export const TEMP_MAX = 2.0
export const TEMP_DEFAULT = 1.0

export const TOPK_MIN = 1
export const TOPK_MAX = CANDIDATES.length
export const TOPK_DEFAULT = CANDIDATES.length // no truncation by default

export const TOPP_MIN = 0.1
export const TOPP_MAX = 1.0
export const TOPP_DEFAULT = 1.0 // no truncation by default

/**
 * Temperature-scaled softmax over the logits:
 *
 *     p_i = exp(logit_i / T) / Σ exp(logit_j / T)
 *
 * T → 0 collapses to argmax (greedy). T → ∞ flattens to uniform.
 * Numerically stable (subtract the max before exponentiating).
 */
export function softmaxTemp(logits: number[], T: number): number[] {
  const t = T <= 0 ? 0.01 : T
  const scaled = logits.map((l) => l / t)
  const m = Math.max(...scaled)
  const exps = scaled.map((l) => Math.exp(l - m))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

/**
 * Top-k truncation: keep only the k highest-probability tokens, zero the
 * rest, renormalise so the survivors sum to 1. Returns the truncated +
 * renormalised distribution (same length as the input, with zeros where
 * tokens were dropped).
 */
export function applyTopK(probs: number[], k: number): number[] {
  const kk = Math.max(1, Math.min(k, probs.length))
  if (kk >= probs.length) return probs.slice()
  // indices of the top-k
  const idx = probs.map((p, i) => [p, i] as const).sort((a, b) => b[0] - a[0])
  const keep = new Set(idx.slice(0, kk).map(([, i]) => i))
  const out = probs.map((p, i) => (keep.has(i) ? p : 0))
  const sum = out.reduce((a, b) => a + b, 0)
  return sum > 0 ? out.map((p) => p / sum) : out
}

/**
 * Top-p (nucleus) truncation: keep the smallest set of tokens whose
 * cumulative probability ≥ p, zero the rest, renormalise. Unlike top-k,
 * the number of survivors varies with how confident the model is.
 */
export function applyTopP(probs: number[], p: number): number[] {
  if (p >= 1) return probs.slice()
  const order = probs
    .map((pr, i) => [pr, i] as const)
    .sort((a, b) => b[0] - a[0])
  const keep = new Set<number>()
  let cum = 0
  for (const [pr, i] of order) {
    keep.add(i)
    cum += pr
    if (cum >= p) break
  }
  const out = probs.map((pr, i) => (keep.has(i) ? pr : 0))
  const sum = out.reduce((a, b) => a + b, 0)
  return sum > 0 ? out.map((pr) => pr / sum) : out
}

/** Full sampling distribution after temperature + top-k + top-p. */
export function sampleDistribution(
  T: number,
  topK: number,
  topP: number,
): number[] {
  return applyTopP(applyTopK(softmaxTemp(LOGITS, T), topK), topP)
}

/**
 * Deterministic pseudo-sample from a distribution, seeded so the demo is
 * reproducible. Uses a tiny LCG; returns the chosen token index.
 * `nonce` lets the caller force a fresh draw each click.
 */
export function sampleIndex(probs: number[], seed: number, nonce: number): number {
  let s = (seed * 2654435761 + nonce * 40503) >>> 0
  const r = (() => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  })()
  let acc = 0
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i]
    if (r < acc) return i
  }
  return probs.length - 1
}

/** Human label for the temperature regime. */
export function tempLabel(T: number): string {
  if (T <= 0.35) return '· greedy-ish'
  if (T <= 0.8) return '· focused'
  if (T <= 1.2) return '· balanced'
  return '· wild'
}
