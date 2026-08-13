import type { BenchmarkModel, BenchmarkTask } from '../types'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface CliRunnerConfig {
  /** Base CLI command (e.g. 'agy', 'codex'). */
  command: string
  /**
   * Build CLI arguments for a prompt.
   * Receives the prompt with the artifact-delivery suffix already appended,
   * plus the registry model.
   */
  buildArgs: (prompt: string, model: BenchmarkModel) => string[]
  /** Parse token usage from stdout/stderr. Return undefined to estimate from output length. */
  parseTokens?: (stdout: string, stderr: string) => { tokensIn: number; tokensOut: number } | undefined
  /** Optional working directory for the CLI. Ignored when artifactViaFile is set. */
  cwd?: string
  /** Optional environment variables. */
  env?: Record<string, string | undefined>
  /** Timeout in milliseconds. Defaults to 10 minutes. */
  timeoutMs?: number
  /**
   * When true, the CLI is run inside a scratch temp dir and asked to write the
   * artifact to ./artifact.html instead of printing it (print-mode stdout is
   * often truncated). Falls back to stdout extraction if no file is produced.
   */
  artifactViaFile?: boolean
}

export interface GenerationResponse {
  output: string
  tokensIn: number
  tokensOut: number
  runtimeMs: number
}

const INLINE_PRINT_SUFFIX =
  '\n\nIMPORTANT: Do not create any files. Print the complete artifact source code inline as your only response.'

const FILE_ARTIFACT_SUFFIX =
  '\n\nIMPORTANT: Save the complete artifact as a single self-contained file at ./artifact.html in the current working directory. Do not print the artifact to stdout — after writing the file, print the absolute path of the file you wrote, then DONE.'

const ARTIFACT_FILENAME = 'artifact.html'

function estimateTokensFromChars(chars: number): number {
  // Rough heuristic: ~4 characters per token for English/code.
  return Math.max(0, Math.round(chars / 4))
}

/** Leading/trailing CLI chrome we can safely strip line-by-line. */
const CLI_CHROME_LINE =
  /^(OpenAI Codex|codex-cli|tokens used|workdir:|model:|provider:|approval:|sandbox:|reasoning effort:|-{5,}|\[\d{4}-\d{2}-\d{2}.*\])/i

/**
 * Extract the likely artifact from raw CLI stdout without ever slicing
 * mid-content. Precedence:
 *   1. A complete HTML document span (doctype/<html ... last </html>).
 *   2. The largest fenced code block (fences + language line stripped).
 *   3. The stdout with known CLI banner lines conservatively stripped from the
 *      leading and trailing edges only — never sliced at interior code markers.
 */
export function extractLikelyCode(stdout: string): string {
  // 1. Complete HTML document span.
  const htmlStart = stdout.search(/<!doctype\s+html|<html[\s>]/i)
  if (htmlStart !== -1) {
    const closeIdx = stdout.toLowerCase().lastIndexOf('</html>')
    if (closeIdx !== -1 && closeIdx > htmlStart) {
      return stdout.slice(htmlStart, closeIdx + '</html>'.length).trim()
    }
  }

  // 2. Largest fenced code block, fences and language line removed.
  const fenceRe = /```[^\n]*\n([\s\S]*?)```/g
  let largestBlock = ''
  let match: RegExpExecArray | null
  while ((match = fenceRe.exec(stdout)) !== null) {
    if (match[1].length > largestBlock.length) largestBlock = match[1]
  }
  if (largestBlock.trim().length > 0) return largestBlock.trim()

  // 3. Conservative chrome stripping: drop known banner/log lines (and blanks)
  // from the edges only. Never cut interior content.
  const lines = stdout.split('\n')
  let start = 0
  while (start < lines.length && (lines[start].trim() === '' || CLI_CHROME_LINE.test(lines[start].trim()))) {
    start++
  }
  let end = lines.length - 1
  while (end >= start && (lines[end].trim() === '' || CLI_CHROME_LINE.test(lines[end].trim()))) {
    end--
  }
  return lines.slice(start, end + 1).join('\n').trim()
}

