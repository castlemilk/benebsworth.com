import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const run = promisify(execFile)
const cli = fileURLToPath(new URL('index.mjs', import.meta.url))

test('the CLI saves an architect outline, replays it offline and detects a changed source before writing', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'chapter-cli-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const source = path.join(root, 'lesson.qmd')
  await writeFile(source, '## Memory\n\nTwo buffers must fit at once before processing can overlap.\n')
  const spec = path.join(root, 'spec.json')
  await writeFile(spec, JSON.stringify({ id: 'vol1/01_memory', title: 'Memory', question: 'Will the buffers fit?', source: { file: source, url: 'https://example.org/memory' } }))
  const plan = { thesis: 'Live buffers compete for the same space.', sections: [{
    id: 'buffers', heading: 'Which buffers are live?', sourceHeadings: ['Memory'],
    glossTargets: ['When operand and accumulator lifetimes overlap.'],
    core: 'Overlapping buffers consume capacity together.', beats: ['Track each lifetime.', 'Add overlapping allocations.'],
    example: 'Two 2 KiB buffers overlap in 4 KiB of storage.', misconception: 'Only the larger buffer counts.',
    visual: { id: 'overlap', title: 'Live bytes', kind: 'bars', unit: 'KiB', caption: 'Overlap consumes twice as much space.', rows: [{ label: 'One buffer', value: 2 }, { label: 'Two buffers', value: 4 }] },
  }], glossary: [{ term: 'Lifetime', definition: 'Time before the last read.' }], applications: ['Inspect allocations at peak use.'], openQuestions: ['Which allocation can release earlier?'] }
  const binary = path.join(root, 'codex')
  const events = [
    { type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(plan) } },
    { type: 'turn.completed', usage: { input_tokens: 16, cached_input_tokens: 2, output_tokens: 24 } },
  ]
  await writeFile(binary, '#!' + process.execPath + '\nprocess.stdin.resume(); process.stdin.on("end", () => process.stdout.write(' + JSON.stringify(events.map(e => JSON.stringify(e)).join('\n') + '\n') + '))', { mode: 0o755 })
  const options = { env: { ...process.env, PATH: root + path.delimiter + process.env.PATH } }
  const call = (cmd, name, ...args) => run(process.execPath, [cli, cmd, spec, '--cache', path.join(root, 'cache'), '--out', path.join(root, name), ...args], options)
  const receipt = async name => JSON.parse(await readFile(path.join(root, name, 'run.json'), 'utf8'))
  await call('outline', 'first')
  assert.equal((await receipt('first')).calls[0].model, 'gpt-6.2-sol')
  assert.equal((await receipt('first')).tokens.total, 40)
  await call('outline', 'replay', '--max-calls', '0')
  assert.equal((await receipt('replay')).status, 'planned')
  assert.equal((await receipt('replay')).liveCalls, 0)
  await call('outline', 'astra', '--profile', 'astra')
  const alternate = await receipt('astra')
  assert.equal(alternate.chapterProfile, 'astra')
  assert.equal(alternate.liveCalls, 1)
  assert.equal(alternate.calls[0].model, 'gpt-6.2-astra')
  assert.equal(alternate.calls[0].effort, 'high')
  await assert.rejects(call('chapter', 'astra-expansion', '--profile', 'astra', '--max-calls', '0'))
  const expansion = await receipt('astra-expansion')
  assert.equal(expansion.calls[0].cached, true)
  assert.deepEqual(expansion.calls.map(({ role, model }) => [role, model]), [
    ['architect', 'gpt-6.2-astra'], ['chapter-writer', 'gpt-6.2-astra'],
  ])
  assert.match(expansion.error, /Live call limit/)
  await assert.rejects(call('outline', 'typo', '--profile', 'astr'), /Chapter --profile must be mixed or astra/)
  const saved = path.join(root, 'first', 'outline.json')
  assert.deepEqual(JSON.parse(await readFile(saved, 'utf8')).plan, plan)
  await writeFile(source, '## Memory\n\nNew source revision.\n')
  await assert.rejects(call('chapter', 'changed', '--outline', saved, '--max-calls', '0'))
  assert.match((await receipt('changed')).error, /different spec or source/)
  assert.equal((await receipt('changed')).calls.length, 0)
})
