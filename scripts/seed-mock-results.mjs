import { writeFileSync } from 'node:fs'
import outputs from './sample-outputs.json' with { type: 'json' }

const models = [
  { id: 'claude-4', input: 0.003, output: 0.015 },
  { id: 'gpt-5', input: 0.0025, output: 0.010 },
  { id: 'gemini-2.5-pro', input: 0.00125, output: 0.010 },
  { id: 'kimi-k2.7', input: 0.0005, output: 0.002 },
]

function cost(tokensIn, tokensOut, modelId) {
  const m = models.find((x) => x.id === modelId)
  return (tokensIn / 1000) * m.input + (tokensOut / 1000) * m.output
}

const seed = [
  ['n-body-field', 'claude-4', 92, 14200, 3200, 2400],
  ['n-body-field', 'gpt-5', 84, 7800, 3100, 2100],
  ['n-body-field', 'gemini-2.5-pro', 90, 10500, 3400, 2600],
  ['n-body-field', 'kimi-k2.7', 88, 9200, 3300, 2500],

  ['mini-platformer', 'claude-4', 94, 12800, 2800, 2300],
  ['mini-platformer', 'gpt-5', 88, 6200, 2700, 1900],
  ['mini-platformer', 'gemini-2.5-pro', 86, 9100, 2900, 2200],
  ['mini-platformer', 'kimi-k2.7', 87, 7800, 3000, 2300],

  ['crypto-hash-race', 'claude-4', 89, 11500, 2400, 1800],
  ['crypto-hash-race', 'gpt-5', 82, 5400, 2300, 1500],
  ['crypto-hash-race', 'gemini-2.5-pro', 87, 8200, 2500, 1700],
  ['crypto-hash-race', 'kimi-k2.7', 85, 6100, 2600, 1900],

  ['landing-page-morph', 'claude-4', 95, 13500, 2600, 2500],
  ['landing-page-morph', 'gpt-5', 90, 6800, 2500, 2200],
  ['landing-page-morph', 'gemini-2.5-pro', 88, 9600, 2700, 2400],
  ['landing-page-morph', 'kimi-k2.7', 89, 8500, 2800, 2600],

  ['equation-solver', 'claude-4', 93, 11000, 2200, 1600],
  ['equation-solver', 'gpt-5', 85, 5200, 2100, 1400],
  ['equation-solver', 'gemini-2.5-pro', 94, 7900, 2300, 1500],
  ['equation-solver', 'kimi-k2.7', 91, 5800, 2400, 1700],

  ['physics-pendulum-wave', 'claude-4', 94, 12500, 3000, 2100],
  ['physics-pendulum-wave', 'gpt-5', 87, 6400, 2900, 1800],
  ['physics-pendulum-wave', 'gemini-2.5-pro', 89, 9300, 3100, 2000],
  ['physics-pendulum-wave', 'kimi-k2.7', 86, 8100, 3100, 2100],

  ['circuit-builder-teaser', 'claude-4', 91, 14800, 3500, 2800],
  ['circuit-builder-teaser', 'gpt-5', 83, 8200, 3400, 2500],
  ['circuit-builder-teaser', 'gemini-2.5-pro', 90, 11200, 3600, 2700],
  ['circuit-builder-teaser', 'kimi-k2.7', 88, 10100, 3700, 2900],
]

const results = seed.map(([taskId, modelId, score, runtimeMs, tokensIn, tokensOut]) => ({
  taskId,
  modelId,
  score,
  runtimeMs,
  tokensIn,
  tokensOut,
  costUsd: cost(tokensIn, tokensOut, modelId),
  iterations: 5,
  iterationsSucceeded: 5,
  status: 'success',
  createdAt: '2026-06-30T00:00:00.000Z',
  // Hand-authored sample data — the UI must disclose these and exclude them
  // from headline verdicts (see BenchmarkSource in lib/lab/llm-benchmark/types.ts).
  source: 'seeded',
  output: outputs[taskId]?.[modelId],
}))

writeFileSync('lib/lab/llm-benchmark/results.json', JSON.stringify(results, null, 2) + '\n')
console.log('seeded', results.length, 'mock results')
