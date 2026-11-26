import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { checkDiagramPlan } from './check-diagram-coverage.mjs'

const diagram = { figure: './path.svg', teaches: 'Follow a token through attention.', source: 'Report Figure 4' }
const reading = { proseOnly: 'A short glossary gives searchable definitions.' }

function article(t, body, sections, { mirror = true, components = [] } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'diagram-check-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const folder = path.join(root, 'content/blog/example')
  const published = path.join(root, 'public/blog/example')
  mkdirSync(folder, { recursive: true })
  mkdirSync(published, { recursive: true })
  mkdirSync(path.join(root, 'components/mdx'), { recursive: true })
  writeFileSync(path.join(root, 'components/mdx/mdx-components.tsx'), `export const mdxComponents = { ${components.join(', ')} }`)
  writeFileSync(path.join(folder, 'index.mdx'), `---\ntitle: Demo\n---\n\n${body}`)
  writeFileSync(path.join(folder, 'path.svg'), '<svg/>')
  if (mirror) writeFileSync(path.join(published, 'path.svg'), '<svg/>')
  const plan = path.join(folder, 'diagram-plan.json')
  writeFileSync(plan, JSON.stringify({ source: 'index.mdx', sections }))
  return checkDiagramPlan(plan, root)
}

test('counts an inline figure in its own section and accepts a prose rationale', (t) => {
  const result = article(t, '## Token path\n\n![Local and full layers](./path.svg)\n\n## Glossary\n\nTerms.', { 'Token path': diagram, Glossary: reading })
  assert.equal(result.figures, 1)
  assert.deepEqual(result.errors, [])
})

test('flags a figure moved above its section, plus new and stale headings', (t) => {
  const { errors } = article(t, '![Local and full layers](./path.svg)\n\n## Token path\n\nTrace it.\n\n## Cost\n\nCompare the terms.', { 'Token path': diagram, Glossary: reading })
  assert.match(errors.join('\n'), /Token path.*missing in this section/)
  assert.match(errors.join('\n'), /Cost.*missing from the plan/)
  assert.match(errors.join('\n'), /Glossary.*no such heading/)
})

test('ignores fenced, quoted and link-only examples', (t) => {
  const body = '## Token path\n\n```md\n![Local layers](./path.svg)\n```\n\n> ![Example](./path.svg)\n\n[See diagram](./path.svg)\n\n{/*\n\n![Hidden](./path.svg)\n\n*/}'
  assert.match(article(t, body, { 'Token path': diagram }).errors.join('\n'), /missing in this section/)
})

test('requires descriptive alt text and the public blog mirror', (t) => {
  const { errors } = article(t, '## Token path\n\n![](./path.svg)', { 'Token path': diagram }, { mirror: false })
  assert.match(errors.join('\n'), /alt text/)
  assert.match(errors.join('\n'), /public\/blog\/example\/path\.svg/)
})

test('requires a plan for substantive parent prose and prevents duplicate headings', (t) => {
  const body = '## Guided notes\n\nThis context matters.\n\n### Token path\n\n![Local layers](./path.svg)\n\n### Token path\n\nAnother section.'
  const { errors } = article(t, body, { 'Token path': diagram })
  assert.match(errors.join('\n'), /Guided notes.*missing from the plan/)
  assert.match(errors.join('\n'), /Token path.*duplicate heading/)
})

test('requires a distinct primary figure for each illustrated section', (t) => {
  const body = '## Token path\n\n![Local layers](./path.svg)\n\n## Timing\n\n![Local layers](./path.svg)'
  const { errors } = article(t, body, { 'Token path': diagram, Timing: diagram })
  assert.match(errors.join('\n'), /Timing.*reuses the primary figure from "Token path"/)
})

test('reads standalone Study markers and their manifests under structural headings', (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'diagram-check-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const folder = path.join(root, 'study/mlsys/vol1/example')
  mkdirSync(path.join(folder, 'diagrams'), { recursive: true })
  writeFileSync(path.join(folder, 'diagrams/path.svg'), '<svg/>')
  writeFileSync(path.join(folder, 'diagrams.json'), JSON.stringify([
    { id: 'path', file: 'path.svg', title: 'Token path', caption: 'The flow through attention.' },
  ]))
  writeFileSync(path.join(folder, 'charts.json'), JSON.stringify([
    { id: 'timing', title: 'Timing', caption: 'Seconds per stage.' },
  ]))
  writeFileSync(path.join(folder, 'packet.md'), '## Guided notes\n\n### Token path\n\n::fig[path]\n\n### Timing\n\n::chart[timing]')
  const plan = path.join(folder, 'diagram-plan.json')
  const sections = {
    'Token path': { ...diagram, figure: '::fig[path]' },
    Timing: { ...diagram, figure: '::chart[timing]' },
  }
  writeFileSync(plan, JSON.stringify({ source: 'packet.md', sections }))
  assert.deepEqual(checkDiagramPlan(plan, root), { figures: 2, errors: [] })
  renameSync(path.join(folder, 'diagrams.json'), path.join(folder, 'book-figures.json'))
  renameSync(path.join(folder, 'diagrams'), path.join(folder, 'book-figures'))
  rmSync(path.join(folder, 'charts.json'))
  const missing = checkDiagramPlan(plan, root).errors.join('\n')
  assert.match(missing, /Token path.*manifest entry for path, found 0/)
  assert.match(missing, /Timing.*manifest entry for timing, found 0/)
  mkdirSync(path.join(root, 'study/research'))
  const research = path.join(root, 'study/research/example')
  renameSync(folder, research)
  assert.match(checkDiagramPlan(path.join(research, 'diagram-plan.json'), root).errors.join('\n'), /only supported in MLSys chapter packets/)
})

test('requires a standalone registered MDX embed in the planned section', (t) => {
  const sections = { 'Token path': { ...diagram, figure: '<TokenPath />' } }
  const rendered = article(t, '## Token path\n\n<TokenPath />', sections, { components: ['TokenPath'] })
  assert.deepEqual(rendered, { figures: 1, errors: [] })
  const quoted = article(t, '## Token path\n\n> <TokenPath />', sections)
  assert.match(quoted.errors.join('\n'), /Token path.*missing in this section/)
  const unregistered = article(t, '## Token path\n\n<TokenPath />', sections)
  assert.match(unregistered.errors.join('\n'), /TokenPath is missing from the MDX registry/)
})
