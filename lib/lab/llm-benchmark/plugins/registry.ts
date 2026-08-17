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
 * of `scorers/sandbox.ts` (whose backend seam reaches Playwright, and whose
 * whole module graph is node-side scoring code). Demo components may
 * import React freely. The same rule is why `generators` holds lazy
 * `() => import(...)` factories rather than functions: a generator spawns
 * CLIs and holds keys, and must not be resolved until `runners/provider.ts`
 * (node-only) asks for it.
 */

/**
 * The extension points a plugin may contribute to — the vocabulary of
 * `BenchmarkPlugin.capabilities`, of the `deny` option, and of the capability
 * table `scripts/validate-plugin.mjs` prints. Order is the display order.
 */
export const PLUGIN_CAPABILITIES = [
  'tasks',
  'checks',
  'scorers',
  'demos',
  'taskCards',
  'generators',
  'models',
] as const

export type PluginCapability = (typeof PLUGIN_CAPABILITIES)[number]

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
  /**
   * What this plugin touches, declared for a reviewer.
   *
   * OPTIONAL but VERIFIED. When present, registration REJECTS a plugin whose
   * actual contributions exceed the declaration — declaring less than you ship
   * is the lie that matters, because the declaration is what a reviewer reads
   * instead of the diff. Declaring MORE than you ship is legal at registration
   * (it only over-warns the reviewer) and merely a warning in
   * `validatePlugin()`.
   *
   * When absent, capabilities are DERIVED from the contributions
   * (`derivedCapabilities()`); validate reports them either way, so the
   * at-a-glance view exists for undeclared plugins too.
   */
  capabilities?: PluginCapability[]
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

/** How many of a capability a plugin actually contributes (0 = does not touch it). */
export function capabilityCount(plugin: BenchmarkPlugin, capability: PluginCapability): number {
  switch (capability) {
    case 'tasks':
      return (plugin.tasks ?? []).length
    case 'models':
      return (plugin.models ?? []).length
    case 'checks':
      return Object.keys(plugin.checks ?? {}).length
    case 'scorers':
      return Object.keys(plugin.scorers ?? {}).length
    case 'demos':
      return Object.keys(plugin.demos ?? {}).length
    case 'taskCards':
      return Object.keys(plugin.taskCards ?? {}).length
    case 'generators':
      return Object.keys(plugin.generators ?? {}).length
  }
}

/**
 * The capabilities a plugin ACTUALLY contributes, in `PLUGIN_CAPABILITIES`
 * order. This is the ground truth every capability rule compares against — a
 * declaration is checked against it, never trusted in place of it.
 */
export function derivedCapabilities(plugin: BenchmarkPlugin): PluginCapability[] {
  return PLUGIN_CAPABILITIES.filter((c) => capabilityCount(plugin, c) > 0)
}

/**
 * Every rule name `registrationViolations()` can emit. Stable identifiers —
 * `validatePlugin()` reports them, tests match on them, and the rule-parity
 * matrix in `validate-plugin.test.ts` asserts each one fires identically on
 * both paths (and that no rule here lacks a fixture).
 */
export const PLUGIN_RULES = [
  'identity-required',
  'duplicate-plugin-id',
  'unknown-capability',
  'denied-capability',
  'undeclared-capability',
  'task-sets-plugin-id',
  'duplicate-task-id',
  'generator-shadows-builtin',
  'generator-already-provided',
  'model-sets-plugin-id',
  'duplicate-model-id',
  'model-id-taken',
  'model-provider-unrunnable',
] as const

export type PluginRule = (typeof PLUGIN_RULES)[number]

export interface PluginViolation {
  rule: PluginRule
  message: string
}

export interface RegistrationContext {
  /**
   * Plugins to check collisions against. `registerPlugin` passes the live
   * registry; `validatePlugin` passes the roster minus the candidate itself.
   */
  existing: readonly BenchmarkPlugin[]
  /**
   * Capabilities the CALL SITE refuses from this plugin, regardless of what the
   * plugin says about itself. The roster is the one place plugins enter, so it
   * is the one place a trust decision can be made: `registerPlugin(thirdParty,
   * { deny: ['demos'] })`.
   */
  deny?: readonly PluginCapability[]
}

/** Which of `existing` owns a generator for this provider, if any. */
function generatorOwnerIn(existing: readonly BenchmarkPlugin[], provider: string): string | undefined {
  for (const p of existing) {
    if (Object.hasOwn(p.generators ?? {}, provider)) return p.id
  }
  return undefined
}

/**
 * THE registration rule set, as a lazy stream of violations.
 *
 * This generator is the single source of truth shared by the two modes:
 *
 *   - `registerPlugin()` takes the FIRST violation and throws it. Because the
 *     stream is lazy, later rules are never even evaluated — byte-identical
 *     behaviour (same message, same first failure) to the hand-rolled
 *     if/fail chain this replaced.
 *   - `validatePlugin()` (validate-plugin.ts) drains it and reports ALL of
 *     them, so a reviewer sees every problem in one pass.
 *
 * Single-sourcing them is the point: a rule added here is enforced by
 * registration AND reported by validation, and the two can never drift.
 * `validate-plugin.test.ts` asserts that parity fixture by fixture, and fails
 * when a rule in `PLUGIN_RULES` has no fixture at all.
 *
 * Rule ORDER is load-bearing (it decides which message `registerPlugin`
 * throws): identity, then the trust gate (capabilities), then contributions in
 * the order they would be mounted.
 */
