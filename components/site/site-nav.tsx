import Link from 'next/link'
import { ThemeToggle } from '@/components/theme/theme-toggle'

export function SiteNav() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-7 text-sm sm:px-8">
      <Link href="/" className="font-display text-[1.05rem] font-bold tracking-tight">
        ben ebsworth
      </Link>
      <div className="flex items-center gap-4">
        <nav className="flex gap-6 font-mono text-[0.78rem] uppercase tracking-[0.18em] text-muted">
          <Link href="/projects/" className="hover:text-project">projects</Link>
          <Link href="/blog/" className="hover:text-blog">blog</Link>
          <Link href="/about/" className="hover:text-about">about</Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  )
}
