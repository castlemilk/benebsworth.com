import Link from 'next/link'

export type Crumb = { label: string; href?: string }

/**
 * Hierarchical breadcrumb trail shown at the top of every section/detail view,
 * giving a consistent way back to Home (and the parent section). Ancestors are
 * links; the final crumb is the current page (not linked, truncated so a long
 * post title can't blow out the line). Matches the site's mono / uppercase /
 * tracked label treatment.
 */
export function Breadcrumb({ items, className = '' }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted">
        {items.map((it, i) => {
          const last = i === items.length - 1
          return (
            <li key={i} className="flex min-w-0 items-center gap-x-2.5">
              {it.href && !last ? (
                <Link href={it.href} className="shrink-0 transition-colors hover:text-fg">
                  {it.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? 'page' : undefined}
                  className={last ? 'block max-w-[55vw] truncate text-fg/80 sm:max-w-sm' : 'shrink-0'}
                >
                  {it.label}
                </span>
              )}
              {!last && (
                <span aria-hidden className="shrink-0 text-muted/45">
                  /
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
