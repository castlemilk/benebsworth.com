import fs from 'node:fs'
import path from 'node:path'
import { getPublishedPosts } from '@/lib/content'
import { hikes } from '@/content/hiking'
import type { ItemType } from './storage'

/**
 * Build-time catalogue of manageable items for the /admin CRM: every blog post
 * and every hike, each with the images that already live in the repo (shown
 * read-only). Server-only (reads the filesystem).
 */
export type CrmItem = {
  type: ItemType
  slug: string
  title: string
  subtitle: string
  repoImages: string[] // public URLs of images already committed under public/<type>/<slug>/
}

const IMG_RE = /\.(webp|png|jpe?g|gif|svg|avif)$/i

function repoImages(publicDir: string): string[] {
  try {
    return fs
      .readdirSync(path.join(process.cwd(), 'public', publicDir))
      .filter((f) => IMG_RE.test(f))
      .sort()
      .map((f) => `/${publicDir}/${f}`)
  } catch {
    return []
  }
}

export function getCrmItems(): { blogs: CrmItem[]; hikes: CrmItem[] } {
  const blogs: CrmItem[] = getPublishedPosts().map((p) => ({
    type: 'blog',
    slug: p.slug,
    title: p.title,
    subtitle: p.date ? new Date(p.date).toLocaleDateString('en-AU', { year: 'numeric', month: 'short' }) : '',
    repoImages: repoImages(`blog/${p.slug}`),
  }))
  const hikeItems: CrmItem[] = hikes.map((h) => ({
    type: 'hike',
    slug: h.slug,
    title: h.name,
    subtitle: h.region,
    repoImages: repoImages(`hiking/${h.slug}`),
  }))
  return { blogs, hikes: hikeItems }
}
