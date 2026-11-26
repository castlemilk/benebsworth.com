const letter = (index) => String.fromCharCode(65 + index)
const indent = (text, width) => text.replace(/\n(?=.)/g, '\n' + ' '.repeat(width))

export function quizMarkdown(quiz) {
  const prompts = []
  const answers = []
  for (const [index, question] of quiz.questions.entries()) {
    const prefix = (index + 1) + '. '
    const choices = []
    let answer
    if (question.kind === 'MCQ') {
      const key = question.options.findIndex(option => option.id === question.correctOptionId)
      if (key < 0 || !question.explanation?.trim()) throw new Error(question.id + ' needs a keyed choice and explanation')
      for (const [i, option] of question.options.entries()) {
        choices.push(' '.repeat(prefix.length) + '- ' + letter(i) + '. ' + indent(option.label, prefix.length + 2))
      }
      answer = letter(key) + '. ' + question.explanation
    } else {
      if (!question.modelAnswer?.trim()) throw new Error(question.id + ' needs modelAnswer for the web and written key')
      answer = [question.modelAnswer, question.explanation].filter(Boolean).join('\n\n')
    }
    prompts.push([prefix + indent(question.prompt, prefix.length), ...choices].join('\n'))
    answers.push(prefix + indent(answer, prefix.length))
  }
  return ['# ' + (quiz.title || 'Self-test'), ...prompts, '## Answer key', ...answers].join('\n\n') + '\n'
}
