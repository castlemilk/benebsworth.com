export type BenchmarkStatus = 'success' | 'fail' | 'timeout'

export interface BenchmarkModel {
  id: string
  name: string
  provider: string
  /** API model identifier, if it differs from the registry id (e.g. 'kimi-k2-7'). */
  apiModelId?: string
  costPer1kInputUsd: number
  costPer1kOutputUsd: number
  contextWindow: number
  capabilities: string
}

export interface BenchmarkCategory {
  slug: string
  label: string
  glyph: string
  accent: string
  blurb: string
}

export interface BenchmarkTask {
  id: string
  category: string
  title: string
  blurb: string
  prompt: string
  runtimeHint: string
  iterationsDefault: number
  methodNotes: string
  demoComponentName: string
  slug: string
}

export interface BenchmarkResult {
  taskId: string
  modelId: string
  score: number
  runtimeMs: number
  tokensIn: number
  tokensOut: number
  costUsd: number
  iterations: number
  status: BenchmarkStatus
  createdAt: string
  /** Raw generated output from the model (code, derivation, etc.) for side-by-side comparison. */
  output?: string
}

export interface BenchmarkRunConfig {
  tasks?: string[]
  models?: string[]
  iterations?: number
  seed?: number
}

export interface BenchmarkRunner {
  runTask(model: BenchmarkModel, task: BenchmarkTask, iterations: number): Promise<BenchmarkResult[]>
}

export interface Scorer {
  /** Score a generated output for a task. Returns 0-100. */
  score(output: string, task: BenchmarkTask): Promise<number> | number
}
