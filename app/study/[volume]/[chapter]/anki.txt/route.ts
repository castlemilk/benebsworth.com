import { getAllChapterParams, getChapter } from '@/lib/study/load'

export const dynamic = 'force-static'

// Anki text-import deck: Front<TAB>Back<TAB>Tags per line, HTML allowed.
// quiz.json is the single source — MCQ fronts carry the options, backs the
// correct option + explanation; Feynman/numeric backs carry the model answer.

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\t/g, ' ')
    .replace(/\r?\n/g, '<br>')
}

export async function GET(_req: Request, { params }: { params: Promise<{ volume: string; chapter: string }> }) {
  const { volume, chapter } = await params
  const loaded = getChapter(volume, chapter)
  if (!loaded?.quiz?.questions.length) return new Response('not found', { status: 404 })

  const { chapter: ch, volume: vol, quiz } = loaded
  const tag = `mlsys::${vol.id}::${ch.slug.replace(/-/g, '_')}`
  const lines = quiz.questions.map((q) => {
    let front: string
    let back: string
    if ((q.options?.length ?? 0) > 0 && q.correctOptionId) {
      const letters = 'abcdefghijklmnopqrstuvwxyz'
      const opts = q.options
        .map((o, i) => `(${letters[i]}) ${esc(o.label)}`)
        .join('<br>')
      const correct = q.options.find((o) => o.id === q.correctOptionId)
      const ci = q.options.findIndex((o) => o.id === q.correctOptionId)
      front = `${esc(q.prompt)}<br><br>${opts}`
      back = `<b>(${letters[ci] ?? '?'})</b> ${esc(correct?.label ?? '')}${q.explanation ? `<br><br>${esc(q.explanation)}` : ''}`
    } else {
      front = esc(q.prompt)
      back = esc(q.modelAnswer || q.explanation || '')
    }
    return `${front}\t${back}\t${tag}`
  })

  const body = [
    '#separator:tab',
    '#html:true',
    `#deck:MLSys ${vol.id} :: ${ch.title}`,
    `#notetype:Basic`,
    `#tags column:3`,
    ...lines,
    '',
  ].join('\n')

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

export async function generateStaticParams() {
  return getAllChapterParams().filter((p) => Boolean(getChapter(p.volume, p.chapter)?.quiz))
}
