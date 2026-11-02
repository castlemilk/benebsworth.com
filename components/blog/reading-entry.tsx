import Link from 'next/link'
import type { BlogPostSummary } from '@/lib/content'
import { fmtDate } from '@/lib/format'
import { topicFor } from '@/lib/topics'
import { FolioEntry } from '@/components/blog/folio-entry'

/** A shared, server-rendered summary; heading depth belongs to its reading context. */
export function ReadingEntry({ post, headingLevel, showImage = false }: {
  post: BlogPostSummary
  headingLevel: 'h2' | 'h3'
  showImage?: boolean
}) {
  const topic = topicFor(post)
  const Heading = headingLevel

  return (
    <Link href={`/blog/${post.slug}/`} className="reading-entry__link">
      <FolioEntry accent={topic.accent} className="reading-entry">
        <div className="reading-entry__body">
          <div className="reading-entry__metadata">
            <span className="reading-entry__topic">{topic.label}</span>
            <time dateTime={post.date} className="reading-entry__date">{fmtDate(post.date)}</time>
            <span className="reading-entry__reading-time">· {post.readingTime} min read</span>
          </div>
          <Heading className="reading-entry__title">{post.title}</Heading>
          {post.description && <p className="reading-entry__description">{post.description}</p>}
        </div>
        {showImage && post.heroImage ? (
          <img
            src={post.heroImage}
            alt=""
            loading="lazy"
            decoding="async"
            width={160}
            height={112}
            className="reading-entry__image"
          />
        ) : (
          <span aria-hidden="true" className="reading-entry__arrow">→</span>
        )}
      </FolioEntry>
    </Link>
  )
}
