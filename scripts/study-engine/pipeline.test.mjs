import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generatePackets, planLesson, profiles, calculate } from './pipeline.mjs'

const readExample = name => JSON.parse(readFileSync(new URL('./examples/' + name + '-pilot.json', import.meta.url)))
const brief = readExample('compression')
const smallSource = '## Fitting the Deployment Budget\n\nWeight and activation memory count toward the resident footprint.'
const valid = {
  body: 'A smaller file can still exceed the ==memory budget=={Count resident activations along with weights.}. The original {{originalTotalMiB}} MiB and compressed {{compressedTotalMiB}} MiB straddle the {{budgetMiB}} MiB budget.',
  quiz: { prompt: 'Which quantity limits deployment?', options: ['Weights alone', 'Total resident memory', 'Download size'], correct: 1, explanation: 'Both buffers occupy memory at once.' },
  transfer: { prompt: 'With 8 MiB weights, 36 MiB activations and an extra 8 MiB buffer, what footprint must fit?', answer: '8 + 36 + 8 = {{changedTotalMiB}} MiB.' },
}
const pass = { verdict: 'pass', issues: [] }
const revise = { verdict: 'revise', issues: ['Explain both resident allocations.'] }

function simulate(replies) {
  const receipt = { calls: [], sections: [] }
  const requests = []
  const promise = generatePackets([planLesson(brief, smallSource)], profiles.lean, async request => {
    requests.push(request)
    const next = replies.shift()
    if (next instanceof Error) throw next
    return { text: JSON.stringify(next), cached: false, usage: { input: 30, cachedInput: 2, output: 8 }, key: 'mock' }
  }, receipt).then(([files]) => files)
  return { receipt, requests, promise }
}

test('ledger verifies both pilot decisions and handles invalid references and arithmetic', () => {
  assert.equal(calculate(brief.sections[0].facts).changedTotalMiB, 52)
  assert.equal(calculate(readExample('hardware').sections[0].facts).spareKiB, 8)
  for (const invalid of [{ a: ['/', 1, 0] }, { a: ['+', 'later', 3] }, { a: ['pow', 3, 2] }]) assert.throws(() => calculate(invalid))
})

test('a worked pilot can draw its ledger in a custom diagram', () => {
  const proposed = structuredClone(brief)
  const section = proposed.sections[0]
  section.answerUnit = 'MiB'
  const fact = section.workedFacts[0]
  section.visual = { kind: 'custom', title: 'Live storage', caption: 'The label records the live allocation.',
    svg: '<svg viewBox="0 0 150 60"><text x="5" y="20">{{' + fact + '}} MiB</text></svg>' }
  const [planned] = planLesson(proposed, smallSource).sections
  assert.ok(planned.diagram.svg.includes('>' + planned.facts[fact] + ' MiB</text>'))
})

test('a changed-input answer in prose, including rendered literal values, triggers a focused repair before review', async () => {
  for (const leak of ['The total will be 52 MiB.', 'The total will be {{changedTotalMiB}} MiB.']) {
    const { promise, requests, receipt } = simulate([{ ...valid, body: valid.body + ' ' + leak }, valid, pass])
    const files = await promise
    assert.deepEqual(requests.map(v => v.role), ['writer', 'repair', 'reviewer'])
    assert.match(requests[1].prompt, /gives away/)
    assert.equal(receipt.sections[0].repairReasons.length, 1)
    assert.match(files.get('quiz.md'), /52 MiB/)
    assert.doesNotMatch(files.get('packet.md'), /52 MiB/)
  }
})

test('review requests one repair, rechecks it, and blocks an unresolved draft', async () => {
  const first = simulate([valid, revise, valid, pass])
  await first.promise
  assert.deepEqual(first.requests.map(v => v.role), ['writer', 'reviewer', 'repair', 'reviewer'])
  assert.match(first.requests[2].prompt, /Explain both resident allocations/)
  const blocked = simulate([valid, revise, valid, revise])
  await assert.rejects(blocked.promise, /needs editorial review/)
  assert.equal(blocked.receipt.sections.length, 0)
  await assert.rejects(simulate([valid, { verdict: 'pass', issues: ['Wrong math'] }]).promise, /Invalid reviewer verdict/)
})

test('recoverable writer syntax errors retain usage; provider errors stop the run', async () => {
  const usage = { input: 43, cachedInput: 2, output: 9 }
  const malformed = Object.assign(new Error('Invalid JSON reply'), { usage, code: 'INVALID_AGENT_REPLY' })
  const repaired = simulate([malformed, valid, pass])
  await repaired.promise
  assert.deepEqual(repaired.receipt.calls[0].usage, usage)
  const offline = simulate([new Error('Offline')])
  await assert.rejects(offline.promise, /Offline/)
  assert.equal(offline.requests.length, 1)
})

test('CLI plan and zero-call budget need no provider; a blocked run cannot overwrite an output', t => {
  const dir = mkdtempSync(join(tmpdir(), 'study-run-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const fixture = { ...brief, source: { ...brief.source, file: join(dir, 'source.qmd') } }
  const file = join(dir, 'brief.json'), out = join(dir, 'review')
  writeFileSync(fixture.source.file, smallSource)
  writeFileSync(file, JSON.stringify(fixture))
  const cli = fileURLToPath(new URL('./index.mjs', import.meta.url))
  assert.equal(JSON.parse(execFileSync(process.execPath, [cli, 'plan', file])).id, fixture.id)
  const args = [cli, 'run', file, '--out', out, '--cache', join(dir, 'cache'), '--max-calls', '0']
  assert.equal(spawnSync(process.execPath, args).status, 1)
  const saved = readFileSync(join(out, 'run.json'), 'utf8')
  assert.equal(JSON.parse(saved).liveCalls, 0)
  assert.equal(JSON.parse(saved).status, 'blocked')
  assert.equal(existsSync(join(out, 'packet')), false)
  assert.equal(spawnSync(process.execPath, args).status, 1)
  assert.equal(readFileSync(join(out, 'run.json'), 'utf8'), saved)
})

test('a grouped review repairs only the rejected section and keeps chapters independent', async () => {
  const second = { ...brief, id: 'vol1/02_second_pilot', title: 'Another budget' }
  const plans = [brief, second].map(value => planLesson(value, smallSource))
  const [a, b] = plans.map(p => p.brief.id + '/' + p.sections[0].section.id)
  const replies = [valid, valid, { reviews: [{ section: a, ...pass }, { section: b, ...revise }] }, valid, pass]
  const receipt = { calls: [], sections: [] }
  const results = await generatePackets(plans, profiles.lean, async () => ({ text: JSON.stringify(replies.shift()) }), receipt, 2)
  assert.equal(results.length, 2)
  assert.equal(JSON.parse(results[1].get('quiz.json')).chapterId, second.id)
  assert.deepEqual(receipt.calls.map(c => [c.role, c.sections]), [
    ['writer', [a]], ['writer', [b]], ['reviewer', [a, b]], ['repair', [b]], ['reviewer', [b]],
  ])
  assert.deepEqual(receipt.sections.map(s => s.repairReasons.length), [0, 1])
})

test('a missing baseline worked fact triggers repair even if the transfer answer is sound', async () => {
  const { promise, requests } = simulate([{ ...valid, body: 'Check ==resident memory=={count each buffer}' }, valid, pass])
  await promise
  assert.match(requests[1].prompt, /Show the baseline calculation/)
})

test('an unusable visual is rejected during planning for free', () => {
  const invalid = structuredClone(brief)
  invalid.sections[0].visual.rows = []
  assert.throws(() => planLesson(invalid, smallSource), /rows/)
})