export function* registrationViolations(
  plugin: BenchmarkPlugin,
  ctx: RegistrationContext
): Generator<PluginViolation> {
  if (!plugin.id || !plugin.name || !plugin.version) {
    yield {
      rule: 'identity-required',
      message: `${plugin.id ?? '<missing id>'}: id, name and version are required`,
    }
  }
  if (ctx.existing.some((p) => p.id === plugin.id)) {
    yield { rule: 'duplicate-plugin-id', message: `duplicate plugin id '${plugin.id}'` }
  }

  // Capability gate. A declaration is a claim about what a reviewer will find;
  // shipping MORE than declared makes the claim a lie, so it is rejected. The
  // reverse (declaring more than shipped) only over-warns and is legal here —
  // validate downgrades it to a warning.
  const contributed = derivedCapabilities(plugin)
  const declared = plugin.capabilities
  for (const c of declared ?? []) {
    if (!(PLUGIN_CAPABILITIES as readonly string[]).includes(c)) {
      yield {
        rule: 'unknown-capability',
        message: `plugin '${plugin.id}' declares unknown capability '${c}' (valid: ${PLUGIN_CAPABILITIES.join(', ')})`,
      }
    }
  }
  for (const c of contributed) {
    if ((ctx.deny ?? []).includes(c)) {
      yield {
        rule: 'denied-capability',
        message: `plugin '${plugin.id}' contributes '${c}', which this registration denies (deny: ${(ctx.deny ?? []).join(', ')})`,
      }
    }
  }
  if (declared) {
    for (const c of contributed) {
      if (!declared.includes(c)) {
        yield {
          rule: 'undeclared-capability',
          message: `plugin '${plugin.id}' contributes '${c}' but does not declare it (capabilities: ${declared.length > 0 ? declared.join(', ') : '<empty>'})`,
        }
      }
    }
  }

  for (const task of plugin.tasks ?? []) {
    if (task.pluginId) {
      yield {
        rule: 'task-sets-plugin-id',
        message: `plugin '${plugin.id}' task '${task.id}' sets pluginId itself (stamped automatically)`,
      }
    }
    for (const other of plugin.tasks ?? []) {
      if (other !== task && other.id === task.id) {
        yield { rule: 'duplicate-task-id', message: `plugin '${plugin.id}' declares task '${task.id}' twice` }
      }
    }
  }
  // Generators: reject BEFORE anything is mounted. A provider name is a
  // routing key, so a collision is not "last wins" like a check or a demo —
  // it silently reroutes an existing model's traffic.
  for (const provider of Object.keys(plugin.generators ?? {})) {
    if (isBuiltinProvider(provider)) {
      yield {
        rule: 'generator-shadows-builtin',
        message: `plugin '${plugin.id}' generator '${provider}' collides with a built-in provider (${BUILTIN_PROVIDERS.join(', ')})`,
      }
    }
    const owner = generatorOwnerIn(ctx.existing, provider)
    if (owner) {
      yield {
        rule: 'generator-already-provided',
        message: `plugin '${plugin.id}' generator '${provider}' is already provided by plugin '${owner}'`,
      }
    }
  }
  for (const model of plugin.models ?? []) {
    if (model.pluginId) {
      yield {
        rule: 'model-sets-plugin-id',
        message: `plugin '${plugin.id}' model '${model.id}' sets pluginId itself (stamped automatically)`,
      }
    }
    for (const other of plugin.models ?? []) {
      if (other !== model && other.id === model.id) {
        yield { rule: 'duplicate-model-id', message: `plugin '${plugin.id}' declares model '${model.id}' twice` }
      }
    }
    for (const p of ctx.existing) {
      if ((p.models ?? []).some((m) => m.id === model.id)) {
        yield {
          rule: 'model-id-taken',
          message: `plugin '${plugin.id}' model '${model.id}' duplicates a model from plugin '${p.id}'`,
        }
      }
    }
    // A model whose provider nothing can generate is dead on arrival — it
    // would only fail at sweep time, one iteration at a time.
    const runnable =
      isBuiltinProvider(model.provider) ||
      Object.hasOwn(plugin.generators ?? {}, model.provider) ||
      generatorOwnerIn(ctx.existing, model.provider) !== undefined
    if (!runnable) {
      yield {
        rule: 'model-provider-unrunnable',
        message: `plugin '${plugin.id}' model '${model.id}' declares provider '${model.provider}', which is neither built-in nor provided by a plugin generator`,
      }
    }
  }
}

/** Options the ROSTER call site controls — the trust decision, made where plugins enter. */
export interface RegisterOptions {
  /**
   * Capabilities this registration refuses. A plugin that ships any of them is
   * rejected outright: `registerPlugin(thirdPartyPlugin, { deny: ['demos'] })`
   * mounts its tasks and checks while refusing the one contribution that runs
   * arbitrary JS in a visitor's browser. No config file, no policy engine —
   * one parameter, at the one place plugins enter.
   */
  deny?: readonly PluginCapability[]
}

/**
 * Register a plugin, rejecting id/contribution collisions loudly.
 *
 * Throws on the FIRST violation (see `registrationViolations`); use
 * `validatePlugin()` to collect every problem at once before rostering
 * something you did not write.
 */
export function registerPlugin(plugin: BenchmarkPlugin, options: RegisterOptions = {}): void {
  for (const violation of registrationViolations(plugin, {
    existing: [...plugins.values()],
    deny: options.deny,
  })) {
    fail(violation.message)
  }
  plugins.set(plugin.id, plugin)
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
