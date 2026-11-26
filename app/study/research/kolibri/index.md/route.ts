import fs from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-static'

export function GET() {
  const root = path.join(process.cwd(), 'study/research/kolibri')
  const packet = fs.readFileSync(path.join(root, 'packet.md'), 'utf8')
    .replace(/==([^=]+)==(?:\{([^}]*)\})?/g, (_match, mark, gloss) => `**${mark}**${gloss ? ` (${gloss})` : ''}`)
    .replace(/^> \[!([a-z]+)\] ?(.*)$/gim, '> **$2**')
  const quiz = fs.readFileSync(path.join(root, 'quiz.md'), 'utf8')
  const audio = fs.existsSync(path.join(process.cwd(), 'public/study-audio/research/kolibri.m4a')) ? '\n\n## Audio overview\n\n[Listen to the audio overview](/study-audio/research/kolibri.m4a).\n' : ''
  return new Response(`${packet}\n\n${quiz}${audio}`, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
}
