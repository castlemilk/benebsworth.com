import type { MetadataRoute } from 'next'
import { getPublishedPosts, getAllProjects } from '@/lib/content'
import { LAB_EFFECTS } from '@/lib/lab/registry'
export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://benebsworth.com'
  const staticUrls = ['', '/projects/', '/blog/', '/about/', '/lab/'].map((u) => ({ url: base + u }))
  const posts = getPublishedPosts().map((p) => ({ url: `${base}/blog/${p.slug}/`, lastModified: p.date }))
  const projects = getAllProjects().map((p) => ({ url: `${base}/projects/${p.slug}/` }))
  const labs = LAB_EFFECTS.map((e) => ({ url: `${base}/lab/${e.slug}/` }))
  return [...staticUrls, ...posts, ...projects, ...labs]
}
