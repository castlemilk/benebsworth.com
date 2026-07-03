import type { BenchmarkTask, Scorer } from '../types'

function tagCounts(html: string, tag: string): { opens: number; closes: number } {
  const opens = html.match(new RegExp(`<${tag}\\b`, 'gi'))?.length ?? 0
  const closes = html.match(new RegExp(`</${tag}\\s*>`, 'gi'))?.length ?? 0
  return { opens, closes }
}

function hasBalancedTag(html: string, tag: string): boolean {
  const { opens, closes } = tagCounts(html, tag)
  return opens > 0 && opens === closes
}

export const htmlScorer: Scorer = {
  score(output: string, _task: BenchmarkTask): number {
    const html = output.trim()
    if (!html) return 0
    if (!html.startsWith('<')) return 10 // HTML-ish but missing doctype/tag opening

    const lower = html.toLowerCase()
    let score = 0

    // Core single-file HTML structure
    if (lower.includes('<!doctype html') || lower.includes('<html')) score += 10
    if (hasBalancedTag(html, 'html')) score += 10
    if (hasBalancedTag(html, 'body')) score += 10

    // Real behaviour: at least one balanced <script> block
    if (hasBalancedTag(html, 'script')) score += 25

    // Substance: the page carries actual content, not just a skeleton —
    // either script code or visible text once tags are stripped.
    const scriptHasCode = /<script\b[^>]*>\s*\S[\s\S]*?<\/script>/i.test(html)
    const visibleText = html.replace(/<[^>]*>/g, '').trim()
    if (scriptHasCode || visibleText.length > 0) score += 15

    // Cleanliness: tag-balance counting for script/canvas plus a simple
    // doubled-bracket garbage check. (Balance counting instead of lookahead
    // regexes, which false-positived on every well-formed page with a script.)
    const script = tagCounts(html, 'script')
    const canvas = tagCounts(html, 'canvas')
    const hasGarbage = /<<|>>/.test(html)
    if (!hasGarbage && script.opens === script.closes && canvas.opens === canvas.closes) {
      score += 15
    }

    // Looks like a runnable page
    if (lower.includes('</html>')) score += 10

    // Bonus for optional tags being balanced when present
    if (lower.includes('<canvas') && hasBalancedTag(html, 'canvas')) score += 5
    if (lower.includes('<style') && hasBalancedTag(html, 'style')) score += 5

    return Math.min(100, score)
  },
}
