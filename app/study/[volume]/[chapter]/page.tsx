import type { Metadata } from 'next'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { getAllChapterParams, getChapter, chapterHref } from '@/lib/study/load'
import { renderMarkdown } from '@/lib/study/markdown'
import { StatusChip, VolumeStateChip } from '@/components/study/status-chip'
import { SvgFigure } from '@/components/study/svg-figure'
import { VisitedMarker } from '@/components/study/visited-marker'
import { PacketAnnotator } from '@/components/study/packet-annotations'
import { TocNav } from '@/components/study/toc-nav'
import { AudioOverview } from '@/components/mdx/audio-overview'
import { QuizRunner, type PreparedQuiz } from '@/components/study/quiz-runner'
import { EquationList } from '@/components/study/equation-list'
import { ChapterActions } from '@/components/study/chapter-actions'
import { QuestionKind, QuestionSource, type EquationSymbol, type StudyChart } from '@/lib/gen/study'
import 'katex/dist/katex.min.css'

// bklit + d3 + motion is a heavy client bundle; split it out so chapter
// pages without charts (most of the course) never pay for it.
const StudyChartFigure = dynamic(() =>
  import('@/components/study/study-chart').then((m) => m.StudyChartFigure),
)

const ROMAN_NUMERAL = ['0', 'I', 'II', 'III', 'IV', 'V'] as const

export function generateStaticParams() {
  return getAllChapterParams()
}

export async function generateMetadata({ params }: { params: Promise<{ volume: string; chapter: string }> }): Promise<Metadata> {
  const { volume, chapter } = await params
  const loaded = getChapter(volume, chapter)
  if (!loaded) return { title: 'Not found' }
  const title = `${loaded.chapter.title} · ${loaded.volume.title}`
  return {
    title,
    description: `Study packet: ${loaded.chapter.title}. ${loaded.chapter.sections.slice(0, 3).map((s) => s.title).join('; ')}`,
    alternates: { canonical: `/study/${volume}/${chapter}/` },
  }
}

