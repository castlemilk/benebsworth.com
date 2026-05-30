import Link from 'next/link'

export function SiteNav() {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center justify-between p-6 text-sm">
      <Link href="/" className="font-display text-[0.95rem] font-bold tracking-tight">
        ben ebsworth
      </Link>
      <nav className="flex gap-5 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted">
        <Link href="/projects/" className="hover:text-project">projects</Link>
        <Link href="/blog/" className="hover:text-blog">blog</Link>
        <Link href="/about/" className="hover:text-about">about</Link>
      </nav>
    </header>
  )
}
