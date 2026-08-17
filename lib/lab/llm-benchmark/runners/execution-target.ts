import type { BenchmarkModel, BenchmarkTask } from '../types'
import { stat, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { delimiter, isAbsolute, join, resolve } from 'node:path'

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
   * artifact to a file instead of printing it (print-mode stdout is often
   * truncated). Falls back to stdout extraction if no file is produced.
   */
  artifactViaFile?: boolean
  /**
   * Per-iteration artifact filename. MUST return a unique name per iteration
   * so concurrent runs (concurrency > 1) never collide: CLI agents resolve
   * relative paths against their own session dir (opencode: /private/tmp;
   * agy: its scratch) rather than the scratch dir, so a shared name means
   * parallel runs overwrite each other's artifact. The name is embedded in
   * the prompt and the printed absolute path is read back via the
   * stdout-path fallback regardless of where the agent actually wrote it.
   * Defaults to a constant 'artifact.html' (concurrency 1 only).
   */
  artifactName?: (iterationIndex: number) => string
}

/** Timeout applied when a provider config names none. */
export const DEFAULT_CLI_TIMEOUT_MS = 10 * 60 * 1000

/** Artifact filename used when a provider config supplies no per-iteration name. */
export const DEFAULT_ARTIFACT_FILENAME = 'artifact.html'

export const INLINE_PRINT_SUFFIX =
  '\n\nIMPORTANT: Do not create any files. Print the complete artifact source code inline as your only response.'

export function fileArtifactSuffix(name: string): string {
  return `\n\nIMPORTANT: Save the complete artifact as a single self-contained file at ./${name} in the current working directory. Do not print the artifact to stdout — after writing the file, print the absolute path of the file you wrote, then DONE.`
}

/**
 * Provider name → the command that provider spawns.
 *
 * SINGLE SOURCE. The runner files (`agy.ts`, `codex.ts`, `opencode.ts`) set
 * their `CliRunnerConfig.command` from this map and the sweep pre-flight reads
 * the same entries, so a provider can never be pre-flighted for one binary and
 * run with another. Keys are the `BenchmarkModel.provider` strings in the
 * registry; `isCliProvider` derives its set from these keys.
 */
export const CLI_COMMANDS = {
  Agy: 'agy',
  Codex: 'codex',
  OpenCode: 'opencode',
} as const satisfies Record<string, string>

/** Providers driven by a locally-spawned agent CLI rather than an HTTP API. */
export const CLI_PROVIDERS: ReadonlySet<string> = new Set(Object.keys(CLI_COMMANDS))

/**
 * Where each CLI comes from, for the "not on PATH" error.
 *
 * These are install ROUTES, not verified-today URLs: the message exists to
 * point an operator at the right vendor rather than to be copy-pasted blind,
 * so each hint names the command it is about and says where it comes from.
 */
const INSTALL_HINTS: Record<string, string> = {
  agy: 'agy ships with Antigravity (Google) — install the app and put its bin dir (e.g. ~/.local/bin) on PATH',
  codex: 'codex is the OpenAI Codex CLI — `npm i -g @openai/codex`, then `codex login`',
  opencode: 'opencode is the opencode CLI — see https://opencode.ai (install script or `npm i -g opencode-ai`), then `opencode auth login`',
}

/** Install route for a command, or a generic instruction when it is unknown. */
export function installHint(command: string): string {
  return INSTALL_HINTS[command] ?? `install the ${command} CLI and make sure it is on PATH`
}

export interface CommandFound {
  path: string
}
export interface CommandMissing {
  missing: true
  hint: string
}
export type CommandResolution = CommandFound | CommandMissing

/** True for the missing half of a resolution (narrowing helper). */
export function isMissing(resolution: CommandResolution): resolution is CommandMissing {
  return 'missing' in resolution
}

/**
 * `command -v`-style resolution, done in-process.
 *
 * WHY a PATH scan rather than spawning `sh -c 'command -v <cmd>'`: this runs in
 * the pre-flight for every targeted CLI provider, and a fork-per-check would
 * inherit the operator's shell semantics (aliases, functions, builtins, a
 * `.profile` that mutates PATH) — so the check would answer a subtly different
 * question from the one `spawn()` asks later. `spawn` resolves through
 * execvp/PATH with no shell, which is exactly what this scan models. It is also
 * unit-testable with a synthetic PATH, which a shell-out is not.
 *
 * POSIX only (no PATHEXT handling) — the harness spawns these CLIs on
 * macOS/Linux.
 *
 * The `stat().isFile()` check is load-bearing: `access(X_OK)` succeeds on
 * DIRECTORIES, so a `~/src/opencode/` checkout on PATH would otherwise resolve
 * as the binary and turn a clean pre-flight failure into an EACCES mid-sweep.
 */
export async function resolveCommand(
  command: string,
  env: Record<string, string | undefined> = process.env
): Promise<CommandResolution> {
  const executable = async (candidate: string): Promise<boolean> => {
    try {
      const info = await stat(candidate)
      if (!info.isFile()) return false
      await access(candidate, constants.X_OK)
      return true
    } catch {
      return false
    }
  }

  // A command with a separator is a path, not a PATH lookup — same rule execvp
  // uses. Relative paths resolve against the process cwd.
  if (command.includes('/')) {
    const candidate = isAbsolute(command) ? command : resolve(process.cwd(), command)
    if (await executable(candidate)) return { path: candidate }
    return { missing: true, hint: installHint(command) }
  }

  const rawPath = env.PATH ?? env.Path ?? ''
  for (const dir of rawPath.split(delimiter)) {
    // An empty PATH element means "cwd" to some shells; deliberately skipped —
    // resolving a benchmark CLI out of the working directory is a footgun, not
    // a feature.
    if (dir === '') continue
    const candidate = join(dir, command)
    if (await executable(candidate)) return { path: candidate }
  }
  return { missing: true, hint: installHint(command) }
}

