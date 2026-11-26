import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { checkDiagramPlan } from '../check-diagram-coverage.mjs'
import { compileLesson } from './compile.mjs'

const recipe = () => ({
  id: 'vol1/12_ml_benchmarking',
  title: 'ML Benchmarking',
  question: 'Would you ship "A" at 2× the load?',
  intro: '*Source notes.*',
  sections: [{
    heading: 'Reading the measurements',
    body: 'Check the ==tail=={A percentile describes one point in the distribution.}.\n\n::eq[slack]',
    figure: '::fig[latency]',
    teaches: 'Compare the same percentile across two measurement windows.',
    source: 'Illustrative traces.',
  }],
  diagrams: [{
    id: 'latency', title: 'Latency at p95', caption: 'Compare windows A & B.',
    kind: 'bars', unit: 'ms', rows: [{ label: 'A < limit', value: 40 }, { label: 'B', value: 55 }],
  }],
  equations: [{
    id: 'slack', number: 1, title: 'Slack', latex: 's=T-t', caption: 'The remainder of a time budget.',
    symbols: [{ symbol: 's', name: 'slack', meaning: 'Time remaining.' }],
  }],
  questions: [{
    id: 'pick', kind: 'MCQ', source: 'ORIGINAL', prompt: 'Which is below 50 ms?',
    options: [{ id: 'window-b', label: 'Window B' }, { id: 'window-a', label: 'Window A' }],
    correctOptionId: 'window-a', explanation: 'Window A takes 40 ms.',
  }, {
    id: 'calculate', kind: 'NUMERIC', source: 'ORIGINAL', prompt: 'Find the slack.',
    modelAnswer: '10 ms when budgeted at 50 ms.',
  }],
  podcast: '# hosts: Asha | Bo\nA: Let’s compare two windows.\n::eq[slack]\nB: Start with the budget.\n::fig[latency]',
})

function writePacket(artifacts, folder) {
  for (const [name, contents] of artifacts) {
    const file = path.join(folder, name)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, contents)
  }
}

test('a review sample compiles repeatably and passes the actual plan checker and Markdown export', (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'study-compile-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const folder = path.join(root, 'study/mlsys/vol1/12-ml-benchmarking')
  const artifacts = compileLesson(recipe())
  assert.deepEqual(artifacts, compileLesson(recipe()))
  assert.deepEqual([...artifacts.keys()].sort(), [
    'book-figures.json', 'charts.json', 'diagram-plan.json', 'diagrams.json', 'diagrams/latency.svg',
    'equations.json', 'packet.md', 'podcast.md', 'quiz.json', 'quiz.md',
  ])
  assert.match(artifacts.get('packet.md'), /\*Source notes\.\*\n\n## Reading/)
  assert.match(artifacts.get('packet.md'), /::eq\[slack\]\n\$\$\ns=T-t\n\$\$/)
  assert.equal(JSON.parse(artifacts.get('quiz.json')).chapterId, recipe().id)
  assert.match(artifacts.get('quiz.md'), /B\. Window A/)
  assert.match(artifacts.get('quiz.md'), /B\. Window A takes 40 ms\./)
  assert.match(artifacts.get('quiz.md'), /10 ms when budgeted at 50 ms\./)
  writePacket(artifacts, folder)
  assert.deepEqual(checkDiagramPlan(path.join(folder, 'diagram-plan.json'), root), { figures: 1, errors: [] })
  const exporter = fileURLToPath(new URL('../gen-study-md.mjs', import.meta.url))
  execFileSync(process.execPath, [exporter], { cwd: root })
  const exported = readFileSync(path.join(root, 'public/study/vol1/12-ml-benchmarking/index.md'), 'utf8')
  assert.match(exported, /Would you ship "A" at 2× the load\?/)
  assert.match(exported, /\*\*Eq 1 · Slack\*\*/)
  assert.match(exported, /!\[Latency at p95\]\([^)]*latency\.svg\)/)
  assert.ok(!exported.includes('::fig['))
})

