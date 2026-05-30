export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-3xl border-t border-white/10 p-6 font-mono text-xs tracking-wide text-muted">
      <div className="flex justify-between">
        <span>© Ben Ebsworth</span>
        <a href="/archive/" className="hover:text-fg">view the old site →</a>
      </div>
    </footer>
  )
}
