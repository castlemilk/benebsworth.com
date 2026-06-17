import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl border-t border-[var(--color-border)] px-6 py-12 sm:py-16 font-mono text-sm tracking-wide text-muted sm:px-8">
      <div className="grid gap-10 sm:grid-cols-3 mb-16">
        <div>
          <h3 className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-fg/70 mb-3">Navigate</h3>
          <ul className="flex flex-col gap-2">
            <li><Link href="/" className="text-muted hover:text-fg transition-colors text-[0.8rem] leading-relaxed">Home</Link></li>
            <li><Link href="/projects/" className="text-muted hover:text-fg transition-colors text-[0.8rem] leading-relaxed">Projects</Link></li>
            <li><Link href="/blog/" className="text-muted hover:text-fg transition-colors text-[0.8rem] leading-relaxed">Blog</Link></li>
            <li><Link href="/lab/" className="text-muted hover:text-fg transition-colors text-[0.8rem] leading-relaxed">Lab</Link></li>
            <li><Link href="/lab/circuit-sim/" className="text-muted hover:text-fg transition-colors text-[0.8rem] leading-relaxed">Circuit Sim</Link></li>
            <li><Link href="/about/" className="text-muted hover:text-fg transition-colors text-[0.8rem] leading-relaxed">About</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-fg/70 mb-3">Connect</h3>
          <ul className="flex flex-col gap-2">
            <li><a href="https://github.com/castlemilk" target="_blank" rel="noreferrer" className="text-muted hover:text-fg transition-colors text-[0.8rem] leading-relaxed">GitHub</a></li>
            <li><a href="https://www.linkedin.com/in/benebsworth/" target="_blank" rel="noreferrer" className="text-muted hover:text-fg transition-colors text-[0.8rem] leading-relaxed">LinkedIn</a></li>
            <li><a href="/feed.xml" target="_blank" rel="noreferrer" className="text-muted hover:text-fg transition-colors text-[0.8rem] leading-relaxed">RSS Feed</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-fg/70 mb-3">Lab</h3>
          <ul className="flex flex-col gap-2">
            <li><Link href="/lab/" className="text-muted hover:text-fg transition-colors text-[0.8rem] leading-relaxed">All experiments</Link></li>
            <li><Link href="/lab/circuit-sim/" className="text-muted hover:text-fg transition-colors text-[0.8rem] leading-relaxed">
              <span className="inline-block mr-1.5 text-[var(--color-accent)]">⚡</span>Circuit Simulator
            </Link></li>
          </ul>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <span>© {new Date().getFullYear()} Ben Ebsworth</span>
        <a href="/archive/" className="hover:text-fg transition-colors">view the old site →</a>
      </div>
    </footer>
  )
}
