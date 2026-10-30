/** Discover authored sections, not figure/control labels or recommendations. */
export function getArticleHeadings(root: ParentNode): HTMLHeadingElement[] {
  const seen = new Set<string>()
  return Array.from(root.querySelectorAll<HTMLHeadingElement>('article h2[id], article h3[id]'))
    .filter(heading => !heading.closest('figure, [data-interactive-study], [data-pagefind-ignore]'))
    .filter(heading => heading.id.trim().length > 0 && (heading.textContent ?? '').trim().length > 0)
    .filter(heading => {
      // Overlapping article trees can briefly expose the same destination twice.
      // Keep DOM order, matching native anchors, without rewriting authored IDs.
      if (seen.has(heading.id)) return false
      seen.add(heading.id)
      return true
    })
}
