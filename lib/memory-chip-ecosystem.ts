export type BandwidthInput = {
  busBits: number
  pinGbps: number
}

export type BandwidthResult = {
  gbPerSecond: number
  tbPerSecond: number
}

export type AiMemoryInput = {
  /** Model parameter count, in billions. */
  paramsB: number
  weightBits: number
  layers: number
  kvHeads: number
  headDim: number
  contextTokens: number
  batch: number
  kvBytes: number
}

export type AiMemoryFootprint = {
  weightsGb: number
  kvCacheGb: number
  totalGb: number
}

export type DramChargeInput = {
  elapsedMs: number
  refreshMs: number
}

export type DramChargeState = {
  charge: number
  label: 'fresh' | 'margin' | 'refresh now'
  needsRefresh: boolean
}

export type ShareInput = {
  label: string
  value: number
}

export type NormalizedShare = ShareInput & {
  rawValue: number
  percent: number
}

const round = (value: number, decimals: number) => {
  const scale = 10 ** decimals
  return Math.round(value * scale) / scale
}

export function calcBandwidth(input: BandwidthInput): BandwidthResult {
  const gbPerSecond = (input.busBits * input.pinGbps) / 8
  return {
    gbPerSecond: round(gbPerSecond, 2),
    tbPerSecond: round(gbPerSecond / 1000, 2),
  }
}

export function calcAiMemoryFootprint(input: AiMemoryInput): AiMemoryFootprint {
  const weightsGb = input.paramsB * (input.weightBits / 8)
  const kvCacheGb =
    (2 *
      input.layers *
      input.kvHeads *
      input.headDim *
      input.contextTokens *
      input.batch *
      input.kvBytes) /
    1_000_000_000

  return {
    weightsGb: round(weightsGb, 2),
    kvCacheGb: round(kvCacheGb, 2),
    totalGb: round(weightsGb + kvCacheGb, 2),
  }
}

export function dramChargeAt(input: DramChargeInput): DramChargeState {
  const refreshMs = Math.max(1, input.refreshMs)
  const elapsedMs = Math.max(0, input.elapsedMs)
  const charge = Math.max(0, 1 - elapsedMs / refreshMs)
  const needsRefresh = charge === 0
  const label = needsRefresh ? 'refresh now' : charge > 0.66 ? 'fresh' : 'margin'

  return {
    charge: round(charge, 2),
    label,
    needsRefresh,
  }
}

export function normalizeShare(items: ShareInput[]): NormalizedShare[] {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.value), 0)

  return items.map((item) => ({
    ...item,
    rawValue: item.value,
    percent: total > 0 ? (Math.max(0, item.value) / total) * 100 : 0,
  }))
}
