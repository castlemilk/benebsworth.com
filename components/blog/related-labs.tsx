import Link from 'next/link'
import { tagColor } from '@/lib/tag-colors'
import { LAB_EFFECTS, type LabEntry } from '@/lib/lab/registry'

/**
 * <RelatedLabs> — a small footer block on a blog post that links to lab
 * effects that overlap in topic with the post. Finds up to N effects
 * whose `tags` overlap with the post's `tags` (or `labels`).
 *
 * Falls back to 3 random effects if no tag match is found, so the block
 * always renders something useful.
 *
 * Used at the end of any blog post that wants to point the reader at
 * the interactive lab. A typical case: a post on the Smith chart links
 * to `smith-chart`, `conformal-grid`, and `wave-superposition`.
 */
export function RelatedLabs({
  tags = [],
  labels = [],
  limit = 3,
  variant = 'default',
}: {
  /** Post tags — match against lab effect tags (case-insensitive substring). */
  tags?: string[]
  /** Post labels — also match against lab effect tags. */
  labels?: string[]
  /** Maximum number of labs to show. Default 3. */
  limit?: number
  /** 'default' for the standard post-footer block. 'inline' for compact use in about pages. */
  variant?: 'default' | 'inline'
}) {
  const query = [...tags, ...labels].map((s) => s.toLowerCase().trim()).filter(Boolean)

  // Score each effect by tag overlap with the post. An effect is a
  // candidate if any of its tags appears (case-insensitive) in the post's
  // query strings, OR if the post's labels match a category the effect
  // belongs to. Tie-break by alphabetic title for stable output.
  //
  // Label→category bridge: the post's labels (e.g. "physics",
  // "electrical engineering") are broader than the effect's tags
  // (e.g. "rf", "quantum"). We map common labels to category
  // memberships so a post tagged "physics" surfaces physics effects
  // even if the specific tags don't match.
  const LABEL_TO_CATEGORIES: Record<string, string[]> = {
    'physics': ['physics', 'maths'],
    'maths': ['maths'],
    'mathematics': ['maths'],
    'engineering': ['engineering'],
    'electrical engineering': ['engineering'],
    'electrical': ['engineering'],
    'signal processing': ['engineering'],
    'dsp': ['engineering'],
    'algorithms': ['maths'],
    'machine-learning': ['ai'],
    'ml': ['ai'],
    'deep-learning': ['ai'],
    'ai': ['ai'],
    'neural': ['ai'],
    'transformer': ['ai'],
    'art': ['art'],
  }
  const wantedCategories = new Set<string>()
  for (const q of query) {
    const cats = LABEL_TO_CATEGORIES[q]
    if (cats) cats.forEach((c) => wantedCategories.add(c))
  }

  const scored: Array<{ entry: LabEntry; score: number }> = LAB_EFFECTS
    .map((entry) => {
      const entryTags = entry.tags.map((t) => t.toLowerCase())
      const tagScore = query.reduce((acc, q) => {
        return acc + (entryTags.some((t) => t.includes(q) || q.includes(t)) ? 1 : 0)
      }, 0)
      const categoryScore = wantedCategories.has(entry.category) ? 1 : 0
      return { entry, score: tagScore + categoryScore }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))

  let chosen: LabEntry[]
  if (scored.length >= limit) {
    chosen = scored.slice(0, limit).map((s) => s.entry)
  } else {
    // Pad with random effects that *aren't* already in the scored list
    // so we always show the requested number of cards. When the post
    // resolved to specific categories (e.g. an AI post → 'ai'), restrict
    // the fillers to those categories too — so an attention post shows
    // its sibling AI labs rather than unrelated random effects.
    const chosenSet = new Set(scored.map((s) => s.entry.slug))
    const fillerPool = wantedCategories.size > 0
      ? LAB_EFFECTS.filter((e) => !chosenSet.has(e.slug) && wantedCategories.has(e.category))
      : LAB_EFFECTS.filter((e) => !chosenSet.has(e.slug))
    // Stable random: shuffle by hash of slug + day (changes daily, but
    // stable within a day so the layout doesn't flicker on every page
    // load).
    const day = Math.floor(Date.now() / 86_400_000)
    const fillersSorted = [...fillerPool].sort((a, b) => {
      const ah = hash(a.slug + day)
      const bh = hash(b.slug + day)
      return ah - bh
    })
    chosen = [...scored.map((s) => s.entry), ...fillersSorted].slice(0, limit)
    // Safety net: if category restriction produced nothing (e.g. a
    // category with no labs yet), fall back to the top random effects so
    // the section never renders empty.
    if (chosen.length === 0) {
      chosen = [...LAB_EFFECTS].slice(0, limit)
    }
  }

  if (variant === 'inline') {
    return (
      <div className="not-prose mt-8 flex flex-wrap items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted">
        <span className="text-fg/60">Try in the lab:</span>
        {chosen.map((e) => (
          <Link
            key={e.slug}
            href={`/lab/${e.slug}/`}
            className="rounded border border-fg/15 bg-fg/5 px-2 py-1 text-fg/80 transition-colors hover:border-fg/30 hover:bg-fg/10 hover:text-fg/95"
          >
            {e.title}
          </Link>
        ))}
      </div>
    )
  }

  return (
    <section className="not-prose mt-16 border-t border-fg/10 pt-8">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.015em] text-fg/90">
          Try it in the lab
        </h2>
        <Link
          href="/lab/"
          className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted transition-colors hover:text-fg/80"
        >
          All effects →
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {chosen.map((e) => (
          <li key={e.slug}>
            <Link
              href={`/lab/${e.slug}/`}
              className="group/lab flex h-full flex-col gap-2 rounded-lg border border-fg/10 bg-fg/2 p-4 transition-all hover:border-fg/25 hover:bg-fg/5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-semibold text-fg/90 group-hover/lab:text-fg">
                  {e.title}
                </h3>
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-fg/40">
                  {e.category}
                </span>
              </div>
              <p className="font-sans text-sm leading-5 text-fg/65">{e.blurb}</p>
              <div className="mt-auto flex flex-wrap gap-1 pt-2">
                {e.tags.slice(0, 3).map((t) => {
                  const c = tagColor(t)
                  return (
                    <span
                      key={t}
                      className="accent-ink rounded-full border px-1.5 py-0.5 font-mono text-[0.5rem] uppercase leading-none tracking-wider"
                      style={{
                        '--ink': c,
                        borderColor: `color-mix(in srgb, ${c} 40%, transparent)`,
                        backgroundColor: `color-mix(in srgb, ${c} 14%, transparent)`,
                      } as React.CSSProperties}
                    >
                      {t}
                    </span>
                  )
                })}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

// Deterministic 32-bit hash. Used for the day-stable "random" shuffle
// fallback so the same set of fillers appears for 24h before rotating.
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
