import type { Metadata } from 'next'
import { about } from '@/content/about'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { Reveal } from '@/components/motion/reveal'
import { AnimatedHeading } from '@/components/motion/animated-heading'
import { SpotlightCard } from '@/components/motion/spotlight-card'
import { SkillMarquee } from '@/components/motion/skill-marquee'
import { PortraitHero } from '@/components/about/portrait-hero'
import { YouTube } from '@/components/media/youtube'
import { youtubeId } from '@/lib/youtube'
import { techColor } from '@/lib/tech-colors'

export const metadata: Metadata = { title: 'About' }

const ACCENT = { blog: '#00e0b8', project: '#7c5cff', about: '#ff7a59' }

// Issuer → accent (coding system consistent with the timeline company colors):
// AWS = orange (about), GCP = teal (blog), CNCF = purple (project).
const ISSUER_ORDER = ['Amazon Web Services', 'Google Cloud', 'CNCF'] as const
const ISSUER_META: Record<string, { label: string; accent: string; tag: string }> = {
  'Amazon Web Services': { label: 'Amazon Web Services', accent: ACCENT.about, tag: 'AWS' },
  'Google Cloud': { label: 'Google Cloud', accent: ACCENT.blog, tag: 'GCP' },
  CNCF: { label: 'Cloud Native Computing Foundation', accent: ACCENT.project, tag: 'CNCF' },
}

function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-baseline gap-3 font-mono text-xs uppercase tracking-[0.25em] text-muted">
      <span className="text-about">{index}</span>
      <span>{children}</span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  )
}

