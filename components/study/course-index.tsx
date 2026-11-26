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
  const packets = chapters.filter((chapter) => chapter.hasPacket)
  const lastAvailable = packets.at(-1)
  const attempted = chapters.filter((chapter) => local[chapter.id]?.quizBest !== undefined).length

  return (
    <div className="space-y-8">
      <div className="space-y-2 border-y border-border py-4">
        <p className="text-sm text-muted-foreground">
          {packets.length} of {chapters.length} chapters have study packets across {course.volumes.length} volumes.
          {attempted > 0 && ` You’ve attempted ${attempted} ${attempted === 1 ? 'quiz' : 'quizzes'} on this device.`}
        </p>
        {lastAvailable && (
          <Link href={chapterHref(lastAvailable)} className="inline-block font-medium underline underline-offset-4">
            Read chapter {Number(lastAvailable.sourceDir.split('_')[0])} · {lastAvailable.title}
          </Link>
        )}
      </div>

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
      {local?.visitedAt && local.quizBest === undefined && <span className="hidden font-mono text-xs text-muted-foreground sm:inline">seen</span>}
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
