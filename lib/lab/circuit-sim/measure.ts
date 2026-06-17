/**
 * Oscilloscope-style statistics over a probe's ring buffer.
 *
 * Headless: pure numeric computation, no React/DOM/canvas/browser APIs.
 */

export interface TraceStats {
  /** Peak-to-peak: vmax - vmin */
  vpp: number
  /** Minimum sample value */
  vmin: number
  /** Maximum sample value */
  vmax: number
  /** Arithmetic mean of valid samples */
  mean: number
  /** Root-mean-square of valid samples */
  rms: number
  /** Estimated fundamental frequency (Hz), 0 if undeterminable */
  freq: number
}

const ZERO_STATS: TraceStats = { vpp: 0, vmin: 0, vmax: 0, mean: 0, rms: 0, freq: 0 }

/**
 * Compute trace statistics over the `count` valid samples of a ring buffer.
 *
 * Chronological reconstruction: when the buffer is full, the oldest sample
 * sits at `writeIdx`; otherwise samples start at index 0. Sample `i`
 * (0..count-1) lives at `samples[(startIdx + i) % length]`.
 *
 * @param samples  backing ring buffer
 * @param count    number of valid samples (count <= samples.length)
 * @param writeIdx next write position in the ring buffer
 * @param dt       seconds per sample (sample spacing)
 */
export function measureTrace(
  samples: Float64Array,
  count: number,
  writeIdx: number,
  dt: number,
): TraceStats {
  const len = samples.length
  const n = Math.min(Math.max(count, 0), len)
  if (n <= 0) return { ...ZERO_STATS }
  const startIdx = count < len ? 0 : writeIdx

  // Read chronologically into a contiguous scratch array for clean indexing.
  const ordered = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    ordered[i] = samples[(startIdx + i) % len]
  }

  let vmin = ordered[0]
  let vmax = ordered[0]
  let sum = 0
  let sumSq = 0
  for (let i = 0; i < n; i++) {
    const v = ordered[i]
    if (v < vmin) vmin = v
    if (v > vmax) vmax = v
    sum += v
    sumSq += v * v
  }

  const mean = sum / n
  const rms = Math.sqrt(sumSq / n)
  const vpp = vmax - vmin

  const freq = estimateFreq(ordered, n, mean, dt)

  return { vpp, vmin, vmax, mean, rms, freq }
}

/**
 * Estimate the fundamental frequency by detecting RISING crossings of the
 * mean level. The period is the average time between consecutive rising
 * crossings; freq = 1/period. Linear interpolation between the two samples
 * straddling a crossing yields a sub-sample (stable) estimate.
 *
 * Returns 0 if dt <= 0 or fewer than 2 rising crossings are found.
 */
function estimateFreq(
  ordered: Float64Array,
  n: number,
  mean: number,
  dt: number,
): number {
  if (dt <= 0 || n < 2) return 0

  let firstCross = -1
  let lastCross = -1
  let crossings = 0

  for (let i = 1; i < n; i++) {
    const prev = ordered[i - 1]
    const cur = ordered[i]
    // Rising crossing of the mean level: prev below, cur at/above.
    if (prev < mean && cur >= mean) {
      const denom = cur - prev
      // Fractional position within the [i-1, i] interval where value == mean.
      const frac = denom !== 0 ? (mean - prev) / denom : 0
      const crossTime = (i - 1 + frac) * dt
      if (firstCross < 0) firstCross = crossTime
      lastCross = crossTime
      crossings++
    }
  }

  if (crossings < 2) return 0

  const period = (lastCross - firstCross) / (crossings - 1)
  if (period <= 0) return 0
  return 1 / period
}
