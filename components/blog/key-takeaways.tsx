import { HandUnderline } from '@/components/mdx/hand-underline'

/** Authored frontmatter insights, unchanged; a ruled reading note, not a dashboard card. */
export function KeyTakeaways({ items }: { items: string[]; accent: string }) {
  if (!items?.length) return null
  return <aside aria-label="Key takeaways" className="not-prose folio-takeaways">
    <h2><HandUnderline>Key takeaways</HandUnderline></h2>
    <ul>{items.map((text,index)=><li key={index}>{text}</li>)}</ul>
  </aside>
}
