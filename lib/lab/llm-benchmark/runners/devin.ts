import type { BenchmarkModel, BenchmarkTask } from '../types'
import { generateFromCli, type GenerationResponse } from './cli'
import { CLI_COMMANDS } from './execution-target'

export interface DevinConfig {
  model?: string
  timeoutMs?: number
}

/** Devin 3000.11.1 print mode, with one fresh workspace and artifact per iteration. */
export async function generateDevin(
  config: DevinConfig,
  model: BenchmarkModel,
  task: BenchmarkTask,
  iterationIndex = 0,
): Promise<GenerationResponse> {
  const modelId = config.model ?? model.apiModelId
  if (!modelId) throw new Error(`Devin model id missing for ${model.id}`)
  return generateFromCli({
    command: CLI_COMMANDS.Devin,
    artifactViaFile: true,
    artifactName: (i) => `artifact-${model.id}-${task.id}-${i}.html`,
    buildArgs: (prompt) => [
      '--model', modelId,
      '--permission-mode', 'accept-edits',
      '--respect-workspace-trust', 'false',
      '--print', prompt,
    ],
    timeoutMs: config.timeoutMs,
  }, model, task, iterationIndex)
}
