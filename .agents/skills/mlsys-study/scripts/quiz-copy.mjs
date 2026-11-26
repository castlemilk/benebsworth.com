import { readFileSync } from 'node:fs'
import { quizMarkdown } from '../../../../scripts/study-engine/quiz-markdown.mjs'

// Both the engine and hand-authored chapters use numbered questions and keys.
// Preserve numbers, units, option order and math inside each item.
function numberedItems(markdown) {
  const items = []
  let current
  for (const raw of markdown.split('\n')) {
    const line = raw.replace(/\*\*([QA]?\d+[.:]|[A-Z][.)])\*\*/gi, '$1')
    const start = /^(?:#{1,6}\s+|-\s+)?(?:\*\*)?[QA]?(\d+)\s*[.:→]\s*(.*)$/i.exec(line)
    if (start) {
      current = { number: Number(start[1]), lines: [start[2]] }
      items.push(current)
    } else if (/^(?:#{1,6}\s|---\s*$)/.test(line)) {
      current = undefined
    } else if (current && line.trim()) {
      current.lines.push(line.trim())
    }
  }
  return items.map(({ number, lines }) => ({
    number,
    text: lines.join(' ').replace(/\s+/g, ' ').trim(),
  }))
}

function compare(expected, actual) {
  const section = actual.split(/^## Self-test[ \t]*$/im).at(-1)
  const [written] = section.split(/^## Audio overview[ \t]*$/im)
  const keyHeading = /^(?:#{1,6}\s+answer key|---\s*answer key\s*---)[ \t]*$/im
  const [prompts, answers] = written.split(keyHeading)
  const [expectedPrompts, expectedAnswers] = expected.split(keyHeading)
  const issues = []
  if (answers === undefined) issues.push('Missing written answer key')
  for (const [label, source, copy] of [
    ['prompt or options', expectedPrompts, prompts], ['answer', expectedAnswers, answers],
  ]) {
    if (copy === undefined) continue
    const reference = numberedItems(source)
    const found = numberedItems(copy)
    if (found.length !== reference.length) issues.push(`${label} count: expected ${reference.length}, found ${found.length}`)
    const different = reference.filter((item, i) => found[i]?.number !== item.number || found[i].text !== item.text)
    if (different.length) issues.push(`Compare ${label} wording or order: ${different.map(item => 'Q' + item.number).join(', ')}`)
  }
  return issues
}

const [quizFile, flag, copyFile, ...extra] = process.argv.slice(2)
if (!quizFile || extra.length || (flag !== undefined && (flag !== '--compare' || !copyFile))) {
  console.error('Usage: node quiz-copy.mjs quiz.json [--compare quiz.md|index.md]')
  process.exitCode = 2
} else {
  try {
    const expected = quizMarkdown(JSON.parse(readFileSync(quizFile, 'utf8')))
    if (copyFile) {
      const issues = compare(expected, readFileSync(copyFile, 'utf8').replace(/\r\n?/g, '\n'))
      for (const issue of issues) console.error(issue)
      if (issues.length) process.exitCode = 1
      else console.log('Numbered prompts, options and written keys match.')
    } else {
      process.stdout.write(expected)
    }
  } catch (error) {
    console.error(error.message)
    process.exitCode = 2
  }
}
