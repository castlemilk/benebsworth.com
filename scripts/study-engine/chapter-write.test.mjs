import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createDispatcher } from './agents.mjs'
import { writeChapter } from './chapter-write.mjs'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkMath from 'remark-math'

const spec = { id: 'vol1/01_capacity', title: 'Device capacity', question: 'Which allocation determines the peak?',
  source: { url: 'https://example.org/book.qmd' },
  sections: [{ sourceHeading: 'Capacity', case: 'Hold 8 MiB of weights and 36 MiB of activations in 48 MiB of memory.',
    facts: { original: 60, peak: 44, cap: 48, buffer: 8, total: ['+', 'peak', 'buffer'] },
    workedFacts: ['original', 'peak', 'cap'], transfer: 'Add an 8 MiB live workspace. Does it fit?', answerFact: 'total', answerUnit: 'MiB' }] }

const sections = ['Capacity', 'Precision', 'Validation'].map(heading => {
  const id = heading.toLowerCase()
  return { id, heading: 'Study ' + heading, sourceHeadings: [heading],
    core: heading + ' changes the accounting. An allocation contributes to a peak only while its storage remains live.',
    beats: ['Distinguish model files from live storage.', 'Track overlapping allocation lifetimes.'],
    example: 'Account for resident tensors at the chosen batch size.', misconception: 'Every tensor lives forever.',
    visual: { id: id + '-figure', kind: 'flow', title: heading + ' decision path',
      caption: 'Inspect the allocations that coexist during the operation.',
      steps: [{ label: 'Inspect', detail: 'Record each buffer lifetime.' }, { label: 'Compare', detail: 'Add simultaneously live bytes.' }] } }
})
const plan = { thesis: 'Count the storage required by the deployed operator at peak use.', sections,
  glossary: [{ term: 'Resident', definition: 'Held in live memory.' }], applications: ['Trace a local inference service.'],
  openQuestions: ['Which allocations overlap at a larger batch size?'] }
const qmd = sections.map(s => '## ' + s.sourceHeadings[0] + '\n\nAllocation lifetimes determine the peak of a deployed operator.\n').join('\n')
const checks = { mechanism: 'Checked lifetime overlap.', calculation: '44 + 8 = 52 MiB exceeds 48 MiB.', continuity: 'Capacity precedes measurement.', assessment: 'The transfer adds a live allocation.' }

function draft(section) {
  const mechanism = 'Follow one request from loading the model to sending the answer. The loader creates a live allocation for each weight tensor. An operator creates its outputs, retains the inputs it still needs, and can release those inputs after their last consumer finishes. A ==lifetime trace=={Overlapping allocations compete for the same capacity at the same instant.} records when each allocation appears and when the allocator can reuse its storage. Track the largest total across the request.'
  const worked = 'Consider a device running a fixed batch with a memory limit of 48 MiB. Its original weights occupy 24 MiB and live activations use 36 MiB at the peak. Together those allocations require 60 MiB. Replacing the weights with an 8 MiB representation brings their combined footprint down to 44 MiB. This accounting assumes that the runtime consumes the packed representation directly and creates no other simultaneous allocation.'
  const diagnosis = 'Read the two stages in order. Report the start and end of each allocation before deciding which sizes to add. A trace that records only the size of the compressed file misses temporary storage created inside the operator. If the request still fails, inspect the first operator whose live set exceeds capacity and compare its actual buffers with the accounted tensors. Repeat the measurement at the batch size used for the deployment decision.'
  const quiz = section.quizKind === 'NUMERIC'
    ? { prompt: 'A live 8 MiB workspace joins 44 MiB of tensors under a 48 MiB limit. Does it fit?', answer: '44 + 8 = 52 MiB, so the allocations exceed the limit by 4 MiB.' }
    : section.quizKind === 'MCQ'
    ? { prompt: 'Which measurement explains the peak?', answer: 'A simultaneous allocation trace',
      distractors: ['A weight-file listing', 'An average token rate', 'A final accuracy score'], explanation: 'Only the trace shows which allocations coincide.' }
    : { prompt: 'Why could a smaller artifact still fail during execution?', answer: 'An overlapping runtime workspace consumes the remaining capacity.' }
  return { id: section.id, mechanism, worked, diagnosis, quiz, physics: { quantity: 'Peak live storage', value: 'sum of concurrent allocations, MiB', use: 'Compare peak memory with capacity.' } }
}

