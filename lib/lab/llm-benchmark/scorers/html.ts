import type { BenchmarkTask, Scorer } from '../types'

function hasBalancedTag(html: string, tag: string): boolean {
  const open = new RegExp(`<${tag}\\b`, 'gi')
  const close = new RegExp(`</${tag}>`, 'gi')
  const opens = html.match(open)?.length ?? 0
  const closes = html.match(close)?.length ?? 0
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
    if (lower.includes('<!doctype html') || lower.includes('<html')) score += 15
    if (hasBalancedTag(html, 'html')) score += 15
    if (hasBalancedTag(html, 'body')) score += 10

    // Common task tags
    if (hasBalancedTag(html, 'script')) score += 15
    if (lower.includes('<canvas')) {
      if (hasBalancedTag(html, 'canvas')) score += 10
    }
    if (lower.includes('<style')) {
      if (hasBalancedTag(html, 'style')) score += 5
    }

    // Obvious broken patterns
    const hasBrokenPatterns =
      /<<|>>/.test(html) ||
      /<script\b[^>]*>([\s\S]*?)(?=<script\b|<\/body>|<\/html>|$)(?!.*?<\/script>)/i.test(html) ||
      /<canvas\b[^>]*>([\s\S]*?)(?=<canvas\b|<\/body>|<\/html>|$)(?!.*?<\/canvas>)/i.test(html)
    if (!hasBrokenPatterns) score += 15

    // Looks like a runnable page
    if (lower.includes('</html>')) score += 10

    return Math.min(100, score)
  },
}
