import type { BenchmarkModel, BenchmarkTask } from '../types'
import { generateFromCli, type GenerationResponse } from './cli'
import { CLI_COMMANDS } from './execution-target'

export const DEVIN_FILE_DELIVERY = '\nUse the sandboxed exec tool to create the artifact file; direct write/edit tools require interactive approval in this sandbox mode. Keep all generated files within the current workspace.'

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
    requireArtifactFile: true,
    artifactName: (i) => `artifact-${model.id}-${task.id}-${i}.html`,
    buildArgs: (prompt) => [
      '--model', modelId,
      '--sandbox', '--permission-mode', 'autonomous',
      '--respect-workspace-trust', 'false',
      '--print', prompt + DEVIN_FILE_DELIVERY,
    ],
    timeoutMs: config.timeoutMs,
  }, model, task, iterationIndex)
}