const payload = request => JSON.parse(request.prompt.split('\n').at(-1))
const reply = value => ({ text: JSON.stringify(value), usage: { input: 120, cachedInput: 0, output: 50 } })
const accept = () => reply({ checks, issues: [] })
function respond(request) {
  if (request.role === 'chapter-reviewer') return accept()
  return reply({ sections: payload(request).sections.map(draft) })
}

test('compiled chapter interleaves each source-grounded example and figure, exports native quiz types and a physics table', async () => {
  const calls = [], reviews = []
  const artifacts = await writeChapter(spec, qmd, plan, async request => {
    calls.push(request)
    return respond(request)
  }, { onReview: outcome => reviews.push(outcome) })
  assert.deepEqual(calls.map(call => [call.role, call.sectionIds]), [
    ['chapter-writer', ['capacity', 'precision']], ['chapter-writer', ['validation']], ['chapter-reviewer', ['capacity', 'precision', 'validation']],
  ])
  assert.equal(calls[0].model, 'gpt-6.1-terra')
  assert.equal(calls.at(-1).model, 'gpt-6-luna')
  assert.deepEqual(reviews, [{ verdict: 'pass', checks, issues: [] }])
  const packet = artifacts.get('packet.md')
  assert.deepEqual(packet.match(/^## .+$/gm), ['## Thesis', '## Guided notes', '## The physics', '## Glossary', "## → Ben's world", '## Open questions'])
  assert.match(packet, /\| Quantity \| Value \| Use \|[\s\S]*\| Peak live storage \|/)
  assert.match(packet, /- \*\*Resident\*\*: Held in live memory\./)
  for (const section of sections) {
    assert.ok(packet.includes(section.core))
    assert.ok(artifacts.has('diagrams/' + section.visual.id + '.svg'))
    assert.ok(packet.includes('simultaneous allocation.\n\n::fig[' + section.visual.id + ']\n\nRead the two stages'))
  }
  const { questions } = JSON.parse(artifacts.get('quiz.json'))
  assert.deepEqual(questions.map(q => q.kind), ['NUMERIC', 'MCQ', 'FEYNMAN'])
  assert.equal(questions[1].options.find(o => o.id === questions[1].correctOptionId).label, 'A simultaneous allocation trace')
  assert.ok(questions[1].options.findIndex(o => o.id === questions[1].correctOptionId) > 0)
  assert.match(artifacts.get('quiz.md'), /52 MiB/)
  const review = payload(calls.at(-1))
  assert.equal(review.packet, packet)
  assert.deepEqual(review.quiz, questions)
  assert.equal(review.sections[0].seedLedger.facts.total, 52)
  assert.match(review.sections[0].source[0].passages[0].text, /Allocation lifetimes/)
})

test('repairs only the section rejected by local depth and the section flagged by independent review', async () => {
  const calls = [], outcomes = []
  let reviewed = 0, firstPacket
  const artifacts = await writeChapter(spec, qmd, plan, async request => {
    calls.push([request.role, request.sectionIds])
    const data = payload(request)
    if (request.role === 'chapter-reviewer') {
      if (!reviewed++) return reply({ checks, issues: [{ id: 'validation', change: 'Explain why the workspace is allocated late.' }] })
      return accept()
    }
    const result = data.sections.map(section => {
      const complete = draft(section)
      if (section.id === 'capacity' && request.role === 'chapter-writer') return { ...complete, worked: 'Too brief.' }
      if (section.id === 'capacity') {
        assert.match(section.feedback[0], /substantive|at least 200/)
        return { id: section.id, worked: complete.worked }
      }
      if (section.id === 'validation' && request.role === 'chapter-repair') {
        assert.match(section.feedback[0], /allocated late/)
        return { id: section.id, diagnosis: complete.diagnosis + ' The runtime requests the workspace on first invocation.' }
      }
      return complete
    })
    return reply({ sections: result })
  }, { onReview: r => outcomes.push(r.verdict), onDraft: map => { firstPacket = map.get('packet.md') } })
  assert.deepEqual(calls.filter(([role]) => role === 'chapter-repair').map(([, ids]) => ids), [['capacity'], ['validation']])
  assert.deepEqual(outcomes, ['revise', 'pass'])
  assert.ok(!firstPacket.includes('on first invocation'))
  assert.match(artifacts.get('packet.md'), /on first invocation/)
})

test('rejects a transfer leaked into the teaching prose, limits repairs and propagates unavailable usage/budget', async () => {
  let calls = 0
  await assert.rejects(writeChapter(spec, qmd, plan, async request => {
    calls++
    return reply({ sections: payload(request).sections.map(s => {
      const body = draft(s)
      if (s.id === 'capacity') body.worked += ' Adding the buffer gives 52 MiB.'
      return body
    }) })
  }), /changed-input result 52 MiB/)
  assert.equal(calls, 2)
  await assert.rejects(writeChapter(spec, qmd, plan, () => { throw new Error('Live call limit reached') }), /Live call limit/)
})

test('replays the same accepted chapter byte-for-byte from dispatch cache without a live invocation', async t => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'study-chapter-test-'))
  t.after(() => rm(cacheDir, { recursive: true, force: true }))
  const fresh = await writeChapter(spec, qmd, plan, createDispatcher({ cacheDir, invoke: respond }))
  const cache = createDispatcher({ cacheDir, beforeInvoke: () => assert.fail('Unexpected new call') })
  const cached = await writeChapter(spec, qmd, plan, async request => {
    const result = await cache(request)
    assert.equal(result.cached, true)
    assert.deepEqual(result.usage, { input: 0, cachedInput: 0, output: 0 })
    return result
  })
  assert.deepEqual([...cached], [...fresh])
})

