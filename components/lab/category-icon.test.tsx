import { it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CategoryIcon } from './category-icon'

it('maps each existing custom category without changing its key', () => {
  for (const [category, file] of [['engineering','ee'],['physics','physics'],['cosmology','cosmology'],['ai','ai']]) {
    const html = renderToStaticMarkup(<CategoryIcon category={category} fallback="old" />)
    expect(html).toContain(`/topics/custom-v6/${file}.svg`)
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toContain('old')
  }
})
it('retains unknown category glyphs and escapes their text', () => {
  const html = renderToStaticMarkup(<CategoryIcon category="maths" fallback="<∫>" />)
  expect(html).toContain('&lt;∫&gt;')
  expect(html).not.toContain('mask:')
})