function runCli(
  command: string,
  args: string[],
  options: { cwd?: string; env?: Record<string, string | undefined>; timeoutMs: number }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    // detached: true puts the CLI in its own process group so a timeout can
    // SIGTERM the whole group. CLIs like opencode spawn server grandchildren
    // (bun server) that inherit the pipes; killing only the direct child
    // leaves them alive, holding stdout open and leaking processes.
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
    })

    let stdout = ''
    let stderr = ''
    let settled = false
    const killGroup = (signal: NodeJS.Signals) => {
      if (child.pid === undefined) return
      try {
        process.kill(-child.pid, signal)
      } catch {
        // Process group already gone.
      }
    }
    const timeout = setTimeout(() => {
      settled = true
      killGroup('SIGTERM')
      // Give the group a moment to die before escalating; a wedged child
      // (e.g. a stuck server holding the pipes) gets SIGKILL.
      setTimeout(() => killGroup('SIGKILL'), 1000)
      reject(new Error(`Timeout after ${options.timeoutMs}ms: ${command} ${args.join(' ')}`))
    }, options.timeoutMs)
    // Never let a stray child keep the parent sweep process alive after the
    // run finishes — the promise has already settled by then.
    timeout.unref?.()

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
      if (settled) return
      settled = true
      reject(err)
    })

    const finish = (code: number | null) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      killGroup('SIGTERM')
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
  const timeoutMs = config.timeoutMs ?? 10 * 60 * 1000

  let scratchDir: string | undefined
  try {
    if (config.artifactViaFile) {
      scratchDir = await mkdtemp(join(tmpdir(), 'llm-bench-'))
    }

    const suffix = config.artifactViaFile ? FILE_ARTIFACT_SUFFIX : INLINE_PRINT_SUFFIX
    const args = config.buildArgs(task.prompt + suffix, _model)

    const { stdout, stderr } = await runCli(config.command, args, {
      cwd: scratchDir ?? config.cwd,
      env: config.env,
      timeoutMs,
    })

    let output: string | undefined
    if (scratchDir) {
      try {
        const fileContents = await readFile(join(scratchDir, ARTIFACT_FILENAME), 'utf8')
        if (fileContents.trim().length > 0) output = fileContents
      } catch {
        // No ./artifact.html — fall through to the directory scan.
      }
      if (output === undefined) {
        // Agent CLIs sometimes name the file themselves (landing.html,
        // index.html, …) despite the instruction. Take the largest HTML-ish
        // file they left in the scratch dir before giving up on file handoff.
        try {
          const entries = await readdir(scratchDir)
          let best: { file: string; size: number } | undefined
          for (const entry of entries) {
            if (!/\.(html?|svg)$/i.test(entry)) continue
            const info = await stat(join(scratchDir, entry))
            if (info.isFile() && (!best || info.size > best.size)) {
              best = { file: entry, size: info.size }
            }
          }
          if (best && best.size > 0) {
            const contents = await readFile(join(scratchDir, best.file), 'utf8')
            if (contents.trim().length > 0) output = contents
          }
        } catch {
          // Scratch dir unreadable — try the stdout-path fallback below.
        }
      }
      if (output === undefined) {
        // Some agent CLIs (agy) resolve relative paths against their OWN
        // workspace (e.g. ~/.gemini/antigravity-cli/scratch/) instead of the
        // process cwd — but they print the absolute path they wrote to. Parse
        // any absolute .html path from stdout and read the largest one that
        // exists. NOTE: this shared workspace path is also why file-handoff
        // CLIs must run at concurrency 1 — parallel iterations would
        // overwrite each other's artifact.
        const pathCandidates = new Set<string>()
        const pathRe = /(?:file:\/\/)?(\/[^\s)\]"'<>]+\.html?)/gi
        let pm: RegExpExecArray | null
        while ((pm = pathRe.exec(stdout)) !== null) pathCandidates.add(pm[1])
        let best: { contents: string; size: number } | undefined
        for (const candidate of pathCandidates) {
          try {
            const info = await stat(candidate)
            if (!info.isFile() || info.size === 0) continue
            if (!best || info.size > best.size) {
              best = { contents: await readFile(candidate, 'utf8'), size: info.size }
            }
          } catch {
            // Path doesn't exist — skip.
          }
        }
        if (best && best.contents.trim().length > 0) output = best.contents
      }
    }
    if (output === undefined) {
      output = extractLikelyCode(stdout)
    }

    const parsed = config.parseTokens?.(stdout, stderr)

    const tokensOut = parsed?.tokensOut ?? estimateTokensFromChars(output.length)
    const tokensIn = parsed?.tokensIn ?? estimateTokensFromChars(task.prompt.length)

    return {
      output,
      tokensIn,
      tokensOut,
      runtimeMs: Date.now() - start,
    }
  } finally {
    if (scratchDir) {
      await rm(scratchDir, { recursive: true, force: true })
    }
  }
}