test('matches a ledger by lesson id when a chapter splits one source heading across two lessons', async () => {
  const intro = { ...sections[0], id: 'overview', heading: 'A capacity decision',
    visual: { ...sections[0].visual, id: 'overview-fig' } }
  const split = { ...plan, sections: [intro, ...sections] }
  const matchingSpec = { ...spec, sections: [{ ...spec.sections[0], id: 'capacity' }] }
  const artifacts = await writeChapter(matchingSpec, qmd, split, respond)
  const { questions } = JSON.parse(artifacts.get('quiz.json'))
  assert.deepEqual(questions.filter(q => q.kind === 'NUMERIC').map(q => q.id), ['capacity-check'])
  assert.equal(questions.find(q => q.id === 'overview-check').kind, 'MCQ')
})

test('independent semantic review decides whether a fully developed long section merits an edit', async () => {
  const authors = []
  const artifacts = await writeChapter(spec, qmd, plan, async request => {
    if (request.role === 'chapter-reviewer') return accept()
    authors.push(request.role)
    return reply({ sections: payload(request).sections.map(section => {
      const writing = draft(section)
      if (section.id === 'capacity') {
        writing.diagnosis += ' A persistent allocator pool can hold physical pages after the final tensor reference disappears. Record both reserved and live bytes during repeated requests, inspect allocation reuse, and compare that steady state with the first request after a cold start. If a long sequence causes the failure, keep the incoming and outgoing context lengths alongside each timestamp so that the growing cache appears in the trace. Run a short and a long request separately, then run them with the overlap allowed by the serving scheduler. Only overlapping buffers contribute to the shared peak. If the isolated runs fit but the concurrent pair fails, reducing the scheduler admission limit provides a direct experiment. Keep the same model and inputs, compare the all-request completion time and tail latency, and decide whether the throughput sacrificed by the smaller limit fits the service objective.'
      }
      return writing
    }) })
  })
  assert.deepEqual(authors, ['chapter-writer', 'chapter-writer'])
  assert.match(artifacts.get('packet.md'), /steady state/)
})

