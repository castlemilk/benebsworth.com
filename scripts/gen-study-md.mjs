// Generates LLM-friendly plain-Markdown siblings for every study packet.
// Runs as a prebuild step (with gen:md): reads each
// study/mlsys/<vol>/<slug>/packet.md plus its manifests, resolves the
// packet-only syntax into plain markdown, and writes
// public/study/<vol>/<slug>/index.md so it is served at
// https://<site>/study/<vol>/<slug>/index.md. Each chapter page advertises
// the sibling via <link rel="alternate" type="text/markdown">.
//
// Why this format:
//   - packet.md speaks the study renderer's syntax — ::eq / ::fig / ::chart
//     markers, ==mark=={gloss}, > [!kind] callouts — which an LLM reading
//     raw would see as noise. This script resolves every marker into the
//     plain-markdown equivalent: equations stay LaTeX, figures become image
//     links to the published SVGs, charts become data tables, glosses become
//     parentheticals.
//   - Diagram SVGs are copied to public/study/<vol>/<slug>/diagrams/ so the
//     markdown's image links resolve to real, fetchable originals.

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync, copyFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import matter from 'gray-matter'

const ROOT = process.cwd()
const SRC = join(ROOT, 'study/mlsys')
const OUT = join(ROOT, 'public/study')
const AUDIO = join(ROOT, 'public/study-audio')
const SITE = 'https://benebsworth.com'

const readJson = (p, fallback) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return fallback
  }
}

/** `::chart[id]` → markdown data table (x points × series) + title + caption. */
function chartToMd(chart) {
  const head = `**${chart.title}**\n\n`
  if (chart.kind === 'IRON_LAW_EXPLORER' || !chart.xPoints?.length) {
    return head + `> [Interactive chart] An iron-law explorer: baseline movement/compute/overhead terms with a rate slider — see the rendered page.\n`
  }
  const series = chart.series ?? []
  const header = `| ${chart.xLabel ?? 'x'} | ${series.map((s) => s.label).join(' | ')} |`
  const rule = `|${'---|'.repeat(series.length + 1)}`
  const rows = chart.xPoints.map(
    (x, i) => `| ${x} | ${series.map((s) => s.values?.[i] ?? '').join(' | ')} |`,
  )
  return head + [header, rule, ...rows].join('\n') + `\n\n*${chart.caption ?? ''}*\n`
}

/**
 * Resolve the packet's renderer syntax into plain markdown.
 * Order matters: glossed marks before bare marks (the {…} would otherwise
 * stay), marker lines before general text.
 */
function packetToMd(body, ctx) {
  let out = body

  // ==text=={gloss} → **text** *(why it matters: gloss)*
  out = out.replace(/==([\s\S]*?)==\s*\{([\s\S]*?)\}/g, (_m, text, gloss) => {
    // Rendered figure IDs live on the HTML chapter. Plain Markdown images
    // and data tables do not acquire the renderer's fig-* anchors.
    const g = gloss.replace(/\s+/g, ' ').trim().replace(
      /\]\(#(fig-[\w-]+)\)/g,
      `](${SITE}/study/${ctx.vol}/${ctx.slug}/#$1)`,
    )
    return `**${text}** *(why it matters: ${g})*`
  })
  // ==text== → **text**
  out = out.replace(/==([\s\S]*?)==/g, '**$1**')

  // Marker paragraphs. They are authored standalone (blank lines around),
  // so match the whole line.
  out = out.replace(/^::eq\[([^\]]+)\]\s*$/gm, (_m, id) => {
    const eq = ctx.equations.find((e) => e.id === id)
    return eq ? `**Eq ${eq.number} · ${eq.title}**` : `**(equation ${id})**`
  })
  out = out.replace(/^::fig\[([^\]]+)\]\s*$/gm, (_m, id) => {
    const d = ctx.figures.find((f) => f.id === id)
    if (d) return `![${d.title}](${SITE}/study/${ctx.vol}/${ctx.slug}/diagrams/${d.file})\n\n*${d.caption}*`
    const b = ctx.bookFigures.find((f) => f.id === id)
    if (b) return `> [Book figure] [${b.title}](${ctx.bookHref}) — ${b.caption}`
    return `> [missing figure ${id}]`
  })
  out = out.replace(/^::chart\[([^\]]+)\]\s*$/gm, (_m, id) => {
    const c = ctx.charts.find((ch) => ch.id === id)
    if (!c) return `> [missing chart ${id}]`
    ctx.embeddedCharts.add(id)
    return '\n' + chartToMd(c)
  })

  // > [!kind] Title → > **kind: Title**  (bare `> [!kind]` → > **kind**)
  // `[ \t]*`, not `\s*`: \s would eat the newline and capture the first
  // body line as the title (the documented callout-title bug class).
  out = out.replace(/^> \[!(\w+)\][ \t]*(.*)$/gm, (_m, kind, title) =>
    title.trim() ? `> **${kind}: ${title.trim()}**` : `> **${kind}**`,
  )

  return out
}

