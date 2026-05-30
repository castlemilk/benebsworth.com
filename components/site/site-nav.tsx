import Link from 'next/link'

export function SiteNav() {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center justify-between p-6 text-sm">
      <Link href="/" className="font-bold tracking-wide">ben ebsworth</Link>
      <nav className="flex gap-5 uppercase tracking-wider text-muted">
        <Link href="/projects/" className="hover:text-project">projects</Link>
        <Link href="/blog/" className="hover:text-blog">blog</Link>
        <Link href="/about/" className="hover:text-about">about</Link>
      </nav>
    </header>
  )
}
