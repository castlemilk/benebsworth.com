import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getAllProjects, getProject } from '@/lib/content'
import { MdxContent } from '@/components/mdx/mdx-content'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Reveal } from '@/components/motion/reveal'
import { ProjectEmblem } from '@/components/projects/project-emblem'

const PROJECT = '#7c5cff'

export function generateStaticParams() {
  return getAllProjects().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const p = getProject(slug)
  const url = `/projects/${slug}/`
  return {
    title: p?.title ?? 'Project',
    description: p?.description,
    alternates: { canonical: url },
    openGraph: { type: 'article', title: p?.title, description: p?.description, url },
    twitter: { card: 'summary_large_image', title: p?.title, description: p?.description },
  }
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = getProject(slug)
  if (!p) notFound()

  return (
    <>
      <SiteNav />

      <main className="mx-auto w-full max-w-5xl px-6 pb-32 sm:px-8">
        <Reveal>
          <Breadcrumb
            className="mt-8"
            items={[{ label: 'Home', href: '/' }, { label: 'Projects', href: '/projects/' }, { label: p.title }]}
          />
        </Reveal>

        {/* ── Hero ───────────────────────────────────────────────── */}
        <header className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[1.1fr_1fr] md:items-stretch">
          <Reveal className="order-2 flex flex-col justify-center md:order-1">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-project">Project</p>
            <h1 className="type-h1 mt-4">
              {p.title}
            </h1>
            <p className="mt-5 max-w-xl font-sans text-[1.2rem] leading-8 text-fg/75">
              {p.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {p.technologies.map((t) => (
                <Badge key={t.text} style={{ backgroundColor: t.color }} className="text-black">
                  {t.text}
                </Badge>
              ))}
            </div>
            {p.link?.url && (
              <a
                className="mt-7 inline-flex w-fit items-center gap-2 rounded-lg border border-project/40 bg-project/10 px-4 py-2 font-mono text-sm text-project transition-colors hover:bg-project/20"
                href={p.link.url}
                target="_blank"
                rel="noreferrer"
              >
                View source <span aria-hidden>↗</span>
              </a>
            )}
          </Reveal>

          <Reveal delay={120} className="order-1 md:order-2">
            <ProjectEmblem
              src={p.image}
              alt={`${p.title} emblem`}
              accent={PROJECT}
              className="h-full min-h-[19rem] rounded-2xl border border-[var(--color-border)]"
              emblemSize={160}
            />
          </Reveal>
        </header>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="mt-12 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted">
          <span className="text-project">02</span>
          <span>Writeup</span>
          <span className="h-px flex-1 bg-[var(--color-border)]" />
        </div>
        <Reveal>
          <article className="mt-8 max-w-[44rem]">
            <MdxContent source={p.body} />
          </article>
        </Reveal>
      </main>

      <SiteFooter />
    </>
  )
}
