import { BENCHMARK_TASKS, BENCHMARK_MODELS } from '../lib/lab/llm-benchmark/registry.ts'
import { generateMoonshot } from '../lib/lab/llm-benchmark/runners/moonshot.ts'

const model = BENCHMARK_MODELS.find(m => m.id === 'kimi-k2.7')
const task = BENCHMARK_TASKS.find(t => t.id === 'n-body-field')
console.log('starting', task.id)
const start = Date.now()
try {
  const res = await generateMoonshot({ apiKey: process.env.MOONSHOT_API_KEY, baseUrl: process.env.MOONSHOT_BASE_URL }, model, task)
  console.log('done in', Date.now() - start, 'ms')
  console.log('tokens', res.tokensIn, res.tokensOut)
  console.log('output length', res.output.length)
  console.log('output preview', res.output.slice(0, 200))
} catch (e) {
  console.log('error in', Date.now() - start, 'ms', e.message)
}
