import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { indexChapter, packSection } from './source.mjs'

const fixture = `---
title: test
## Not a section
---
## Purpose {.unlisted}
Ignored.
## First {#sec-first}

Introductory evidence.

\`\`\`{python}
## Not a section
print("noise")
\`\`\`

### Calculation {#calc}

$$
x = 3
$$

A relevant value is \`{python} result\`.

## Second
More evidence.
`

test('indexes H2 sections outside fences and frontmatter', () => {
  assert.deepEqual(indexChapter(fixture), [
    { heading: 'First', startLine: 7, endLine: 23 },
    { heading: 'Second', startLine: 24, endLine: 26 },
  ])
})

test('preserves evidence, math and flags placeholders', () => {
  const packed = packSection(fixture, 'First', { terms: ['relevant'] })
  assert.equal(packed.needsVerification, true)
  assert.equal(packed.omitted, false)
  assert.match(packed.excerpts.map((x) => x.text).join('\n'), /\$\$\nx = 3\n\$\$/)
  assert.doesNotMatch(JSON.stringify(packed.excerpts), /print/)
  for (const x of packed.excerpts) assert.equal(x.text, fixture.split('\n').slice(x.startLine - 1, x.endLine).join('\n'))
  assert.equal(packed.excerptBytes, packed.excerpts.reduce((n, x) => n + Buffer.byteLength(x.text), 0))
})

test('honours byte budget and ranks terms without splitting unicode', () => {
  const qmd = `## Topic\n\n${'é'.repeat(400)}\n\n${'other '.repeat(30)}\n\nneedle ${'signal '.repeat(20)}\n`
  const packed = packSection(qmd, 'Topic', { maxBytes: 256, terms: ['needle'] })
  assert.ok(packed.excerptBytes <= 256)
  assert.equal(packed.omitted, true)
  assert.match(JSON.stringify(packed.excerpts), /needle/)
  assert.doesNotMatch(JSON.stringify(packed.excerpts), /�/)
})

test('rejects invalid or ambiguous requests', () => {
  for (const args of [[fixture, ''], [fixture, 'Missing'], [fixture, 'First', { maxBytes: 0 }], [fixture, 'First', { terms: 'bad' }], ['## Same\na\n## Same\nb', 'Same']]) assert.throws(() => packSection(...args))
})

test('reduces pinned chapters while preserving source ranges', () => {
  for (const path of ['10_model_compression/10_model_compression.qmd', '11_hw_acceleration/11_hw_acceleration.qmd']) {
    const qmd = readFileSync(`study/cs249r_book/books/vol1/${path}`, 'utf8')
    const section = indexChapter(qmd)[0]
    const pack = packSection(qmd, section.heading, { terms: ['memory', 'compute'] })
    assert.ok(pack.excerptBytes <= 7000 && pack.excerptBytes < pack.sourceBytes / 10)
    assert.ok(pack.excerpts.length > 1)
    for (const x of pack.excerpts) assert.equal(x.text, qmd.split('\n').slice(x.startLine - 1, x.endLine).join('\n'))
  }
})
