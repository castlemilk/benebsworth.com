'use client'

import Link from 'next/link'
import type { StudyChapter, StudyCourse } from '@/lib/gen/study'
import type { ProgressRow } from '@/lib/study/load'
import { chapterHref, progressKey } from '@/lib/study/shared'
import { StatusChip, VolumeStateChip } from './status-chip'
import { useStudyProgress } from './progress'
import { cn } from '@/lib/utils'

const ROMAN_NUMERAL = ['0', 'I', 'II', 'III', 'IV', 'V'] as const

/**
 * Course tree for /study — volumes → chapters with the workflow status from
 * curriculum.md (server-parsed) overlaid with the learner's local progress
 * (localStorage). Client component so quiz scores update live after a run.
 */
export function CourseIndex({ course, progress }: { course: StudyCourse; progress: Record<string, ProgressRow> }) {
  const local = useStudyProgress()

  const chapters = course.volumes.flatMap((v) => v.chapters)
  const built = chapters.filter((c) => c.hasPacket).length
  const quizzed = chapters.filter((c) => (local[c.id]?.quizBest ?? 0) > 0).length
  const next = chapters.find((c) => !c.hasPacket)

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="chapters" value={String(chapters.length)} />
        <Stat label="packets built" value={`${built}`} />
        <Stat label="quizzes passed*" value={`${quizzed}`} />
        <Stat label="volumes" value={String(course.volumes.length)} />
      </div>
      <p className="-mt-7 font-mono text-[11px] text-muted-foreground">*attempted locally; scores live in your browser, not the repo</p>

      {next && (
        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Next in the loop:{' '}
          <Link href={chapterHref(next)} className="font-medium text-foreground underline underline-offset-4">
            {next.title}
          </Link>{' '}
          <span className="font-mono text-xs">({next.id})</span>: packet not built yet. Run the{' '}
          <code className="font-mono text-xs">mlsys-study</code> skill to produce it.
        </div>
      )}

      {course.volumes.map((vol) => (
        <section key={vol.id} className="[content-visibility:auto] [contain-intrinsic-size:auto_480px]">
          <div className="mb-3 flex items-baseline gap-3">
            <h2 className="text-xl font-semibold">
              <span className="font-mono text-sm text-muted-foreground">Vol {ROMAN_NUMERAL[vol.number] ?? vol.number}</span>{' '}
              {vol.title}
            </h2>
            <VolumeStateChip state={vol.state} />
            <span className="ml-auto font-mono text-xs text-muted-foreground">{vol.chapters.length} ch</span>
          </div>
          <ol className="divide-y divide-border/50 rounded-xl border border-border/60">
            {vol.chapters.map((ch) => (
              <ChapterRow key={ch.id} chapter={ch} row={progress[progressKey(ch)]} local={local[ch.id]} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 p-3 text-center">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  )
}

function ChapterRow({ chapter, row, local }: { chapter: StudyChapter; row?: ProgressRow; local?: { visitedAt?: string; quizBest?: number; reviewedAt?: string } }) {
  const pending = !chapter.hasPacket
  const body = (
    <div className={cn('group flex items-center gap-3 px-4 py-3 sm:gap-4', !pending && 'transition-colors hover:bg-muted/40')}>
      <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">{chapter.sourceDir.split('_')[0]}</span>
      <span className={cn('min-w-0 flex-1 truncate', pending && 'text-muted-foreground', !pending && 'transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:transform-none')}>{chapter.title}</span>
      {row?.packetAt && <span className="hidden font-mono text-xs text-muted-foreground lg:inline">{row.packetAt}</span>}
      {local?.quizBest !== undefined && (
        <span className="hidden font-mono text-xs text-emerald-600 sm:inline dark:text-emerald-400">{local.quizBest}%</span>
      )}
      {local?.visitedAt && !local.quizBest && <span className="hidden font-mono text-xs text-muted-foreground sm:inline">seen</span>}
      {chapter.hasQuiz && <span className="hidden font-mono text-xs text-muted-foreground md:inline">quiz</span>}
      {chapter.diagrams.length > 0 && <span className="hidden font-mono text-xs text-muted-foreground md:inline">{chapter.diagrams.length} fig</span>}
      {pending && <span className="font-mono text-xs text-muted-foreground">pending</span>}
      <StatusChip status={chapter.status} />
      {!pending && (
        <span aria-hidden className="w-3 shrink-0 text-right text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none">
          ›
        </span>
      )}
    </div>
  )
  return <li>{pending ? <div className="opacity-80">{body}</div> : <Link href={chapterHref(chapter)}>{body}</Link>}</li>
}
