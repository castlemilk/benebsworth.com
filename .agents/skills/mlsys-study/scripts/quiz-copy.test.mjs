import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

test('compare the exported questions, ordered choices and worked key against the web quiz', t => {
  const dir = mkdtempSync(join(tmpdir(), 'study-quiz-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const json = join(dir, 'quiz.json')
  const md = join(dir, 'index.md')
  const program = fileURLToPath(new URL('./quiz-copy.mjs', import.meta.url))
  const run = (...args) => spawnSync(process.execPath, [program, json, ...args], { encoding: 'utf8' })
  writeFileSync(json, JSON.stringify({ questions: [
    { id: 'boundary', kind: 'MCQ', prompt: 'Which stage was timed?', correctOptionId: 'x',
      options: [{ id: 'y', label: 'Decode' }, { id: 'x', label: 'Inference' }], explanation: 'The trace starts after decode.' },
    { id: 'total', kind: 'NUMERIC', prompt: 'Add the two stages.', modelAnswer: '3 + 5 = 8 ms.' },
  ] }))
  const generated = run()
  assert.equal(generated.status, 0)
  assert.match(generated.stdout, /1\. B\. The trace starts after decode\./)
  assert.match(generated.stdout, /2\. 3 \+ 5 = 8 ms\./)
  // The export contains chapter prose and headings before and after the copied quiz.
  const body = generated.stdout.slice(generated.stdout.indexOf('\n')).replace('1. Which', '## 1. Which')
    .replace('1. B. The trace', '**1.** **B.** The trace')
  const check = copy => {
    writeFileSync(md, '## Worked example\n' + generated.stdout + '\n## Self-test\n' + copy + '\n## Audio overview\nListen.')
    return run('--compare', md)
  }
  assert.equal(check(body).status, 0)
  for (const [copy, reason] of [
    [body.split('## Answer key')[0], /Missing written answer key/],
    [body.replace('Add the two stages.', 'Compare the GPUs.'), /prompt or options wording or order: Q2/],
    [body.replace('A. Decode', 'A. Inference'), /prompt or options wording or order: Q1/],
    [body.replace('**B.** The trace', '**A.** The trace'), /answer wording or order: Q1/],
    [body.replace('8 ms.', '8 s.'), /answer wording or order: Q2/],
  ]) {
    const result = check(copy)
    assert.equal(result.status, 1)
    assert.match(result.stderr, reason)
  }
  writeFileSync(json, JSON.stringify({ questions: [
    { id: 'old', kind: 'FEYNMAN', prompt: 'Explain the decision.', rubric: 'Account for host time.' },
  ] }))
  assert.match(run().stderr, /old needs modelAnswer/)
})
