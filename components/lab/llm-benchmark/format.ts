export function formatScore(score: number): string {
  return score.toFixed(1)
}

export function formatRuntime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`
  const min = Math.floor(ms / 60_000)
  const sec = Math.round((ms % 60_000) / 1000)
  return `${min}m ${sec.toString().padStart(2, '0')}s`
}

export function formatCost(usd: number): string {
  if (usd === 0) return 'free'
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(3)}`
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return `${n}`
}

export function formatContextWindow(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return `${n}`
}

export function isFreeModel(model: {
  costPer1kInputUsd: number
  costPer1kOutputUsd: number
}): boolean {
  return model.costPer1kInputUsd === 0 && model.costPer1kOutputUsd === 0
}

/** Compact "$X in / $Y out / 1M" pricing; "Free" for the $0/$0 tier. */
export function formatPricingPer1M(model: {
  costPer1kInputUsd: number
  costPer1kOutputUsd: number
}): string {
  if (isFreeModel(model)) return 'Free'
  return `$${(model.costPer1kInputUsd * 1000).toFixed(2)} in / $${(model.costPer1kOutputUsd * 1000).toFixed(2)} out`
}

/** Short-form release date for a yyyy-mm-dd ISO string. */
export function formatReleaseDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'short' })
}
