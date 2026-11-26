import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createDispatcher } from './agents.mjs'
import { chapterEvidence, planChapter, validateChapterPlan } from './chapter-plan.mjs'

const spec = {
  id: 'vol1/01_example', title: 'An engineer’s guide to tiles', question: 'How do you pick a tile?',
  source: { file: 'source/example.qmd', url: 'https://example.com/example.qmd' },
}
const qmd = [
  '---', 'title: Test chapter', '---', '# A chapter',
  '## Local storage {#local}', '', 'Storage can hold only a fraction of the array.', '',
  '### Read one tile {#read}', '', 'Load a tile from memory, then multiply it.', '',
  '```{python}', '### Fake heading', 'compute_something()', '```', '',
  'The original text cites @fig-tiles and a capacity of `{python} Formula.size`.', '$$C = w + a$$ {#eq-capacity}',
  '### Accumulate {#accumulate}', '', 'Keep partial sums in wider accumulators.', '',
  '## Writeback {#writeback}', '', 'Write the final output, once per tile.', '',
  '## Summary {#summary}', '', 'Choose based on the whole budget.', '',
  '## Purpose {.unlisted}', '', 'Tell readers which sections to read.',
].join('\n')

function validPlan() {
  return {
    thesis: 'Local reuse trades scarce storage for fewer repeated transfers.',
    sections: [{
      id: 'tile-budget', heading: 'Count bytes for the active tile',
      sourceHeadings: ['Local storage', 'Writeback'],
      core: 'Loading a large tile gives consumers more work per reload, but leaves less space for partial sums.',
      glossTargets: ['When operand and accumulator lifetimes overlap.'],
      beats: ['Keep output live until accumulation completes.', 'Write each completed tile once.'],
      example: 'Imagine an 8 KiB local store. If each operand takes 3 KiB, the accumulator and scratch have 2 KiB together.',
      misconception: 'The operand sizes alone do not determine local storage.',
      visual: {
        id: 'lifetime', title: 'A tile’s lifecycle', caption: 'Output stays local through accumulation.', kind: 'flow',
        steps: [{ label: 'Load operands', detail: 'Bring the input tile in.' }, { label: 'Write output', detail: 'Store the completed sum.' }],
      },
    }],
    glossary: [{ term: 'Tile', definition: 'The subset of a tensor processed as a unit.' }],
    applications: ['Size the activation scratch in an edge inference kernel.'],
    openQuestions: ['Which layout gets the most reuse from a hardware prefetcher?'],
  }
}

test('indexes H2s and H3s, keeps upstream line provenance, and removes Quarto code', () => {
  const [local] = chapterEvidence(qmd, ['Local storage'])
  assert.equal(local.heading, 'Local storage')
  assert.equal(local.anchor, 'local')
  assert.equal(local.startLine, 5)
  assert.deepEqual(local.subheadings.map(({ heading, startLine }) => [heading, startLine]), [
    ['Read one tile', 9], ['Accumulate', 20],
  ])
  assert.match(JSON.stringify(local.excerpts), /Keep partial sums/)
  assert.match(JSON.stringify(local.excerpts), /value omitted/)
  assert.match(JSON.stringify(local.excerpts), /C = w \+ a/)
  assert.doesNotMatch(JSON.stringify(local), /Formula\.size|compute_something|Fake heading|@fig-tiles/)
  assert.deepEqual(chapterEvidence(qmd).map(({ heading }) => heading), ['Local storage', 'Writeback', 'Summary'])
  assert.throws(() => chapterEvidence(qmd, ['local storage']), /Unknown source heading.*local storage/)
})

test('preserves headings after a closing delimiter on the last line of a display equation', () => {
  const source = qmd.replace('$$C = w + a$$ {#eq-capacity}', () => '$$\nC = w + a$$ {#eq-capacity}')
  const [local] = chapterEvidence(source, ['Local storage'])
  assert.deepEqual(local.subheadings.map(({ heading }) => heading), ['Read one tile', 'Accumulate'])
  assert.match(JSON.stringify(local.excerpts), /C = w \+ a/)
})

