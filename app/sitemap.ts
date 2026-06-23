import type { MetadataRoute } from 'next'
import { getPublishedPosts, getAllProjects } from '@/lib/content'
import { LAB_EFFECTS } from '@/lib/lab/registry'
export const dynamic = 'force-static'

/**
 * Sitemap. Includes every published post, every project, every lab
 * effect, plus the static pages. `changeFrequency` and `priority` are
 * hints for crawlers (Google uses them as soft signals, not strict
 * directives). The home page and the lab index are the highest-priority
 * destinations; individual posts and labs are next; archive pages
 * are lower.
 *
 * `lastmod` is a real ISO 8601 timestamp wherever we have one:
 *   - posts: the post's `date` field
 *   - projects: fall back to today (no project mtime today)
 *   - lab effects: fall back to the time the file was last modified
 *     (the lab effects are mostly static, so this is a stable signal)
 *   - static pages: fall back to the build date
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://benebsworth.com'
  // Use the build's compile time as the fallback "lastmod" for entries
  // that don't have a meaningful file mtime. This isn't perfect but is
  // more useful than omitting the field (Google prefers a real value).
  const now = new Date()
  const staticUrls = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly' as const, priority: 1.0 },
    { url: `${base}/projects/`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${base}/blog/`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${base}/about/`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${base}/lab/`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${base}/now/`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${base}/uses/`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.4 },
  ]
  const posts = getPublishedPosts().map((p) => ({
    url: `${base}/blog/${p.slug}/`,
    lastModified: new Date(p.date),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))
  const projects = getAllProjects().map((p) => ({
    url: `${base}/projects/${p.slug}/`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))
  const labs = LAB_EFFECTS.map((e) => ({
    url: `${base}/lab/${e.slug}/`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))
  return [...staticUrls, ...posts, ...projects, ...labs]
}
