// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CalloutInkIcon, type CalloutType } from './callout-ink-icon'
import { Callout } from './callout'
import styles from '@/components/mdx/editorial-blocks.module.css'

afterEach(cleanup)
const types: CalloutType[] = ['info', 'warning', 'success', 'error', 'thinking', 'feeling', 'doing']

it.each(types)('renders a transparent, decorative, deterministic %s drawing', type => {
  const { container } = render(<CalloutInkIcon type={type} />)
  const svg = container.querySelector('svg')!
  expect(svg.getAttribute('viewBox')).toBe('-3 -3 46 46')
  expect(svg.getAttribute('fill')).toBe('none')
  expect(svg.getAttribute('aria-hidden')).toBe('true')
  expect(svg.getAttribute('focusable')).toBe('false')
  expect(svg.querySelector('image, rect, text, foreignObject')).toBeNull()
  expect(svg.querySelectorAll('path').length).toBeGreaterThan(0)
  for (const path of svg.querySelectorAll('path')) {
    expect(path.getAttribute('stroke')).toBe('currentColor')
    expect(path.getAttribute('fill')).toBeNull()
    expect(path.getAttribute('d')).toContain('C')
  }
  expect(renderToStaticMarkup(<CalloutInkIcon type={type} />)).toBe(renderToStaticMarkup(<CalloutInkIcon type={type} />))
})

it('gives all seven meanings distinct authored outlines', () => {
  const drawings = types.map(type => renderToStaticMarkup(<CalloutInkIcon type={type} />).match(/ d="[^"]+"/g)?.join(''))
  expect(new Set(drawings).size).toBe(7)
})

it('keeps each icon beside the visible type label without replacing title, prose or the insight rail', () => {
  const { container } = render(<article className="research-article">{types.map(type =>
    <Callout key={type} type={type} title={`Exact ${type}`}><p>Exact body</p></Callout>)}</article>)
  for (const type of types) {
    const callout = container.querySelector(`[data-callout-type="${type}"]`)!
    expect(callout.querySelector(`.${styles.kind} > [data-callout-ink-icon="${type}"]`)).not.toBeNull()
    expect(callout.querySelector(`.${styles.kind}`)?.textContent?.length).toBeGreaterThan(0)
    expect(callout.querySelector(`.${styles.title}`)?.textContent).toBe(`Exact ${type}`)
    expect(callout.querySelector(`.${styles.body}`)?.textContent).toBe('Exact body')
    expect(callout.querySelector('[data-insight-focus-rail]') !== null).toBe(type === 'thinking')
  }
})
