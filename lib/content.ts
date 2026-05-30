import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import type { BlogPost, Project } from '@/lib/gen/content'

const BLOG_DIR = path.join(process.cwd(), 'content/blog')
const PROJECT_DIR = path.join(process.cwd(), 'content/projects')

function require_(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`content validation: ${msg}`)
}

export type LoadedPost = BlogPost & { body: string }

export function getAllPosts(): LoadedPost[] {
  const slugs = fs.readdirSync(BLOG_DIR).filter((d) =>
    fs.existsSync(path.join(BLOG_DIR, d, 'index.mdx')))
  const posts = slugs.map((slug) => {
    const raw = fs.readFileSync(path.join(BLOG_DIR, slug, 'index.mdx'), 'utf8')
    const { data, content } = matter(raw)
    require_(data.title, `${slug}: missing title`)
    require_(data.date, `${slug}: missing date`)
    return {
      slug,
      title: String(data.title),
      date: String(data.date),
      description: String(data.description ?? ''),
      tags: (data.tags ?? []) as string[],
      heroImage: String(data.heroImage ?? data.hero_image ?? ''),
      draft: Boolean(data.draft ?? false),
      body: content,
    }
  })
  return posts.sort((a, b) => +new Date(b.date) - +new Date(a.date))
}

export function getPost(slug: string): LoadedPost | undefined {
  return getAllPosts().find((p) => p.slug === slug)
}

export function getLatestPost(): LoadedPost | null {
  return getAllPosts().find((p) => !p.draft) ?? null
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
