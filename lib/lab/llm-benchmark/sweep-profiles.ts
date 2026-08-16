import profilesJson from './sweep-profiles.json'
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
 * Pure and dependency-free by design: the plain-JS run script imports it, and
 * so do the unit tests. Nothing here touches the filesystem or the clock.
 */

/** One named recipe. Every field except `description` is optional. */
export interface SweepProfile {
  /** One line, shown by --list-profiles. Required: an unexplained recipe rots. */
  description: string
  models?: string[]
  tasks?: string[]
  iterations?: number
  concurrency?: number
  timeoutMs?: number
  maxRetries?: number
  bustCache?: boolean
}

const STRING_ARRAY_KEYS = ['models', 'tasks'] as const
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
  iterations?: number
  concurrency?: number
  timeoutMs?: number
  maxRetries?: number
  /** Presence-only: there is no --no-bust-cache, so `false` means "not passed". */
  bustCache?: boolean
}

export interface ResolvedSweepConfig {
  models: Resolved<string[]>
  /** undefined = every registered task. */
  tasks: Resolved<string[] | undefined>
  /** undefined = each task's own iterationsDefault. */
  iterations: Resolved<number | undefined>
  concurrency: Resolved<number>
  /** undefined = the runner's own 10-minute default. */
  timeoutMs: Resolved<number | undefined>
  /** undefined = the runner's own default of 2. */
  maxRetries: Resolved<number | undefined>
  bustCache: Resolved<boolean>
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

  return {
    models: pick(flags.models, envList(env.RUN_MODELS), profile?.models, DEFAULT_MODELS),
    tasks: pick<string[] | undefined>(flags.tasks, envList(env.RUN_TASKS), profile?.tasks, undefined),
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
 * dependency). Supports `--flag value` and `--flag=value`; `--model`/`--task`
 * accept a comma list, repeat, or both.
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
  const append = (key: 'models' | 'tasks', raw: string) => {
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
