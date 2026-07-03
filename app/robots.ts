import type { MetadataRoute } from 'next'
export const dynamic = 'force-static'
export default function robots(): MetadataRoute.Robots {
  // No path is disallowed. /admin is deliberately crawlable so crawlers can
  // READ its page-level `robots: { index: false, follow: false }` meta (set in
  // app/admin/page.tsx) — that noindex is the stronger, honoured signal. A
  // robots.txt `disallow: /admin` would block the crawl and thus hide the
  // noindex, which is self-defeating (a disallowed URL can still be indexed
  // from external links, just without its own directives).
  return { rules: { userAgent: '*', allow: '/' }, sitemap: 'https://benebsworth.com/sitemap.xml' }
}
