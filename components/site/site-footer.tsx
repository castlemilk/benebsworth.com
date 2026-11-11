import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl border-t border-[var(--color-border)] px-6 py-12 sm:py-16 font-serif text-base text-muted sm:px-8">
      <div className="grid gap-10 sm:grid-cols-3 mb-16">
        <div>
          <h3 className="type-label text-muted mb-3">Navigate</h3>
          <ul className="flex flex-col gap-2">
            <li><Link href="/" className="text-fg/90 underline-offset-4 hover:text-fg hover:underline transition-colors text-[1rem] leading-relaxed">Home</Link></li>
            <li><Link href="/projects/" className="text-fg/90 underline-offset-4 hover:text-fg hover:underline transition-colors text-[1rem] leading-relaxed">Projects</Link></li>
            <li><Link href="/blog/" className="text-fg/90 underline-offset-4 hover:text-fg hover:underline transition-colors text-[1rem] leading-relaxed">Blog</Link></li>
            <li><Link href="/hiking/" className="text-fg/90 underline-offset-4 hover:text-fg hover:underline transition-colors text-[1rem] leading-relaxed">Hiking</Link></li>
            <li><Link href="/lab/" className="text-fg/90 underline-offset-4 hover:text-fg hover:underline transition-colors text-[1rem] leading-relaxed">Lab</Link></li>
            <li><Link href="/lab/circuit-sim/" className="text-fg/90 underline-offset-4 hover:text-fg hover:underline transition-colors text-[1rem] leading-relaxed">Circuit Sim</Link></li>
            <li><Link href="/about/" className="text-fg/90 underline-offset-4 hover:text-fg hover:underline transition-colors text-[1rem] leading-relaxed">About</Link></li>
            <li><Link href="/now/" className="text-fg/90 underline-offset-4 hover:text-fg hover:underline transition-colors text-[1rem] leading-relaxed">Now</Link></li>
            <li><Link href="/uses/" className="text-fg/90 underline-offset-4 hover:text-fg hover:underline transition-colors text-[1rem] leading-relaxed">Uses</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="type-label text-muted mb-3">Connect</h3>
          <ul className="flex flex-col gap-2">
            <li><a href="https://github.com/castlemilk" target="_blank" rel="noreferrer" className="text-fg/90 underline-offset-4 hover:text-fg hover:underline transition-colors text-[1rem] leading-relaxed">GitHub</a></li>
            <li><a href="https://www.linkedin.com/in/benebsworth/" target="_blank" rel="noreferrer" className="text-fg/90 underline-offset-4 hover:text-fg hover:underline transition-colors text-[1rem] leading-relaxed">LinkedIn</a></li>
            <li><a href="/feed.xml" target="_blank" rel="noreferrer" className="text-fg/90 underline-offset-4 hover:text-fg hover:underline transition-colors text-[1rem] leading-relaxed">RSS Feed</a></li>
          </ul>
        </div>
        <div>
          <h3 className="type-label text-muted mb-3">Lab</h3>
          <ul className="flex flex-col gap-2">
            <li><Link href="/lab/" className="text-fg/90 underline-offset-4 hover:text-fg hover:underline transition-colors text-[1rem] leading-relaxed">All experiments</Link></li>
            <li><Link href="/lab/circuit-sim/" className="text-fg/90 underline-offset-4 hover:text-fg hover:underline transition-colors text-[1rem] leading-relaxed">
              <span className="inline-block mr-1.5 text-[var(--color-accent)]">⚡</span>Circuit Simulator
            </Link></li>
            <li><Link href="/lab/llm-benchmark/" className="text-fg/90 underline-offset-4 hover:text-fg hover:underline transition-colors text-[1rem] leading-relaxed">
              <span className="inline-block mr-1.5 text-[var(--color-accent)]">◧</span>LLM Benchmark
            </Link></li>
          </ul>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <span className="type-meta">© {new Date().getFullYear()} Ben Ebsworth</span>
      </div>
    </footer>
  )
}
