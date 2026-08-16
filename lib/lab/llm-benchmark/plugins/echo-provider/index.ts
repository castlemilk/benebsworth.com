import type { BenchmarkPlugin } from '../registry'
import type { BenchmarkModel } from '../../types'

/**
 * Worked example of a plugin-provided PROVIDER: one model plus the generator
 * that runs it, with zero edits to `runners/provider.ts`.
 *
 * Deliberately NOT on the roster (`plugins/index.ts`) — it generates fake
 * output and would pollute the board. THIS plugin is registered by
 * `plugins/models.test.ts` (which is also the proof of the acceptance
 * criterion: the contributed model reaches BENCHMARK_MODELS stamped with its
 * pluginId); `runners/provider.test.ts` proves the generator half of the same
 * shape with an inline fixture plugin. Copy the shape, not the roster status.
 *
 * The two rules a provider plugin must respect:
 *
 *  1. `generators` is keyed by the exact `BenchmarkModel.provider` string, and
 *     the key must not collide with a built-in provider or another plugin's
 *     (rejected at registration).
 *  2. The value is a LAZY factory. The implementation is node-only; this file
 *     is reachable from the client bundle. `import type` for the model shape,
 *     `import()` for the code.
 */
const echoModel: BenchmarkModel = {
  id: 'echo-1',
  name: 'Echo 1',
  provider: 'Echo',
  costPer1kInputUsd: 0,
  costPer1kOutputUsd: 0,
  contextWindow: 8192,
  capabilities: 'Echoes the prompt back as a self-contained HTML document (example provider).',
  company: 'Example',
  family: 'Echo',
  tags: ['example', 'plugin-provider'],
  blurb: 'Example plugin-provided model — proves a provider can ship as a plugin.',
}

export const echoProvider: BenchmarkPlugin = {
  id: 'echo-provider',
  name: 'Echo Provider',
  version: '1.0.0',
  description: 'Example plugin that ships a provider (generator) and the model that uses it.',
  models: [echoModel],
  generators: {
    Echo: () => import('./generate').then((m) => m.echoGenerate),
  },
}
