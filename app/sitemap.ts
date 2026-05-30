import type { MetadataRoute } from 'next'
import { getPublishedPosts, getAllProjects } from '@/lib/content'
export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://benebsworth.com'
  const staticUrls = ['', '/projects/', '/blog/', '/about/'].map((u) => ({ url: base + u }))
  const posts = getPublishedPosts().map((p) => ({ url: `${base}/blog/${p.slug}/`, lastModified: p.date }))
  const projects = getAllProjects().map((p) => ({ url: `${base}/projects/${p.slug}/` }))
  return [...staticUrls, ...posts, ...projects]
}
