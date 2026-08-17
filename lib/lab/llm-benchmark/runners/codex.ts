import type { BenchmarkModel, BenchmarkTask } from '../types'
import { generateFromCli, type CliRunnerConfig, type GenerationResponse } from './cli'
import { CLI_COMMANDS } from './execution-target'

export interface CodexConfig {
  /** Codex model, e.g. "gpt-5.5" or "o3". Defaults to the model's apiModelId. */
  model?: string
  /** Per-call timeout in milliseconds. */
  timeoutMs?: number
}

function parseCodexTokens(stdout: string, stderr: string): { tokensIn: number; tokensOut: number } | undefined {
  const text = stdout + '\n' + stderr
  // Codex sometimes prints a line like "tokens used\n15,268"
  const match = text.match(/tokens used[\s:]*(\d[\d,]*)/i)
  if (!match) return undefined
  const total = Number(match[1].replace(/,/g, ''))
  if (!Number.isFinite(total) || total <= 0) return undefined
  // Codex reports total tokens used; split heuristically between input and output.
  return { tokensIn: Math.round(total * 0.25), tokensOut: Math.round(total * 0.75) }
}

export async function generateCodex(
  config: CodexConfig,
  model: BenchmarkModel,
  task: BenchmarkTask,
  iterationIndex = 0
): Promise<GenerationResponse> {
  const codexModel = config.model ?? model.apiModelId
  // workspace-write so codex can save ./artifact.html into the scratch cwd;
  // --skip-git-repo-check because the scratch tmpdir is not a git repo and
  // codex otherwise refuses with "Not inside a trusted directory" (verified
  // against codex-cli 0.134.0).
  const baseArgs = ['exec', '--ephemeral', '--skip-git-repo-check', '--sandbox', 'workspace-write']
  if (codexModel) baseArgs.push('-c', `model="${codexModel}"`)
  baseArgs.push('--')

  const runner: CliRunnerConfig = {
    // Single-sourced with the sweep pre-flight (see execution-target.ts).
    command: CLI_COMMANDS.Codex,
    // Printing inline risks the extractor slicing the artifact; write it to a
    // scratch-dir file and read it back instead. Codex honors the spawn cwd,
    // so each call's fresh mkdtemp scratch dir already isolates artifacts;
    // the unique name is belt-and-braces for parallel jobs.
    artifactViaFile: true,
    artifactName: (i) => `artifact-${model.id}-${task.id}-${i}.html`,
    buildArgs: (prompt) => [...baseArgs, prompt],
    parseTokens: parseCodexTokens,
    timeoutMs: config.timeoutMs,
  }
  return generateFromCli(runner, model, task, iterationIndex)
}
