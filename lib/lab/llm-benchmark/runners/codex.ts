import type { BenchmarkModel, BenchmarkTask } from '../types'
import { generateFromCli, type CliRunnerConfig, type GenerationResponse } from './cli'

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
  task: BenchmarkTask
): Promise<GenerationResponse> {
  const codexModel = config.model ?? model.apiModelId
  const baseArgs = ['exec', '--ephemeral', '--sandbox', 'read-only']
  if (codexModel) baseArgs.push('-c', `model="${codexModel}"`)
  baseArgs.push('--')

  const runner: CliRunnerConfig = {
    command: 'codex',
    buildArgs: (prompt) => [
      ...baseArgs,
      `${prompt}\n\nIMPORTANT: Do not create any files. Print the complete artifact source code inline as your only response.`,
    ],
    parseTokens: parseCodexTokens,
    timeoutMs: config.timeoutMs,
  }
  return generateFromCli(runner, model, task)
}
