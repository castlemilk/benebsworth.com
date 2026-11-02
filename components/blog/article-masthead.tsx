import type { CSSProperties } from 'react'
import type { Topic } from '@/lib/topics'
import { fmtDate } from '@/lib/format'

/** One reading masthead for every post. Presentation never rewrites frontmatter. */
export function ArticleMasthead({ title, description, date, readingTime, tags, topic }: {
  title: string; description?: string; date: string; readingTime: number; tags: string[]; topic: Topic
}) {
  return <header className="folio-post-masthead" style={{ '--ink': topic.accent } as CSSProperties}>
    <div className="folio-post-meta">
      <span className="folio-post-topic accent-ink"><img src={topic.icon} alt="" aria-hidden width={18} height={18}/>{topic.label}</span>
      <span className="folio-post-byline"><time dateTime={date}>{fmtDate(date)}</time><span>· {readingTime} min read · Ben Ebsworth</span></span>
    </div>
    <h1 className="folio-post-title">{title}</h1>
    {description && <p className="folio-post-deck">{description}</p>}
    {tags.length > 0 && <ul className="folio-post-tags" aria-label="Article topics">{tags.slice(0,6).map(tag=><li key={tag}>{tag}</li>)}</ul>}
  </header>
}
