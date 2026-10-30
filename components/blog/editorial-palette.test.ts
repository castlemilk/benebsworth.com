import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../../app/editorial.css', import.meta.url), 'utf8')

describe('reading-route paper palette', () => {
  it('limits the accepted cream palette to light-mode reading routes', () => {
    const rule = css.match(/:root:not\(\.dark\):has\(\.folio-reading-page, \.folio-archive\)\{([^}]+)\}/)?.[1]
    expect(rule).toBeDefined()
    expect(rule).toContain('--bg:#f4f1e9')
    expect(rule).toContain('--fg:#202c34')
    // Canvas and scientific series must not be recoloured by editorial styling.
    expect(rule).not.toMatch(/--(?:stage|diagram-paper|blog|project|about):/)
  })
})

it('carries readable red handwriting to the article sibling TOC in both themes', () => {
  expect(css).toContain('.folio-reading-page{--folio-handwriting:#b32624}')
  expect(css).toContain('.dark .folio-reading-page{--folio-handwriting:#ffaaa5}')
})
