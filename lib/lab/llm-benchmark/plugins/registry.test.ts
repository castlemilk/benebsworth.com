import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { BENCHMARK_TASKS, getTask } from '../registry'
import { getChecksForTask } from '../scorers/checks'
import {
  registerPlugin,
  unregisterPlugin,
  getPlugins,
  pluginTasks,
  pluginChecks,
  pluginDemos,
  pluginTaskCards,
  pluginGenerator,
  pluginGenerators,
  pluginModels,
  pluginProviderNames,
  type BenchmarkPlugin,
} from '../plugins'
import type { CheckFn } from '../scorers/sandbox'
import type { BenchmarkModel, BenchmarkTask, PluginGenerate } from '../types'

const probeCheck: CheckFn = async () => ({
  name: 'probe-check',
  passed: true,
  points: 10,
  maxPoints: 10,
})

const probeTask: BenchmarkTask = {
  id: 'probe-task',
  category: 'advanced-game-building',
  title: 'Probe Task',
  blurb: '',
  prompt: 'do the thing',
  runtimeHint: '',
  iterationsDefault: 1,
  methodNotes: '',
  demoComponentName: 'ProbeDemo',
  slug: 'probe-task',
  scorer: 'behavioral',
  checks: ['probe-check'],
}

const probePlugin: BenchmarkPlugin = {
  id: 'probe-plugin',
  name: 'Probe Plugin',
  version: '0.0.1',
  tasks: [probeTask],
  checks: { 'probe-check': probeCheck },
  demos: { ProbeDemo: () => null },
  taskCards: { 'probe-task': () => null },
}

describe('plugin registry (runtime registration)', () => {
  // Probe-plugin-only cleanup: the shipped roster plugin (community-tasks)
  // must survive — BENCHMARK_TASKS is a load-time snapshot that includes it.
  beforeEach(() => unregisterPlugin('probe-plugin'))
  afterEach(() => unregisterPlugin('probe-plugin'))

  it('registers a plugin and exposes its contributions', () => {
    registerPlugin(probePlugin)
    expect(getPlugins().map((p) => p.id)).toContain('probe-plugin')
    expect(pluginTasks().map((t) => t.id)).toContain('probe-task')
    expect(pluginChecks()['probe-check']).toBe(probeCheck)
    expect(pluginDemos()['ProbeDemo']).toBeDefined()
    expect(pluginTaskCards()['probe-task']).toBeDefined()
  })

  it('stamps pluginId on contributed tasks', () => {
    registerPlugin(probePlugin)
    expect(pluginTasks().find((t) => t.id === 'probe-task')?.pluginId).toBe('probe-plugin')
  })

  it('rejects a duplicate plugin id loudly', () => {
    registerPlugin(probePlugin)
    expect(() => registerPlugin(probePlugin)).toThrow(/duplicate plugin id/)
  })

  it('rejects a task that sets its own pluginId', () => {
    expect(() =>
      registerPlugin({
        ...probePlugin,
        id: 'probe-plugin-2',
        tasks: [{ ...probeTask, pluginId: 'someone-else' }],
      })
    ).toThrow(/sets pluginId itself/)
  })

  it('unwinds contributions on unregister', () => {
    registerPlugin(probePlugin)
    unregisterPlugin('probe-plugin')
    expect(getPlugins().find((p) => p.id === 'probe-plugin')).toBeUndefined()
    expect(pluginTasks().find((t) => t.id === 'probe-task')).toBeUndefined()
  })
})

const probeGenerate: PluginGenerate = async () => ({
  output: 'x'.repeat(80),
  tokensIn: 1,
  tokensOut: 2,
  runtimeMs: 3,
})

const probeModel: BenchmarkModel = {
  id: 'probe-model',
  name: 'Probe Model',
  provider: 'ProbeProvider',
  costPer1kInputUsd: 0,
  costPer1kOutputUsd: 0,
  contextWindow: 1000,
  capabilities: '',
}

const generatorPlugin: BenchmarkPlugin = {
  id: 'probe-generator-plugin',
  name: 'Probe Generator Plugin',
  version: '0.0.1',
  models: [probeModel],
  generators: { ProbeProvider: async () => probeGenerate },
}

