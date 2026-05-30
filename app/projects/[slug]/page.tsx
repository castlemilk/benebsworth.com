import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getAllProjects, getProject } from '@/lib/content'
import { MdxContent } from '@/components/mdx/mdx-content'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Badge } from '@/components/ui/badge'

export function generateStaticParams() {
  return getAllProjects().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const p = getProject(slug)
  return { title: p?.title ?? 'Project', description: p?.description }
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = getProject(slug)
  if (!p) notFound()
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl p-6">
        <h1 className="text-3xl font-bold">{p.title}</h1>
        <p className="mt-2 text-fg/70">{p.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {p.technologies.map((t) => (
            <Badge key={t.text} style={{ backgroundColor: t.color }} className="text-black">{t.text}</Badge>
          ))}
        </div>
        {p.link?.url && <a className="mt-4 inline-block text-project underline" href={p.link.url}>View source →</a>}
        <article className="mt-8"><MdxContent source={p.body} /></article>
      </main>
      <SiteFooter />
    </>
  )
}
