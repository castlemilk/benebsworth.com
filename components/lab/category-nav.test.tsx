import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CategoryNav } from './category-nav'

vi.mock('@/components/mdx/use-scroll-activity', () => ({ useScrollActivity: () => false }))
const categories = [
  { key: 'physics', label: 'Physics', glyph: 'P', accent: '#123456', count: 7 },
  { key: 'ai', label: 'AI', glyph: 'A', accent: '#654321', count: 5 },
]
const render = (searchQuery = '', activeCategory: string | null = 'physics') => renderToStaticMarkup(
  <CategoryNav categories={categories} searchQuery={searchQuery} activeCategory={activeCategory}
    onSearchChange={() => {}} onCategoryChange={() => {}} />,
)
describe('category navigation accessibility and custom icons', () => {
  it('names search independently of its placeholder', () => {
    expect(render()).toContain('aria-label="Search lab experiments"')
  })
  it('disables the invisible empty Clear control', () => {
    expect(render()).toMatch(/aria-label="Clear search"[^>]*disabled=""/)
    expect(render('wave')).not.toMatch(/aria-label="Clear search"[^>]*disabled=""/)
  })
  it('announces selection including All without relying on colour', () => {
    expect([...render().matchAll(/aria-pressed="(true|false)"/g)].map(m => m[1])).toEqual(['false', 'true', 'false'])
    expect([...render('', null).matchAll(/aria-pressed="(true|false)"/g)].map(m => m[1])).toEqual(['true', 'false', 'false'])
  })
  it('uses distinct Physics and AI masks and preserves visible labels', () => {
    const html = render()
    expect(html).toContain('/topics/custom-v6/physics.svg')
    expect(html).toContain('/topics/custom-v6/ai.svg')
    expect(html).toContain('Physics')
    expect(html).toContain('AI')
  })
})