function processChapter(volDir, slugDir) {
  const dir = join(SRC, volDir, slugDir)
  const packetPath = join(dir, 'packet.md')
  if (!existsSync(packetPath)) return null

  const { data, content: packet } = matter(readFileSync(packetPath, 'utf8'))
  const equations = readJson(join(dir, 'equations.json'), [])
  const charts = readJson(join(dir, 'charts.json'), [])
  const figures = readJson(join(dir, 'diagrams.json'), [])
  const bookFigures = readJson(join(dir, 'book-figures.json'), [])
  const transcript = readJson(join(dir, 'transcript.json'), {})

  // vol1/07-frameworks → book dir vol1/07_frameworks → mlsysbook.ai page
  const bookSlug = slugDir.replace(/-/g, '_')
  const bookHref = `${SITE.replace('benebsworth.com', 'mlsysbook.ai')}/${volDir}/${bookSlug}/${bookSlug}.html`

  const h1 = packet.match(/^#\s+(.+)$/m)?.[1] ?? slugDir
  const title = h1.replace(/:?\s*Study Packet\s*$/i, '').trim()

  const ctx = {
    vol: volDir,
    slug: slugDir,
    equations,
    charts,
    figures,
    bookFigures,
    bookHref,
    embeddedCharts: new Set(),
  }

  let body = packetToMd(packet, ctx)
  if (typeof data.openingQuestion === 'string' && data.openingQuestion.trim()) {
    body = body.replace(/^# .+$/m, heading => `${heading}\n\n${data.openingQuestion.trim()}`)
  }

  const sections = []
  if (equations.length) {
    sections.push(
      '## Key equations\n\n' +
        equations
          .map((e) => `**Eq ${e.number} · ${e.title}**\n\n$$\n${e.latex}\n$$\n\n*${e.caption}*`)
          .join('\n\n'),
    )
  }
  const galleryCharts = charts.filter((c) => !ctx.embeddedCharts.has(c.id))
  if (galleryCharts.length) {
    sections.push('## Charts\n\n' + galleryCharts.map(chartToMd).join('\n'))
  }
  if (bookFigures.length) {
    sections.push(
      '## From the book\n\n' +
        bookFigures.map((f) => `- [${f.title}](${bookHref}) — ${f.caption}`).join('\n') +
        '\n\n*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). ' +
        'Images are not republished here; consult the source book alongside the original sketches.*',
    )
  }
  const quizPath = join(dir, 'quiz.md')
  if (existsSync(quizPath)) {
    const quiz = readFileSync(quizPath, 'utf8').replace(/^#[^\n]*\n+/, '')
    sections.push('## Self-test\n\n' + quiz.trim())
  }
  const audioFile = join(AUDIO, volDir, `${slugDir}.m4a`)
  if (existsSync(audioFile)) {
    const last = transcript.segments?.at(-1)
    const mins = last?.end ? ` (~${Math.round(last.end / 60)} min)` : ''
    const hosts = transcript.hosts ? Object.values(transcript.hosts).join(' & ') : 'two hosts'
    sections.push(
      `## Audio overview\n\n` +
        `[Listen to the ${hosts} read-along${mins}](${SITE}/study-audio/${volDir}/${slugDir}.m4a) — ` +
        `a generated podcast walking this packet's argument.`,
    )
  }

  const frontmatter = [
    '---',
    `title: ${JSON.stringify(`${title} — ML Systems study packet`)}`,
    `source: ${JSON.stringify('Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0')}`,
    `book_url: ${JSON.stringify(bookHref)}`,
    `canonical_url: ${JSON.stringify(`${SITE}/study/${volDir}/${slugDir}/`)}`,
    '---',
    '',
  ].join('\n')

  const md = frontmatter + body + (sections.length ? `\n\n---\n\n${sections.join('\n\n')}\n` : '\n')

  const outDir = join(OUT, volDir, slugDir)
  mkdirSync(outDir, { recursive: true })

  // Publish the original sketches next to the markdown so ![]() refs resolve.
  const diagramsDir = join(dir, 'diagrams')
  if (figures.length && existsSync(diagramsDir)) {
    const dest = join(outDir, 'diagrams')
    mkdirSync(dest, { recursive: true })
    for (const f of figures) {
      const src = join(diagramsDir, f.file)
      if (existsSync(src)) copyFileSync(src, join(dest, f.file))
    }
  }

  writeFileSync(join(outDir, 'index.md'), md)
  return relative(ROOT, join(outDir, 'index.md'))
}

const written = []
for (const volEntry of readdirSync(SRC)) {
  if (!/^vol\d+$/.test(volEntry) || !statSync(join(SRC, volEntry)).isDirectory()) continue
  for (const chEntry of readdirSync(join(SRC, volEntry))) {
    if (!statSync(join(SRC, volEntry, chEntry)).isDirectory()) continue
    const result = processChapter(volEntry, chEntry)
    if (result) written.push(result)
  }
}

console.log(`[study-md] wrote ${written.length} files:`)
for (const w of written) console.log(`  ${w}`)
