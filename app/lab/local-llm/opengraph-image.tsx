import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'

export const dynamic = 'force-static'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'Local LLM — M5 Max 128GB · Ben Ebsworth'

/**
 * Share card for the local LLM benchmark. Mirrors the llm-benchmark card
 * but highlights on-device throughput: 132 tok/s (Gemma 4B) / 97.4 avg (Qwen3 8B) on M5 Max.
 */
export default function Image() {
  return renderOgCard({
    eyebrow: 'benebsworth.com/lab/local-llm',
    title: 'Local LLM — M5 Max 128GB',
    description: 'On-device throughput via Ollama Metal: Gemma 3 4B 132 tok/s · Qwen3 8B 97.4 avg · Gemma 12B/27B, Qwen 14B. TTFT, prompt eval, cost $0.',
    footer: 'M5 Max · 128GB · Ollama Metal · 5 models · 7 tasks',
    accent: '#10b981',
  })
}