export default async function ChapterPage({ params }: { params: Promise<{ volume: string; chapter: string }> }) {
  const { volume, chapter } = await params
  const loaded = getChapter(volume, chapter)
  if (!loaded) notFound()

  const { chapter: ch, volume: vol, packetBody, quiz, figures, bookFigures, audioUrl, transcript, progress, prev, next } = loaded

  // Strip the packet's own H1; the page header carries the title.
  const bodySource = packetBody?.replace(/^\s*#[^\n]*\n+/, '') ?? null

  // `<!-- eq:id -->$$…$$` blocks in the packet pull their symbol drilldown from
  // equations.json: index the manifest once for the markdown transform.
  const equationSymbols = new Map<string, EquationSymbol[]>(
    ch.equations.map((e) => [e.id, e.symbols]),
  )

  // `::fig[id]` / `::chart[id]` markers embed figures inline at the point of
  // discussion. The transform reports which ids it actually embedded, a
  // source-level regex would also match markers inside code fences, which the
  // transform rightly ignores, and those assets would vanish from galleries.
  const embeds = { figIds: new Set<string>(), chartIds: new Set<string>() }
  const inlineFigures = new Map([...figures, ...bookFigures].map((f) => [f.id, f]))
  const bookFigureIds = new Set(bookFigures.map((f) => f.id))

  // Chart captions must render first; `::chart[id]` placeholders carry the
  // title + caption server-side (no-JS still gets the takeaway), and the
  // packet transform needs them in hand.
  const chartCaptions = await Promise.all(
    ch.charts.map((c) => (c.caption ? renderMarkdown(c.caption) : Promise.resolve(''))),
  )
  const chartInfo = new Map(
    ch.charts.map((c, i) => [c.id, { title: c.title, captionHtml: chartCaptions[i] ?? '' }]),
  )

  // Render packet prose and quiz bodies in parallel; independent pipelines.
  const [packetHtml, preparedQuiz] = await Promise.all([
    bodySource ? renderMarkdown(bodySource, { equationSymbols, inlineFigures, bookFigureIds, chartInfo, embeds }) : Promise.resolve(null),
    quiz
      ? Promise.all(
          quiz.questions.map(async (q) => ({
            id: q.id,
            kind: (q.kind === QuestionKind.MCQ ? 'MCQ' : q.kind === QuestionKind.FEYNMAN ? 'FEYNMAN' : 'NUMERIC') as PreparedQuiz['questions'][number]['kind'],
            source: (q.source === QuestionSource.BOOK ? 'BOOK' : 'ORIGINAL') as 'BOOK' | 'ORIGINAL',
            promptHtml: await renderMarkdown(q.prompt),
            options: await Promise.all((q.options ?? []).map(async (o) => ({ id: o.id, labelHtml: await renderMarkdown(o.label) }))),
            correctOptionId: q.correctOptionId || undefined,
            modelAnswerHtml: q.modelAnswer ? await renderMarkdown(q.modelAnswer) : undefined,
            explanationHtml: q.explanation ? await renderMarkdown(q.explanation) : undefined,
          })),
        ).then((questions): PreparedQuiz => ({ title: quiz.title, questions }))
      : Promise.resolve(null),
  ])

  // Embedded ids keep fig-<id> anchors inline; filter them out of the end
  // galleries so each anchor exists exactly once on the page.
  const galleryFigures = figures.filter((f) => !embeds.figIds.has(f.id))
  const galleryBookFigures = bookFigures.filter((f) => !embeds.figIds.has(f.id))
  const galleryCharts = ch.charts.filter((c) => !embeds.chartIds.has(c.id))

  // Chart payloads for `::chart[id]` embeds: the annotator portals a real
  // StudyChartFigure into each placeholder's slot. The title/caption already
  // render server-side inside the placeholder, so only the chart travels.
  const chartSlots: Record<string, StudyChart> = Object.fromEntries(
    ch.charts.filter((c) => embeds.chartIds.has(c.id)).map((c) => [c.id, c]),
  )

  const words = bodySource ? bodySource.split(/\s+/).filter(Boolean).length : 0
  const minutes = Math.max(1, Math.round(words / 230))

  // TOC from the rendered headings (rehype-slug guarantees ids) + the
  // chapter's own sections below the packet.
  const tocPacket = packetHtml
    ? [...packetHtml.matchAll(/<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>/g)].map((m) => ({
        depth: Number(m[1]) as 2 | 3,
        id: m[2],
        text: m[3].replace(/<[^>]+>/g, '').trim(),
      }))
    : []
  const tocSections = [
    ...(ch.equations.length ? [{ depth: 2 as const, id: 'key-equations', text: 'Key equations' }] : []),
    ...(galleryCharts.length ? [{ depth: 2 as const, id: 'charts', text: 'Charts' }] : []),
    ...(galleryFigures.length ? [{ depth: 2 as const, id: 'sketches', text: 'Sketches' }] : []),
    ...(galleryBookFigures.length ? [{ depth: 2 as const, id: 'book-figures', text: 'From the book' }] : []),
    ...(preparedQuiz ? [{ depth: 2 as const, id: 'self-test', text: 'Self-test' }] : []),
  ]

  return (
    <>
      <SiteNav />
      <main id="main-content" className="mx-auto w-full max-w-4xl px-6 pb-20 sm:px-8">
        <Breadcrumb
          className="mb-8"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Study', href: '/study/' },
            { label: `Vol ${ROMAN_NUMERAL[vol.number] ?? vol.number}` },
            { label: ch.title },
          ]}
        />

        <header className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {vol.id} · {ch.sourceDir.split('_')[0]}
            </span>
            <VolumeStateChip state={vol.state} />
            <StatusChip status={ch.status} />
            {progress?.packetAt && (
              <span className="font-mono text-xs text-muted-foreground">packet {progress.packetAt}</span>
            )}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{ch.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
            <span>{ch.sections.length} book sections</span>
            {packetHtml && <span>~{minutes} min packet</span>}
            {quiz && <span>{quiz.questions.length} self-test questions</span>}
            {figures.length > 0 && <span>{figures.length} original figures</span>}
            {bookFigures.length > 0 && <span>{bookFigures.length} book references</span>}
            {ch.equations.length > 0 && <span>{ch.equations.length} key equations</span>}
            {ch.charts.length > 0 && <span>{ch.charts.length} charts</span>}
          </div>
          {packetHtml && (
            <div className="mt-4">
              <ChapterActions chapterId={ch.id} hasQuiz={Boolean(quiz)} />
            </div>
          )}
          {audioUrl && (
            <AudioOverview
              key={ch.id}
              src={audioUrl}
              segments={transcript.segments}
              hosts={transcript.hosts}
              title={`audio overview · ${ch.title.toLowerCase()}`}
              eqAnchorPrefix="eq-"
            />
          )}
        </header>

        {packetHtml ? (
          <>
            <VisitedMarker chapterId={ch.id} />
            <TocNav packet={tocPacket} sections={tocSections} />
            <PacketAnnotator chapterId={ch.id} chartSlots={chartSlots}>
              <article
                className="prose dark:prose-invert max-w-none prose-pre:text-[#ececf0] prose-pre:rounded-xl prose-pre:px-5 prose-pre:py-4 prose-pre:overflow-x-auto [&_[data-rehype-pretty-code-figure]]:my-7 prose-code:bg-transparent prose-code:p-0 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none"
                dangerouslySetInnerHTML={{ __html: packetHtml }}
              />
            </PacketAnnotator>

            {ch.equations.length > 0 && (
              <section id="key-equations" className="mt-12 scroll-mt-20">
                <h2 className="mb-2 text-2xl font-semibold tracking-tight">Key equations</h2>
                <p className="mb-2 text-sm text-muted-foreground">
                  The formulas the chapter leans on. Copy the LaTeX straight into your notes.
                </p>
                <EquationList equations={ch.equations} />
              </section>
            )}

            {galleryCharts.length > 0 && (
              <section id="charts" className="mt-12 scroll-mt-20">
                <h2 className="mb-2 text-2xl font-semibold tracking-tight">Charts</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Illustrative data drawn for this packet, not book measurements.
                </p>
                {galleryCharts.map((c) => (
                  <figure key={c.id} id={`fig-${c.id}`} className="my-8 scroll-mt-20">
                    <h3 className="mb-3 text-base font-semibold">{c.title}</h3>
                    <div className="rounded-xl border border-border/60 p-4 sm:p-5">
                      <StudyChartFigure chart={c} />
                    </div>
                    {chartInfo.get(c.id)?.captionHtml ? (
                      <figcaption
                        className="mt-3 text-sm text-muted-foreground [&_p]:my-0"
                        dangerouslySetInnerHTML={{ __html: chartInfo.get(c.id)?.captionHtml ?? '' }}
                      />
                    ) : null}
                  </figure>
                ))}
              </section>
            )}

            {galleryFigures.length > 0 && (
              <section id="sketches" className="mt-12 scroll-mt-20">
                <h2 className="mb-2 text-2xl font-semibold tracking-tight">Sketches</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Original diagrams drawn for this packet, not book figures.
                </p>
                {galleryFigures.map((f) => (
                  <SvgFigure key={f.id} figure={f} />
                ))}
              </section>
            )}

            {galleryBookFigures.length > 0 && (
              <section id="book-figures" className="mt-12 scroll-mt-20">
                <h2 className="mb-2 text-2xl font-semibold tracking-tight">From the book</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Reference figures from Machine Learning Systems by Vijay Janapa Reddi.
                  These images are not republished here; consult the source book alongside our sketches.
                </p>
                {galleryBookFigures.map((f) => (
                  <p key={f.id} id={`fig-${f.id}`}><a href={f.sourceHref} className="underline">Read the source book figure: {f.title}</a></p>
                ))}
              </section>
            )}

            {preparedQuiz && (
              <section id="self-test" className="mt-12 scroll-mt-20 border-t border-border/60 pt-10">
                <h2 className="mb-2 text-2xl font-semibold tracking-tight">Self-test</h2>
                <p className="mb-6 text-sm text-muted-foreground">
                  Answer everything before scoring. Pass bar: ≥80% with no missed core claim. Score saves to this browser only.{' '}
                  <a href="anki.txt" className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
                    Export this deck to Anki
                  </a>
                  .
                </p>
                <QuizRunner key={ch.id} quiz={preparedQuiz} chapterId={ch.id} />
              </section>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6">
            <h2 className="text-lg font-semibold">Packet not built yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This chapter is on the map but the study packet hasn't been produced. Run the{' '}
              <code className="font-mono text-xs">mlsys-study</code> skill to work through it next.
            </p>
            {ch.sections.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">book sections</div>
                <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                  {ch.sections.map((s) => (
                    <li key={s.title} className="truncate">· {s.title}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <nav className="mt-14 flex items-center justify-between border-t border-border/60 pt-6 text-sm">
          {prev ? (
            <Link href={chapterHref(prev)} className="text-muted-foreground hover:text-foreground">
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={chapterHref(next)} className="text-muted-foreground hover:text-foreground">
              {next.title} →
            </Link>
          ) : (
            <span />
          )}
        </nav>

        <p className="mt-8 font-mono text-[11px] leading-relaxed text-muted-foreground">
          Study notes derived from <em>Machine Learning Systems</em>,{' '}
          <a href="https://mlsysbook.ai" className="underline underline-offset-2" target="_blank" rel="noreferrer">
            mlsysbook.ai
          </a>{' '}
          (Vijay Janapa Reddi, Harvard CS249r). Original sketches are labelled separately; reference book figures link to the source and are not republished here.
        </p>
      </main>
      <SiteFooter />
    </>
  )
}
