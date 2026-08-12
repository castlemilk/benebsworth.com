import type { BenchmarkModel, BenchmarkTask } from '../types'
import { generateFromCli, type CliRunnerConfig, type GenerationResponse } from './cli'

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
 * (write/edit/bash), so HTML artifacts are written to ./artifact.html and
 * handed back through the shared cli.ts file-handoff path.
 *
 * NOTE (verified 2026-08-12): opencode resolves relative paths against its
 * OWN session directory (/private/tmp here) rather than the process cwd, and
 * prints the absolute path it wrote — cli.ts fallback #3 (parse absolute
 * .html paths from stdout) reads it back. Because that path is shared, this
 * provider must run at concurrency 1, like the agy file-handoff route.
 */
export async function generateOpencode(
  config: OpencodeConfig,
  model: BenchmarkModel,
  task: BenchmarkTask
): Promise<GenerationResponse> {
  const opencodeModel = config.model ?? model.apiModelId
  const runner: CliRunnerConfig = {
    command: 'opencode',
    artifactViaFile: true,
    buildArgs: (prompt) => ['run', ...(opencodeModel ? ['-m', opencodeModel] : []), prompt],
    timeoutMs: config.timeoutMs,
  }
  return generateFromCli(runner, model, task)
}
