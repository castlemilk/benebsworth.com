import type { ComponentType } from 'react'
import type { BenchmarkModel, BenchmarkTask, BenchmarkScorerName, PluginGeneratorFactory } from '../types'
import type { CheckFn } from '../scorers/sandbox'
import type { Scorer } from '../types'
import { BUILTIN_PROVIDERS, isBuiltinProvider } from '../providers'

/**
 * Plugin system for the benchmark harness (dsh-inspired, sized for this
 * codebase).
 *
 * A plugin is a self-contained module that contributes extension points to
 * the shared registries — tasks, behavioral checks, scorers, and demo/UI
 * components — without touching the core files. There is no privileged
 * plugin: the built-in task/check/scorer set is itself just the first
 * registrant, and every registration is an effect that unwinds when the
 * plugin is unregistered (mirroring dsh's "registrations are effects that
 * unwind on their plugin's unload").
 *
 * Lifecycle:
 *   - Plugins register at module load via `registerPlugin()`.
 *   - The roster in `./index.ts` imports each shipped plugin statically
 *     (Next.js requires static imports for client components, and the
 *     harness runs under tsx) — adding a plugin = one import there.
 *   - `unregisterPlugin()` exists for tests and hot reload; consumers must
 *     treat plugin state as derived (query the getters, never cache).
 *
 * Client-bundle rule: anything imported (directly or transitively) by
 * `registry.ts` / `demo-registry.tsx` reaches the client bundle, so plugin
 * check files MUST use `import type { CheckFn }` — never a runtime import
 * of `scorers/sandbox.ts` (which pulls Playwright in). Demo components may
 * import React freely. The same rule is why `generators` holds lazy
 * `() => import(...)` factories rather than functions: a generator spawns
 * CLIs and holds keys, and must not be resolved until `runners/provider.ts`
 * (node-only) asks for it.
 */

/** One plugin's contribution set. All fields optional; an empty plugin is legal (metadata only). */
export interface BenchmarkPlugin {
  /** Stable id, unique across all plugins (e.g. 'community-tasks'). */
  id: string
  /** Human-readable name for the UI (e.g. 'Community Tasks'). */
  name: string
  /** Semver-ish version, shown for attribution. */
  version: string
  /** One-line description. */
  description?: string
  /** Tasks contributed. `pluginId` is stamped automatically from `id`. */
  tasks?: BenchmarkTask[]
  /** Named behavioral checks, keyed by stable check name. */
  checks?: Record<string, CheckFn>
  /** Named scorers, keyed by the name a task row declares in `scorer`. */
  scorers?: Record<string, Scorer>
  /** Demo components, keyed by the task `demoComponentName` they render. */
  demos?: Record<string, ComponentType<{ className?: string }>>
  /** Extra UI slots rendered on a task page, keyed by task id. */
  taskCards?: Record<string, ComponentType<{ task: BenchmarkTask }>>
  /**
   * Generators keyed by PROVIDER name — the exact `BenchmarkModel.provider`
   * string a contributed model declares. `runners/provider.ts` consults this
   * map when its built-in switch does not know a provider, instead of
   * throwing; the built-in cases are untouched.
   *
   * The value is a LAZY factory (`() => import('./generate').then(…)`), never
   * the function itself: this module is in the client-bundle graph and a
   * generator is node-only. See `PluginGeneratorFactory` in `types.ts`.
   *
   * A key that collides with a built-in provider or with another plugin's
   * generator is rejected at registration — silently shadowing the OpenAI
   * runner is not a contribution, it is a supply-chain surprise.
   */
  generators?: Record<string, PluginGeneratorFactory>
  /**
   * Models contributed by this plugin, merged into `BENCHMARK_MODELS` exactly
   * like tasks and stamped with `pluginId`. A model whose `provider` is
   * neither built-in nor generator-backed (by this plugin or an already
   * registered one) is rejected at registration — it could never run.
   */
  models?: BenchmarkModel[]
}

const plugins = new Map<string, BenchmarkPlugin>()

function fail(message: string): never {
  throw new Error(`[plugins] ${message}`)
}

