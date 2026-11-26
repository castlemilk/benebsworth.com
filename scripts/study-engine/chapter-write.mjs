import { compileDiagram, compileLesson } from './compile.mjs'
import { calculate } from './pipeline.mjs'
import { packSection } from './source.mjs'

const author = { model: 'gpt-6.1-terra', effort: 'medium' }
const editor = { model: 'gpt-6-luna', effort: 'low' }
const frameId = '@chapter'
const wordCount = text => (text.match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu) ?? []).length
const gloss = /==([^=*$_{}\n]+)==\{([^{}\n]+)\}/g
const textOf = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Missing ' + field)
  if (/^\s*(?:#{1,3} |::(?:fig|chart|eq)\[)|<\/?[A-Za-z][\w-]*(?:\s[^>]+)?>|\{\{[<{]/m.test(value)) {
    throw new Error(field + ' contains a heading, embed, HTML or unresolved source expression')
  }
  return value.trim()
}

function makeEvidence(qmd, section) {
  const vocabulary = [section.heading, section.core, ...section.beats].join(' ').toLowerCase()
  const stop = /^(?:about|after|again|before|between|could|either|every|first|larger|might|often|other|should|smaller|their|there|these|those|through|under|using|which|while|within|would)$/
  const terms = [...new Set(vocabulary.match(/[a-z][a-z-]{4,}/g) ?? [])].filter(word => !stop.test(word)).slice(0, 40)
  return section.sourceHeadings.map(heading => {
    const evidence = packSection(qmd, heading, { terms, maxBytes: 4200 })
    const passages = evidence.excerpts.slice(1).filter(e => !/^\s*#{3,6}\s/.test(e.text))
      .map(e => ({ lines: [e.startLine, e.endLine], text: e.text
        .replace(/`\{(?:python|r|julia|ojs)\}[^\n`]*`|\{\{<[^>]+>\}\}/gi, '[dynamic source value omitted]') }))
    if (!passages.length) throw new Error('No source passage fits for ' + heading)
    return { heading, passages }
  })
}

function findSeedSection(seed, sections) {
  const exact = sections.findIndex(({ section }) => section.id === seed.id || section.visual?.id === seed.id)
  if (exact >= 0) return exact
  const candidates = sections.map(({ section }, index) => ({ section, index }))
    .filter(({ section }) => section.sourceHeadings.includes(seed.sourceHeading))
  if (candidates.length < 2) return candidates[0]?.index ?? -1
  // Several lessons may develop different parts of the same upstream H2.
  // Resolve the particular worked example, rather than its first sibling.
  const terms = [...new Set([seed.id, seed.heading, ...(seed.terms ?? []), seed.case].join(' ')
    .toLowerCase().match(/[a-z0-9]+/g) ?? [])].filter(word => word.length >= 3 || /^\d+$/.test(word))
  const ranked = candidates.map(({ section, index }) => {
    const words = new Set([section.id, section.heading, section.example].join(' ').toLowerCase().match(/[a-z0-9]+/g))
    return { index, score: terms.filter(word => words.has(word)).length }
  }).sort((a, b) => b.score - a.score)
  if (ranked[0].score === ranked[1].score) throw new Error('Ambiguous worked example; match a planned section id to ' + seed.id)
  return ranked[0].index
}

function prepare(spec, qmd, plan) {
  const sections = plan.sections.map(section => ({ section, evidence: makeEvidence(qmd, section) }))
  if (!sections.length) throw new Error('Chapter needs a planned section')
  const seed = spec.sections?.find(s => s.facts && s.answerFact && s.case && s.transfer)
  let numericIndex = seed ? findSeedSection(seed, sections) : -1
  if (numericIndex >= 0) {
    const facts = calculate(seed.facts)
    if (!Object.hasOwn(facts, seed.answerFact)) throw new Error('Missing transfer answer in seed ledger')
    sections[numericIndex].seed = { case: seed.case, transfer: seed.transfer, facts, baselineKeys: seed.workedFacts,
      answerKey: seed.answerFact, unit: seed.answerUnit ?? seed.visual.unit }
  } else {
    numericIndex = sections.findIndex(({ section }) => section.visual?.kind === 'bars')
    if (numericIndex < 0) numericIndex = sections.findIndex(({ section }) => /\d/.test(section.example))
  }
  // For a qualitative source, keep the questions qualitative. A quantitative
  // section carries its natural transfer; the other topics alternate formats.
  let conceptual = 0, mcqIndex = 0
  for (const [i, item] of sections.entries()) {
    item.quizKind = i === numericIndex ? 'NUMERIC' : conceptual++ % 2 === 0 ? 'MCQ' : 'FEYNMAN'
    if (item.quizKind === 'MCQ') item.answerPosition = ++mcqIndex
    item.previous = sections[i - 1]?.section.heading
    item.next = sections[i + 1]?.section.heading
  }
  return sections
}

function writingInstructions(batch) {
  const depth = batch.some(item => item.section.targetWords !== undefined)
    ? "Aim for each architect's targetAdditionalWords beyond its existing core. Let the difficulty of the mechanism determine the final length. Develop necessary explanations without padding or a fixed upper limit."
    : 'Usually write 240–290 ADDITIONAL words across those passages; aim at the per-section word target in the data. The visible total including core MUST be 200–340 words.'
  const annotations = batch.some(item => item.section.glossTargets)
    ? 'At each planned gloss target, mark a distinct ==short phrase=={one sentence explaining the consequence} where the decision arises in mechanism, worked or diagnosis. Keep the main reasoning readable with cards closed. For a section without targets, choose one consequential phrase.'
    : 'Integrate ONE original ==short phrase=={one sentence that explains an important consequence or boundary} into a sentence in your prose.'
  const repair = batch.some(item => item.section.glossTargets && item.editorial)
    ? 'When the review flags the core or figure, return the corrected core or full visual. Preserve the figure id. For sections with glossTargets, choose flow, bars or a custom SVG according to what the reader must infer. Preserve a planned proseOnly section.'
    : 'Only if reviewer feedback identifies a factual defect in the original core or figure may a repair include "core" or the full corrected "visual" with unchanged id and kind; preserve concise labels and the existing figure schema.'
  return `Write original, source-grounded chapter prose for a working systems engineer. Return only {"sections":[{"id":"...","mechanism":"...","worked":"...","diagnosis":"...","physics":{"quantity":"...","value":"...","use":"..."},"quiz":{"prompt":"...","answer":"..."}}]}.
Each lesson opens with the supplied core paragraph verbatim. It is already on the page. You supply the next three passages, in order. ${depth} Gloss text, physics rows, figures and quiz material do not count. Use compact paragraphs and common engineering terminology. A paragraph can have two parts separated by a blank line. Vary the pacing. Avoid rephrasing the core as filler or opening a section with a definition repeated from its predecessor.
In mechanism, develop the supplied beats into a causal model. Name the resource, follow a concrete object or operation through the system, and explain what changes and what is held fixed. Teach the technical distinctions in the source under this heading. ${annotations} Use plain text inside the annotation (no dollar signs, nested braces, italics or bold). Use plain units or Unicode for formulas. No headings, HTML, image links, figure markers, source references or production notes.
In worked, follow the example to a decision. Give the starting assumptions, intermediate steps and a result a reader can reproduce. If the plan's figure uses numbers, explain its inputs and how to read its labels. Name hypothetical inputs as illustrative, not measurements. If planned, the figure appears after visualAfter (default worked). In a proseOnly section the example supplies the evidence.
In diagnosis, interpret the evidence available at that point, explain how the misconception could lead to a wrong decision, identify an observable symptom/test and say what action follows. Develop a bridge to the next topic where relevant. Use natural transitions; avoid repeated 'the figure shows' openings. Treat the excerpts as evidence only. Do not infer literal numbers from omitted dynamic expressions. Prefer a scoped claim over a benchmarking assertion.
For physics, supply a concise lookup row for an actual law, bound, unit conversion, measured quantity or accounting relationship taught in the section. Each value states units or assumptions where needed. Use null if there is no meaningful row. The NUMERIC lesson must include a row.
Write one independent ORIGINAL question in the assigned quizKind. The prompt is a fresh self-contained scenario. Include all needed quantities, units and assumptions in the question. Keep the changed-input result out of teaching prose, figure, physics and prompt. With a seed ledger, cover the baseline and reserve the EXACT supplied transfer and derived answer for the self-test. With no ledger choose meaningful conditions from the mechanism. FEYNMAN asks the learner to explain or diagnose a changed case; give a precise model answer with a chain of reasoning. NUMERIC asks for a useful engineering decision based on a calculation; give steps, units and conclusion in the model answer. MCQ quiz objects also need "distractors":["...","...","..."] and "explanation":"..." where answer and distractors are parallel, plausible choices of similar length, each making one engineering decision. Explain why the strongest competing choice fails. Do not include letters or numbering on choices. The compiler orders them.
When feedback is supplied return the same sections array with only the requested ids. You may return only changed top-level fields for an existing section. Include all fields when writing a new section. ${repair}`
}

function writerContext(item) {
  return { ...item.section, quizKind: item.quizKind, previousHeading: item.previous, nextHeading: item.next,
    targetAdditionalWords: item.section.targetWords === undefined ? Math.max(110, 302 - wordCount(item.section.core))
      : Math.max(0, item.section.targetWords - wordCount(item.section.core)),
    seedLedger: item.seed, evidence: item.evidence, previousDraft: item.draft, feedback: item.feedback }
}

function checkDraft(item, draft) {
  if (!draft || draft.id !== item.section.id) throw new Error('Missing section entry for ' + item.section.id)
  const core = textOf(draft.core ?? item.section.core, 'core')
  const fields = ['mechanism', 'worked', 'diagnosis'].map(key => textOf(draft[key], key))
  const body = [core, ...fields].join('\n\n')
  const marks = [...fields.join(' ').matchAll(gloss)]
  if (!marks.length || !marks.some(m => wordCount(m[2]) >= 5)) throw new Error('Add an inline ==phrase=={explanatory sentence} in the teaching passages')
  if (item.section.glossTargets) {
    const explained = new Set(marks.filter(mark => wordCount(mark[2]) >= 5).map(mark => mark[1].trim().toLowerCase()))
    if (explained.size < item.section.glossTargets.length) {
      throw new Error('Add a distinct explained phrase for each planned gloss target: ' + item.section.glossTargets.join(' / '))
    }
  }
  const count = wordCount(body.replace(gloss, '$1'))
  if (count < 200) throw new Error('Visible core plus teaching prose has ' + count + ' words; develop the worked mechanism to at least 200 words')
  if (fields.some(field => wordCount(field.replace(gloss, '$1')) < 25)) throw new Error('Develop the mechanism, example and diagnosis in substantive passages')
  const figure = draft.visual ?? item.section.visual
  if (draft.visual) {
    if (!item.section.visual || figure.id !== item.section.visual.id) throw new Error('Preserve the figure id')
    if (!item.section.glossTargets && figure.kind !== item.section.visual.kind) throw new Error('Preserve the planned figure kind')
    if (item.section.glossTargets && figure.kind === 'bars' && !(figure.rows?.length >= 2)) throw new Error('A bar comparison needs at least two rows')
    compileDiagram(figure)
  }
  if (draft.physics != null || item.quizKind === 'NUMERIC') {
    for (const key of ['quantity', 'value', 'use']) textOf(draft.physics?.[key], 'physics.' + key)
  }
  const prompt = textOf(draft.quiz?.prompt, 'quiz.prompt')
  const answer = textOf(draft.quiz?.answer, 'quiz.answer')
  if (item.quizKind === 'MCQ') {
    if (!Array.isArray(draft.quiz.distractors) || ![2, 3, 4].includes(draft.quiz.distractors.length)) throw new Error('MCQ needs two to four distractors')
    const choices = [answer, ...draft.quiz.distractors.map(d => textOf(d, 'distractor'))]
    if (new Set(choices.map(c => c.toLowerCase())).size !== choices.length) throw new Error('MCQ choices must be distinct')
    textOf(draft.quiz.explanation, 'MCQ explanation')
  }
  if (item.quizKind === 'NUMERIC' && (!/\d/.test(prompt) || !/\d/.test(answer))) throw new Error('The numeric exercise needs self-contained input numbers and a worked numeric answer')
  if (item.seed) {
    const { facts, baselineKeys, answerKey, unit } = item.seed
    const containsNumber = (value, text) => new RegExp('(?:^|[^\\d.])' + String(value).replaceAll('.', '\\.') + '(?!\\d|\\.\\d)').test(text)
    for (const key of baselineKeys ?? []) if (!containsNumber(facts[key], body)) throw new Error('Teach the baseline ' + key + ' = ' + facts[key] + ' ' + unit)
    if (!containsNumber(facts[answerKey], answer)) throw new Error('Worked numeric answer must show ' + facts[answerKey] + ' ' + unit)
    const leak = transferAnswerPattern(item.seed)
    if (leak && [body, prompt, JSON.stringify(draft.physics)].some(text => leak.test(text))) {
      throw new Error('Keep the changed-input result ' + facts[answerKey] + ' ' + unit + ' for the answer only')
    }
  }
  return draft
}

async function propose(spec, frame, batch, dispatch, role) {
  const context = { title: spec.title, openingQuestion: spec.question, thesis: frame.thesis,
    sections: batch.map(writerContext) }
  const request = { role, ...author, sectionIds: batch.map(item => item.section.id), prompt: writingInstructions(batch) + '\n' + JSON.stringify(context) }
  let reply
  try { reply = JSON.parse((await dispatch(request)).text) }
  catch (error) {
    if (error.code !== 'INVALID_AGENT_REPLY' && !(error instanceof SyntaxError)) throw error
    for (const item of batch) item.feedback = ['Return a valid JSON object containing the requested sections array.']
    return batch
  }
  const failed = []
  for (const item of batch) {
    const entries = Array.isArray(reply?.sections) ? reply.sections.filter(row => row?.id === item.section.id) : []
    try {
      if (entries.length !== 1) throw new Error('Return exactly one sections entry with id ' + item.section.id)
      const previous = item.draft, update = entries[0]
      item.draft = { ...previous, ...update }
      for (const field of ['quiz', 'physics']) {
        if (previous?.[field] && update[field]) item.draft[field] = { ...previous[field], ...update[field] }
      }
      if (!item.editorial) {
        delete item.draft.core
        delete item.draft.visual
      }
      checkDraft(item, item.draft)
      delete item.feedback
    } catch (error) {
      item.feedback = [error.message]
      failed.push(item)
    }
  }
  return failed
}

async function writeBatch(spec, frame, batch, dispatch, role) {
  let failed = await propose(spec, frame, batch, dispatch, role)
  if (failed.length) failed = await propose(spec, frame, failed, dispatch, 'chapter-repair')
  if (failed.length) throw new Error('Chapter drafts need correction: ' + failed.map(item => item.section.id + ': ' + item.feedback.join(', ')).join(' / '))
}

function question(item) {
  const { quiz } = item.draft
  const { quizKind: kind } = item
  const common = { id: item.section.id + '-check', kind, source: 'ORIGINAL', prompt: quiz.prompt }
  if (kind !== 'MCQ') return { ...common, modelAnswer: quiz.answer }
  const labels = [...quiz.distractors]
  const correct = item.answerPosition % (labels.length + 1)
  labels.splice(correct, 0, quiz.answer)
  const options = labels.map((label, i) => ({ id: String.fromCharCode(97 + i), label }))
  return { ...common, options, correctOptionId: options[correct].id, explanation: quiz.explanation }
}

const bullets = list => list.map(item => '- ' + item).join('\n')
const cell = value => value.replaceAll('|', '\\|').replace(/\s+/g, ' ').trim()

function assemble(spec, frame, items) {
  const diagrams = []
  const guided = items.map(({ section, evidence, draft }) => {
    const core = draft.core ?? section.core
    const visual = draft.visual ?? section.visual
    const parts = [core]
    for (const key of ['mechanism', 'worked', 'diagnosis']) {
      parts.push(draft[key])
      if (visual && key === (section.visualAfter ?? 'worked')) parts.push('::fig[' + visual.id + ']')
    }
    const lesson = { level: 3, heading: section.heading, body: parts.join('\n\n') }
    if (!visual) return { ...lesson, proseOnly: section.proseOnly }
    diagrams.push(visual)
    const source = evidence.map(({ heading, passages }) => heading + ', ' + spec.source.url + '#L' +
      passages[0].lines[0] + '-L' + passages.at(-1).lines[1]).join('; ')
    return { ...lesson, teaches: core, source, figure: '::fig[' + visual.id + ']' }
  })
  const physics = items.map(({ draft }) => draft.physics).filter(Boolean)
  if (!physics.length) throw new Error('The physics reference needs a grounded quantitative or accounting relationship')
  const table = ['| Quantity | Value | Use |', '| --- | --- | --- |',
    ...physics.map(row => '| ' + [row.quantity, row.value, row.use].map(cell).join(' | ') + ' |')].join('\n')
  return compileLesson({ id: spec.id, title: spec.title, question: spec.question,
    intro: '*Based on [Machine Learning Systems](' + spec.source.url + ') by Vijay Janapa Reddi and contributors (CC BY-NC-SA 4.0).*',
    sections: [
      { heading: 'Thesis', body: frame.thesis, proseOnly: 'Introduce the decision that connects the worked sections.' },
      { heading: 'Guided notes' }, ...guided,
      { heading: 'The physics', body: table, proseOnly: 'Compare the quantities and conditions in a lookup table.' },
      { heading: 'Glossary', body: bullets(frame.glossary.map(entry => '**' + entry.term + '**: ' + entry.definition)),
        proseOnly: 'Look up a term encountered in the worked sections.' },
      { heading: "→ Ben's world", body: bullets(frame.applications), proseOnly: 'Apply the mechanisms to concrete engineering decisions.' },
      { heading: 'Open questions', body: bullets(frame.openQuestions), proseOnly: 'Identify an experiment or evidence the chapter leaves open.' },
    ], diagrams, questions: items.map(question) })
}

// A bare number shared with an input is not evidence of answer leakage.
function transferAnswerPattern({ facts, answerKey, unit }) {
  const expected = facts[answerKey]
  if (Object.entries(facts).some(([key, value]) => key !== answerKey && value === expected)) return null
  const escape = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const value = escape(expected) + (Number.isInteger(expected) ? '(?:\\.0+)?' : '')
  return new RegExp('(?<![\\d.])' + value + '[\\s*-]*' + escape(unit) + '(?![a-zA-Z0-9])', 'i')
}

// Map each learner-visible field back to the one draft that can correct it.
// Include a bar's unit next to its numeric value, as the rendered graphic does.
function chapterTransferIssues(spec, frame, items) {
  const seed = items.find(item => item.seed)?.seed
  const pattern = seed && transferAnswerPattern(seed)
  if (!pattern) return []
  const result = seed.facts[seed.answerKey] + ' ' + seed.unit
  const protectedResults = [{ pattern, result }]
  // An answer can include a second requested decision (e.g. remaining SRAM).
  // Require the margin wording too: the same quantity can be a legitimate input.
  if (/remain|spare|headroom|margin|left over/i.test(seed.transfer)) {
    for (const [key, value] of Object.entries(seed.facts)) {
      if (!/spare|headroom|margin|remaining/i.test(key) || key === seed.answerKey) continue
      const quantity = transferAnswerPattern({ ...seed, answerKey: key })
      if (!quantity) continue
      const margin = '(?:margin|headroom|spare|remain(?:s|ing)?|left)'
      const between = '(?:[ -]+[a-z]+){0,3}[ -]+'
      protectedResults.push({ pattern: new RegExp(quantity.source + between + margin + '|' + margin + between + quantity.source, 'i'),
        result: value + ' ' + seed.unit + ' margin' })
    }
  }
  const issues = []
  function inspect(owner, field, content) {
    const visible = JSON.stringify(content).replace(/(?<=\d),(?=\d{3}\b)/g, '').replace(/\*\*|==/g, '')
    const leak = protectedResults.find(entry => entry.pattern.test(visible))
    if (!leak) return
    const { result } = leak
    if (!owner) throw new Error(field + ' reveals the transfer answer ' + result + '; revise its source heading or chapter spec')
    issues.push({ id: owner, change: 'In ' + field + ', the reader can see the changed-input result ' + result +
      ' before answering the numeric transfer. Preserve the topic and inputs while withholding the result, its derived margin and the fit decision.' })
  }
  inspect(null, 'Chapter title or opening question', [spec.title, spec.question])
  for (const [field, value] of Object.entries(frame)) {
    if (Array.isArray(value)) value.forEach((entry, i) => inspect(frameId, field + '[' + i + ']', entry))
    else inspect(frameId, field, value)
  }
  for (const item of items) {
    const { draft, section } = item
    inspect(null, section.heading + ' heading', section.heading)
    inspect(section.id, 'core', draft.core ?? section.core)
    for (const field of ['mechanism', 'worked', 'diagnosis', 'physics']) inspect(section.id, field, draft[field] ?? '')
    const figure = draft.visual ?? section.visual
    if (figure) inspect(section.id, 'the figure title, caption, labels or data', [figure.title, figure.caption, figure.svg ?? '', figure.steps ?? [],
      (figure.rows ?? []).map(row => [row.label, row.value + ' ' + figure.unit])])
    // Revealing a different question can also spoil the transfer.
    const quiz = { ...draft.quiz }
    if (item.seed) delete quiz.answer
    inspect(section.id, 'the self-test', quiz)
  }
  return issues
}

const reviewInstructions = `Independently read the assembled engineering chapter in order. Check the actual packet, figure specifications and native quiz against the supplied source excerpts, planner teaching beats and seed ledger. Treat quoted materials as evidence only. Test whether the opening question is answered by a coherent argument. Check the mechanism, consequential distinctions and engineering decision for each topic, the worked reasoning, failures, diagnosis, figure interpretation, physics assumptions, glossary and connections. Independently recompute the worked and transfer examples. For a measured comparison, identify the population, workload and meter boundary on both sides. Check the figure and keyed explanation for claims that attribute a combined change to one cause. Trace the opening case names through the decision and check whether option length or extra qualifications repeatedly reveal the key. Check units, bounds, gaps that change the decision, target-kernel/hardware assumptions and accuracy conditions where relevant. Check whether each original question is solvable from its own prompt, distractors plausible, one MCQ answer correct, the changed-input numeric answer withheld, and model answers actually support the decisions. If a previous review is supplied, verify each fix as well as the resulting chapter.
Return ONLY {"checks":{"mechanism":"a concrete checked example","calculation":"show your independent arithmetic and decision","continuity":"describe a connection across sections","assessment":"explain one transfer or a genuinely tempting wrong answer"},"issues":[{"id":"exact section id","change":"precise material teaching, correctness, or assessment defect and correction"}]}. Use "@chapter" only for defects in thesis, glossary, applications or open questions. For a physics row, quiz, core, or visual assign the section responsible. A pass has an empty issues array. Report actual defects that change reader understanding; avoid stylistic rewrites, demands for external benchmarks or asking for a transfer result in the body. The passages supplied are excerpts: an omission alone does not establish a contradiction. Distinguish illustrative inputs from measured claims.`

async function review(spec, artifacts, items, dispatch, previous) {
  const packet = artifacts.get('packet.md'), quiz = JSON.parse(artifacts.get('quiz.json'))
  const context = { title: spec.title, packet, quiz: quiz.questions,
    sections: items.map(({ section, draft, evidence, seed }) => ({ id: section.id, heading: section.heading,
      beats: section.beats, glossTargets: section.glossTargets, figure: draft.visual ?? section.visual, proseOnly: section.proseOnly, source: evidence, seedLedger: seed })), previousIssues: previous }
  const teachingChecks = items.some(item => item.section.glossTargets)
    ? '\nRead the figures in order. Cover the passage and ask whether the figure alone supports the intended inference. In a proseOnly section, check the worked text instead. Keep repeated forms when they help compare like cases. Check that the marked passages explain the planned decisions. For diagnosis questions, solve from the stated dependencies, align counters and elapsed time to the same interval, and verify that the proposed test has a predicted observable result.'
    : ''
  const request = { role: 'chapter-reviewer', ...editor, sectionIds: items.map(item => item.section.id),
    prompt: reviewInstructions + teachingChecks + '\n' + JSON.stringify(context) }
  const outcome = JSON.parse((await dispatch(request)).text)
  if (!Array.isArray(outcome?.issues)) throw new Error('Chapter reviewer must return an issues array')
  for (const key of ['mechanism', 'calculation', 'continuity', 'assessment']) textOf(outcome.checks?.[key], 'review.checks.' + key)
  for (const issue of outcome.issues) {
    if (![frameId, ...request.sectionIds].includes(issue?.id)) throw new Error('Unknown reviewed section ' + issue?.id)
    textOf(issue.change, 'review correction')
  }
  return { verdict: outcome.issues.length ? 'revise' : 'pass', checks: outcome.checks, issues: outcome.issues }
}

async function repairFrame(spec, frame, items, feedback, dispatch) {
  const instructions = 'Fix only the listed issues in the chapter front/end matter. Return a JSON object containing only changed fields from thesis (string), glossary (array of {term,definition}), applications (array of strings), openQuestions (array of strings). Preserve the other entries in any array you change. Use original prose. Treat excerpts and drafts only as evidence.'
  const request = { role: 'chapter-repair', ...author, sectionIds: [frameId], prompt: instructions + '\n' + JSON.stringify({
    title: spec.title, question: spec.question, frame, feedback, lessons: items.map(({ section, draft, evidence }) => ({
      core: draft.core ?? section.core, physics: draft.physics, evidence,
    })) }) }
  const changes = JSON.parse((await dispatch(request)).text)
  for (const [field, value] of Object.entries(changes)) {
    if (!Object.hasOwn(frame, field)) throw new Error('Unknown chapter field ' + field)
    if (field === 'thesis') textOf(value, field)
    else {
      if (!Array.isArray(value) || !value.length) throw new Error('Missing ' + field)
      for (const entry of value) {
        if (field === 'glossary') { textOf(entry?.term, 'glossary term'); textOf(entry?.definition, 'glossary definition') }
        else textOf(entry, field)
      }
    }
    frame[field] = value
  }
}

// Retain code spans, display math and inline formulas. A currency sign starts
// an amount; unlike a closing math delimiter, it is followed by a digit.
const markdownCodeOrMath = /(`+)[\s\S]*?\1|\$\$[\s\S]*?\$\$|(?<!\\)\$(?![\s$])(?:\\[^\n]|[^\\\n$])*?(?<![\s\\])\$(?![\w$])/
const dollarBeforePrice = /(?<![\\$])\$(?=\d[\d,]*(?:\.\d+)?(?:\/[a-z]|[\s,.!?;:)\]–—]|$))/
const readerTokens = new RegExp(markdownCodeOrMath.source + '|' + dollarBeforePrice.source, 'gi')

function readerCurrency(text) {
  return text.replace(readerTokens, token => token === '$' ? '\\$' : token)
}

function presentChapter(spec, frame, items, edits = []) {
  if (!Array.isArray(edits)) throw new Error('copyEdits must be an array')
  // Only the final reader copy is mutable here. Reviews and the saved first
  // draft retain the exact input and output used for their model receipts.
  for (const edit of edits) {
    const item = items.find(item => item.section.id === edit?.sectionId)
    if (!item || typeof edit.from !== 'string' || !edit.from.trim() || typeof edit.to !== 'string' || !edit.to.trim()) {
      throw new Error('Each copy edit needs an existing sectionId and nonempty from/to text')
    }
    const matches = []
    for (const key of ['core', 'mechanism', 'worked', 'diagnosis']) {
      const text = item.draft[key] ?? item.section[key]
      const start = text.indexOf(edit.from)
      if (start < 0) continue
      matches.push({ key, start, text })
      if (text.indexOf(edit.from, start + 1) >= 0) throw new Error('Ambiguous copy edit in ' + edit.sectionId)
    }
    if (matches.length !== 1) throw new Error('Copy edit in ' + edit.sectionId + ' matched ' + matches.length + ' teaching passages; expected exactly one')
    const [{ key, start, text }] = matches
    item.draft[key] = text.slice(0, start) + edit.to + text.slice(start + edit.from.length)
    checkDraft(item, item.draft)
  }
  const leaks = chapterTransferIssues(spec, frame, items)
  if (leaks.length) throw new Error('Reader copy reveals a transfer result: ' + JSON.stringify(leaks))
  for (const { draft, section } of items) {
    for (const key of ['core', 'mechanism', 'worked', 'diagnosis']) draft[key] = readerCurrency(draft[key] ?? section[key])
    if (draft.physics) for (const key of ['quantity', 'value', 'use']) draft.physics[key] = readerCurrency(draft.physics[key])
    for (const key of ['prompt', 'answer', 'explanation']) if (draft.quiz[key]) draft.quiz[key] = readerCurrency(draft.quiz[key])
    if (draft.quiz.distractors) draft.quiz.distractors = draft.quiz.distractors.map(readerCurrency)
  }
  return assemble(spec, { thesis: readerCurrency(frame.thesis), applications: frame.applications.map(readerCurrency),
    openQuestions: frame.openQuestions.map(readerCurrency), glossary: frame.glossary.map(({ term, definition }) => ({
      term: readerCurrency(term), definition: readerCurrency(definition),
    })) }, items)
}

/** Compile and independently review a planned chapter. All live work goes through dispatch. */
export async function writeChapter(spec, qmd, plan, dispatch, options = {}) {
  const { thesis, glossary, applications, openQuestions } = plan
  const frame = { thesis, glossary, applications, openQuestions }
  const items = prepare(spec, qmd, plan)
  for (let i = 0; i < items.length; i += 2) await writeBatch(spec, frame, items.slice(i, i + 2), dispatch, 'chapter-writer')
  let artifacts = assemble(spec, frame, items)
  await options.onDraft?.(artifacts)
  let previous
  for (let round = 0; round < 3; round++) {
    const leaks = chapterTransferIssues(spec, frame, items)
    const outcome = leaks.length ? { verdict: 'revise', source: 'transfer-check', issues: leaks }
      : await review(spec, artifacts, items, dispatch, previous)
    await options.onReview?.(outcome)
    if (outcome.verdict === 'pass') return presentChapter(spec, frame, items, plan.copyEdits)
    if (round === 2) throw new Error('Chapter review still needs corrections: ' + JSON.stringify(outcome.issues))
    previous = outcome.issues
    const affected = items.filter(item => {
      item.feedback = previous.filter(issue => issue.id === item.section.id).map(issue => issue.change)
      if (item.feedback.length) item.editorial = true
      return item.feedback.length
    })
    for (let i = 0; i < affected.length; i += 2) await writeBatch(spec, frame, affected.slice(i, i + 2), dispatch, 'chapter-repair')
    const frameFeedback = previous.filter(issue => issue.id === frameId)
    if (frameFeedback.length) await repairFrame(spec, frame, items, frameFeedback, dispatch)
    artifacts = assemble(spec, frame, items)
  }
}
