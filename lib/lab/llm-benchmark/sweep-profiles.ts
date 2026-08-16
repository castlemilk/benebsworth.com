import profilesJson from './sweep-profiles.json'
import { getPlugins } from './plugins'
import type { BenchmarkResult } from './types'

/**
 * Named sweep profiles + effective-config resolution.
 *
 * A sweep used to be a hand-assembled string of env vars
 * (`RUN_MODELS=... RUN_MAX_RETRIES=0 RUN_TIMEOUT_MS=1500000 ...`). Several real
 * recipes had to be remembered and retyped correctly, and getting one wrong —
 * forgetting `RUN_MAX_RETRIES=0` on a slow model, say — burns hours on
 * guaranteed retries. The recipes are now DATA (`sweep-profiles.json`) and this
 * module is the only place that knows how a profile, the environment, and CLI
 * flags combine.
 *
 * PRECEDENCE:  CLI flag  >  env var  >  profile  >  built-in default.
 *
 * Every resolved knob carries its provenance (`flag` / `env` / `profile:<name>`
 * / `default`) so `scripts/run-benchmark.mjs` can print the effective config
 * before spending money — the dsh `--dump-config` idea.
 *
 * Pure by design: the plain-JS run script imports it, and so do the unit tests.
 * Nothing here touches the filesystem or the clock. Its one in-tree dependency
 * is the plugin roster (`./plugins`), read ONLY to validate `plugins` ids
 * against what is actually registered — a typo'd bundle id must fail at
 * resolution, not silently sweep the wrong task set.
 */

/** One named recipe. Every field except `description` is optional. */
export interface SweepProfile {
  /** One line, shown by --list-profiles. Required: an unexplained recipe rots. */
  description: string
  models?: string[]
  tasks?: string[]
  /**
   * Plugin bundles this recipe mounts. Absent = every registered plugin (the
   * pre-feature behaviour); `[]` = BUILTINS ONLY. Ids are validated against the
   * roster in `plugins/index.ts` when the profile is resolved.
   */
  plugins?: string[]
  iterations?: number
  concurrency?: number
  timeoutMs?: number
  maxRetries?: number
  bustCache?: boolean
}

const STRING_ARRAY_KEYS = ['models', 'tasks', 'plugins'] as const
const NUMBER_KEYS = ['iterations', 'concurrency', 'timeoutMs', 'maxRetries'] as const
const BOOLEAN_KEYS = ['bustCache'] as const
const PROFILE_KEYS = new Set<string>(['description', ...STRING_ARRAY_KEYS, ...NUMBER_KEYS, ...BOOLEAN_KEYS])

/**
 * Validate a raw profiles document (the parsed JSON) into typed profiles.
 *
 * Strict on purpose — an unknown key is an ERROR, not a shrug. A profile with
 * `retries: 0` instead of `maxRetries: 0` would otherwise look correct and
 * silently do the exact thing this feature exists to prevent.
 */
export function parseSweepProfiles(raw: unknown): Record<string, SweepProfile> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('sweep profiles: document must be an object of name -> profile')
  }
  const out: Record<string, SweepProfile> = {}
  for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`sweep profile "${name}": must be an object`)
    }
    const entry = value as Record<string, unknown>
    for (const key of Object.keys(entry)) {
      if (!PROFILE_KEYS.has(key)) {
        throw new Error(
          `sweep profile "${name}": unknown key "${key}" (allowed: ${[...PROFILE_KEYS].sort().join(', ')})`
        )
      }
    }
    if (typeof entry.description !== 'string' || entry.description.trim() === '') {
      throw new Error(`sweep profile "${name}": description must be a non-empty string`)
    }
    const profile: SweepProfile = { description: entry.description }
    for (const key of STRING_ARRAY_KEYS) {
      const field = entry[key]
      if (field === undefined) continue
      if (!Array.isArray(field) || field.some((item) => typeof item !== 'string')) {
        throw new Error(`sweep profile "${name}": ${key} must be an array of strings`)
      }
      profile[key] = field as string[]
    }
    for (const key of NUMBER_KEYS) {
      const field = entry[key]
      if (field === undefined) continue
      if (typeof field !== 'number' || !Number.isFinite(field)) {
        throw new Error(`sweep profile "${name}": ${key} must be a finite number`)
      }
      profile[key] = field
    }
    for (const key of BOOLEAN_KEYS) {
      const field = entry[key]
      if (field === undefined) continue
      if (typeof field !== 'boolean') {
        throw new Error(`sweep profile "${name}": ${key} must be a boolean`)
      }
      profile[key] = field
    }
    out[name] = profile
  }
  return out
}

