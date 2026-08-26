export interface LocalHardware {
  platform: string
  machine: string
  python: string
  cpu_brand: string
  'hw.ncpu': string
  'hw.memsize': string
  'hw.physicalcpu': string
  'hw.logicalcpu': string
  mem_gb: number
  macos: string
  chip: string
  cores_detail: string
  memory_str: string
  ollama_version: string
}

export interface LocalAggregate {
  ttft_ms_mean: number
  ttft_ms_p50: number
  prompt_tps_mean: number
  prompt_tps_median: number
  gen_tps_mean: number
  gen_tps_median: number
  gen_tps_min: number
  gen_tps_max: number
  wall_tps_mean: number
  total_wall_s_mean: number
  eval_count_mean: number
}

export interface LocalEntry {
  file: string
  prompt_set: string
  tokens: number
  aggregate: LocalAggregate
  runs: number
  warmup: number
  timestamp: string
}

export interface LocalModelResult {
  id: string
  displayName: string
  entries: LocalEntry[]
  summary: {
    gen_tps_mean: number | null
    gen_tps_min: number | null
    gen_tps_max: number | null
    ttft_ms_mean: number | null
    prompt_tps_mean: number | null
    samples: number
  }
  // enrichment from ollama show (optional)
  size_gb?: number
  params?: string
  quant?: string
  context?: number
}

export interface LocalDataset {
  generatedAt: string
  hardware: LocalHardware
  models: LocalModelResult[]
  rawFiles: string[]
}