test('a frame-only reviewer finding updates its glossary without redrafting sections', async () => {
  const repairs = [], verdicts = []
  let reviewed = 0
  const artifacts = await writeChapter(spec, qmd, plan, async request => {
    if (request.role === 'chapter-reviewer') {
      if (!reviewed++) return reply({ checks, issues: [{ id: '@chapter', change: 'Clarify the memory tier in the Resident definition.' }] })
      assert.match(payload(request).packet, /target memory tier/)
      return accept()
    }
    if (request.role === 'chapter-repair') {
      repairs.push(request.sectionIds)
      return reply({ glossary: [{ term: 'Resident', definition: 'Held in the target memory tier during execution.' }] })
    }
    return respond(request)
  }, { onReview: result => verdicts.push(result.verdict) })
  assert.deepEqual(repairs, [['@chapter']])
  assert.deepEqual(verdicts, ['revise', 'pass'])
  assert.match(artifacts.get('packet.md'), /- \*\*Resident\*\*: Held in the target memory tier/)
})

test('fails closed on missing reviewer findings or a finding assigned to a nonexistent section', async () => {
  for (const [bad, expected] of [[{ checks }, /issues array/], [{ issues: [] }, /review.checks.mechanism/],
    [{ checks, issues: [{ id: 'missing', change: 'Repair a defect.' }] }, /Unknown reviewed section/]]) {
    await assert.rejects(writeChapter(spec, qmd, plan, request => request.role === 'chapter-reviewer' ? reply(bad) : respond(request)), expected)
  }
})

test('repairs a leaked footprint and margin in open questions before independent review', async () => {
  const openQuestions = ['For the 88 KiB narrow tile, how much of the 8 KiB margin survives alignment?']
  const tileSpec = { ...spec, sections: [{ ...spec.sections[0], facts: { input: 48, weight: 16, acc: 12,
    workspace: 12, capacity: 96, total: ['+', 'input', 'weight', 'acc', 'workspace'], spareKiB: ['-', 'capacity', 'total'] },
    workedFacts: [], answerFact: 'total', answerUnit: 'KiB', transfer: 'Calculate the footprint and say how much SRAM remains.' }] }
  const repairs = [], reviews = []
  const result = await writeChapter(tileSpec, qmd, { ...plan, openQuestions }, async request => {
    if (request.role === 'chapter-reviewer') {
      const { packet } = payload(request)
      assert.doesNotMatch(packet, /88 KiB|8 KiB margin/)
      return accept()
    }
    if (request.role === 'chapter-repair') {
      assert.deepEqual(request.sectionIds, ['@chapter'])
      const { feedback } = payload(request)
      assert.match(feedback[0].change, /openQuestions\[0\]/)
      repairs.push(feedback[0].change)
      return reply({ openQuestions: [repairs.length === 1 ? 'How much of the 8 KiB margin survives alignment?' :
        'How would alignment change the available capacity for the narrower tile?'] })
    }
    return reply({ sections: payload(request).sections.map(section => {
      const value = draft(section)
      if (section.quizKind === 'NUMERIC') value.quiz = { prompt: 'Do 48, 16, 12, and 12 KiB of simultaneous storage fit in 96 KiB?',
        answer: 'The 88 KiB of live buffers leave an 8 KiB margin.' }
      return value
    }) })
  }, { onReview: r => reviews.push(r) })
  assert.equal(repairs.length, 2)
  assert.match(repairs[1], /8 KiB margin/)
  assert.deepEqual(reviews.map(r => r.source ?? r.verdict), ['transfer-check', 'transfer-check', 'pass'])
  assert.match(result.get('quiz.md'), /88 KiB/)
})

test('a transfer leak in a different section’s figure is repaired without rewriting teaching prose', async () => {
  const altered = structuredClone(plan)
  altered.sections[2].visual = { ...altered.sections[2].visual, caption: 'The transfer requires 52 MiB.' }
  const repaired = []
  const result = await writeChapter(spec, qmd, altered, async request => {
    if (request.role === 'chapter-repair') {
      repaired.push(request.sectionIds)
      const section = payload(request).sections[0]
      assert.match(section.feedback[0], /figure/)
      return reply({ sections: [{ id: section.id, visual: { ...section.visual, caption: 'Measure the deployed working set.' } }] })
    }
    return respond(request)
  })
  assert.deepEqual(repaired, [['validation']])
  assert.doesNotMatch(result.get('diagrams/validation-figure.svg'), /52 MiB/)
})

