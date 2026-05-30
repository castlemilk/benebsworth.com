import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllProjects, getProject } from '@/lib/content'
import { MdxContent } from '@/components/mdx/mdx-content'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
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
  return { title: p?.title ?? 'Project', description: p?.description }
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = getProject(slug)
  if (!p) notFound()

  return (
    <>
      <SiteNav />

      <main className="mx-auto w-full max-w-4xl px-6 pb-24">
        <Reveal>
          <Link
            href="/projects/"
            className="mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em] text-muted transition-colors hover:text-project"
          >
            <span aria-hidden>←</span> Projects
          </Link>
        </Reveal>

        {/* ── Hero ───────────────────────────────────────────────── */}
        <header className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[1.1fr_1fr] md:items-stretch">
          <Reveal className="order-2 flex flex-col justify-center md:order-1">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-project">Project</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {p.title}
            </h1>
            <p className="mt-4 max-w-xl font-sans text-[1.05rem] leading-7 text-fg/75">
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
              className="h-full min-h-[15rem] rounded-2xl border border-white/10"
              emblemSize={168}
            />
          </Reveal>
        </header>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="mt-12 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted">
          <span className="text-project">02</span>
          <span>Writeup</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <Reveal>
          <article className="prose prose-invert mt-6 max-w-none">
            <MdxContent source={p.body} />
          </article>
        </Reveal>
      </main>

      <SiteFooter />
    </>
  )
}
