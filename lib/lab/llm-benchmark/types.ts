export type BenchmarkStatus = 'success' | 'partial' | 'fail' | 'timeout'

/**
 * Where a result came from. 'live' results were produced by real API/CLI
 * harness runs; 'seeded' results are hand-authored sample data used to
 * scaffold the UI before a model has been run for real. The UI must always
 * disclose seeded results and exclude them from headline verdicts.
 */
export type BenchmarkSource = 'live' | 'seeded'

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

/**
 * One aggregated record per task × model.
 *
 * Field semantics (one record aggregates `iterations` API calls):
 *  - score:      mean 0-100 score across SUCCESSFUL iterations (0 if none)
 *  - runtimeMs:  mean wall-clock per SUCCESSFUL iteration
 *  - tokensIn/tokensOut: TOTALS across all iterations
 *  - costUsd:    TOTAL estimated spend across all iterations
 *  - status:     'success' = all iterations succeeded; 'partial' = some;
 *                'fail' = none; 'timeout' = none, and the last error was a timeout
 */
export interface BenchmarkResult {
  taskId: string
  modelId: string
  score: number
  runtimeMs: number
  tokensIn: number
  tokensOut: number
  costUsd: number
  iterations: number
  /** How many of the iterations succeeded (absent on older records = all succeeded). */
  iterationsSucceeded?: number
  status: BenchmarkStatus
  createdAt: string
  /** 'live' (real harness run) or 'seeded' (hand-authored sample data). */
  source?: BenchmarkSource
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
