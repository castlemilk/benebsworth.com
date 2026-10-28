// @vitest-environment jsdom
import React from 'react'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import postcss from 'postcss'
import { Stat, StatGroup } from './editorial-components'
import { Callout } from '../ui/callout'
import styles from './editorial-blocks.module.css'

const css = postcss.parse(readFileSync('components/mdx/editorial-blocks.module.css', 'utf8'))
const cssText = css.toString()
afterEach(cleanup)

describe('folio stats and callouts', () => {
  it('retains definition-list semantics and the exact authored RLC values/context', () => {
    const source = readFileSync('content/blog/every-wire-is-an-rlc-circuit/index.mdx', 'utf8')
    const stats = [...source.matchAll(/<Stat label="([^"]+)" value="([^"]+)" context="([^"]+)" \/>/g)]
    expect(stats.map(([, label, value]) => [label, value])).toEqual([
      ['ζ = 0.5', '16%'], ['ζ = 0.3', '37%'], ['ζ = 0.1', '73%'],
    ])
    const { container } = render(<StatGroup>{stats.map(([, label, value, context]) =>
      <Stat key={label} label={label} value={value} context={context} />)}</StatGroup>)
    expect(container.querySelector('dl')).not.toBeNull()
    expect([...container.querySelectorAll('dt')].map(el => el.textContent)).toEqual(stats.map(s => s[1]))
    expect([...container.querySelectorAll('dd')].map(el => el.textContent)).toEqual(stats.flatMap(s => [s[2], s[3]]))
    expect(cssText).toContain('text-transform: none')
  })

  it('accepts rich labels and values and omits absent context without empty definitions', () => {
    const { container } = render(<StatGroup><Stat label={<span>V<sub>out</sub></span>} value={<strong>3.3 V</strong>} /></StatGroup>)
    expect(container.querySelectorAll('dd')).toHaveLength(1)
    expect(container.querySelector('dt sub')?.textContent).toBe('out')
    expect(container.querySelector('dd strong')?.textContent).toBe('3.3 V')
  })

  it.each(['info', 'warning', 'success', 'error', 'thinking', 'feeling', 'doing'] as const)(
    'retains %s type, exact title and rich content without live alert announcements', type => {
      const title = 'You have seen this exact equation before'
      const { container } = render(<article className="research-article"><Callout type={type} title={title} className="authored-class">
        <p>Equation (3) is not a signal-integrity formula. It&apos;s <em>the</em> second-order step-response formula.</p>
        <a href="#equation-3">Equation (3)</a>
      </Callout></article>)
      const callout = container.querySelector(`[data-callout-type="${type}"]`)!
      expect(callout.classList.contains('authored-class')).toBe(true)
      expect(callout.querySelector(`.${styles.title}`)?.textContent).toBe(title)
      expect(callout.querySelector('em')?.textContent).toBe('the')
      expect(callout.querySelector('a')?.getAttribute('href')).toBe('#equation-3')
      expect(callout.querySelector(`.${styles.kind}`)?.textContent).toBe(
        { thinking: 'Insight', feeling: 'Reflection', doing: 'Practice' }[type as 'thinking'] ?? type)
      expect(container.querySelector('[role="alert"], [aria-live]')).toBeNull()
    },
  )

  it('keeps default non-blog callout classes and titleless content intact', () => {
    const { container } = render(<Callout><p>Unchanged information</p></Callout>)
    const callout = container.querySelector('[data-callout-type="info"]')!
    expect(callout.classList.contains('bg-sky-500/10')).toBe(true)
    expect(callout.classList.contains('rounded-lg')).toBe(true)
    expect(callout.querySelector(`.${styles.title}`)).toBeNull()
    expect(callout.textContent).toContain('Unchanged information')
  })

  it('scopes every restyling rule to reading surfaces; the extra type label is hidden elsewhere', () => {
    css.walkRules(rule => {
      if (rule.selector === '.kind') {
        expect(rule.nodes.map(node => node.toString()).join('')).toContain('display: none')
      } else {
        expect(rule.selector.split(',\n').every(selector => selector.startsWith(':global(:is(.research-article, .folio-study))'))).toBe(true)
      }
    })
    expect(cssText).toContain('repeat(auto-fit, minmax(min(100%, 10rem), 1fr))')
    expect(cssText).toContain('overflow-wrap: anywhere')
    expect(cssText).toContain("[data-callout-type='warning']")
    expect(cssText).toContain('3px solid var(--folio-accent')
    expect(cssText).toContain("[data-callout-type='error']")
    expect(cssText).toContain('3px double var(--folio-handwriting')
  })

  it('inherits established light/dark inks instead of introducing a fixed orange palette', () => {
    expect(cssText).toContain('var(--color-fg)')
    expect(cssText).toContain('var(--color-border)')
    expect(cssText).toContain('var(--folio-handwriting, #b32624)')
    expect(cssText).not.toContain('orange')
    const theme = readFileSync('app/editorial.css', 'utf8')
    expect(theme).toContain('--folio-handwriting:#b32624')
    expect(theme).toContain('--folio-handwriting:#ffaaa5')
  })
})
