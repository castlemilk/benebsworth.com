/** Discover authored sections, not figure/control labels or recommendations. */
export function getArticleHeadings(root: ParentNode): HTMLHeadingElement[] {
  return Array.from(root.querySelectorAll<HTMLHeadingElement>('article h2[id], article h3[id]'))
    .filter(heading => !heading.closest('figure, [data-interactive-study], [data-pagefind-ignore]'))
    .filter(heading => heading.id.trim().length > 0 && (heading.textContent ?? '').trim().length > 0)
}
