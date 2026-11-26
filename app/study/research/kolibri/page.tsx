import type { Metadata } from 'next'
import fs from 'node:fs'
import path from 'node:path'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { PacketAnnotator } from '@/components/study/packet-annotations'
import { TocNav } from '@/components/study/toc-nav'
import { MicroScroller } from '@/components/study/micro-scroller'
import { QuizRunner, type PreparedQuiz } from '@/components/study/quiz-runner'
import { KolibriExplorers } from '@/components/study/kolibri-explorers'
import { AudioOverview } from '@/components/mdx/audio-overview'
import { renderMarkdown } from '@/lib/study/markdown'
import quiz from '@/study/research/kolibri/quiz.json'
import 'katex/dist/katex.min.css'

export const metadata: Metadata = {
  title: 'Kolibri · Research study',
  description: 'A study packet on Kolibri’s sparse experts, long context, training and evaluation.',
  alternates: { canonical: '/study/research/kolibri/', types: { 'text/markdown': '/study/research/kolibri/index.md' } },
}

export default async function KolibriStudyPage() {
  const hasAudio = fs.existsSync(path.join(process.cwd(), 'public/study-audio/research/kolibri.m4a')) && fs.existsSync(path.join(process.cwd(), 'public/study-audio/research/kolibri.transcript.json'))
  const packet = fs.readFileSync(path.join(process.cwd(), 'study/research/kolibri/packet.md'), 'utf8')
  const packetHtml = await renderMarkdown(packet.replace(/^\s*#[^\n]*\n+/, ''))
  const questions: PreparedQuiz['questions'] = await Promise.all(quiz.questions.map(async (q) => ({
    id: q.id,
    kind: q.kind as 'MCQ' | 'FEYNMAN' | 'NUMERIC',
    source: 'ORIGINAL' as const,
    promptHtml: await renderMarkdown(q.prompt),
    options: await Promise.all((q.options ?? []).map(async (o) => ({ id: o.id, labelHtml: await renderMarkdown(o.label) }))),
    correctOptionId: q.correctOptionId,
    explanationHtml: q.explanation ? await renderMarkdown(q.explanation) : undefined,
    modelAnswerHtml: q.modelAnswer ? await renderMarkdown(q.modelAnswer) : undefined,
  })))
  const headings = [...packetHtml.matchAll(/<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>/g)].map((m) => ({
    depth: Number(m[1]) as 2 | 3, id: m[2], text: m[3].replace(/<[^>]+>/g, '').trim(),
  }))
  const toc = [{ depth: 2 as const, id: 'explore-kolibri', text: 'Explore Kolibri' }, ...headings]
  const sections = [{ depth: 2 as const, id: 'self-test', text: 'Self-test' }]

  return <>
    <SiteNav />
    <main id="main-content" className="mx-auto w-full max-w-4xl px-6 pb-20 sm:px-8">
      <Breadcrumb className="mb-8" items={[{ label: 'Home', href: '/' }, { label: 'Learning', href: '/learning/' }, { label: 'Research' }, { label: 'Kolibri' }]} />
      <header className="mb-8">
        <div className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">study · research packet</div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Kolibri: A sparse model as a system</h1>
        <p className="mt-3 text-sm text-muted-foreground">Study notes and a self-test based on Aleph Alpha’s technical report.</p>
        {hasAudio && <AudioOverview src="/study-audio/research/kolibri.m4a" transcriptSrc="/study-audio/research/kolibri.transcript.json" title="audio overview · kolibri" />}
      </header>
      <TocNav packet={toc} sections={sections} />
      <MicroScroller items={[...toc, ...sections]} />
      <div id="explore-kolibri" className="scroll-mt-24"><KolibriExplorers /></div>
      <PacketAnnotator chapterId="research/kolibri" chartSlots={{}}>
        <article className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: packetHtml }} />
      </PacketAnnotator>
      <section id="self-test" className="mt-12 scroll-mt-20 border-t border-border/60 pt-10">
        <h2 className="mb-2 text-2xl font-semibold tracking-tight">Self-test</h2>
        <p className="mb-6 text-sm text-muted-foreground">Answer everything before scoring. Scores stay in this browser. <a href="anki.txt" className="underline underline-offset-4">Export this deck to Anki</a>.</p>
        <QuizRunner quiz={{ title: quiz.title, questions }} chapterId="research/kolibri" />
      </section>
    </main>
    <SiteFooter />
  </>
}
