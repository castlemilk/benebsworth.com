import type { CSSProperties } from 'react'

/**
 * Skimmable "Key takeaways" block rendered near the top of a post — distinct
 * from the one-line lede. A few crisp, standalone insights a reader can scan
 * (and an AI engine can lift verbatim as a citable summary). Keyed to the
 * post's topic accent so it reads as part of the editorial system, not a
 * generic callout. Sourced from the post's `takeaways` frontmatter.
 */
export function KeyTakeaways({ items, accent }: { items: string[]; accent: string }) {
  if (!items?.length) return null
  return (
    <aside
      aria-label="Key takeaways"
      className="not-prose mb-10 rounded-xl border p-5 sm:p-6"
      style={
        {
          borderColor: `color-mix(in srgb, ${accent} 28%, transparent)`,
          background: `color-mix(in srgb, ${accent} 6%, transparent)`,
        } as CSSProperties
      }
    >
      <p
        className="font-mono text-[0.62rem] uppercase tracking-[0.24em]"
        style={{ color: accent }}
      >
        Key takeaways
      </p>
      <ul className="mt-3.5 space-y-2.5">
        {items.map((t, i) => (
          <li
            key={i}
            className="flex gap-3 font-sans text-[0.95rem] leading-[1.65] text-fg/85"
          >
            <span
              aria-hidden
              className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