/** The shipped recipes. Validated at import — a malformed file fails loudly. */
export const SWEEP_PROFILES: Record<string, SweepProfile> = parseSweepProfiles(profilesJson)

/** Where a resolved value came from. */
export type ConfigSource = 'flag' | 'env' | 'default' | `profile:${string}`

export interface Resolved<T> {
  value: T
  source: ConfigSource
}

/** The knobs a CLI invocation can set. Absent = "not passed". */
export interface SweepFlags {
  models?: string[]
  tasks?: string[]
  /** `--plugins a,b`, or `--plugins none` for builtins only. */
  plugins?: string[]
  iterations?: number
  concurrency?: number
  timeoutMs?: number
  maxRetries?: number
  /** Presence-only: there is no --no-bust-cache, so `false` means "not passed". */
  bustCache?: boolean
  /** `--resume <run-id>`: skip pairs already checkpointed in that sweep. */
  resume?: string
}

export interface ResolvedSweepConfig {
  models: Resolved<string[]>
  /** undefined = every registered task. */
  tasks: Resolved<string[] | undefined>
  /**
   * Active plugin bundles. undefined = EVERY registered plugin (default, and
   * the behaviour before this knob existed); `[]` = builtins only.
   */
  plugins: Resolved<string[] | undefined>
  /** undefined = each task's own iterationsDefault. */
  iterations: Resolved<number | undefined>
  concurrency: Resolved<number>
  /** undefined = the runner's own 10-minute default. */
  timeoutMs: Resolved<number | undefined>
  /** undefined = the runner's own default of 2. */
  maxRetries: Resolved<number | undefined>
  bustCache: Resolved<boolean>
  /**
   * Sweep run id to resume from (`sweeps/<run-id>/`), or undefined for a fresh
   * sweep. FLAG > ENV only — there is deliberately no profile layer: a profile
   * is a reusable recipe, and a resume names one specific dead run, so a stored
   * `resume` would either be stale on its second use or silently redirect an
   * unrelated sweep into an old tree. `parseSweepProfiles` rejects the key.
   */
  resume: Resolved<string | undefined>
  /** The profile this config resolved against, if any. */
  profile?: string
}

/** The defaults `scripts/run-benchmark.mjs` has always applied. */
const DEFAULT_MODELS = ['kimi-k2.7']
const DEFAULT_CONCURRENCY = 3

/** An empty env var reads as unset — the Taskfile passes `RUN_MODELS=""` for an omitted knob. */
function envList(raw: string | undefined): string[] | undefined {
  return raw ? raw.split(',') : undefined
}

function envNumber(raw: string | undefined): number | undefined {
  return raw ? Number(raw) : undefined
}

/**
 * How an operator SAYS "builtins only" on a command line, where there is no way
 * to type an empty array: `--plugins none` / `RUN_PLUGINS=none`. In a profile
 * JSON the same thing is spelled `"plugins": []`.
 */
export const PLUGINS_NONE = 'none'

/**
 * Trim/drop blanks and fold the `none` sentinel into the empty set.
 *
 * `none` mixed with real ids is a self-contradicting instruction, so it throws
 * rather than picking a winner.
 */
