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
  task: BenchmarkTask,
  iterationIndex = 0
): Promise<GenerationResponse> {
  const agyModel = config.model ?? model.apiModelId ?? model.name
  const runner: CliRunnerConfig = {
    command: 'agy',
    // agy print mode ("-p") truncates stdout around 10k chars, so the artifact
    // is written to a scratch-dir file instead of being printed inline.
    artifactViaFile: true,
    // Unique artifact per iteration: agy resolves relative paths against its
    // own workspace (~/.gemini/antigravity-cli/scratch/), so a shared name
    // would let parallel jobs overwrite each other. The printed absolute
    // path is read back regardless of where it lands.
    artifactName: (i) => `artifact-${model.id}-${task.id}-${i}.html`,
    buildArgs: (prompt) => [
      '-p', prompt,
      '--model', agyModel,
      // Headless benchmark runs have no interactive permission prompt, so
      // agy's tool calls (write_to_file for the artifact) would otherwise
      // be auto-denied with "no output produced — a tool required permission".
      // --dangerously-skip-permissions auto-approves so the file handoff
      // succeeds. This is safe in the benchmark context: the prompt, the
      // scratch dir, and the write target are all controlled by us.
      '--dangerously-skip-permissions',
    ],
    timeoutMs: config.timeoutMs,
  }
  return generateFromCli(runner, model, task, iterationIndex)
}
