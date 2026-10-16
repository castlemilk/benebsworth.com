import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/components/seo/json-ld'
import { getPublishedPosts, getAllProjects } from '@/lib/content'
import { hikes } from '@/content/hiking'
import { LAB_EFFECTS } from '@/lib/lab/registry'
import {
  BENCHMARK_CATEGORIES,
  BENCHMARK_TASKS,
  BENCHMARK_MODELS,
} from '@/lib/lab/llm-benchmark/registry'
import {
  categoryPath,
  taskPath,
  modelIndexPath,
  modelPath,
} from '@/lib/lab/llm-benchmark/nav'
import { ALL_SUMMARIES } from '@/lib/lab/harness-eval/results'
import {
  harnessModelPath,
  harnessModelIndexPath,
  harnessSuitePath,
  harnessTaskPath,
} from '@/lib/lab/harness-eval/nav'
import { HARNESS_SUITES, HARNESS_TASKS } from '@/lib/lab/harness-eval/registry'

export const dynamic = 'force-static'

type SitemapEntry = MetadataRoute.Sitemap[number]

/**
 * Keep every sitemap URL on the public apex domain. Relative paths are
 * resolved here instead of interpolating hostnames throughout the sitemap,
 * so a staging hostname or a future subdomain cannot leak into production
 * crawl hints by accident.
 */
function absoluteUrl(pathname: string): string {
  if (!pathname.startsWith('/') || pathname.startsWith('//')) {
    throw new Error(`sitemap: expected a site-relative path, got ${pathname}`)
  }
  const url = new URL(pathname, SITE_URL)
  if (url.origin !== SITE_URL) {
    throw new Error(`sitemap: URL escaped the canonical origin: ${url.toString()}`)
  }
  return url.toString()
}

function page(pathname: string, details: Omit<SitemapEntry, 'url'> = {}): SitemapEntry {
  return { url: absoluteUrl(pathname), ...details }
}

/**
 * Sitemap entries should describe canonical HTML pages, not feeds, robots,
 * Markdown alternates, admin tools, or generated asset files. `lastModified`
 * is included only when the content has a real publication/revision date;
 * using the build timestamp would make every page look freshly changed on
 * every deploy.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    page('/', { changeFrequency: 'weekly', priority: 1 }),
    page('/about/', { changeFrequency: 'monthly', priority: 0.6 }),
    page('/blog/', { changeFrequency: 'weekly', priority: 0.9 }),
    page('/hiking/', { changeFrequency: 'monthly', priority: 0.7 }),
    page('/now/', { changeFrequency: 'monthly', priority: 0.5 }),
    page('/projects/', { changeFrequency: 'monthly', priority: 0.7 }),
    page('/uses/', { changeFrequency: 'yearly', priority: 0.4 }),
    page('/vectors/', { changeFrequency: 'monthly', priority: 0.6 }),
    page('/lab/', { changeFrequency: 'weekly', priority: 0.9 }),
    page('/lab/black-hole-sim/', { changeFrequency: 'monthly', priority: 0.7 }),
    page('/lab/carbon/', { changeFrequency: 'monthly', priority: 0.7 }),
    page('/lab/circuit-sim/', { changeFrequency: 'monthly', priority: 0.7 }),
    page('/lab/cost-dashboard/', { changeFrequency: 'monthly', priority: 0.6 }),
    page('/lab/harness-eval/', { changeFrequency: 'monthly', priority: 0.8 }),
    page('/lab/llm-benchmark/', { changeFrequency: 'monthly', priority: 0.8 }),
    page('/lab/local-llm/', { changeFrequency: 'monthly', priority: 0.6 }),
    page('/lab/universe-scale/', { changeFrequency: 'monthly', priority: 0.7 }),
    page(harnessModelIndexPath(), { changeFrequency: 'monthly', priority: 0.5 }),
  ]

  const posts = getPublishedPosts().map((post) =>
    page(`/blog/${post.slug}/`, {
      lastModified: new Date(post.dateModified ?? post.date),
      changeFrequency: 'monthly',
      priority: 0.8,
    }),
  )

  const projects = getAllProjects().map((project) =>
    page(`/projects/${project.slug}/`, {
      changeFrequency: 'monthly',
      priority: 0.6,
    }),
  )

  // These three effects have dedicated route files with richer page copy.
  // The remaining effects are rendered by app/lab/[slug]/page.tsx.
  const dedicatedLabSlugs = new Set(['black-hole-sim', 'circuit-sim', 'universe-scale'])
  const labs = LAB_EFFECTS.filter((effect) => !dedicatedLabSlugs.has(effect.slug)).map((effect) =>
    page(`/lab/${effect.slug}/`, {
      changeFrequency: 'monthly',
      priority: 0.7,
    }),
  )

  const hikePages = hikes.map((hike) =>
    page(`/hiking/${hike.slug}/`, {
      changeFrequency: 'monthly',
      priority: 0.6,
    }),
  )

  const benchmarkPages = [
    ...BENCHMARK_CATEGORIES.map((category) =>
      page(categoryPath(category), { changeFrequency: 'monthly', priority: 0.6 }),
    ),
    ...BENCHMARK_TASKS.map((task) =>
      page(taskPath(task), { changeFrequency: 'monthly', priority: 0.7 }),
    ),
    page(modelIndexPath(), { changeFrequency: 'monthly', priority: 0.5 }),
    ...BENCHMARK_MODELS.map((model) =>
      page(modelPath(model), { changeFrequency: 'monthly', priority: 0.5 }),
    ),
  ]

  const harnessPages = [
    ...HARNESS_SUITES.map((suite) =>
      page(harnessSuitePath(suite.slug), { changeFrequency: 'monthly', priority: 0.6 }),
    ),
    ...HARNESS_TASKS.map((task) =>
      page(harnessTaskPath(task.suite, task.id), { changeFrequency: 'monthly', priority: 0.6 }),
    ),
    ...ALL_SUMMARIES.map((summary) =>
      page(harnessModelPath(summary.model.id), { changeFrequency: 'monthly', priority: 0.5 }),
    ),
  ]

  // Registry overlap is easy to introduce when a page graduates to a
  // dedicated route. Keep the output valid even if that happens again.
  const seen = new Set<string>()
  return [...staticPages, ...posts, ...projects, ...labs, ...hikePages, ...benchmarkPages, ...harnessPages].filter(
    (entry) => {
      if (seen.has(entry.url)) return false
      seen.add(entry.url)
      return true
    },
  )
}
