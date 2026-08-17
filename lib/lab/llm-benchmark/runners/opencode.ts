import type { BenchmarkModel, BenchmarkTask } from '../types'
import { generateFromCli, type CliRunnerConfig, type GenerationResponse } from './cli'
import { CLI_COMMANDS } from './execution-target'

export interface OpencodeConfig {
  /** opencode model id, e.g. "opencode/deepseek-v4-flash-free". Defaults to the model's apiModelId. */
  model?: string
  /** Per-call timeout in milliseconds. */
  timeoutMs?: number
}

/**
 * opencode CLI runner (the same CLI this benchmark report is written with).
 *
 * opencode run is non-interactive: the prompt is passed on the command line
 * and the final reply is printed to stdout. Tools are available to the model
 * (write/edit/bash), so HTML artifacts are written to a file and handed back
 * through the shared cli.ts file-handoff path.
 *
 * NOTE (verified 2026-08-13): opencode resolves relative paths against its
 * OWN session directory (e.g. /private/tmp) rather than the process cwd —
 * but it prints the absolute path it wrote, and cli.ts fallback #3 (parse
 * absolute .html paths from stdout) reads it back. Each iteration uses a
 * unique artifact filename (model-task-index), so concurrent jobs never
 * collide and sweeps can run at concurrency > 1.
 */
export async function generateOpencode(
  config: OpencodeConfig,
  model: BenchmarkModel,
  task: BenchmarkTask,
  iterationIndex = 0
): Promise<GenerationResponse> {
  const opencodeModel = config.model ?? model.apiModelId
  const runner: CliRunnerConfig = {
    // Single-sourced with the sweep pre-flight (see execution-target.ts).
    command: CLI_COMMANDS.OpenCode,
    artifactViaFile: true,
    // Unique artifact per iteration (model + task + index): opencode resolves
    // relative paths against ITS OWN session dir (verified: /private/tmp),
    // so a shared name would let parallel jobs overwrite each other. The
    // printed absolute path is read back regardless of where it lands.
    artifactName: (i) => `artifact-${model.id}-${task.id}-${i}.html`,
    buildArgs: (prompt) => ['run', ...(opencodeModel ? ['-m', opencodeModel] : []), prompt],
    timeoutMs: config.timeoutMs,
  }
  return generateFromCli(runner, model, task, iterationIndex)
}