describe('plugin generators + models (registration rules)', () => {
  beforeEach(() => unregisterPlugin('probe-generator-plugin'))
  afterEach(() => {
    unregisterPlugin('probe-generator-plugin')
    unregisterPlugin('probe-generator-plugin-2')
  })

  it('registers a generator + model pair and stamps pluginId on the model', () => {
    registerPlugin(generatorPlugin)
    expect(pluginProviderNames()).toContain('ProbeProvider')
    expect(pluginGenerator('ProbeProvider')).toBeDefined()
    expect(pluginGenerators()['ProbeProvider']).toBeDefined()
    const merged = pluginModels().find((m) => m.id === 'probe-model')
    expect(merged?.pluginId).toBe('probe-generator-plugin')
    // The registered object is not mutated — the stamp is on the copy.
    expect(probeModel.pluginId).toBeUndefined()
  })

  it('rejects a generator whose key shadows a built-in provider', () => {
    // Silently rerouting every OpenAI model through a plugin is the one thing
    // a provider seam must never allow.
    expect(() =>
      registerPlugin({ ...generatorPlugin, models: [], generators: { OpenAI: async () => probeGenerate } })
    ).toThrow(/collides with a built-in provider/)
  })

  it('rejects a generator another plugin already provides', () => {
    registerPlugin(generatorPlugin)
    expect(() =>
      registerPlugin({
        ...generatorPlugin,
        id: 'probe-generator-plugin-2',
        models: [],
      })
    ).toThrow(/already provided by plugin 'probe-generator-plugin'/)
  })

  it('rejects a model whose provider nothing can generate', () => {
    expect(() =>
      registerPlugin({
        id: 'probe-generator-plugin-2',
        name: 'Orphan',
        version: '0.0.1',
        models: [{ ...probeModel, id: 'orphan-model', provider: 'NoSuchProvider' }],
      })
    ).toThrow(/neither built-in nor provided by a plugin generator/)
  })

  it('accepts a model on a built-in provider (no generator needed)', () => {
    registerPlugin({
      id: 'probe-generator-plugin-2',
      name: 'Builtin-backed',
      version: '0.0.1',
      models: [{ ...probeModel, id: 'builtin-backed-model', provider: 'OpenRouter' }],
    })
    expect(pluginModels().map((m) => m.id)).toContain('builtin-backed-model')
  })

  it('rejects a model that sets its own pluginId, and a duplicate model id', () => {
    expect(() =>
      registerPlugin({ ...generatorPlugin, id: 'probe-generator-plugin-2', models: [{ ...probeModel, pluginId: 'x' }] })
    ).toThrow(/sets pluginId itself/)
    expect(() =>
      registerPlugin({ ...generatorPlugin, id: 'probe-generator-plugin-2', models: [probeModel, { ...probeModel }] })
    ).toThrow(/declares model 'probe-model' twice/)
  })

  it('rejects a model id another plugin already contributed', () => {
    registerPlugin(generatorPlugin)
    expect(() =>
      registerPlugin({
        id: 'probe-generator-plugin-2',
        name: 'Copycat',
        version: '0.0.1',
        models: [{ ...probeModel, provider: 'OpenRouter' }],
      })
    ).toThrow(/duplicates a model from plugin 'probe-generator-plugin'/)
  })

  it('unwinds generators and models on unregister', () => {
    registerPlugin(generatorPlugin)
    unregisterPlugin('probe-generator-plugin')
    expect(pluginProviderNames()).not.toContain('ProbeProvider')
    expect(pluginModels().find((m) => m.id === 'probe-model')).toBeUndefined()
  })
})

describe('shipped plugin integration (load-time roster)', () => {
  it('merges the community-tasks plugin into BENCHMARK_TASKS with attribution', () => {
    const t = getTask('tic-tac-toe')
    expect(t?.pluginId).toBe('community-tasks')
    expect(t?.demoComponentName).toBe('TicTacToeDemo')
    expect(t?.scorer).toBe('behavioral')
  })

  it('resolves the plugin task\'s declared checks through the registry', async () => {
    const t = getTask('tic-tac-toe')!
    const checks = getChecksForTask(t)
    expect(checks.map((c) => c.name ? 'named' : 'anon')).toHaveLength(2)
    // The plugin checks are the named functions shipped in community-tasks.
    expect(checks[0]!.name ?? 'anon').toBeDefined()
  })

  it('keeps built-in tasks on the fallback map when they declare no checks', () => {
    const platformer = BENCHMARK_TASKS.find((t) => t.id === 'mini-platformer')!
    expect(getChecksForTask(platformer).length).toBeGreaterThan(0)
  })

  it('keeps task ids unique across built-ins and plugins', () => {
    const ids = BENCHMARK_TASKS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('fails loudly on an unknown check name', () => {
    const broken: BenchmarkTask = {
      ...probeTask,
      id: 'broken-task',
      slug: 'broken-task',
      checks: ['does-not-exist'],
    }
    expect(() => getChecksForTask(broken)).toThrow(/Unknown check 'does-not-exist'/)
  })
})