test('checks an edited plan without invoking a model', () => {
  const candidate = validPlan()
  candidate.sections[0].visual = {
    id: 'tiles', title: 'Local storage budget', caption: 'Both bars use the same budget.',
    kind: 'bars', unit: 'KiB', rows: [{ label: 'Operands', value: 6 }, { label: 'Capacity', value: 8 }],
  }
  const evidence = chapterEvidence(qmd)
  assert.equal(validateChapterPlan(candidate, evidence), candidate)
  candidate.sections[0].visual.rows[1].value = '8'
  assert.throws(() => validateChapterPlan(candidate, evidence), /Capacity value must be finite/)
})

test('accepts an optional whole-number editorial word target within range', () => {
  const candidate = validPlan()
  const evidence = chapterEvidence(qmd)
  const section = candidate.sections[0]
  assert.equal(validateChapterPlan(candidate, evidence), candidate)
  for (const targetWords of [200, 535, 800]) {
    section.targetWords = targetWords
    assert.equal(validateChapterPlan(candidate, evidence).sections[0].targetWords, targetWords)
  }
  for (const targetWords of [199, 801, 350.5, '350', null]) {
    section.targetWords = targetWords
    assert.throws(() => validateChapterPlan(candidate, evidence), /Section 1 targetWords must be an integer from 200 to 800/)
  }
})

test('plans a bespoke diagram next to a prose-led section and rejects ambiguous choices', () => {
  const candidate = validPlan()
  const illustrated = candidate.sections[0]
  illustrated.visual = { id: 'lifetimes', kind: 'custom', title: 'Overlapping writes',
    caption: 'Both buffers are live between writes.', svg: '<svg viewBox="0 0 160 80"><path d="M10 20h70m-25 20h55"/></svg>' }
  illustrated.visualAfter = 'mechanism'
  const prose = { ...illustrated, id: 'terminology', heading: 'Read the allocation contract', proseOnly: 'The two definitions fit in one sentence.' }
  delete prose.visual
  delete prose.visualAfter
  candidate.sections.push(prose)
  const check = () => validateChapterPlan(candidate, chapterEvidence(qmd))
  assert.equal(check(), candidate)
  prose.visual = illustrated.visual
  assert.throws(check, /proseOnly conflicts/)
  delete prose.visual
  illustrated.visualAfter = 'elsewhere'
  assert.throws(check, /visualAfter/)
  delete illustrated.visualAfter
  illustrated.visual.svg = '<svg viewBox="0 0 90 40"><image/></svg>'
  assert.throws(check, /unsupported element/)
})

test('fresh plans identify distinct gloss targets and earlier saved plans still load', () => {
  const candidate = validPlan()
  const section = candidate.sections[0]
  const evidence = chapterEvidence(qmd)
  delete section.glossTargets
  assert.equal(validateChapterPlan(candidate, evidence), candidate)
  const validateNew = () => validateChapterPlan(candidate, evidence, { requireGlossTargets: true })
  assert.throws(validateNew, /glossTargets/)
  for (const invalid of [[], 'Overlap', [''], ['Overlap', ' overlap ']]) {
    section.glossTargets = invalid
    assert.throws(validateNew, /glossTargets|gloss target/)
  }
  section.glossTargets = ['When both inputs are live', 'When to charge writeback traffic']
  assert.equal(validateNew(), candidate)
})

