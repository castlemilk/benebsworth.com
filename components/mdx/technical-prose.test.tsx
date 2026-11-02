// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { TechnicalPre, TechnicalTable } from './technical-prose'
afterEach(cleanup)

describe('technical prose primitives', () => {
  it('preserves code, author attributes and syntax surface on a keyboard-reachable pre', () => {
    const text = 'const text = "one uninterrupted line";'
    const { container } = render(<TechnicalPre className="existing" data-language="ts" style={{ backgroundColor: '#24292e' }}><code>{text}</code></TechnicalPre>)
    const pre = container.querySelector('pre')!
    expect(pre.tabIndex).toBe(0)
    expect(pre.getAttribute('aria-label')).toContain('Code example')
    expect(pre.classList.contains('existing')).toBe(true)
    expect(pre.dataset.language).toBe('ts')
    expect(pre.textContent).toBe(text)
    expect(pre.querySelectorAll('code')).toHaveLength(1)
  })

  it('keeps headers, caption and table props inside a labelled keyboard scroll region', () => {
    const { getByRole } = render(<TechnicalTable id="example"><caption>Review states</caption><thead><tr><th scope="col">State</th></tr></thead><tbody><tr><td>Illustrative</td></tr></tbody></TechnicalTable>)
    const table = getByRole('table')
    const region = getByRole('region', { name: 'Table, horizontally scrollable' })
    expect(table.id).toBe('example')
    expect(table.parentElement).toBe(region)
    expect(region.tabIndex).toBe(0)
    expect(getByRole('columnheader').getAttribute('scope')).toBe('col')
  })
  it('provides structural scrolling outside reading surfaces without adding folio colour or type', () => {
    const { container, getByRole } = render(<div className="non-reading-consumer">
      <TechnicalPre style={{ backgroundColor: '#24292e' }}><code>Long example line</code></TechnicalPre>
      <TechnicalTable><tbody><tr><td>Long example cell</td></tr></tbody></TechnicalTable>
    </div>)
    const pre = container.querySelector('pre')!
    const region = getByRole('region')
    for (const surface of [pre, region]) {
      expect(surface.style.overflowX).toBe('auto')
      expect(surface.style.minWidth).toBe('0')
      expect(surface.style.maxWidth).toBe('100%')
      expect(surface.style.fontFamily).toBe('')
      expect(surface.style.color).toBe('')
      expect(surface.style.border).toBe('')
    }
    expect(pre.style.backgroundColor).toBe('rgb(36, 41, 46)')
    expect(region.style.backgroundColor).toBe('')
    expect(container.querySelector('.research-article,.folio-study')).toBeNull()
  })

})
