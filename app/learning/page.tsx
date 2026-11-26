import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { LibraryList, type LearningEntry } from '@/components/learning/library-list'
import { getCourse } from '@/lib/study/load'

export const metadata: Metadata = { title: 'Learning', description: 'Notes, diagrams and self-tests from books and technical research.', alternates: { canonical: '/learning/' } }

export default function LearningPage() {
  const course = getCourse()
  const chapters = course.volumes.flatMap((volume) => volume.chapters)
  const entries: LearningEntry[] = [
    { id: 'mlsys', title: course.title, creator: course.sourceAuthor, description: 'A guided read-through with chapter notes, original diagrams, audio and self-tests.', type: 'Book', image: '/learning/ml-systems.webp', href: '/learning/ml-systems/', detail: `${chapters.filter((chapter) => chapter.hasPacket).length} packets` },
    { id: 'kolibri', title: 'Kolibri: A sparse model as a system', creator: 'Aleph Alpha', description: 'Notes and a self-test on the Kolibri technical report.', type: 'Research', href: '/study/research/kolibri/', detail: 'Study packet' },
  ]
  return <><SiteNav /><main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-20 sm:px-8"><Breadcrumb className="mb-8" items={[{ label: 'Home', href: '/' }, { label: 'Learning' }]} /><header className="max-w-3xl"><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Learning</h1><p className="mt-4 text-lg leading-relaxed text-muted-foreground">Books, courses and research I’m working through, with notes and self-tests to make the ideas stick.</p></header><LibraryList entries={entries} /></main><SiteFooter /></>
}
