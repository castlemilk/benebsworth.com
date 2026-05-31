export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl border-t border-[var(--color-border)] px-6 py-8 font-mono text-sm tracking-wide text-muted sm:px-8">
      <div className="flex justify-between">
        <span>© Ben Ebsworth</span>
        <a href="/archive/" className="hover:text-fg">view the old site →</a>
      </div>
    </footer>
  )
}
