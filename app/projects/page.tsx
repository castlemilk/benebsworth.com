import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllProjects } from '@/lib/content'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Projects' }

export default function ProjectsPage() {
  const projects = getAllProjects()
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl p-6">
        <h1 className="mb-8 text-3xl font-bold">Projects</h1>
        <div className="grid gap-6 sm:grid-cols-2">
          {projects.map((p) => (
            <Link key={p.slug} href={`/projects/${p.slug}/`}>
              <Card className="h-full bg-white/[0.03] p-5 transition hover:border-project/60">
                <h2 className="text-xl font-semibold">{p.title}</h2>
                <p className="mt-2 text-sm text-fg/70">{p.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.technologies.map((t) => (
                    <Badge key={t.text} style={{ backgroundColor: t.color }} className="text-black">{t.text}</Badge>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
