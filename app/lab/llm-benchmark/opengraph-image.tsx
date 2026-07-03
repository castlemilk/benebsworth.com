import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const dynamic = 'force-static'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt =
  'LLM Benchmark — Ben Ebsworth · Frontier models compared across coding, physics, security, UI, maths, and electronics'

/**
 * Share card for the LLM benchmark section. Next file-convention OG images
 * don't cascade into nested static segments, so the nested benchmark routes
 * reference this image explicitly via `openGraph.images` in their metadata.
 */
export default function Image() {
  return renderOgCard({
    eyebrow: 'benebsworth.com/lab/llm-benchmark',
    title: 'Frontier model benchmark',
    description:
      'Claude · GPT · Gemini · Kimi · Codex compared on runnable tasks — physics, games, security, UI, maths, electronics. Scored for correctness, runtime, and cost.',
    footer: 'Correctness · Runtime · Cost',
    accent: '#6366f1',
  })
}
