import type { MetadataRoute } from 'next'
import { getPublishedPosts, getAllProjects } from '@/lib/content'
import { LAB_EFFECTS } from '@/lib/lab/registry'
import { hikes } from '@/content/hiking'
import {
  BENCHMARK_CATEGORIES,
  BENCHMARK_TASKS,
  BENCHMARK_MODELS,
} from '@/lib/lab/llm-benchmark/registry'
import {
  benchmarkPath,
  categoryPath,
  taskPath,
  modelIndexPath,
  modelPath,
} from '@/lib/lab/llm-benchmark/nav'
export const dynamic = 'force-static'

/**
 * Sitemap. Includes every published post, every project, every lab
 * effect, the LLM-benchmark section (landing, categories, tasks, models),
 * every hike, plus the static pages. `changeFrequency` and `priority` are
 * hints for crawlers (Google uses them as soft signals, not strict
 * directives). The home page and the lab index are the highest-priority
 * destinations; individual posts and labs are next.
 *
 * `lastmod` is a real ISO 8601 timestamp only where we have one:
 *   - posts: the post's `date` field
 *   - everything else (projects, lab effects, hikes, benchmark pages,
 *     static pages): fall back to the build time (`now`). These are mostly
 *     static, so the build date is a stable, honest signal.
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
    { url: `${base}/hiking/`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
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
  const hikePages = hikes.map((h) => ({
    url: `${base}/hiking/${h.slug}/`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))
  // ── LLM Benchmark (/lab/llm-benchmark/**) ──────────────────────────────
  // The landing, one page per category, one per task, the models index, and
  // one per model. Path helpers already include the leading /lab/llm-benchmark/
  // and the trailing slash. (Note: /lab/circuit-sim/ and /lab/universe-scale/
  // are NOT added here — they are LAB_EFFECTS entries already emitted above via
  // `labs`, so listing them again would produce duplicate <loc> URLs.)
  const benchmarkPages = [
    { url: `${base}${benchmarkPath()}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8 },
    ...BENCHMARK_CATEGORIES.map((c) => ({
      url: `${base}${categoryPath(c)}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...BENCHMARK_TASKS.map((t) => ({
      url: `${base}${taskPath(t)}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${base}${modelIndexPath()}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 },
    ...BENCHMARK_MODELS.map((m) => ({
      url: `${base}${modelPath(m)}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ]
  return [...staticUrls, ...posts, ...projects, ...labs, ...hikePages, ...benchmarkPages]
}