export default function AboutPage() {
  const certCount = about.certifications.length
  const talkCount = about.speaking.length

  const certsByIssuer = ISSUER_ORDER.map((issuer) => ({
    issuer,
    meta: ISSUER_META[issuer],
    items: about.certifications.filter((c) => c.issuer === issuer),
  })).filter((g) => g.items.length > 0)

  return (
    <>
      <SiteNav />

      <main className="mx-auto w-full max-w-6xl px-6 pb-32 sm:px-8">
        {/* ── Hero — portrait is the focal point, copy framing it ──── */}
        <section className="grid grid-cols-1 items-center gap-12 pt-14 pb-28 md:grid-cols-[1fr_minmax(24rem,32rem)] md:gap-20 md:pt-24">
          <div className="order-2 text-center md:order-1 md:text-left">
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-about">
                Dossier · Platform / SRE
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="type-display mt-4">
                Ben
                <br />
                Ebsworth
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mx-auto mt-6 max-w-xl font-mono text-base text-fg/60 md:mx-0">
                Platform / SRE engineer · Kubernetes, GCP &amp; AWS · Melbourne, Australia
              </p>
            </Reveal>
            <Reveal delay={220}>
              <p className="mx-auto mt-7 max-w-2xl type-body text-fg/85 md:mx-0">
                {about.bio}
              </p>
            </Reveal>
            <Reveal delay={300}>
              <dl className="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-4 font-mono md:justify-start">
                <Fact value="10+" label="years building" accent={ACCENT.about} />
                <Fact value={`${certCount}`} label="certifications" accent={ACCENT.blog} />
                <Fact value={`${talkCount}`} label="talks given" accent={ACCENT.project} />
              </dl>
            </Reveal>
          </div>

          <Reveal delay={120} className="order-1 md:order-2">
            <PortraitHero accent={ACCENT.about} />
          </Reveal>
        </section>

        {/* ── Resume / Career ────────────────────────────────────── */}
        <section id="resume" className="pb-28">
          <SectionLabel index="01">Career &amp; education</SectionLabel>
          <AnimatedHeading
            text="The track record"
            as="h2"
            className="type-h2 mb-10"
          />

          <ol className="relative ml-2 sm:ml-3">
            {/* vertical spine */}
            <span
              aria-hidden
              className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-white/5 via-white/15 to-white/5"
            />
            {about.timeline.map((t, i) => (
              <li key={i} className="relative pl-10 pb-8 last:pb-0 sm:pl-12">
                {/* spine node, colored per entry */}
                <span
                  aria-hidden
                  className="absolute left-[3px] top-5 grid size-4 place-items-center rounded-full border border-white/20 bg-bg sm:left-[4px]"
                  style={{ boxShadow: `0 0 0 3px color-mix(in srgb, ${t.color} 18%, transparent)` }}
                >
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                </span>

                <Reveal delay={i * 40}>
                  <SpotlightCard accent={t.color} className="p-6 sm:p-8">
                    <div className="flex items-start gap-5">
                      <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] p-3">
                        <img
                          src={t.logo}
                          alt={`${t.company} logo`}
                          width={40}
                          height={40}
                          className="block h-full w-full object-contain"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span
                            className="font-mono text-[0.65rem] uppercase tracking-[0.2em]"
                            style={{ color: t.color }}
                          >
                            {t.kind === 'education' ? 'Education' : 'Work'} · {t.company}
                          </span>
                          <span className="font-mono text-[0.7rem] text-muted">{t.when}</span>
                        </div>
                        <h3 className="mt-2 font-display text-xl font-semibold leading-snug tracking-[-0.01em] sm:text-2xl">{t.title}</h3>
                        <p className="mt-2.5 font-sans text-base leading-7 text-fg/65">{t.detail}</p>
                        {t.tech.length > 0 && (
                          <ul className="mt-4 flex flex-wrap gap-1.5">
                            {t.tech.map((tech) => {
                              const c = techColor(tech)
                              return (
                                <li
                                  key={tech}
                                  className="rounded-full border px-2.5 py-0.5 font-mono text-[0.65rem] tracking-tight"
                                  style={{
                                    borderColor: `color-mix(in srgb, ${c} 45%, transparent)`,
                                    backgroundColor: `color-mix(in srgb, ${c} 14%, transparent)`,
                                    color: c,
                                  }}
                                >
                                  {tech}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  </SpotlightCard>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Certifications ─────────────────────────────────────── */}
        <section id="certifications" className="pb-28">
          <SectionLabel index="02">Verified credentials</SectionLabel>
          <AnimatedHeading
            text="The trophy shelf"
            as="h2"
            className="type-h2 mb-2"
          />
          <p className="mb-10 max-w-lg font-sans text-sm text-fg/55">
            {certCount}{' '}active certifications across the three clouds &amp; the cloud-native ecosystem.
          </p>

          <div className="space-y-12">
            {certsByIssuer.map((group) => (
              <div key={group.issuer}>
                <div className="mb-5 flex items-center gap-3">
                  <span
                    className="size-2.5 rounded-sm"
                    style={{ backgroundColor: group.meta.accent }}
                    aria-hidden
                  />
                  <h3 className="font-mono text-sm uppercase tracking-[0.18em] text-fg/85">
                    {group.meta.label}
                  </h3>
                  <span className="font-mono text-xs text-muted">
                    {group.items.length} {group.items.length === 1 ? 'cert' : 'certs'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((c) => (
                    <Reveal key={c.title}>
                      <a
                        href={c.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="block h-full rounded-xl"
                      >
                        <SpotlightCard
                          accent={group.meta.accent}
                          className="flex h-full items-center gap-5 p-5"
                        >
                          <img
                            src={c.badge}
                            alt={`${c.title} badge`}
                            width={88}
                            height={88}
                            className="size-20 shrink-0 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                          />
                          <div className="min-w-0">
                            <p className="font-display text-base font-semibold leading-snug tracking-[-0.01em]">{c.title}</p>
                            <p className="mt-1 font-mono text-[0.7rem] uppercase tracking-wider text-muted">
                              {group.meta.tag} ↗
                            </p>
                          </div>
                        </SpotlightCard>
                      </a>
                    </Reveal>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Speaking ───────────────────────────────────────────── */}
        <section id="speaking" className="pb-28">
          <SectionLabel index="03">On the record</SectionLabel>
          <AnimatedHeading
            text="Talks & speaking"
            as="h2"
            className="type-h2 mb-10"
          />

          {(() => {
            const withVideo = about.speaking
              .map((e) => ({ e, vid: youtubeId(e.url) }))
              .filter((x): x is { e: typeof x.e; vid: string } => x.vid !== null)
            const noVideo = about.speaking.filter((e) => youtubeId(e.url) === null)

            return (
              <>
                {/* Talks with recordings — the embed is the hero of each card */}
                {withVideo.length > 0 && (
                  <div className="mb-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {withVideo.map(({ e, vid }, i) => (
                      <Reveal key={`v-${i}`} delay={i * 60}>
                        <SpotlightCard accent={ACCENT.project} className="flex h-full flex-col p-4">
                          <YouTube id={vid} title={e.title} accent={ACCENT.project} />
                          <div className="flex items-start gap-3 px-1 pt-4">
                            <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] p-2">
                              <img
                                src={e.image}
                                alt={`${e.title} logo`}
                                width={32}
                                height={32}
                                className="max-h-7 max-w-7 object-contain"
                              />
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <h3 className="font-display text-base font-semibold leading-snug tracking-[-0.01em]">{e.title}</h3>
                                <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-project">
                                  ▶ Recording
                                </span>
                              </div>
                              <p className="mt-1 font-mono text-[0.7rem] text-muted">{e.date}</p>
                              <p className="mt-2 font-sans text-sm leading-6 text-fg/60">
                                {e.description}
                              </p>
                            </div>
                          </div>
                        </SpotlightCard>
                      </Reveal>
                    ))}
                  </div>
                )}

                {/* Remaining talks — logo + external link card */}
                {noVideo.length > 0 && (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {noVideo.map((e, i) => (
                      <Reveal key={`n-${i}`} delay={i * 40}>
                        <a
                          href={e.url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="block h-full rounded-xl"
                        >
                          <SpotlightCard accent={ACCENT.project} className="flex h-full gap-4 p-5">
                            <span className="grid size-14 shrink-0 place-items-center self-start rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
                              <img
                                src={e.image}
                                alt={`${e.title} logo`}
                                width={40}
                                height={40}
                                className="max-h-9 max-w-9 object-contain"
                              />
                            </span>
                            <div className="min-w-0">
                              <h3 className="font-display text-base font-semibold leading-snug tracking-[-0.01em]">{e.title}</h3>
                              <p className="mt-1 font-mono text-[0.7rem] text-muted">{e.date}</p>
                              <p className="mt-2 font-sans text-sm leading-6 text-fg/60">
                                {e.description}
                              </p>
                            </div>
                          </SpotlightCard>
                        </a>
                      </Reveal>
                    ))}
                  </div>
                )}
              </>
            )
          })()}
        </section>

        {/* ── Skills ─────────────────────────────────────────────── */}
        <section id="skills">
          <SectionLabel index="04">Toolkit</SectionLabel>
          <Reveal>
            <SkillMarquee skills={about.skills} />
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}

function Fact({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <div>
      <dt className="text-4xl font-bold leading-none sm:text-5xl" style={{ color: accent }}>
        {value}
      </dt>
      <dd className="mt-2 text-[0.78rem] uppercase tracking-[0.18em] text-muted">{label}</dd>
    </div>
  )
}