/** Register a plugin, rejecting id/contribution collisions loudly. */
export function registerPlugin(plugin: BenchmarkPlugin): void {
  if (!plugin.id || !plugin.name || !plugin.version) {
    fail(`${plugin.id ?? '<missing id>'}: id, name and version are required`)
  }
  if (plugins.has(plugin.id)) fail(`duplicate plugin id '${plugin.id}'`)
  for (const task of plugin.tasks ?? []) {
    if (task.pluginId) fail(`plugin '${plugin.id}' task '${task.id}' sets pluginId itself (stamped automatically)`)
    for (const other of plugin.tasks ?? []) {
      if (other !== task && other.id === task.id) fail(`plugin '${plugin.id}' declares task '${task.id}' twice`)
    }
  }
  // Generators: reject BEFORE anything is mounted. A provider name is a
  // routing key, so a collision is not "last wins" like a check or a demo —
  // it silently reroutes an existing model's traffic.
  for (const provider of Object.keys(plugin.generators ?? {})) {
    if (isBuiltinProvider(provider)) {
      fail(
        `plugin '${plugin.id}' generator '${provider}' collides with a built-in provider (${BUILTIN_PROVIDERS.join(', ')})`
      )
    }
    const owner = generatorOwner(provider)
    if (owner) fail(`plugin '${plugin.id}' generator '${provider}' is already provided by plugin '${owner}'`)
  }
  for (const model of plugin.models ?? []) {
    if (model.pluginId) fail(`plugin '${plugin.id}' model '${model.id}' sets pluginId itself (stamped automatically)`)
    for (const other of plugin.models ?? []) {
      if (other !== model && other.id === model.id) fail(`plugin '${plugin.id}' declares model '${model.id}' twice`)
    }
    for (const p of plugins.values()) {
      if ((p.models ?? []).some((m) => m.id === model.id)) {
        fail(`plugin '${plugin.id}' model '${model.id}' duplicates a model from plugin '${p.id}'`)
      }
    }
    // A model whose provider nothing can generate is dead on arrival — it
    // would only fail at sweep time, one iteration at a time.
    const runnable =
      isBuiltinProvider(model.provider) ||
      Object.hasOwn(plugin.generators ?? {}, model.provider) ||
      generatorOwner(model.provider) !== undefined
    if (!runnable) {
      fail(
        `plugin '${plugin.id}' model '${model.id}' declares provider '${model.provider}', which is neither built-in nor provided by a plugin generator`
      )
    }
  }
  plugins.set(plugin.id, plugin)
}

/** Which registered plugin owns a generator for this provider, if any. */
function generatorOwner(provider: string): string | undefined {
  for (const p of plugins.values()) {
    if (Object.hasOwn(p.generators ?? {}, provider)) return p.id
  }
  return undefined
}

/** Unregister a plugin, unwinding its contributions (tests / hot reload). */
export function unregisterPlugin(id: string): void {
  plugins.delete(id)
}

export function getPlugins(): BenchmarkPlugin[] {
  return [...plugins.values()]
}

export function getPlugin(id: string): BenchmarkPlugin | undefined {
  return plugins.get(id)
}

/** Tasks from all plugins, stamped with `pluginId`. */
export function pluginTasks(): BenchmarkTask[] {
  const out: BenchmarkTask[] = []
  for (const p of plugins.values()) {
    for (const t of p.tasks ?? []) out.push({ ...t, pluginId: p.id })
  }
  return out
}

/** Models from all plugins, stamped with `pluginId`. */
export function pluginModels(): BenchmarkModel[] {
  const out: BenchmarkModel[] = []
  for (const p of plugins.values()) {
    for (const m of p.models ?? []) out.push({ ...m, pluginId: p.id })
  }
  return out
}

/**
 * Generator factories from all plugins, keyed by provider name.
 *
 * Unlike checks/scorers/demos this is NOT last-wins: `registerPlugin` rejects
 * a duplicate provider key outright, so the merge below can never overwrite.
 */
export function pluginGenerators(): Record<string, PluginGeneratorFactory> {
  const out: Record<string, PluginGeneratorFactory> = {}
  for (const p of plugins.values()) Object.assign(out, p.generators ?? {})
  return out
}

/** The generator factory for a provider name, if a plugin provides one. */
export function pluginGenerator(provider: string): PluginGeneratorFactory | undefined {
  return pluginGenerators()[provider]
}

/** Provider names currently backed by a plugin generator (for diagnostics). */
export function pluginProviderNames(): string[] {
  return Object.keys(pluginGenerators())
}

/** Checks from all plugins, merged by name (later plugins win on collision). */
export function pluginChecks(): Record<string, CheckFn> {
  const out: Record<string, CheckFn> = {}
  for (const p of plugins.values()) Object.assign(out, p.checks ?? {})
  return out
}

/** Scorers from all plugins, merged by name. */
export function pluginScorers(): Record<string, Scorer> {
  const out: Record<string, Scorer> = {}
  for (const p of plugins.values()) Object.assign(out, p.scorers ?? {})
  return out
}

/** Demo components from all plugins, merged by name. */
export function pluginDemos(): Record<string, ComponentType<{ className?: string }>> {
  const out: Record<string, ComponentType<{ className?: string }>> = {}
  for (const p of plugins.values()) Object.assign(out, p.demos ?? {})
  return out
}

/** Task-page cards from all plugins, merged by task id. */
export function pluginTaskCards(): Record<string, ComponentType<{ task: BenchmarkTask }>> {
  const out: Record<string, ComponentType<{ task: BenchmarkTask }>> = {}
  for (const p of plugins.values()) Object.assign(out, p.taskCards ?? {})
  return out
}

/** The plugin-supplied task-page card for a task, if any. */
export function pluginTaskCard(task: BenchmarkTask): ComponentType<{ task: BenchmarkTask }> | undefined {
  return pluginTaskCards()[task.id]
}

export type { BenchmarkScorerName }
