import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { getCourse, getProgressRows } from '@/lib/study/load'
import type { ProgressRow } from '@/lib/study/load'
import { CourseIndex } from '@/components/study/course-index'
import { JsonLd, SITE_URL, breadcrumbLd } from '@/components/seo/json-ld'

export const metadata: Metadata = {
  title: 'Study — Machine Learning Systems',
  description:
    'A step-by-step read-through of Machine Learning Systems (mlsysbook.ai) — chapter packets, original diagrams, self-tests, and an essay per chapter.',
  alternates: { canonical: '/study/' },
}

export default function StudyPage() {
  const course = getCourse()
  const progress: Record<string, ProgressRow> = Object.fromEntries(getProgressRows())

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'Learning', url: `${SITE_URL}/learning/` },
          { name: 'Machine Learning Systems', url: `${SITE_URL}/learning/ml-systems/` },
        ])}
      />
      <SiteNav />
      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-20 sm:px-8">
        <Breadcrumb className="mb-8" items={[{ label: 'Home', href: '/' }, { label: 'Learning', href: '/learning/' }, { label: 'Machine Learning Systems' }]} />

        <header className="mb-6 max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{course.title}</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Chapter notes, diagrams and self-tests for{' '}
            <a href={course.sourceUrl} className="underline underline-offset-4" target="_blank" rel="noreferrer">
              <em>{course.sourceTitle}</em>
            </a>{' '}
            by {course.sourceAuthor} ({course.license}).
          </p>
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            <Link href="/study/concepts/" className="underline underline-offset-4 hover:text-foreground">
              concept index
            </Link>{' '}
            · every glossary term across packets
          </p>
        </header>

        <CourseIndex course={course} progress={progress} />
      </main>
      <SiteFooter />
    </>
  )
}
