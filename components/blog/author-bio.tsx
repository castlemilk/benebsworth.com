import Link from 'next/link'

/** Human-readable author context; keep the authored biography and destination intact. */
export function AuthorBio() {
  return <aside className="not-prose folio-author">
    <img src="/about/portrait-main.webp" alt="Ben Ebsworth" width={600} height={859}
      loading="lazy" decoding="async" className="folio-author-portrait"/>
    <div className="folio-author-copy">
      <p className="folio-author-label">Written by</p>
      <p className="folio-author-name">Ben Ebsworth</p>
      <p className="folio-author-description">
        Software, platform &amp; hardware engineer in Melbourne, currently building
        Atlassian&rsquo;s internal platform. I write here about distributed systems,
        electronics, signal processing and the physics underneath — usually with
        something interactive to poke at.
      </p>
      <Link href="/about/" className="folio-author-link">More about Ben<span aria-hidden>→</span></Link>
    </div>
  </aside>
}
