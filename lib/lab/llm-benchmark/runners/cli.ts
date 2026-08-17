import type { BenchmarkModel, BenchmarkTask } from '../types'
import { redactArgs, redactText } from '../redact'
import { resolveExecutionTarget, type CliRunnerConfig } from './execution-target'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// The runner config is DEFINED in execution-target.ts (it is the input to
// `resolveExecutionTarget`) and re-exported here so every provider keeps
// importing it from './cli' — and so the two modules have exactly one import
// edge, cli → execution-target, with no cycle.
export type { CliRunnerConfig } from './execution-target'

export interface GenerationResponse {
  output: string
  tokensIn: number
  tokensOut: number
  runtimeMs: number
  /** See the canonical contract on `GenerationResponse` in ../types. */
  ttftMs?: number
}

// The prompt suffixes, the artifact-filename default and the timeout default
// now live in `execution-target.ts` — `resolveExecutionTarget` is the one place
// that decides them (and the one place tests assert them).

/**
 * Sweep root for forensic retention, e.g. `<repo>/sweeps/2026-08-16T09-30-12`.
 *
 * Module-level rather than a `CliRunnerConfig` field (the `setBustCache`
 * precedent in `cache.ts`): the sweep root is a property of the RUN, not of any
 * one provider, and threading it through all three provider config signatures
 * would put the same value in three places for no gain. `scripts/run-benchmark.mjs`
 * sets it once at startup; library/unit-test callers leave it unset and keep the
 * historical ephemeral-tmpdir behaviour.
 */
let sweepRoot: string | undefined

/** Set (or clear, with `undefined`) the run's forensic sweep root. */
export function setSweepRoot(dir: string | undefined): void {
  sweepRoot = dir
}

export function getSweepRoot(): string | undefined {
  return sweepRoot
}

/**
 * Copy a successfully handed-off artifact into `<sweep-root>/artifacts/`.
 *
 * WHY a copy: the three handoff paths in `generateFromCli` read from wherever
 * the agent actually wrote (scratch dir, or its OWN session dir — opencode
 * `/private/tmp`, agy's scratch). Only the copy is guaranteed to be under the
 * run's tree, named for the iteration that produced it, and therefore
 * recoverable and linkable after the fact.
 *
 * `{ flag: 'wx', mode: 0o600 }` — exclusive create, owner-only — is the
 * defensive default: never silently clobber, never widen permissions on
 * model-authored HTML. The one legitimate clobber is a RETRY of the same
 * iteration, which reuses the same filename; that case unlinks first and
 * re-creates exclusively rather than opening with 'w', so the exclusive-create
 * guarantee still holds against any OTHER writer racing us for the name.
 *
 * Never throws: retention is best-effort bookkeeping and must not fail a run
 * whose generation already succeeded.
 */
