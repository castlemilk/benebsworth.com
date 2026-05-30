import type { Metadata } from 'next'
import { about } from '@/content/about'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl space-y-12 p-6">
        <section>
          <h1 className="mb-4 text-3xl font-bold">About</h1>
          <p className="leading-7 text-fg/90">{about.bio}</p>
        </section>
        <section>
          <h2 className="mb-4 text-xl font-semibold text-about">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {about.skills.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
          </div>
        </section>
        <section id="timeline">
          <h2 className="mb-4 text-xl font-semibold text-about">Timeline</h2>
          <ul className="space-y-4">
            {about.timeline.map((t, i) => (
              <li key={i}>
                <span className="text-xs uppercase tracking-wider text-muted">{t.when}</span>
                <p className="font-medium">{t.title}</p>
                <p className="text-sm text-fg/70">{t.detail}</p>
              </li>
            ))}
          </ul>
        </section>
        <section id="speaking">
          <h2 className="mb-4 text-xl font-semibold text-about">Speaking</h2>
          <ul className="space-y-4">
            {about.speaking.map((e, i) => (
              <li key={i}>
                <a href={e.url || '#'} className="font-medium hover:text-about">{e.title}</a>
                <p className="text-sm text-fg/70">{e.description}</p>
              </li>
            ))}
          </ul>
        </section>
        <section id="certifications">
          <h2 className="mb-4 text-xl font-semibold text-about">Certifications</h2>
          <ul className="space-y-4">
            {about.certifications.map((c, i) => (
              <li key={i}>
                {c.url ? (
                  <a href={c.url} className="font-medium hover:text-about">{c.title}</a>
                ) : (
                  <span className="font-medium">{c.title}</span>
                )}
                <p className="text-sm text-fg/70">{c.issuer}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
