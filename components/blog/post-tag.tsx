import type { CSSProperties } from 'react'
import { topicFor, TOPIC } from '@/lib/topics'
import { TopicGlyph } from './topic-marker'

/** Non-interactive inside linked cards. Raw authored tags remain searchable. */
export function PostTag({ tag }: { tag: string }) {
  const topic = topicFor({ slug: '', tags: [tag] })
  const known = topic !== TOPIC.technology
  return <span className="topic-lozenge" data-tag={tag}
    style={{ '--ink': known ? topic.accent : 'var(--muted)' } as CSSProperties}>
    {known ? <TopicGlyph topic={topic} size={14} /> : <span aria-hidden="true" className="topic-lozenge__dot" />}
    <span>{tag}</span>
  </span>
}