async function retainArtifact(root: string, fileName: string, contents: string): Promise<void> {
  try {
    const dir = join(root, 'artifacts')
    await mkdir(dir, { recursive: true })
    const dest = join(dir, fileName)
    try {
      await writeFile(dest, contents, { flag: 'wx', mode: 0o600 })
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err
      await rm(dest, { force: true })
      await writeFile(dest, contents, { flag: 'wx', mode: 0o600 })
    }
  } catch (err) {
    console.warn(
      `[harness] could not retain artifact ${fileName}: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

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

/** Anything whose NAME looks like a credential is not handed to a model CLI. */
const CREDENTIAL_KEY = /(key|secret|token|password|auth|credential|private)/i

/**
 * Strip credential-shaped variables out of an environment block.
 *
 * WHY: the CLI child we spawn IS the model, and its output is published
 * publicly on the benchmark site. A model that dumps `env` — degenerate
 * free-tier behaviour we have already seen in other forms (prompt echoing,
 * empty bodies) — would put every key in the repo environment
 * (OPENROUTER_API_KEY, ANTHROPIC_API_KEY, Cloudflare/GitHub tokens, …) into a
 * public HTML page. The model CLIs authenticate from their own local
 * credential stores (opencode `~/.config/opencode` + keychain, agy `~/.gemini`,
 * codex `~/.codex`), so they need none of it.
 *
 * Deliberately broad: SSH_AUTH_SOCK, GITHUB_TOKEN and friends go too. Nothing
 * a child actually needs (PATH, HOME, TMPDIR, SHELL, TERM, LANG/LC_*, USER)
 * matches the pattern, so there is no allowlist to keep in sync.
 *
 * CONTRACT: this is applied to the INHERITED env only. A provider's explicit
 * `env` override is merged AFTER the scrub, so a runner that genuinely needs a
 * credential can re-add it by name — opt-in, never ambient.
 */
export function scrubEnv(env: Record<string, string | undefined>): Record<string, string | undefined> {
  const scrubbed: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(env)) {
    if (CREDENTIAL_KEY.test(key)) continue
    scrubbed[key] = value
  }
  return scrubbed
}

/**
 * Spawn a CLI and collect its output.
 *
 * `ttftMs` is the time from just-before-spawn to the FIRST stdout chunk — the
 * only first-output boundary a piped child process makes observable. Two
 * honesty caveats, both deliberate:
 *  - it is first OUTPUT, not first TOKEN: an agent CLI's banner, model line or
 *    progress chrome usually lands before the model has decoded anything, so
 *    for a chatty CLI this reads LOW;
 *  - it is stdout only. stderr chatter does not count, because that is where
 *    the chrome most reliably goes.
 *
 * Absent (not 0) when the child never wrote to stdout.
 */
export function runCli(
  command: string,
  args: string[],
  options: { cwd?: string; env?: Record<string, string | undefined>; timeoutMs: number }
): Promise<{ stdout: string; stderr: string; ttftMs?: number }> {
  return new Promise((resolve, reject) => {
    const spawnedAt = Date.now()
    // detached: true puts the CLI in its own process group so a timeout can
    // SIGTERM the whole group. CLIs like opencode spawn server grandchildren
    // (bun server) that inherit the pipes; killing only the direct child
    // leaves them alive, holding stdout open and leaking processes.
    const child = spawn(command, args, {
      cwd: options.cwd,
      // Scrub first, provider override second: the child never sees an
      // ambient credential, but a runner can re-add one explicitly.
      // The cast is only for Next's ProcessEnv augmentation (it declares
      // NODE_ENV as required, which no plain env-shaped record satisfies).
      env: { ...scrubEnv(process.env), ...options.env } as NodeJS.ProcessEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
    })

    let stdout = ''
    let stderr = ''
    let ttftMs: number | undefined
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
      // Both error messages below are REDACTED at the source (`redact.ts`).
      // They do not stay local: the harness puts them in `[harness]` sweep log
      // lines, in results.json's `output` for a failed record, and in the run
      // log's `failure` event — so one redaction here covers all three. The
      // argv also carries the whole PROMPT, which redactText leaves intact
      // except for any credential assignment actually inside it.
      reject(
        new Error(
          `Timeout after ${options.timeoutMs}ms: ${redactText(command)} ${redactArgs(args).join(' ')}`
        )
      )
    }, options.timeoutMs)
    // Never let a stray child keep the parent sweep process alive after the
    // run finishes — the promise has already settled by then.
    timeout.unref?.()

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      // First chunk only — a later chunk must never move the boundary.
      if (ttftMs === undefined) ttftMs = Date.now() - spawnedAt
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
        reject(new Error(`CLI exited with code ${code}: ${redactText(stderr || stdout)}`))
      } else {
        resolve({ stdout, stderr, ...(ttftMs !== undefined ? { ttftMs } : {}) })
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
  model: BenchmarkModel,
  task: BenchmarkTask,
  iterationIndex = 0
): Promise<GenerationResponse> {
  const start = Date.now()
  // Snapshot the sweep root for the whole call: a concurrent setSweepRoot must
  // not make the create and the cleanup disagree about which regime we are in.
  const root = sweepRoot
  // Everything about WHAT to run — command, argv (prompt suffix included),
  // env, cwd, timeout, artifact name, session label — resolved in one pure
  // call. This function only performs the target.
  const target = resolveExecutionTarget(config, model, task, iterationIndex, { sweepRoot: root })
  const artifactName = target.artifactName

  let scratchDir: string | undefined
  try {
    if (target.scratchDir) {
      // Deterministic, per-iteration, and RETAINED (see the finally below).
      // Reused as-is when it already exists, so a retry of the same iteration
      // lands in the same place instead of failing on EEXIST.
      scratchDir = target.scratchDir
      await mkdir(scratchDir, { recursive: true })
    } else if (target.needsEphemeralScratch) {
      scratchDir = await mkdtemp(join(tmpdir(), 'llm-bench-'))
    }

    const { stdout, stderr, ttftMs } = await runCli(target.command, target.args, {
      cwd: scratchDir ?? target.cwd,
      env: target.env,
      timeoutMs: target.timeoutMs,
    })

    let output: string | undefined
    if (scratchDir) {
      try {
        const fileContents = await readFile(join(scratchDir, artifactName), 'utf8')
        if (fileContents.trim().length > 0) output = fileContents
      } catch {
        // No ./<artifactName> — fall through to the directory scan.
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
        // Some agent CLIs (opencode, agy) resolve relative paths against
        // their OWN workspace (e.g. /private/tmp, ~/.gemini/.../scratch)
        // instead of the process cwd — but they print the absolute path they
        // wrote to. Parse any absolute .html path from stdout and read the
        // largest one that exists. With unique artifactName per iteration
        // (see CliRunnerConfig), parallel runs never collide here: each run
        // prints and reads its own file.
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
    // Every file-handoff path above (direct name, largest-HTML scan, printed
    // absolute path) lands here with `output` set; stdout extraction below does
    // not. Copy exactly the bytes we handed off, from whichever path won.
    if (output !== undefined && root) {
      await retainArtifact(root, `artifact-${target.label}.html`, output)
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
      // Passed through as measured by runCli (from spawn), while runtimeMs is
      // measured from `start` (before the scratch-dir mkdir). The scratch setup
      // is sub-millisecond-to-a-few-ms, so ttftMs <= runtimeMs still holds; the
      // alternative — rebasing onto `start` — would inflate TTFT with our own
      // bookkeeping, which is not the model's latency.
      ...(ttftMs !== undefined ? { ttftMs } : {}),
    }
  } finally {
    // Under a sweep root the scratch dir is NEVER deleted — not on success and
    // deliberately not on failure either. Forensic value peaks exactly when an
    // iteration failed: the half-written file, the wrongly-named file, the
    // nothing-at-all are the evidence for why. `scripts/sweep-clean.mjs` is the
    // cleanup path, not this finally. Without a sweep root (unit tests, ad-hoc
    // library use) the historical ephemeral-tmpdir behaviour is unchanged.
    if (scratchDir && !root) {
      await rm(scratchDir, { recursive: true, force: true })
    }
  }
}
