import { getPublishedPosts } from '@/lib/content'
export const dynamic = 'force-static'

export function GET() {
  const base = 'https://benebsworth.com'
  const items = getPublishedPosts().map((p) => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${base}/blog/${p.slug}/</link>
      <guid>${base}/blog/${p.slug}/</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${escapeXml(p.description)}</description>
    </item>`).join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Ben Ebsworth</title><link>${base}</link>
  <description>A playground for development and writing material.</description>${items}
</channel></rss>`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } })
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!))
}
