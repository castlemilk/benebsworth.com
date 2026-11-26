import { readFileSync } from 'node:fs'

// Surface possible answer cues for editorial review. Ties do not count.
// Option length is source text length, including any Markdown or TeX.
function reviewQuiz(file) {
  const { questions } = JSON.parse(readFileSync(file, 'utf8'))
  const positions = []
  const longest = []
  for (const question of questions.filter(q => q.kind === 'MCQ')) {
    const { options, correctOptionId, id } = question
    const matches = options.filter(option => option.id === correctOptionId)
    if (matches.length !== 1) throw new Error(`${file}: ${id} needs one matching correct option`)
    const answer = matches[0]
    positions.push(String.fromCharCode(65 + options.indexOf(answer)))
    const length = answer.label.trim().length
    if (options.length > 1 && options.every(option => option === answer || option.label.trim().length < length)) {
      longest.push(id)
    }
  }
  console.log(file)
  console.log(`  Correct positions: ${positions.join(' ') || 'no multiple-choice questions'}`)
  console.log(`  Correct option uniquely longest: ${longest.length}/${positions.length}` +
    (longest.length ? ` (${longest.join(', ')})` : ''))
}

const files = process.argv.slice(2)
if (!files.length) {
  console.error('Usage: node review-quiz.mjs path/to/quiz.json [path/to/another/quiz.json]')
  process.exitCode = 1
} else {
  for (const file of files) reviewQuiz(file)
}
