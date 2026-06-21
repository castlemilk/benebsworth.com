import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import type { BlogPost, Project } from '@/lib/gen/content'

const BLOG_DIR = path.join(process.cwd(), 'content/blog')
const PROJECT_DIR = path.join(process.cwd(), 'content/projects')

function require_(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`content validation: ${msg}`)
}

export type LoadedPost = BlogPost & {
  body: string
  release: boolean
  dateModified?: string
  /** Skimmable insights for the post header + JSON-LD abstract + .md siblings. */
  takeaways?: string[]
  /** Plain-prose word count (code/math/JSX stripped) — drives readingTime + SEO. */
  wordCount: number
  /** Estimated read time in minutes (≈230 wpm), min 1. */
  readingTime: number
}

/** Minimal post shape for list/feed views — excludes the heavy `body` MDX source. */
export type BlogPostSummary = Pick<LoadedPost, 'slug' | 'title' | 'date' | 'description' | 'tags' | 'heroImage' | 'readingTime'>

/**
 * Word count over the rendered prose only — strip fenced code, JSX/component
 * tags, and KaTeX math so the number reflects reading effort (and the SEO
 * content-depth signal), not markup. Computed once at load so the post page,
 * cards, feed and JSON-LD all agree.
 */
function readingStats(body: string): { wordCount: number; readingTime: number } {
  const wordCount = body
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/<[^>]+>/g, ' ')        // JSX / component tags
    .replace(/\$\$[\s\S]*?\$\$/g, ' ') // display math
    .replace(/\$[^$]+\$/g, ' ')      // inline math
    .replace(/[#*_`>~|]/g, ' ')      // markdown punctuation
    .split(/\s+/)
    .filter(Boolean).length
  return { wordCount, readingTime: Math.max(1, Math.round(wordCount / 230)) }
}

/**
 * A post is published iff it is not an explicit draft and its `release`
 * frontmatter flag is not `false`. Legacy posts use `release: false` to keep
 * placeholder/unfinished bodies out of the public site.
 */
export function isPublished(p: LoadedPost): boolean {
  return p.release !== false && !p.draft
}

export function getAllPosts(): LoadedPost[] {
  const slugs = fs.readdirSync(BLOG_DIR).filter((d) =>
    fs.existsSync(path.join(BLOG_DIR, d, 'index.mdx')))
  const posts = slugs.map((slug) => {
    const raw = fs.readFileSync(path.join(BLOG_DIR, slug, 'index.mdx'), 'utf8')
    const { data, content } = matter(raw)
    require_(data.title, `${slug}: missing title`)
    require_(data.date, `${slug}: missing date`)
    const { wordCount, readingTime } = readingStats(content)
    return {
      slug,
      title: String(data.title),
      date: String(data.date),
      description: String(data.description ?? ''),
      tags: (data.tags ?? (typeof data.labels === 'string'
        ? data.labels.split(',').map((t) => t.trim()).filter(Boolean)
        : data.labels) ?? []) as string[],
      heroImage: String(data.heroImage ?? data.hero_image ?? ''),
      // Optional freshness signal. When a post is materially revised, set
      // `dateModified` in frontmatter; otherwise JSON-LD/OG fall back to `date`.
      dateModified: data.dateModified ?? data.date_modified
        ? String(data.dateModified ?? data.date_modified)
        : undefined,
      // Optional skimmable insights — rendered as a "Key takeaways" block.
      takeaways: Array.isArray(data.takeaways) && data.takeaways.length
        ? (data.takeaways as unknown[]).map(String)
        : undefined,
      wordCount,
      readingTime,
      draft: Boolean(data.draft ?? false),
      release: data.release !== false,
      body: content,
    }
  })
  return posts.sort((a, b) => +new Date(b.date) - +new Date(a.date))
}

/** All published posts, newest-first. */
export function getPublishedPosts(): LoadedPost[] {
  return getAllPosts().filter(isPublished)
}

export function getPost(slug: string): LoadedPost | undefined {
  return getAllPosts().find((p) => p.slug === slug)
}

export function getLatestPost(): LoadedPost | null {
  return getPublishedPosts()[0] ?? null
}

export type LoadedProject = Project & { body: string }

export function getAllProjects(): LoadedProject[] {
  const files = fs.readdirSync(PROJECT_DIR).filter((f) => f.endsWith('.mdx'))
  const projs = files.map((f) => {
    const raw = fs.readFileSync(path.join(PROJECT_DIR, f), 'utf8')
    const { data, content } = matter(raw)
    require_(data.slug, `${f}: missing slug`)
    require_(data.title, `${f}: missing title`)
    return {
      slug: String(data.slug),
      title: String(data.title),
      description: String(data.description ?? ''),
      image: String(data.image ?? ''),
      link: data.link ?? undefined,
      technologies: (data.technologies ?? []) as Project['technologies'],
      order: Number(data.order ?? 99),
      body: content,
    }
  })
  return projs.sort((a, b) => a.order - b.order)
}

export function getProject(slug: string): LoadedProject | undefined {
  return getAllProjects().find((p) => p.slug === slug)
}
