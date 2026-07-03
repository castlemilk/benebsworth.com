import type { BenchmarkModel, BenchmarkTask } from '../types'
import { spawn } from 'node:child_process'

export interface CliRunnerConfig {
  /** Base CLI command (e.g. 'agy', 'codex'). */
  command: string
  /**
   * Build CLI arguments for a prompt.
   * Receives the raw prompt and the registry model.
   */
  buildArgs: (prompt: string, model: BenchmarkModel) => string[]
  /** Parse token usage from stdout/stderr. Return undefined to estimate from output length. */
  parseTokens?: (stdout: string, stderr: string) => { tokensIn: number; tokensOut: number } | undefined
  /** Optional working directory for the CLI. */
  cwd?: string
  /** Optional environment variables. */
  env?: Record<string, string | undefined>
  /** Timeout in milliseconds. Defaults to 10 minutes. */
  timeoutMs?: number
}

export interface GenerationResponse {
  output: string
  tokensIn: number
  tokensOut: number
  runtimeMs: number
}

function estimateTokensFromChars(chars: number): number {
  // Rough heuristic: ~4 characters per token for English/code.
  return Math.max(0, Math.round(chars / 4))
}

function extractLikelyCode(stdout: string): string {
  // Many CLIs emit metadata lines before/after the artifact. Try to find the
  // first code-like start and last code-like end, preferring HTML/DOCTYPE
  // over markdown headers so landing-page/n-body outputs are preserved.
  const htmlStartMarkers = ['<!DOCTYPE', '<!doctype', '<html', '<HTML']
  const codeStartMarkers = ['```', 'import ', 'const ', 'function ', 'class ', 'def ']
  const endMarkers = ['</html>', '</HTML>', '```']

  let first = -1
  for (const marker of htmlStartMarkers) {
    const idx = stdout.indexOf(marker)
    if (idx !== -1 && (first === -1 || idx < first)) {
      first = idx
    }
  }

  if (first === -1) {
    for (const marker of codeStartMarkers) {
      const idx = stdout.indexOf(marker)
      if (idx !== -1 && (first === -1 || idx < first)) {
        first = idx
      }
    }
  }

  if (first === -1) return stdout.trim()

  // Trim trailing metadata after the closing </html> or final code fence.
  let last = -1
  for (const marker of endMarkers) {
    const idx = stdout.lastIndexOf(marker)
    if (idx !== -1) {
      const end = idx + marker.length
      if (last === -1 || end > last) last = end
    }
  }

  if (last === -1 || last <= first) {
    return stdout.slice(first).trim()
  }
  return stdout.slice(first, last).trim()
}

function runCli(
  command: string,
  args: string[],
  options: { cwd?: string; env?: Record<string, string | undefined>; timeoutMs: number }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    const timeout = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`Timeout after ${options.timeoutMs}ms: ${command} ${args.join(' ')}`))
    }, options.timeoutMs)

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })

    child.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })

    const finish = (code: number | null) => {
      clearTimeout(timeout)
      if (code !== 0 && code !== null) {
        reject(new Error(`CLI exited with code ${code}: ${stderr || stdout}`))
      } else {
        resolve({ stdout, stderr })
      }
    }
    child.on('exit', finish)
    child.on('close', finish)

    // Close stdin immediately; some CLIs (e.g. agy) wait for stdin EOF before running.
    child.stdin.end()
  })
}

export async function generateFromCli(
  config: CliRunnerConfig,
  _model: BenchmarkModel,
  task: BenchmarkTask
): Promise<GenerationResponse> {
  const start = Date.now()
  const args = config.buildArgs(task.prompt, _model)
  const timeoutMs = config.timeoutMs ?? 10 * 60 * 1000

  const { stdout, stderr } = await runCli(config.command, args, {
    cwd: config.cwd,
    env: config.env,
    timeoutMs,
  })

  const output = extractLikelyCode(stdout)
  const parsed = config.parseTokens?.(stdout, stderr)

  const tokensOut = parsed?.tokensOut ?? estimateTokensFromChars(output.length)
  const tokensIn = parsed?.tokensIn ?? estimateTokensFromChars(task.prompt.length)

  return {
    output,
    tokensIn,
    tokensOut,
    runtimeMs: Date.now() - start,
  }
}
