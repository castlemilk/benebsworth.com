import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PostBrief, EvidenceNote, MethodSteps } from './post-patterns'
import { CoilSpecimen } from './coil-specimen'

describe('reusable editorial patterns', () => {
  it.each(['explainer', 'experiment', 'essay', 'guide'] as const)('renders a %s brief without invented metadata', kind => {
    const html = renderToStaticMarkup(<PostBrief kind={kind}><p>A bounded argument.</p></PostBrief>)
    expect(html).toContain('reading brief')
    expect(html).toContain('A bounded argument.')
    expect(html).not.toMatch(/<h1|Before you start|Written for|minute/)
  })
  it('renders only the author-supplied audience and prerequisites', () => {
    const html = renderToStaticMarkup(<PostBrief kind="guide" audience="Platform engineers" prerequisites={['A test cluster']}><p>Try it safely.</p></PostBrief>)
    expect(html).toContain('Platform engineers')
    expect(html).toContain('<li>A test cluster</li>')
  })
  it('states illustrative evidence and limits without claiming a measurement', () => {
    const html = renderToStaticMarkup(<EvidenceNote basis="illustrative" limitations={<p>No field data.</p>}><p>A model.</p></EvidenceNote>)
    expect(html).toContain('Illustration')
    expect(html).toContain('No field data.')
    expect(html).not.toContain('Measured result')
  })
  it('preserves ordered procedure semantics and rejects empty procedures', () => {
    const html = renderToStaticMarkup(<MethodSteps steps={[{ title: 'Fix the input', content: <p>Keep it constant.</p> }]} />)
    expect(html).toContain('<ol>')
    expect(html).toContain('<h4>Fix the input</h4>')
    expect(() => renderToStaticMarkup(<MethodSteps steps={[]} />)).toThrow()
  })
  it('gives repeated illustrations independent paint definitions', () => {
    const html = renderToStaticMarkup(<><CoilSpecimen /><CoilSpecimen /></>)
    const ids = [...html.matchAll(/linearGradient id="([^"]+)"/g)].map(m => m[1])
    expect(new Set(ids).size).toBe(2)
    for (const id of ids) expect(html).toContain(`url(#${id})`)
  })
})