function normalizePlugins(list: readonly string[] | undefined, where: string): string[] | undefined {
  if (list === undefined) return undefined
  const ids = list.map((id) => id.trim()).filter((id) => id !== '')
  if (ids.some((id) => id.toLowerCase() === PLUGINS_NONE)) {
    if (ids.length > 1) {
      throw new Error(`${where}: "${PLUGINS_NONE}" means builtins only and cannot be combined with plugin ids (got: ${ids.join(', ')})`)
    }
    return []
  }
  return ids
}

/** Ids registered by the roster in `plugins/index.ts`. */
function rosterIds(): string[] {
  return getPlugins().map((plugin) => plugin.id)
}

/**
 * dsh's "reject at mount rather than collide": an unknown bundle id is fatal at
 * resolution, with the roster printed, instead of quietly mounting nothing.
 */
function assertKnownPlugins(ids: readonly string[], where: string): void {
  const available = rosterIds()
  const known = new Set(available)
  const unknown = ids.filter((id) => !known.has(id))
  if (unknown.length > 0) {
    throw new Error(
      `Unknown plugin id(s): ${unknown.join(', ')} (available: ${available.length > 0 ? [...available].sort().join(', ') : '<none registered>'}; use "${PLUGINS_NONE}" for builtins only) [from ${where}]`
    )
  }
}

export interface ResolveInput {
  flags: SweepFlags
  env: Record<string, string | undefined>
  profile?: string
}

/**
 * Merge flags, env, and a profile into one effective config with per-knob
 * provenance. Pure: pass `process.argv`-derived flags and `process.env`.
 *
 * With no profile and no flags the result is byte-identical to the env-only
 * behaviour the Taskfile wrappers and the skill runbook depend on.
 */
export function resolveSweepConfig({ flags, env, profile: profileName }: ResolveInput): ResolvedSweepConfig {
  let profile: SweepProfile | undefined
  if (profileName !== undefined) {
    profile = SWEEP_PROFILES[profileName]
    if (!profile) {
      throw new Error(
        `Unknown sweep profile "${profileName}" (available: ${Object.keys(SWEEP_PROFILES).sort().join(', ')})`
      )
    }
  }
  const fromProfile: ConfigSource = `profile:${profileName}`

  function pick<T>(flag: T | undefined, envValue: T | undefined, profileValue: T | undefined, fallback: T): Resolved<T> {
    if (flag !== undefined) return { value: flag, source: 'flag' }
    if (envValue !== undefined) return { value: envValue, source: 'env' }
    if (profileValue !== undefined) return { value: profileValue, source: fromProfile }
    return { value: fallback, source: 'default' }
  }

  // RUN_MAX_RETRIES is the one knob read with `!== undefined` rather than
  // truthiness, so a defined-but-empty value has always meant 0. Preserved
  // deliberately: this module must not change any existing env invocation.
  const envMaxRetries = env.RUN_MAX_RETRIES !== undefined ? Number(env.RUN_MAX_RETRIES) : undefined
  const envBustCache =
    env.RUN_BUST_CACHE === '1' || env.RUN_BUST_CACHE === 'true' ? true : undefined

  // Plugin bundles are normalized per LAYER (so the error names the layer that
  // is wrong) and validated once, on the layer that actually won.
  const plugins = pick<string[] | undefined>(
    normalizePlugins(flags.plugins, '--plugins'),
    normalizePlugins(envList(env.RUN_PLUGINS), 'RUN_PLUGINS'),
    normalizePlugins(profile?.plugins, `sweep profile "${profileName}": plugins`),
    undefined
  )
  if (plugins.value !== undefined) assertKnownPlugins(plugins.value, plugins.source)

  return {
    models: pick(flags.models, envList(env.RUN_MODELS), profile?.models, DEFAULT_MODELS),
    tasks: pick<string[] | undefined>(flags.tasks, envList(env.RUN_TASKS), profile?.tasks, undefined),
    plugins,
    iterations: pick<number | undefined>(
      flags.iterations,
      envNumber(env.RUN_ITERATIONS),
      profile?.iterations,
      undefined
    ),
    concurrency: pick(
      flags.concurrency,
      envNumber(env.RUN_CONCURRENCY),
      profile?.concurrency,
      DEFAULT_CONCURRENCY
    ),
    timeoutMs: pick<number | undefined>(flags.timeoutMs, envNumber(env.RUN_TIMEOUT_MS), profile?.timeoutMs, undefined),
    maxRetries: pick<number | undefined>(flags.maxRetries, envMaxRetries, profile?.maxRetries, undefined),
    bustCache: pick(flags.bustCache || undefined, envBustCache, profile?.bustCache || undefined, false),
    // No profile layer by design (see ResolvedSweepConfig.resume). An empty
    // RUN_RESUME reads as unset, like every other env knob here.
    resume: pick<string | undefined>(flags.resume, env.RUN_RESUME || undefined, undefined, undefined),
    profile: profileName,
  }
}

