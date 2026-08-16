import { describe, it, expect, vi } from 'vitest'
import { registerPlugin } from './registry'
import { echoProvider } from './echo-provider'

// `BENCHMARK_MODELS` is a LOAD-TIME snapshot of built-ins plus `pluginModels()`,
// exactly like `BENCHMARK_TASKS`. So the plugin has to be registered before the
// registry module is evaluated — hence the top-level registration plus a
// dynamic import here, rather than a `beforeEach` in registry.test.ts (whose
// static import would already have taken the snapshot). Vitest isolates module
// graphs per test file, so registering echo-provider here does not leak into
// the other suites' view of the registry.
registerPlugin(echoProvider)
const { BENCHMARK_MODELS, BENCHMARK_PROVIDERS, getModel, modelsByProvider } = await import('../registry')

describe('plugin models merged into BENCHMARK_MODELS', () => {
  it('includes the contributed model, stamped with its pluginId', () => {
    const model = BENCHMARK_MODELS.find((m) => m.id === 'echo-1')
    expect(model).toBeDefined()
    expect(model?.pluginId).toBe('echo-provider')
    expect(model?.provider).toBe('Echo')
  })

  it('is reachable through the registry getters like any built-in model', () => {
    expect(getModel('echo-1')?.name).toBe('Echo 1')
    expect(BENCHMARK_PROVIDERS).toContain('Echo')
    expect(modelsByProvider()['Echo']?.map((m) => m.id)).toEqual(['echo-1'])
  })

  it('keeps model ids unique across built-ins and plugins', () => {
    const ids = BENCHMARK_MODELS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('puts built-ins first, so plugin models never reorder the board', () => {
    const pluginIdx = BENCHMARK_MODELS.findIndex((m) => m.pluginId !== undefined)
    const lastBuiltinIdx = BENCHMARK_MODELS.map((m) => m.pluginId === undefined).lastIndexOf(true)
    expect(pluginIdx).toBeGreaterThan(lastBuiltinIdx)
  })

  // Last: it resets the module registry, so anything after it would be looking
  // at a different registry instance than the assertions above.
  it('rejects a plugin model whose id duplicates a built-in model', async () => {
    vi.resetModules()
    const freshPlugins = await import('./registry')
    freshPlugins.registerPlugin({
      id: 'collider',
      name: 'Collider',
      version: '0.0.1',
      // Built-in provider, so the model passes registration; the collision is
      // with a BUILT-IN id, which only the registry merge can see.
      models: [
        {
          id: 'claude-4',
          name: 'Not Claude',
          provider: 'OpenRouter',
          costPer1kInputUsd: 0,
          costPer1kOutputUsd: 0,
          contextWindow: 1,
          capabilities: '',
        },
      ],
    })
    await expect(import('../registry')).rejects.toThrow(/duplicate model id 'claude-4'/)
  })
})