test('publishes a custom figure at the planned reading point and carries a prose-only lesson through review', async () => {
  const revised = structuredClone(plan)
  const [capacity, precision] = revised.sections
  capacity.visual = { id: 'live-ranges', kind: 'custom', title: 'Allocation lifetimes',
    caption: 'The two allocations overlap during the store.',
    svg: '<svg viewBox="0 0 140 54"><path d="M10 18h60M50 40h70"/><text x="10" y="12">Weights</text></svg>' }
  capacity.visualAfter = 'mechanism'
  delete precision.visual
  precision.proseOnly = 'The worked conversion supplies the unit comparison directly.'
  const output = await writeChapter(spec, qmd, revised, respond)
  const coverage = JSON.parse(output.get('diagram-plan.json')).sections
  assert.equal(coverage[capacity.heading].figure, '::fig[live-ranges]')
  assert.deepEqual(coverage[precision.heading], { proseOnly: precision.proseOnly })
  const packet = output.get('packet.md')
  assert.ok(packet.indexOf('::fig[live-ranges]') < packet.indexOf('Consider a device running'))
  assert.match(output.get('diagrams/live-ranges.svg'), /Weights/)
  assert.equal(output.has('diagrams/precision-figure.svg'), false)
})

test('review can replace a flow with a quantitative comparison at the same figure anchor', async () => {
  const revised = structuredClone(plan)
  revised.sections[0].glossTargets = ['Which allocations are live together?']
  let reviews = 0
  const output = await writeChapter(spec, qmd, revised, async request => {
    if (request.role === 'chapter-reviewer') {
      const { figure } = payload(request).sections[0]
      if (++reviews === 1) {
        assert.equal(figure.kind, 'flow')
        return reply({ checks, issues: [{ id: 'capacity', change: 'Show the two footprints and the capacity on the same scale.' }] })
      }
      assert.equal(figure.kind, 'bars')
      return accept()
    }
    if (request.role === 'chapter-repair') {
      return reply({ sections: [{ id: 'capacity', visual: {
        id: 'capacity-figure', title: 'Resident memory', caption: 'The compressed footprint fits this budget.',
        kind: 'bars', unit: 'MiB', rows: [{ label: 'Original', value: 60 }, { label: 'Compressed', value: 44 }, { label: 'Budget', value: 48 }],
      } }] })
    }
    return respond(request)
  })
  assert.equal(reviews, 2)
  assert.match(output.get('diagrams/capacity-figure.svg'), /Compressed/)
  assert.match(output.get('packet.md'), /::fig\[capacity-figure\]/)
})

test('per-lesson targets allocate the remaining words after the planned core while legacy requests keep their original instructions', async () => {
  const targeted = { ...plan, sections: [{ ...sections[0], targetWords: 550 }, ...sections.slice(1)] }
  const writers = []
  await writeChapter(spec, qmd, targeted, async request => {
    if (request.role === 'chapter-writer') writers.push(request)
    return respond(request)
  })
  const first = payload(writers[0]).sections[0]
  assert.equal(first.targetAdditionalWords, 550 - first.core.split(/\s+/).length)
  assert.match(writers[0].prompt, /without padding or a fixed upper limit/)
  assert.doesNotMatch(writers[0].prompt, /MUST be 200–340/)
  assert.match(writers[1].prompt, /MUST be 200–340/)
})

