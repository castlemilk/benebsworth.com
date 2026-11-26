import { describe, expect, it } from 'vitest'
import { GET as getDeck } from './anki.txt/route'
import { GET as getMarkdown } from './index.md/route'
import quiz from '@/study/research/kolibri/quiz.json'
import { renderMarkdown } from '@/lib/study/markdown'
import { readFileSync } from 'node:fs'

describe('Kolibri study exports', () => {
  it('exports one answer-bearing Anki card per quiz question', async () => {
    const body = await getDeck().text()
    const cards = body.split('\n').filter((line) => line.includes('\tresearch::kolibri'))
    expect(cards).toHaveLength(quiz.questions.length)
    for (const card of cards) expect(card.split('\t')[1]).toBeTruthy()
    expect(body).toContain('Sparse activation reduces computation')
  })

  it('renders the actual packet with its sketch and highlighted explanation', async () => {
    const packet = readFileSync('study/research/kolibri/packet.md', 'utf8')
    const html = await renderMarkdown(packet)
    expect(html).toContain('/study-research/kolibri/sparse-path.svg')
    expect(html).toContain('study-mark')
    expect(html).not.toContain('[!caution]')
  })

  it('exports readable source notes with the self-test', async () => {
    const response = getMarkdown()
    const body = await response.text()
    expect(response.headers.get('Content-Type')).toContain('text/markdown')
    expect(body).toContain('Aleph Alpha')
    expect(body).toContain('Kolibri self-test')
    expect(body).not.toContain('==4.4%')
    expect(body).not.toContain('[!caution]')
  })
})
