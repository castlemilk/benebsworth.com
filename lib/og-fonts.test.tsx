import { afterEach, describe, expect, it, vi } from 'vitest'
import { ogFonts } from './og-fonts'
import { renderOgCard, renderBlogOgCard } from './og'
import { getPublishedPosts, getAllProjects } from './content'
import { LAB_EFFECTS } from './lab/registry'
import { hikes } from '@/content/hiking'

// next/og logs and swallows fallback fetch failures. Assert the spy, not merely
// successful PNG output, so missing glyphs cannot silently pass this regression.
afterEach(() => vi.unstubAllGlobals())

describe('local OpenGraph fonts', () => {
  it('retains Next bundled Geist first and caches licensed local fallbacks', () => {
    const fonts = ogFonts()
    expect(fonts.map((font) => font.name)).toEqual(['geist', 'Noto Sans', 'Noto Sans Symbols', 'Noto Sans Symbols 2'])
    expect(fonts.every((font) => font.data.byteLength > 0)).toBe(true)
    expect(ogFonts()).toBe(fonts)
  })

  it('renders authored route text and all category symbols without any fetch', async () => {
    const nativeFetch = globalThis.fetch
    const networkFetch = vi.fn(() => Promise.reject(new Error('OG tests must not access the network')))
    vi.stubGlobal('fetch', (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      // Satori initializes its bundled Yoga WASM through an inline data URL.
      if (typeof input === 'string' && input.startsWith('data:')) return nativeFetch(input, init)
      return networkFetch()
    })
    // Exercise both production card renderers with the full metadata corpus,
    // chunked to avoid giant SVG text layouts while checking all code points.
    const text = [
      ...getPublishedPosts().flatMap((post) => [post.title, post.description ?? '', ...post.tags]),
      ...getAllProjects().flatMap((project) => [project.title, project.description ?? '']),
      ...LAB_EFFECTS.flatMap((effect) => [effect.title, effect.blurb, ...effect.tags]),
      ...hikes.flatMap((hike) => [hike.name, hike.region, hike.country]),
      '∫ ψ Ω ◆ ✦ ✷ ⛰ · … ² ₀ ᵢ → Δ λ ≈ ∞ α β μ × −',
    ].join(' ')
    const characters = [...new Set([...text])].join('')
    for (let i = 0; i < characters.length; i += 70) {
      const title = characters.slice(i, i + 70)
      for (const response of [
        renderOgCard({ eyebrow: 'Local font regression', title, footer: 'benebsworth.com' }),
        renderBlogOgCard({ title, topicLabel: 'Engineering' }),
      ]) {
        const bytes = new Uint8Array(await response.arrayBuffer())
        expect([...bytes.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
      }
    }
    expect(networkFetch).not.toHaveBeenCalled()
  }, 60_000)
})
