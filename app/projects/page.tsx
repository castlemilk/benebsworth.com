import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllProjects, type LoadedProject } from '@/lib/content'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Breadcrumb } from '@/components/site/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Reveal } from '@/components/motion/reveal'
import { AnimatedHeading } from '@/components/motion/animated-heading'
import { SpotlightCard } from '@/components/motion/spotlight-card'
import { ProjectEmblem } from '@/components/projects/project-emblem'
import { JsonLd, SITE_URL, breadcrumbLd, collectionPageLd } from '@/components/seo/json-ld'

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Selected projects by Ben Ebsworth — platforms, tools and product work spanning software, cloud infrastructure and embedded hardware, built end-to-end from data layer to interface.',
  alternates: { canonical: '/projects/' },
  openGraph: {
    type: 'website',
    title: 'Projects · Ben Ebsworth',
    description: 'Selected projects across software, cloud and hardware.',
    url: '/projects/',
    siteName: 'Ben Ebsworth',
    locale: 'en_AU',
  },
  twitter: { card: 'summary_large_image', title: 'Projects · Ben Ebsworth' },
}

const PROJECT = '#7c5cff'

function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-baseline gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted">
      <span className="text-project">{index}</span>
      <span>{children}</span>
      <span className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  )
}

// Pick black or white text per badge color for AA contrast on the solid fill.
// Some brand colors (e.g. Terraform #844fba) are too dark for black text; those
// get white. Theme-independent — the badges look identical in both themes.
function readableInk(hex: string): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
  const lin = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
  const lum = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
  // contrast of black vs the fill = (lum+0.05)/0.05; white vs fill = 1.05/(lum+0.05)
  return (lum + 0.05) / 0.05 >= 1.05 / (lum + 0.05) ? '#000000' : '#ffffff'
}

function TechBadges({ project }: { project: LoadedProject }) {
  return (
    <div className="flex flex-wrap gap-2">
      {project.technologies.map((t) => (
        <Badge
          key={t.text}
          style={{ backgroundColor: t.color, color: readableInk(t.color) }}
        >
          {t.text}
        </Badge>
      ))}
    </div>
  )
}

export default function ProjectsPage() {
  const projects = getAllProjects()
  const [lead, ...rest] = projects

  const ld = [
    breadcrumbLd([
      { name: 'Home', url: `${SITE_URL}/` },
      { name: 'Projects', url: `${SITE_URL}/projects/` },
    ]),
    collectionPageLd({
      name: 'Projects · Ben Ebsworth',
      description: 'Selected projects across software, cloud and hardware.',
      url: `${SITE_URL}/projects/`,
      items: projects.map((p) => ({ name: p.title, url: `${SITE_URL}/projects/${p.slug}/` })),
    }),
  ]

  return (
    <>
      <JsonLd data={ld} />
      <SiteNav />

      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 pb-32 sm:px-8">
        <Breadcrumb className="pt-8 sm:pt-10" items={[{ label: 'Home', href: '/' }, { label: 'Projects' }]} />

        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="pt-8 pb-20 md:pt-10">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-project">
              Selected work
            </p>
          </Reveal>
          <AnimatedHeading
            text="Things I've built"
            as="h1"
            className="type-h1 mt-4"
          />
          <Reveal delay={160}>
            <p className="mt-7 max-w-2xl font-sans text-[1.2rem] leading-8 text-fg/70">
              Side projects and experiments — places to try new ideas end-to-end, from
              data layer to interface.
            </p>
          </Reveal>
        </section>

        {/* ── The work ───────────────────────────────────────────── */}
        <section>
          <SectionLabel index="01">The work</SectionLabel>

          {/* Lead / feature card — full width, emblem alongside large type */}
          {lead && (
            <Reveal>
              <Link href={`/projects/${lead.slug}/`} className="block rounded-2xl">
                <SpotlightCard accent={PROJECT} className="overflow-hidden">
                  <div className="grid grid-cols-1 gap-0 md:grid-cols-[1.05fr_1fr]">
                    <ProjectEmblem
                      src={lead.image}
                      alt={`${lead.title} emblem`}
                      accent={PROJECT}
                      className="min-h-[20rem] border-b border-[var(--color-border)] md:border-b-0 md:border-r"
                      emblemSize={168}
                    />
                    <div className="flex flex-col justify-center p-9 sm:p-12">
                      <div className="flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.22em]">
                        <span className="text-project">Featured</span>
                        <span className="text-muted">·</span>
                        <span className="text-muted">Project 01</span>
                      </div>
                      <h2 className="type-h2 mt-3">
                        {lead.title}
                      </h2>
                      <p className="mt-4 max-w-lg font-sans text-[1.0625rem] leading-7 text-fg/70">
                        {lead.description}
                      </p>
                      <div className="mt-6">
                        <TechBadges project={lead} />
                      </div>
                      <span className="mt-7 inline-flex items-center gap-2 font-mono text-sm text-project">
                        View project
                        <span className="transition-transform duration-300 group-hover/spot:translate-x-1">
                          →
                        </span>
                      </span>
                    </div>
                  </div>
                </SpotlightCard>
              </Link>
            </Reveal>
          )}

          {/* Secondary entries — full-width horizontal cards (emblem-left,
              shorter than the lead) so a single entry never floats in an empty
              grid cell, while extra entries simply stack with rhythm. */}
          {rest.length > 0 && (
            <div className="mt-6 space-y-6">
              {rest.map((p, i) => (
                <Reveal key={p.slug} delay={(i + 1) * 60}>
                  <Link href={`/projects/${p.slug}/`} className="block rounded-2xl">
                    <SpotlightCard accent={PROJECT} className="overflow-hidden">
                      <div className="grid grid-cols-1 gap-0 sm:grid-cols-[clamp(15rem,34%,21rem)_1fr]">
                        <ProjectEmblem
                          src={p.image}
                          alt={`${p.title} emblem`}
                          accent={PROJECT}
                          className="min-h-[15rem] border-b border-[var(--color-border)] sm:border-b-0 sm:border-r"
                          emblemSize={140}
                        />
                        <div className="flex flex-col justify-center p-8 sm:p-9">
                          <div className="font-mono text-[0.74rem] uppercase tracking-[0.22em] text-muted">
                            Project 0{i + 2}
                          </div>
                          <h2 className="type-h3 mt-2.5 text-[1.75rem]">{p.title}</h2>
                          <p className="mt-3 max-w-lg font-sans text-base leading-7 text-fg/65">
                            {p.description}
                          </p>
                          <div className="mt-5">
                            <TechBadges project={p} />
                          </div>
                          <span className="mt-6 inline-flex items-center gap-2 font-mono text-sm text-project">
                            View project
                            <span className="transition-transform duration-300 group-hover/spot:translate-x-1">
                              →
                            </span>
                          </span>
                        </div>
                      </div>
                    </SpotlightCard>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
