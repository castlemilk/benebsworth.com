import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchBrandMark, guessBrand } from './brandbrain.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * A generated page invents a company. BrandBrain knows what a real company's
 * mark looks like, so the interesting question is not "can we fetch it" but
 * "should this page wear it" — and these tests pin the answer to that question,
 * because a fabricated mark presented as a real one is the failure this
 * integration could otherwise introduce into every artefact.
 */
describe('guessBrand', () => {
  it('reads the nav wordmark first, where a brand puts its name', () => {
    const html =
      '<header><a class="brand">Meridian</a><nav>Pricing</nav></header><title>Meridian · Observability</title>'
    expect(guessBrand(html)).toEqual({ name: 'Meridian', likelyRealCompany: false, basis: 'wordmark' })
  })

  it('falls back to the document title', () => {
    const html = '<title>Acme Analytics</title><body><h1>Every request</h1></body>'
    expect(guessBrand(html)).toEqual({ name: 'Acme Analytics', likelyRealCompany: false, basis: 'title' })
  })

  it('never reads the injected stylesheet as a brand name', () => {
    const html =
      '<style>.gamma-brand{--gamma-ink:#000}</style><header><a class="brand">Nimbus</a></header>'
    expect(guessBrand(html)?.name).toBe('Nimbus')
  })

  it('returns nothing rather than guessing when there is no brand', () => {
    expect(guessBrand('<body><h1>Hello</h1></body>')).toBeUndefined()
  })
})

describe('fetchBrandMark', () => {
  const brand = { name: 'Meridian', likelyRealCompany: false, basis: 'wordmark' as const }

  it('says so plainly when BrandBrain is not reachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
    const asset = await fetchBrandMark(brand, { url: 'http://127.0.0.1:4444/mcp' })
    expect(asset?.fromPlatform).toBe(false)
    expect(asset?.note).toContain('not reachable')
  })

  it('records a found mark and still withholds it from a standalone page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce(new Response('{"tools":[]}', { status: 200 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      results: [{ name: 'Meridian', logoUrl: 'https://cdn.brandbrain.dev/m.png', sourceUrl: 'https://meridian.example' }],
                    }),
                  },
                ],
              },
            }),
            { status: 200 }
          )
        )
    )
    const asset = await fetchBrandMark(brand, { url: 'http://127.0.0.1:4444/mcp' })
    expect(asset?.fromPlatform).toBe(true)
    expect(asset?.url).toBe('https://cdn.brandbrain.dev/m.png')
    // The record shows the mark was found and declined, not never looked for.
    expect(asset?.note).toContain('withheld')
  })

  it('returns the mark with its page when real-brand use is explicitly allowed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce(new Response('{"tools":[]}', { status: 200 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              result: {
                content: [
                  { type: 'text', text: JSON.stringify({ results: [{ logoUrl: 'https://cdn/x.png', sourceUrl: 'https://x.example' }] }) },
                ],
              },
            }),
            { status: 200 }
          )
        )
    )
    const asset = await fetchBrandMark(brand, { url: 'http://127.0.0.1:4444/mcp', allowRealBrandMarks: true })
    expect(asset?.note).toBeUndefined()
    expect(asset?.page).toBe('https://x.example')
  })
})
