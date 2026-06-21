import Link from 'next/link'

/**
 * Author bio at the foot of every post. The post already carries a JSON-LD
 * `author` Person entity; this is the human-readable counterpart that readers
 * and AI fetchers actually see — a visible E-E-A-T signal (who wrote this, why
 * trust them) plus a contextual internal link to /about.
 */
export function AuthorBio() {
  return (
    <aside className="not-prose mt-16 flex flex-col gap-5 rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-fg)_3%,transparent)] p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
      <img
        src="/about/portrait-main.webp"
        alt="Ben Ebsworth"
        width={600}
        height={859}
        loading="lazy"
        decoding="async"
        className="h-20 w-20 shrink-0 rounded-full object-cover object-top ring-1 ring-[var(--color-border)] sm:h-24 sm:w-24"
      />
      <div className="min-w-0">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted">
          Written by
        </p>
        <p className="mt-1 font-display text-xl font-semibold text-fg">Ben Ebsworth</p>
        <p className="mt-2 font-sans text-[0.95rem] leading-7 text-fg/70">
          Software, platform &amp; hardware engineer in Melbourne, currently building
          Atlassian&rsquo;s internal platform. I write here about distributed systems,
          electronics, signal processing and the physics underneath — usually with
          something interactive to poke at.
        </p>
        <Link
          href="/about/"
          className="mt-3 inline-flex items-center gap-1.5 font-mono text-sm text-project transition-colors hover:underline"
        >
          More about Ben
          <span aria-hidden>→</span>
        </Link>
      </div>
    </aside>
  )
}