test('repairs a missing planned explanation and carries the targets into chapter review', async () => {
  const targets = ['Count overlapping lifetimes.', 'Check for temporary unpacked weights.']
  const targeted = { ...plan, sections: [{ ...sections[0], glossTargets: targets }, ...sections.slice(1)] }
  const repairs = []
  const artifacts = await writeChapter(spec, qmd, targeted, async request => {
    const context = payload(request)
    if (request.role === 'chapter-reviewer') {
      assert.deepEqual(context.sections[0].glossTargets, targets)
      assert.match(request.prompt, /figure alone/)
      return accept()
    }
    if (request.role === 'chapter-repair') {
      const [section] = context.sections
      repairs.push(request.sectionIds)
      assert.match(section.feedback[0], /distinct explained phrase/)
      const worked = section.previousDraft.worked.replace('packed representation', '==packed representation=={An unpacking buffer can coincide with the original weights.}')
      return reply({ sections: [{ id: section.id, worked }] })
    }
    if (request.sectionIds.includes('capacity')) {
      assert.match(request.prompt, /each planned gloss target/)
      assert.doesNotMatch(request.prompt, /Integrate ONE/)
    }
    return respond(request)
  })
  assert.deepEqual(repairs, [['capacity']])
  assert.match(artifacts.get('packet.md'), /==packed representation==\{An unpacking buffer/)
})

test('reader prices appear as literal dollars in Markdown while formulas and original reviewer inputs are preserved', async () => {
  const prices = 'A costs $3.60/hour; B costs $2.70/hour. A costs about $0.56 per million requests and B costs $0.50.'
  const mixed = prices + ' The formula is $2x+3$. Another is $2.50 + x$. A code sample uses `$2.00`.'
  const formatted = prices.replaceAll('$', '\\$') + mixed.slice(prices.length)
  const example = { ...plan, thesis: mixed }
  const artifacts = await writeChapter(spec, qmd, example, async request => {
    if (request.role === 'chapter-reviewer') {
      assert.ok(payload(request).packet.includes(mixed))
      assert.ok(payload(request).quiz[1].options[0].label.includes(prices))
      return accept()
    }
    return reply({ sections: payload(request).sections.map(section => {
      const writing = draft(section)
      writing.quiz.prompt += ' ' + mixed
      writing.quiz.answer += ' ' + mixed
      if (writing.quiz.distractors) {
        writing.quiz.distractors = writing.quiz.distractors.map(label => label + ' ' + mixed)
        writing.quiz.explanation += ' ' + mixed
      }
      return writing
    }) })
  })
  assert.ok(artifacts.get('packet.md').includes(formatted))
  const markdown = unified().use(remarkParse).use(remarkMath)
  const nodes = markdown.parse(formatted).children[0].children
  assert.ok(nodes[0].value.startsWith(prices))
  assert.deepEqual(nodes.filter(n => n.type === 'inlineMath').map(n => n.value), ['2x+3', '2.50 + x'])
  assert.equal(nodes.find(n => n.type === 'inlineCode').value, '$2.00')
  const quiz = JSON.parse(artifacts.get('quiz.json')).questions
  for (const q of quiz) {
    assert.ok(q.prompt.includes(formatted))
    for (const text of [q.modelAnswer, q.explanation, ...(q.options ?? []).map(o => o.label)].filter(Boolean)) {
      assert.ok(text.includes(formatted))
    }
  }
  assert.ok(artifacts.get('quiz.md').includes(formatted))
})

test('applies exact section-scoped copy edits after review and rejects missing, ambiguous or leaking replacements', async () => {
  const from = 'Trace a local inference service.'
  const anchor = 'Follow one request from loading the model to sending the answer.'
  const to = 'Follow one camera frame from model load to the returned prediction.'
  const edit = { sectionId: 'precision', from: anchor, to }
  let first
  const result = await writeChapter(spec, qmd, { ...plan, copyEdits: [edit] }, request => {
    if (request.role === 'chapter-reviewer') assert.ok(!payload(request).packet.includes(to))
    return respond(request)
  }, { onDraft: artifacts => { first = artifacts.get('packet.md') } })
  assert.ok(!first.includes(to))
  const packet = result.get('packet.md')
  assert.equal(packet.split(to).length - 1, 1)
  assert.equal(packet.split(anchor).length - 1, 2)
  await assert.rejects(writeChapter(spec, qmd, { ...plan, copyEdits: [{ ...edit, from }] }, respond), /matched 0 teaching passages/)
  await assert.rejects(writeChapter(spec, qmd, { ...plan, copyEdits: [{ ...edit, from: 'the' }] }, respond), /Ambiguous/)
  await assert.rejects(writeChapter(spec, qmd, { ...plan, copyEdits: [{ ...edit, to: 'The changed footprint is 52 MiB.' }] }, respond), /transfer result/)
})
