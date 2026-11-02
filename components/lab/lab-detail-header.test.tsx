import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LabDetailHeader } from './lab-detail-header'

describe('Notebook experiment header', () => {
  const props = { title:'Wave Superposition', blurb:'Two waves add.', category:'physics', label:'Physics', glyph:'ψ', hasExplainer:true }
  it('reuses the approved topic symbol with visible text and one title', () => {
    const html = renderToStaticMarkup(<LabDetailHeader {...props} />)
    expect(html).toContain('/topics/custom-v6/physics.svg')
    expect(html).not.toContain('ψ')
    expect(html).toContain('<span>Physics</span>')
    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain('href="#experiment"')
    expect(html).toContain('href="#explanation"')
  })
  it('does not link to an absent explainer', () => {
    const html = renderToStaticMarkup(<LabDetailHeader {...props} hasExplainer={false} />)
    expect(html).not.toContain('href="#explanation"')
  })
})
