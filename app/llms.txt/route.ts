import { getPublishedPosts } from '@/lib/content'
import { LAB_EFFECTS, CATEGORIES } from '@/lib/lab/registry'
import { topicFor } from '@/lib/topics'
export const dynamic = 'force-static'

/**
 * llms.txt — a machine-readable site manifest. The spec is from
 * https://llmstxt.org/ — short version: it's a plain-text file that
 * gives LLMs (and AI crawlers) a curated, terse index of the site.
 *
 * Convention (per llmstxt.org):
 *   - H1 with the site name
 *   - A blockquote with a one-paragraph summary (in the LLM's voice)
 *   - Sections starting with H2
 *   - Each section is a list of `[name](url): description` lines
 *
 * The format is intentionally simple. We are not trying to be clever;
 * the goal is to give an LLM a quick "what is this site" + "what are
 * the canonical URLs" without having to crawl and parse the homepage.
 */
export function GET() {
  const base = 'https://benebsworth.com'
  const posts = getPublishedPosts()
  // Surface the most recent N posts in the manifest; LLM context is
  // precious, and old posts are reachable via /blog/.
  const RECENT_POSTS = 12
  const recent = posts.slice(0, RECENT_POSTS)
  const labsByCategory = CATEGORIES.map((cat) => ({
    ...cat,
    effects: LAB_EFFECTS.filter((e) => e.category === cat.key),
  }))

  const lines: string[] = []
  lines.push('# Ben Ebsworth')
  lines.push('')
  lines.push(
    '> Software, platform & hardware engineer based in Melbourne, Australia. ' +
      'Writing on Kubernetes, distributed systems, electrical engineering, ' +
      'signal processing, and AI. The site also hosts an interactive lab of ' +
      'parameterised simulations — each lab is a working canvas-based model ' +
      'with live controls, on a wide range of physics, math, and engineering topics.',
  )
  lines.push('')
  lines.push('A plain-Markdown sibling of every blog post is available at `/blog/<slug>/index.md`.')
  lines.push('')
  lines.push('## Main')
  lines.push('')
  for (const u of [
    { name: 'Home', url: '/', desc: 'Landing page with the latest post and a random lab matrix.' },
    { name: 'About', url: '/about/', desc: 'Career timeline, talks, skills, certifications.' },
    { name: 'Projects', url: '/projects/', desc: 'Open-source and side projects.' },
    { name: 'Blog', url: '/blog/', desc: 'Long-form writing with interactive figures.' },
    { name: 'Lab', url: '/lab/', desc: '30+ interactive canvas simulations, parameterised.' },
  ]) {
    lines.push(`- [${u.name}](${base}${u.url}): ${u.desc}`)
  }
  lines.push('')
  lines.push(`## Recent posts (${recent.length} of ${posts.length})`)
  lines.push('')
  for (const p of recent) {
    const t = topicFor(p)
    lines.push(
      `- [${p.title}](${base}/blog/${p.slug}/) [${t.label}]: ${p.description}`,
    )
  }
  lines.push('')
  lines.push('## Lab effects (by category)')
  lines.push('')
  for (const cat of labsByCategory) {
    if (cat.effects.length === 0) continue
    lines.push(`### ${cat.label} (${cat.effects.length})`)
    lines.push('')
    for (const e of cat.effects) {
      lines.push(`- [${e.title}](${base}/lab/${e.slug}/): ${e.blurb}`)
    }
    lines.push('')
  }
  lines.push('## Feeds')
  lines.push('')
  lines.push('- [RSS feed](https://benebsworth.com/feed.xml)')
  lines.push('- [Sitemap](https://benebsworth.com/sitemap.xml)')
  lines.push('')
  lines.push('## Contact')
  lines.push('')
  lines.push('- GitHub: https://github.com/castlemilk')
  lines.push('- LinkedIn: https://www.linkedin.com/in/benebsworth/')
  lines.push('- Email: ben.ebsworth@gmail.com')
  lines.push('')
  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