/**
 * The execution target: everything a CLI provider run needs, resolved in ONE
 * place instead of being recomputed inline by `generateFromCli`.
 *
 * Local-process only today. The point of naming the seam is that the shape
 * ("which command, which argv, which cwd, which cap, which identity") is what a
 * remote host or a sandbox would also have to answer — and `generateFromCli`
 * now consumes an answer rather than deriving one.
 */

export interface ExecutionTarget {
  /** The binary to spawn (unresolved — `spawn` does its own PATH lookup). */
  command: string
  /** Full argv, prompt + artifact-delivery suffix already applied. */
  args: string[]
  /** Provider env overrides, merged over the scrubbed inherited env by runCli. */
  env?: Record<string, string | undefined>
  /** Working directory: the retained scratch dir when there is one, else the config's. */
  cwd?: string
  /** Resolved cap: `config.timeoutMs ?? DEFAULT_CLI_TIMEOUT_MS`. The ONLY place this default lives. */
  timeoutMs: number
  /** Per-iteration artifact filename embedded in the prompt suffix. */
  artifactName: string
  artifactViaFile: boolean
  /** The prompt tail this target appends (inline-print vs write-to-file). */
  promptSuffix: string
  /** Session identity: `<model.id>-<task.id>-<iteration>` — scratch dir, artifact copy, logs. */
  label: string
  /** Deterministic retained scratch dir under the sweep root; absent without one. */
  scratchDir?: string
  /** True when the caller must mkdtemp an ephemeral scratch dir (no sweep root). */
  needsEphemeralScratch: boolean
}

/**
 * Assemble the execution target for one iteration. Pure: no fs, no spawn — the
 * caller creates whatever directory the target names.
 */
export function resolveExecutionTarget(
  config: CliRunnerConfig,
  model: BenchmarkModel,
  task: BenchmarkTask,
  iterationIndex: number,
  options: { sweepRoot?: string } = {}
): ExecutionTarget {
  const label = `${model.id}-${task.id}-${iterationIndex}`
  const artifactViaFile = config.artifactViaFile === true
  const artifactName = config.artifactName?.(iterationIndex) ?? DEFAULT_ARTIFACT_FILENAME
  const promptSuffix = artifactViaFile ? fileArtifactSuffix(artifactName) : INLINE_PRINT_SUFFIX
  // Under a sweep root the scratch dir is deterministic and retained (a retry of
  // the same iteration reuses it); without one it is an ephemeral mkdtemp the
  // caller creates and deletes.
  const scratchDir =
    artifactViaFile && options.sweepRoot ? join(options.sweepRoot, 'scratch', label) : undefined

  return {
    command: config.command,
    args: config.buildArgs(task.prompt + promptSuffix, model),
    env: config.env,
    cwd: scratchDir ?? config.cwd,
    timeoutMs: config.timeoutMs ?? DEFAULT_CLI_TIMEOUT_MS,
    artifactName,
    artifactViaFile,
    promptSuffix,
    label,
    ...(scratchDir ? { scratchDir } : {}),
    needsEphemeralScratch: artifactViaFile && scratchDir === undefined,
  }
}

/** Just the fields the pre-flight needs from a model — keeps the helper testable. */
export interface CliPreflightModel {
  id: string
  provider: string
}

export interface CliCommandStatus {
  command: string
  /** Every targeted model that needs this command, in registry order. */
  modelIds: string[]
  resolution: CommandResolution
}

/**
 * One row per DISTINCT CLI command the given models need (API providers are
 * skipped), each resolved exactly once.
 *
 * `resolver` is injectable so the pre-flight is unit-testable without touching
 * the machine's real PATH.
 */
export async function resolveCliCommands(
  models: readonly CliPreflightModel[],
  resolver: (command: string) => Promise<CommandResolution> = resolveCommand
): Promise<CliCommandStatus[]> {
  const byCommand = new Map<string, string[]>()
  for (const model of models) {
    const command = CLI_COMMANDS[model.provider as keyof typeof CLI_COMMANDS]
    if (!command) continue
    const ids = byCommand.get(command)
    if (ids) ids.push(model.id)
    else byCommand.set(command, [model.id])
  }
  // Sequential on purpose: at most three entries, and a serial scan keeps the
  // failure order deterministic (first-targeted command first).
  const rows: CliCommandStatus[] = []
  for (const [command, modelIds] of byCommand) {
    rows.push({ command, modelIds, resolution: await resolver(command) })
  }
  return rows
}

export interface MissingCliCommand {
  command: string
  hint: string
  modelIds: string[]
}

/**
 * Every targeted CLI command that is NOT installed — all of them, not just the
 * first, so one pre-flight run tells the operator everything to install.
 */
export async function missingCliCommands(
  models: readonly CliPreflightModel[],
  resolver: (command: string) => Promise<CommandResolution> = resolveCommand
): Promise<MissingCliCommand[]> {
  const rows = await resolveCliCommands(models, resolver)
  return rows
    .filter((row) => isMissing(row.resolution))
    .map((row) => ({
      command: row.command,
      hint: (row.resolution as CommandMissing).hint,
      modelIds: row.modelIds,
    }))
}
