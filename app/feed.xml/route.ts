import { getPublishedPosts } from '@/lib/content'
import { topicFor } from '@/lib/topics'
export const dynamic = 'force-static'

/**
 * RSS 2.0 feed. The feed is the canonical "what's new on this site"
 * signal for both human subscribers and aggregators (Feedly, Inoreader,
 * RSS Bridge, etc.). Each item includes:
 *
 *   - title, link, guid (stable identifier)
 *   - pubDate in RFC-822 form
 *   - description (one-paragraph summary, escaped)
 *   - category per post tag (RSS standard)
 *   - author (Dublin Core namespace)
 *
 * The body is the post's MDX source with the frontmatter stripped,
 * NOT a fully-rendered HTML. The MDX source preserves the math,
 * code blocks, and component references for any reader that
 * understands MDX. Plain-text readers see the markdown as-is.
 *
 * Note: we deliberately don't include `content:encoded` with the
 * fully-rendered HTML. The feed is a teaser, not a content mirror;
 * the canonical URL is the post itself, and the LLM-readable
 * `.md` sibling (at /blog/<slug>/index.md) is the markdown mirror.
 */
export function GET() {
  const base = 'https://benebsworth.com'
  const items = getPublishedPosts()
    .map((p) => {
      const topic = topicFor(p)
      // Strip YAML frontmatter if any leaked into body.
      const body = p.body.replace(/^---[\s\S]*?---\s*/m, '')
      return {
        title: p.title,
        link: `${base}/blog/${p.slug}/`,
        guid: `${base}/blog/${p.slug}/`,
        pubDate: new Date(p.date).toUTCString(),
        description: p.description,
        author: 'ben.ebsworth@gmail.com (Ben Ebsworth)',
        topic: topic.label,
        tags: p.tags,
        body,
      }
    })
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>Ben Ebsworth</title>
  <link>${base}</link>
  <description>Software, platform &amp; hardware engineer · Writing on Kubernetes, distributed systems, electrical engineering, and AI · Melbourne, Australia</description>
  <language>en-AU</language>
  <copyright>© ${new Date().getFullYear()} Ben Ebsworth</copyright>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml"/>
  <image>
    <url>${base}/icon.svg</url>
    <title>Ben Ebsworth</title>
    <link>${base}</link>
  </image>
  ${items
    .map(
      (p) => `<item>
    <title>${escapeXml(p.title)}</title>
    <link>${p.link}</link>
    <guid isPermaLink="true">${p.guid}</guid>
    <pubDate>${p.pubDate}</pubDate>
    <dc:creator>${escapeXml(p.author)}</dc:creator>
    <description>${escapeXml(p.description)}</description>
    <category>${escapeXml(p.topic)}</category>
    ${p.tags.map((t) => `<category>${escapeXml(t)}</category>`).join('\n    ')}
  </item>`,
    )
    .join('\n  ')}
</channel>
</rss>`
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