export interface SweepArgs {
  flags: SweepFlags
  profile?: string
  dumpConfig: boolean
  listProfiles: boolean
}

const NUMERIC_FLAGS: Record<string, keyof SweepFlags> = {
  '--iterations': 'iterations',
  '--concurrency': 'concurrency',
  '--timeout-ms': 'timeoutMs',
  '--max-retries': 'maxRetries',
}

/**
 * Hand-rolled argv parsing (the `scripts/sweep-clean.mjs` house style — no
 * dependency). Supports `--flag value` and `--flag=value`;
 * `--model`/`--task`/`--plugins` accept a comma list, repeat, or both.
 *
 * Throws on anything it does not understand: a typo'd flag silently ignored is
 * a sweep that runs the wrong shape and costs real money.
 */
export function parseSweepArgs(argv: readonly string[]): SweepArgs {
  const flags: SweepFlags = {}
  let profile: string | undefined
  let dumpConfig = false
  let listProfiles = false

  const pending: string[] = []
  for (const arg of argv) {
    const eq = arg.startsWith('--') ? arg.indexOf('=') : -1
    if (eq > 0) {
      pending.push(arg.slice(0, eq), arg.slice(eq + 1))
    } else {
      pending.push(arg)
    }
  }

  const takeValue = (flag: string, next: string | undefined): string => {
    if (next === undefined || next.startsWith('--')) throw new Error(`${flag} requires a value`)
    return next
  }
  const takeNumber = (flag: string, next: string | undefined): number => {
    const value = Number(takeValue(flag, next))
    if (!Number.isFinite(value)) throw new Error(`${flag} requires a number`)
    return value
  }
  const append = (key: 'models' | 'tasks' | 'plugins', raw: string) => {
    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part !== '')
    flags[key] = [...(flags[key] ?? []), ...parts]
  }

  for (let i = 0; i < pending.length; i++) {
    const arg = pending[i]
    if (arg === '--profile') {
      profile = takeValue(arg, pending[++i])
    } else if (arg === '--model') {
      append('models', takeValue(arg, pending[++i]))
    } else if (arg === '--task') {
      append('tasks', takeValue(arg, pending[++i]))
    } else if (arg === '--plugins') {
      append('plugins', takeValue(arg, pending[++i]))
    } else if (arg === '--resume') {
      flags.resume = takeValue(arg, pending[++i])
    } else if (arg in NUMERIC_FLAGS) {
      const key = NUMERIC_FLAGS[arg]
      ;(flags[key] as number) = takeNumber(arg, pending[++i])
    } else if (arg === '--bust-cache') {
      flags.bustCache = true
    } else if (arg === '--dump-config') {
      dumpConfig = true
    } else if (arg === '--list-profiles') {
      listProfiles = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return { flags, profile, dumpConfig, listProfiles }
}

/**
 * The minimum a task must expose for bundle filtering. Structural on purpose:
 * this module stays independent of `registry.ts` (and of the DAG edge that
 * would create), and the helpers stay trivially testable with plain objects.
 */
export interface PluginTaskRef {
  id: string
  /** Stamped by the plugin registry. Absent = a built-in task. */
  pluginId?: string
}

/**
 * Is this task in scope for the active bundle set?
 *
 * A built-in task (no `pluginId`) is ALWAYS eligible — bundle selection picks
 * which plugins participate, it is not a task allowlist. `undefined` means "all
 * registered plugins", so everything passes.
 */
export function isTaskEnabled(task: PluginTaskRef, activePlugins: readonly string[] | undefined): boolean {
  if (task.pluginId === undefined) return true
  if (activePlugins === undefined) return true
  return activePlugins.includes(task.pluginId)
}

/** The tasks a sweep with this bundle set may run. */
export function filterTasksByPlugins<T extends PluginTaskRef>(
  tasks: readonly T[],
  activePlugins: readonly string[] | undefined
): T[] {
  return tasks.filter((task) => isTaskEnabled(task, activePlugins))
}

/**
 * Task ids explicitly asked for whose plugin is NOT mounted.
 *
 * `--task tic-tac-toe --plugins none` is a self-contradicting instruction: one
 * flag names a task, the other unmounts the plugin that supplies it. Silently
 * running nothing (or silently running it anyway) both hide the mistake, so the
 * caller reports these and exits.
 */
export function excludedPluginTaskConflicts(
  requestedTaskIds: readonly string[] | undefined,
  tasks: readonly PluginTaskRef[],
  activePlugins: readonly string[] | undefined
): { taskId: string; pluginId: string }[] {
  if (!requestedTaskIds) return []
  const requested = new Set(requestedTaskIds)
  return tasks
    .filter((task) => requested.has(task.id) && !isTaskEnabled(task, activePlugins))
    .map((task) => ({ taskId: task.id, pluginId: task.pluginId as string }))
}

/** One (model, task) job a sweep is about to run. */
export interface SweepPair {
  modelId: string
  taskId: string
  iterations: number
}

export interface DurationEstimate {
  /** Rough wall-clock milliseconds. 0 when nothing has history. */
  totalMs: number
  pairsWithHistory: number
  pairsWithoutHistory: number
}

/**
 * ROUGH duration estimate from historical `runtimeMs` in results.json.
 *
 * `BenchmarkResult.runtimeMs` is already the MEAN per successful iteration, so
 * the estimate is sum(mean x iterations) / concurrency. Records with no
 * measured runtime (an all-failed row) are not evidence of speed and are
 * ignored; a pair with no usable history contributes 0 and is counted so the
 * caller can say how much of the estimate is missing.
 *
 * Deliberately crude: it ignores retries, cache hits, scoring time, and the
 * fact that concurrency never divides perfectly. Present it as a lower bound.
 */
export function estimateSweepDuration(
  results: readonly BenchmarkResult[],
  pairs: readonly SweepPair[],
  concurrency: number
): DurationEstimate {
  let totalMs = 0
  let pairsWithHistory = 0
  let pairsWithoutHistory = 0

  for (const pair of pairs) {
    const runtimes = results
      .filter((r) => r.modelId === pair.modelId && r.taskId === pair.taskId && r.runtimeMs > 0)
      .map((r) => r.runtimeMs)
    if (runtimes.length === 0) {
      pairsWithoutHistory++
      continue
    }
    pairsWithHistory++
    const mean = runtimes.reduce((sum, ms) => sum + ms, 0) / runtimes.length
    totalMs += mean * pair.iterations
  }

  return { totalMs: totalMs / Math.max(1, concurrency), pairsWithHistory, pairsWithoutHistory }
}

/** `1h 04m`, `7m 30s`, `45s` — for the rough estimate line in the dump. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`
  return `${seconds}s`
}
