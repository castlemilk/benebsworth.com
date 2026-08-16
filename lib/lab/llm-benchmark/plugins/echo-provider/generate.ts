/**
 * The Echo provider's generation function — the node-only half of the worked
 * example.
 *
 * NOTHING in the client-bundle graph may import this file. `index.ts` reaches
 * it through a lazy `() => import('./generate')` factory, and the only code
 * that ever awaits that factory is `runners/provider.ts`, which is node-only
 * already. A real provider would spawn a CLI (`node:child_process`) or hold an
 * API key here; this one uses `node:perf_hooks` so the rule is load-bearing
 * rather than decorative — a static import of this module from `index.ts`
 * would put a node builtin in the browser bundle.
 */
import { performance } from 'node:perf_hooks'
import type { GenerationResponse, PluginGenerate } from '../../types'

/** Rough token estimate; a real provider reports usage from the wire. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Echo the task prompt back inside a self-contained HTML document.
 *
 * Deliberately trivial: the point of the example is the SEAM (a plugin
 * provider inherits retries, caching, run logs, the quota breaker and
 * scoring), not the generation. Swap this body for a `fetch` or a spawned CLI
 * and the plugin is a real provider with no core edits.
 */
export const echoGenerate: PluginGenerate = async (model, task, iterationIndex): Promise<GenerationResponse> => {
  const started = performance.now()
  const output = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head><meta charset="utf-8"><title>Echo</title></head>',
    '<body>',
    `<h1>${model.name} · ${task.title} · iteration ${iterationIndex + 1}</h1>`,
    `<pre>${task.prompt.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))}</pre>`,
    '</body>',
    '</html>',
  ].join('\n')
  return {
    output,
    tokensIn: estimateTokens(task.prompt),
    tokensOut: estimateTokens(output),
    runtimeMs: Math.round(performance.now() - started),
  }
}
