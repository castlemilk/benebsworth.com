import type { StudyChapter } from '@/lib/gen/study'

/** Pure helpers shared by the /study server loader and client components. */

export function chapterHref(ch: Pick<StudyChapter, 'volumeId' | 'slug'>): string {
  return `/study/${ch.volumeId}/${ch.slug}/`
}

/** progress.md rows are keyed by `volN/NN` — same key shape used client-side. */
export function progressKey(ch: Pick<StudyChapter, 'volumeId' | 'sourceDir'>): string {
  return `${ch.volumeId}/${ch.sourceDir.split('_')[0]}`
}
