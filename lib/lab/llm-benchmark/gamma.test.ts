import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fetchGammaAssets, gammaBrief, gammaStylesheet } from './gamma.js'

/**
 * Gamma is optional infrastructure: the loop must run identically when it is
 * absent, and must never *claim* assets it did not receive. These tests pin
 * both — a reachable catalogue yields assets, an absent one yields an honest
 * empty result, and the brief says which happened.
 */

function mcpResponse(payload: unknown): Response {
  return new Response(JSON.stringify({ result: { content: [{ type: 'text', text: JSON.stringify(payload) }] } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchGammaAssets', () => {
  it('reports unreachable rather than throwing when Gamma is not running', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
    const assets = await fetchGammaAssets('observability', { timeoutMs: 50 })
    expect(assets.reachable).toBe(false)
    expect(assets.tokensCss).toBeUndefined()
    expect(assets.notes.join(' ')).toContain('nothing')
  })

  it('pulls tokens, a background, an effect and component slugs when it answers', async () => {
    const css = ':root { --gamma-ink: #101014; --gamma-radius: 10px; }'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url: string, init: { body: string }) => {
        const { params } = JSON.parse(init.body) as { params: { name: string } }
        switch (params.name) {
          case 'gamma_list_design_systems':
            return mcpResponse({ items: [{ id: 'nocturne', name: 'Nocturne' }] })
          case 'gamma_get_design_system':
            return mcpResponse({ css })
          case 'gamma_list_backgrounds':
            return mcpResponse({ items: [{ slug: 'atlas', name: 'Atlas' }] })
          case 'gamma_get_background':
            return mcpResponse({ recipe: css })
          case 'gamma_list_shaders':
            return mcpResponse({ shaders: [{ name: 'Aurora' }] })
          case 'gamma_get_shader':
            return mcpResponse({ source: css })
          case 'gamma_list_components':
            return mcpResponse({ items: [{ slug: 'StatCard' }, { slug: 'DataTable' }] })
          default:
            return new Response('{}', { status: 200 })
        }
      })
    )

    const assets = await fetchGammaAssets('observability')
    expect(assets.reachable).toBe(true)
    expect(assets.system).toBe('nocturne')
    expect(assets.tokensCss).toContain('--gamma-ink')
    expect(assets.backgroundName).toBe('atlas')
    expect(assets.effectName).toBe('Aurora')
    expect(assets.componentSlugs).toEqual(['StatCard', 'DataTable'])
    expect(assets.notes).toEqual([])
  })

  it('survives a catalogue that answers with nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))
    const assets = await fetchGammaAssets('anything', { timeoutMs: 100 })
    expect(assets.reachable).toBe(false)
    expect(assets.componentSlugs).toEqual([])
  })
})

describe('gammaStylesheet + gammaBrief', () => {
  const assets = {
    reachable: true,
    system: 'nocturne',
    tokensCss: ':root{--gamma-ink:#101014}',
    backgroundName: 'atlas',
    backgroundCss: '.bg{background:radial-gradient(circle,#0000,transparent)}',
    effectName: 'Aurora',
    effectCss: '.fx{filter:blur(2px)}',
    componentSlugs: ['StatCard'],
    notes: [],
  }

  it('labels each block with what it is and where it came from', () => {
    const css = gammaStylesheet(assets)
    expect(css).toContain('nocturne')
    expect(css).toContain('--gamma-ink')
    expect(css).toContain('atlas')
    expect(css).toContain('Aurora')
  })

  it('tells the model to adopt the tokens rather than redefine them', () => {
    const brief = gammaBrief(assets)
    expect(brief).toContain('StatCard')
    expect(brief).toMatch(/Do not redefine|adopt/i)
  })

  it('never prints undefined when a name is missing', () => {
    const unnamed = { ...assets, backgroundName: undefined, effectName: undefined }
    expect(gammaStylesheet(unnamed)).not.toContain('undefined')
    expect(gammaBrief(unnamed)).not.toContain('undefined')
  })

  it('says nothing at all when nothing was fetched', () => {
    const empty = { reachable: false, componentSlugs: [], notes: [] }
    expect(gammaStylesheet(empty)).toBe('')
    expect(gammaBrief(empty)).toBe('')
  })
})