test('plans through Sol with exact evidence and reuses a cached reply', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'study-plan-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const requests = []
  const dispatch = createDispatcher({ cacheDir: directory, invoke: async request => {
    requests.push(request)
    return { text: JSON.stringify(validPlan()), usage: { input: 5, cachedInput: 0, output: 5 } }
  } })
  assert.deepEqual(await planChapter(spec, qmd, dispatch), validPlan())
  assert.deepEqual(await planChapter(spec, qmd, dispatch), validPlan())
  assert.equal(requests.length, 1)
  const [{ role, model, effort, prompt }] = requests
  assert.deepEqual({ role, model, effort }, { role: 'architect', model: 'gpt-6.2-sol', effort: 'high' })
  assert.match(prompt, /https:\/\/example\.com\/example\.qmd/)
  assert.match(prompt, /Keep partial sums/)
  assert.match(prompt, /"requiredSourceHeadings":\["Local storage","Writeback"\]/)
  assert.match(prompt, /targetWords/)
  assert.match(prompt, /changed-input result.*answer key.*open questions/)
  assert.doesNotMatch(prompt, /Formula\.size|compute_something|Fake heading/)
  await planChapter(spec, qmd, dispatch, 'Keep the discussion focused on SRAM.')
  assert.equal(requests.length, 2)
  assert.match(requests[1].prompt, /Keep the discussion focused on SRAM/)
})

test('repairs missing substantive headings and compiler errors in one follow-up', async () => {
  const invalid = validPlan()
  invalid.sections[0].sourceHeadings = ['Local storage']
  invalid.sections[0].visual.steps[0].label = 'A flowing diagram label far too long to render'
  const requests = []
  const dispatch = async request => {
    requests.push(request)
    return { text: JSON.stringify(requests.length === 1 ? invalid : validPlan()) }
  }
  assert.deepEqual(await planChapter(spec, qmd, dispatch), validPlan())
  assert.equal(requests.length, 2)
  assert.match(requests[1].prompt, /Missing required source headings: Writeback/)
  assert.match(requests[1].prompt, /step label is too long/)
  assert.match(requests[1].prompt, /A flowing diagram label far too long/)
})

test('each outline gets replayable style draws, including during a planner repair', async () => {
  async function draws(input, repair = false) {
    const seen = []
    await planChapter(input, qmd, async ({ prompt }) => {
      const original = prompt.split('\n\nRepair the earlier output.')[0]
      seen.push(JSON.parse(original.split('\n').at(-1)).visualDraws)
      return { text: JSON.stringify(repair && seen.length === 1 ? {} : validPlan()) }
    })
    if (repair) assert.deepEqual(seen[1], seen[0])
    return seen[0]
  }
  const original = await draws(spec, true)
  assert.deepEqual(original, await draws(spec))
  assert.ok(original.length >= validPlan().sections.length)
  for (const order of original) assert.equal([...order].sort().join(''), '123')
  assert.notDeepEqual(original, await draws({ ...spec, id: 'vol1/another_chapter' }))
  const alternate = { ...spec, visualSeed: 'second sketch' }
  assert.notDeepEqual(original, await draws(alternate))
  assert.deepEqual(await draws(alternate), await draws(alternate))
  await assert.rejects(draws({ ...spec, visualSeed: [] }), /visualSeed/)
})

test('reports remaining validation errors after two attempts', async () => {
  const invalid = validPlan()
  invalid.sections[0].sourceHeadings = ['Local Storage']
  let calls = 0
  await assert.rejects(() => planChapter(spec, qmd, async () => {
    calls += 1
    return { text: JSON.stringify(invalid) }
  }), /Unknown source heading "Local Storage"[\s\S]*Missing required source headings: Local storage, Writeback/)
  assert.equal(calls, 2)
})

test('uses the repair budget for malformed JSON but propagates dispatch failures', async () => {
  let calls = 0
  assert.deepEqual(await planChapter(spec, qmd, async () => {
    calls += 1
    if (calls === 1) throw Object.assign(new Error('Codex reply must be a JSON object'), { code: 'INVALID_AGENT_REPLY' })
    return { text: '```json\n' + JSON.stringify(validPlan()) + '\n```' }
  }), validPlan())
  assert.equal(calls, 2)
  calls = 0
  await assert.rejects(() => planChapter(spec, qmd, async () => {
    calls += 1
    throw new Error('Call budget exhausted')
  }), /Call budget exhausted/)
  assert.equal(calls, 1)
})
