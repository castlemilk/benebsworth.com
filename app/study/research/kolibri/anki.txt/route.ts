import quiz from '@/study/research/kolibri/quiz.json'

export const dynamic = 'force-static'

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\t/g, ' ').replace(/\r?\n/g, '<br>')
}

export function GET() {
  const rows = quiz.questions.map((q) => {
    const options = q.options ?? []
    const front = escapeHtml(q.prompt) + (options.length ? '<br><br>' + options.map((o) => `(${escapeHtml(o.id)}) ${escapeHtml(o.label)}`).join('<br>') : '')
    const correct = options.find((o) => o.id === q.correctOptionId)
    const answer = correct ? `<b>(${escapeHtml(correct.id)})</b> ${escapeHtml(correct.label)}<br><br>${escapeHtml(q.explanation ?? '')}` : escapeHtml(q.modelAnswer ?? '')
    return `${front}\t${answer}\tresearch::kolibri`
  })
  return new Response(['#separator:tab', '#html:true', '#deck:Research :: Kolibri', '#notetype:Basic', '#tags column:3', ...rows, ''].join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
