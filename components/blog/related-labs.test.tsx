import React from 'react'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RelatedLabs } from './related-labs'
import { LAB_DEMO_EFFECTS } from '@/lib/lab/registry'
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-28T12:00:00Z')) })
afterEach(() => vi.useRealTimers())
function destinations(html: string) { return Array.from(html.matchAll(/href="(\/lab\/[^"/]+)\/?"/g), match => match[1]) }
describe('related labs preserve registry identity', () => {
  it('retains stable daily fallback, unique routes, source names and limits', () => {
    const html = renderToStaticMarkup(<RelatedLabs limit={3} />)
    expect(renderToStaticMarkup(<RelatedLabs limit={3} />)).toBe(html)
    const hrefs = destinations(html)
    expect(hrefs).toHaveLength(3)
    expect(new Set(hrefs).size).toBe(3)
    for (const href of hrefs) {
      const entry = LAB_DEMO_EFFECTS.find(e => href === `/lab/${e.slug}`)
      expect(entry).toBeDefined()
      expect(html).toContain(entry!.title.replace(/&/g, '&amp;'))
    }
    expect(html).toContain('Try it in the lab')
    expect(html).toMatch(/href="\/lab\/?"/)
  })
  it('places optional authored context below one heading without changing recommendations', () => {
    const before = renderToStaticMarkup(<RelatedLabs tags={['physics']} limit={4} />)
    const after = renderToStaticMarkup(<RelatedLabs tags={['physics']} limit={4} intro={<p>Working simulations and signal experiments.</p>} />)
    expect(destinations(after)).toEqual(destinations(before))
    expect(after.match(/<h2/g)).toHaveLength(1)
    expect(after.match(/href="\/lab\/?"/g)).toHaveLength(1)
    expect(after.indexOf('Try it in the lab')).toBeLessThan(after.indexOf('Working simulations'))
    expect(after.indexOf('Working simulations')).toBeLessThan(after.indexOf('<ul'))
    expect(before).not.toContain('Working simulations')
  })
  it('retains category-constrained recommendations' , () => {
    const hrefs = destinations(renderToStaticMarkup(<RelatedLabs tags={['machine-learning']} limit={3} />))
    expect(hrefs).toHaveLength(3)
    for (const href of hrefs) expect(LAB_DEMO_EFFECTS.find(e => href === `/lab/${e.slug}`)?.category).toBe('ai')
  })
  it('does not match RF inside performance on an AI article', () => {
    const hrefs = destinations(renderToStaticMarkup(<RelatedLabs tags={['software', 'machine-learning', 'llm', 'metal', 'performance']} limit={3} />))
    expect(hrefs).toHaveLength(3)
    for (const href of hrefs) expect(LAB_DEMO_EFFECTS.find(e => href === `/lab/${e.slug}`)?.category).toBe('ai')
  })
  it('retains explicit RF and multi-word topic matches', () => {
    const rf = destinations(renderToStaticMarkup(<RelatedLabs tags={['RF']} limit={3} />))
    for (const href of rf) expect(LAB_DEMO_EFFECTS.find(e => href === `/lab/${e.slug}`)?.tags).toContain('rf')
    const attention = destinations(renderToStaticMarkup(<RelatedLabs tags={['self-attention']} limit={1} />))
    expect(attention).toEqual(['/lab/self-attention'])
  })
  it('keeps inline links and About-sized limits; typography is scoped to reading pages', () => {
    const inline = renderToStaticMarkup(<RelatedLabs tags={['physics']} variant="inline" limit={4} />)
    expect(destinations(inline)).toHaveLength(4)
    expect(inline).toContain('Try in the lab:')
    expect(inline).not.toContain('<section')
    const about = renderToStaticMarkup(<RelatedLabs tags={['electrical', 'engineering', 'physics', 'algorithms', 'signal']} labels={['physics', 'engineering', 'algorithms', 'simulation']} limit={4} />)
    expect(destinations(about)).toHaveLength(4)
    const css = readFileSync(new URL('./archive-discovery.module.css', import.meta.url), 'utf8')
    for (const line of css.split('\n').filter(line => line.includes('.related'))) expect(line).toContain(':global(.folio-reading-page)')
  })
})