test('compiles structural headings, charts, linked book figures and a supplied SVG together', () => {
  const input = recipe()
  input.sections = [
    { heading: 'Guided notes', body: '' },
    { ...input.sections[0], level: 3, body: 'Compare.\n\n::fig[latency]\n\n::fig[book-figure]' },
    {
      heading: 'Timing totals', level: 3, body: 'Read from the left.\n\n::chart[totals]',
      teaches: 'Identify the lower value.', source: 'Illustrative totals.',
    },
    { heading: 'Glossary', body: '- **Budget**: Available time.', proseOnly: 'Provides searchable definitions.' },
  ]
  input.charts = [{
    id: 'totals', title: 'Request time', caption: 'An illustrative request.', kind: 'BAR_STACKED',
    xPoints: ['Baseline'], series: [{ key: 'latency', label: 'Latency', color: 'var(--chart-1)', values: [3] }],
  }]
  input.bookFigures = [{ id: 'book-figure', title: 'Book figure', caption: 'See the original.', file: 'fig-book' }]
  input.diagrams[0] = {
    id: 'latency', title: 'Latency', caption: 'Compare windows.',
    kind: 'custom', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 25"><path d="M0 0h50"/></svg>',
  }
  const artifacts = compileLesson(input)
  const packet = artifacts.get('packet.md')
  assert.match(packet, /## Guided notes\n\n### Reading/)
  assert.equal(packet.match(/::fig\[latency\]/g).length, 1)
  const plan = JSON.parse(artifacts.get('diagram-plan.json'))
  assert.deepEqual(Object.keys(plan.sections), ['Reading the measurements', 'Timing totals', 'Glossary'])
  assert.equal(plan.sections['Timing totals'].figure, '::chart[totals]')
  const svg = artifacts.get('diagrams/latency.svg')
  assert.match(svg, /<path d="M0 0h50"\/>/)
  assert.match(svg, /<title[^>]*>Latency<\/title>/)
  assert.match(svg, /<desc[^>]*>Compare windows\.<\/desc>/)
})

test('generated bars escape text and keep mixed, zero and extreme values within the viewport', () => {
  const input = recipe()
  input.diagrams[0].rows = [
    { label: 'Old < & "new"', value: -Number.MAX_VALUE },
    { label: 'Zero', value: 0 },
    { label: 'New', value: Number.MAX_VALUE },
  ]
  const svg = compileLesson(input).get('diagrams/latency.svg')
  assert.match(svg, /Old &lt; &amp; &quot;new&quot;/)
  const dom = new JSDOM(svg, { contentType: 'image/svg+xml' })
  const root = dom.window.document.documentElement
  const [, , width, height] = root.getAttribute('viewBox').split(' ').map(Number)
  assert.match(root.querySelector('desc').textContent, /Zero: 0 ms/)
  for (const rect of root.querySelectorAll('rect')) {
    assert.ok(Number(rect.getAttribute('x')) + Number(rect.getAttribute('width')) <= width)
    assert.ok(Number(rect.getAttribute('y')) + Number(rect.getAttribute('height')) <= height)
    assert.ok(Number(rect.getAttribute('width')) >= 0)
  }
  dom.window.close()
})

test('flows render steps and arrow order in a narrow, themed and accessible SVG', () => {
  const input = recipe()
  input.diagrams[0] = {
    ...input.diagrams[0], kind: 'flow',
    steps: [
      { label: 'Trace <input>', detail: 'Record the inputs that cross the measured service boundary.' },
      { label: 'Warm up', detail: 'Let allocation & compilation settle.' },
      { label: 'Measure', detail: 'Use consistent sample windows.' },
    ],
  }
  const svg = compileLesson(input).get('diagrams/latency.svg')
  assert.match(svg, /Trace &lt;input&gt;/)
  assert.match(svg, /var\(--surface, /)
  const dom = new JSDOM(svg, { contentType: 'image/svg+xml' })
  const root = dom.window.document.documentElement
  const [, , width, height] = root.getAttribute('viewBox').split(' ').map(Number)
  assert.ok(width <= 360)
  assert.ok(root.classList.contains('study-fig-fit'))
  assert.match(root.querySelector('desc').textContent, /Trace <input>: .* Then Warm up: .* Then Measure:/)
  assert.equal(root.querySelectorAll('path').length, 2)
  assert.equal(root.querySelectorAll('rect').length, input.diagrams[0].steps.length)
  for (const rect of root.querySelectorAll('rect')) {
    assert.ok(Number(rect.getAttribute('x')) + Number(rect.getAttribute('width')) <= width)
    assert.ok(Number(rect.getAttribute('y')) + Number(rect.getAttribute('height')) <= height)
  }
  assert.ok(root.querySelectorAll('tspan').length > input.diagrams[0].steps.length)
  dom.window.close()
  input.diagrams[0].steps[0].detail = 'Repeat the input. '.repeat(20)
  assert.throws(() => compileLesson(input), /flow.*detail.*three lines/)
  input.diagrams[0].steps = input.diagrams[0].steps.slice(0, 1)
  assert.throws(() => compileLesson(input), /flow steps.*at least 2/)
})

test('validates IDs, quiz answers and finite numeric inputs', () => {
  const rejects = [
    [(data) => { data.id = 'vol1/../evil' }, /recipe\.id.*safe/],
    [(data) => { data.diagrams[0].id = '../unsafe' }, /diagram.*id.*safe/i],
    [(data) => { data.bookFigures = [{ ...data.diagrams[0], file: 'fig-latency' }] }, /duplicate.*latency/i],
    [(data) => { data.questions[0].correctOptionId = 'no-such-option' }, /correctOptionId.*option/],
    [(data) => { data.questions[0].options[1].id = 'window-b' }, /duplicate.*window-b/i],
    [(data) => { data.questions[0].explanation = ' ' }, /explanation/],
    [(data) => { delete data.questions[1].modelAnswer }, /modelAnswer/],
    [(data) => { data.diagrams[0].rows[0].value = Infinity }, /finite/],
    [(data) => { data.charts = [{ id: 'x', title: 't', caption: 'c', kind: 'BAR_STACKED',
      xPoints: ['a'], series: [{ key: 'value', label: 'Value', color: '#000', values: [NaN] }],
    }] }, /finite/],
    [(data) => { data.podcast += '\n::eq[missing]' }, /podcast.*missing/],
    [(data) => { data.podcast += '\nA: Compare the windows.\n::fig[missing]' }, /podcast.*missing/],
  ]
  for (const [mutate, error] of rejects) {
    const input = recipe()
    mutate(input)
    assert.throws(() => compileLesson(input), error)
  }
})

test('validates marker placement and preserves matching handwritten math', () => {
  const input = recipe()
  const section = input.sections[0]
  section.body = 'Discuss slack.\n\n::eq[slack]\n$$\ns=T-t\n$$\n\n```txt\n::fig[demonstration]\n```'
  assert.equal(compileLesson(input).get('packet.md').match(/s=T-t/g).length, 1)
  section.body = section.body.replace('s=T-t', 's=t-T')
  assert.throws(() => compileLesson(input), /equation.*slack.*differs/i)
  section.body = 'Discuss slack.\n::fig[latency]'
  assert.throws(() => compileLesson(input), /standalone/)
  section.body = 'Compare options.\n\n::chart[unknown]'
  assert.throws(() => compileLesson(input), /unknown.*chart|chart.*unknown/)
  section.body = 'Compare options.\n\n::eq[slack]\n$$\ns=T-t'
  assert.throws(() => compileLesson(input), /equation.*slack.*fence/i)
  section.body = 'Compare options.'
  section.proseOnly = 'Provides context.'
  assert.throws(() => compileLesson(input), /proseOnly/)
})

test('validates figure placement in the complete packet after Markdown resolves reference links', () => {
  const input = recipe()
  input.sections.push({ heading: 'Glossary', body: '[latency]: https://example.com/',
    proseOnly: 'Definitions.' })
  assert.throws(() => compileLesson(input), /marker.*latency.*standalone|standalone.*latency/)
  input.sections = [
    { heading: 'Thesis', body: 'Prose followed by an open code fence.\n\n~~~', proseOnly: 'Opening statement.' },
    input.sections[0],
  ]
  assert.throws(() => compileLesson(input), /heading.*Reading the measurements/)
})

test('a single H3 works for a sample and prose sections may contain annotated math', () => {
  const input = recipe()
  input.sections[0].level = 3
  assert.match(compileLesson(input).get('packet.md'), /### Reading the measurements/)
  input.sections.push({
    heading: 'Quick reference', body: 'Recall the budget.\n\n::eq[slack]',
    proseOnly: 'An equation is enough for this reference.',
  })
  assert.match(compileLesson(input).get('packet.md'), /## Quick reference\n\nRecall the budget.\n\n::eq\[slack\]\n\$\$/)
})

test('rejects unsafe or unbounded custom SVGs before embedding them', () => {
  const input = recipe()
  const base = input.diagrams[0]
  for (const [contents, error] of [
    ['<script>alert(1)</script>', /SVG.*script/],
    ['<rect width="2" height="2" onload="alert(1)"/>', /SVG.*onload/],
    ['<rect width="2" height="2" fill="url(https://example.com/a)"/>', /SVG.*reference/],
    ['<rect width="Infinity" height="2"/>', /SVG.*finite/],
    ['<path d="M0 1e999"/>', /SVG.*finite/],
  ]) {
    input.diagrams[0] = { ...base, kind: 'custom', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 25">${contents}</svg>` }
    assert.throws(() => compileLesson(input), error)
  }
  input.diagrams[0].svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 90000"/>'
  assert.throws(() => compileLesson(input), /SVG.*viewBox/)
})
