// One live CLI call. Verifies command execution plus file handoff without
// writing benchmark results or response caches.
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { BENCHMARK_MODELS } from '../lib/lab/llm-benchmark/registry.ts'
import { generateDevin } from '../lib/lab/llm-benchmark/runners/devin.ts'
import { setSweepRoot } from '../lib/lab/llm-benchmark/runners/cli.ts'

const model = BENCHMARK_MODELS.find((candidate) => candidate.id === 'devin-swe-2-high')
const marker = randomUUID()
const root = resolve('sweeps', `devin-preflight-${Date.now()}`)
const task = {
  id: 'exec-handoff',
  title: 'Command and artifact delivery preflight',
  category: 'code-generation',
  prompt: `Run this exact command through your exec tool: python3 -c "from pathlib import Path; Path('exec-proof.txt').write_text('${marker}'); print(6 * 7)". Then create a tiny self-contained HTML document displaying the actual command output. You must execute the command before creating the HTML.`,
}

setSweepRoot(root)
try {
  const response = await generateDevin({ timeoutMs: 180000 }, model, task)
  const proof = await readFile(join(root, 'scratch', `${model.id}-${task.id}-0`, 'exec-proof.txt'), 'utf8')
  if (proof !== marker || !/<!doctype\s+html/i.test(response.output) || !response.output.includes('42')) {
    throw new Error('Devin preflight failed: command proof or HTML artifact missing')
  }
  console.log(`Devin SWE-2 preflight passed: command proof and HTML handoff (${response.runtimeMs}ms). Artifacts: ${root}`)
} finally {
  setSweepRoot(undefined)
}
