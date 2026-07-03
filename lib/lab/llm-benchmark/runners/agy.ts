import type { BenchmarkModel, BenchmarkTask } from '../types'
import { generateFromCli, type CliRunnerConfig, type GenerationResponse } from './cli'

export interface AgyConfig {
  /** Agy model name, e.g. "Gemini 3.5 Flash (High)". Defaults to the model's apiModelId or name. */
  model?: string
  /** Per-call timeout in milliseconds. */
  timeoutMs?: number
}

export async function generateAgy(
  config: AgyConfig,
  model: BenchmarkModel,
  task: BenchmarkTask
): Promise<GenerationResponse> {
  const agyModel = config.model ?? model.apiModelId ?? model.name
  const runner: CliRunnerConfig = {
    command: 'agy',
    buildArgs: (prompt) => [
      '-p',
      `${prompt}\n\nIMPORTANT: Do not create any files. Print the complete artifact source code inline as your only response.`,
      '--model',
      agyModel,
    ],
    timeoutMs: config.timeoutMs,
  }
  return generateFromCli(runner, model, task)
}
