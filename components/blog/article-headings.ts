/** Reading navigation excludes ancillary article regions such as recommendations. */
export function getArticleHeadings(root: ParentNode): HTMLHeadingElement[] {
  return Array.from(root.querySelectorAll<HTMLHeadingElement>('article h2[id], article h3[id]'))
    .filter(heading => !heading.closest('[data-pagefind-ignore]'))
}
