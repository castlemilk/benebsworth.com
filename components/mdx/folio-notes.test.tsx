// @vitest-environment jsdom
import React from 'react'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PullQuote } from './editorial-components'
import { FieldNote, Assumptions } from './research-folio'
import { PostBrief, EvidenceNote, MethodSteps } from './post-patterns'
import styles from './folio-notes.module.css'
import postcss from 'postcss'

afterEach(cleanup)

describe('folio notes and reasoning', () => {
  it('preserves long multi-paragraph quotes, emphasis and destinations without nested paragraphs', () => {
    const { container } = render(<PullQuote><p>Exact authored words <em>remain exact</em>.</p><p>Second paragraph with <a href="#source">source</a>.</p></PullQuote>)
    expect(container.querySelectorAll('blockquote > p')).toHaveLength(2)
    expect(container.querySelector('p p')).toBeNull()
    expect(container.querySelector('blockquote')?.textContent).toBe('Exact authored words remain exact.Second paragraph with source.')
    expect(container.querySelector('a')?.getAttribute('href')).toBe('#source')
    expect(container.querySelector('blockquote')?.classList.contains('font-display')).toBe(true)
    const css = readFileSync('components/mdx/folio-notes.module.css', 'utf8')
    expect(css).toContain(':global(:is(.research-article, .folio-study)) .quote')
    expect(css).toContain('@layer utilities')
    expect(css).toContain('font: inherit !important')
    expect(css).toContain('.quote p + p')
  })

  it.each(['observation', 'caution', 'method'] as const)('keeps %s notes identifiable without relying on colour', kind => {
    const { container } = render(<FieldNote kind={kind} title="Exact title"><p>Exact <strong>body</strong>.</p></FieldNote>)
    const note = container.querySelector('aside')!
    expect(note.getAttribute('data-kind')).toBe(kind)
    expect(note.getAttribute('aria-label')).toBe('Exact title')
    expect(note.querySelector(`.${styles.kind}`)?.textContent?.toLowerCase()).toBe(kind)
    expect(note.querySelector('strong')?.textContent).toBe('body')
    expect(container.querySelector('[role="alert"], [aria-live]')).toBeNull()
  })

  it('does not duplicate a title that already spells out the note kind', () => {
    const { container } = render(<FieldNote title="Method" kind="method">Keep the authored title.</FieldNote>)
    expect(container.querySelector(`.${styles.kind}`)).toBeNull()
    expect(container.querySelector('aside')?.textContent).toBe('MethodKeep the authored title.')
  })

  it('stacks unusually long exact titles and responds to narrow containers, not just viewports', () => {
    const title = 'A deliberately longer caution title that must wrap without covering the content'
    const { container, rerender } = render(<FieldNote title={title}>Exact body.</FieldNote>)
    expect(container.querySelector('aside')?.classList.contains(styles.longTitle)).toBe(true)
    expect(container.querySelector('.hand-underline')?.textContent).toBe(title)
    rerender(<FieldNote title="Short margin note">Exact body.</FieldNote>)
    expect(container.querySelector('aside')?.classList.contains(styles.longTitle)).toBe(false)
    const css = readFileSync('components/mdx/folio-notes.module.css', 'utf8')
    expect(css).toContain('container-type: inline-size')
    expect(css).toContain('container-name: folio-note')
    expect(css).toContain('@container folio-note (max-width: 30rem)')
    expect(css).toContain('.longTitle > div')
    expect(css).toContain('grid-column: 1 / -1')
  })

  it.each(['invalid', '__proto__', 'toString', 'constructor'])( 'rejects unsafe or unsupported kind %s', invalid => {
    expect(() => renderToStaticMarkup(<FieldNote kind={invalid as 'method'}>Copy</FieldNote>)).toThrow('supported note kind')
    expect(() => renderToStaticMarkup(<PostBrief kind={invalid as 'guide'}>Copy</PostBrief>)).toThrow('supported post kind')
    expect(() => renderToStaticMarkup(<EvidenceNote basis={invalid as 'measured'}>Copy</EvidenceNote>)).toThrow('explicit evidence basis')
  })

  it.each(['measured', 'simulated', 'illustrative', 'interpretation'] as const)('preserves explicit %s evidence with and without limits', basis => {
    const { container, rerender } = render(<EvidenceNote basis={basis}><p>Label specimen; no result reported.</p></EvidenceNote>)
    expect(container.querySelector('[data-evidence-basis]')?.getAttribute('data-evidence-basis')).toBe(basis)
    expect(container.querySelector('.folio-evidence-limit')).toBeNull()
    rerender(<EvidenceNote basis={basis} limitations={<p>Exact authored limit.</p>}><p>Label specimen; no result reported.</p></EvidenceNote>)
    expect(container.querySelector('.folio-evidence-limit')?.textContent).toBe('LimitsExact authored limit.')
  })

  it('requires an explicit post kind and evidence basis at runtime', () => {
    expect(() => renderToStaticMarkup(<PostBrief kind={undefined as unknown as 'guide'}>Copy</PostBrief>)).toThrow()
    expect(() => renderToStaticMarkup(<EvidenceNote basis={undefined as unknown as 'measured'}>Copy</EvidenceNote>)).toThrow()
  })

  it('resets inherited prose ink at each reading component boundary without recolouring mapped links', () => {
    const { container } = render(<article className="research-article"><div className="prose">
      <FieldNote><p>Note <strong>emphasis</strong> and <a href="#raw">raw link</a>.</p></FieldNote>
      <Assumptions><ul><li>Constraint.</li></ul></Assumptions>
      <PostBrief kind="guide"><p>Brief <a className="text-project" href="#mapped">mapped link</a>.</p></PostBrief>
      <EvidenceNote basis="illustrative"><p>Label specimen.</p></EvidenceNote>
      <MethodSteps steps={[{ title: 'Read', content: <p>Step.</p> }]} />
    </div></article>)
    const css = postcss.parse(readFileSync('components/mdx/folio-notes.module.css', 'utf8'))
    let inkBoundary = ''
    css.walkRules(rule => {
      if (rule.selector.endsWith(':is(.note, .copy)')) {
        rule.walkDecls('color', declaration => { inkBoundary = declaration.value })
      }
    })
    expect(inkBoundary).toBe('var(--color-fg)')
    for (const family of ['.folio-note', '.folio-assumptions', '.folio-brief', '.folio-method']) {
      for (const element of container.querySelectorAll(family)) {
        expect(element.matches(`.${styles.note}, .${styles.copy}`)).toBe(true)
      }
    }
    expect(container.querySelectorAll('a:not([class])')).toHaveLength(1)
    expect(container.querySelector('a.text-project')?.getAttribute('href')).toBe('#mapped')
    expect(css.toString()).toContain('a:not([class]):focus-visible')
    expect(css.toString()).not.toContain('svg')
  })

  it('retains named sections, heading levels, assumptions and genuinely ordered steps', () => {
    const { container } = render(<><Assumptions title="Exact assumptions"><ul><li>Exact constraint.</li></ul></Assumptions><MethodSteps steps={[{ title: 'First action', content: <p>First detail.</p> }, { title: 'Second action', content: <p>Second detail.</p> }]} /></>)
    expect(container.querySelector('section[aria-label="Exact assumptions"] h3')?.textContent).toBe('Exact assumptions')
    expect(container.querySelector('.folio-assumptions li')?.textContent).toBe('Exact constraint.')
    expect([...container.querySelectorAll('ol > li > h4')].map(el => el.textContent)).toEqual(['First action', 'Second action'])
    expect(container.querySelectorAll('h1, h2, p p')).toHaveLength(0)
    expect(() => renderToStaticMarkup(<MethodSteps steps={[]} />)).toThrow()
  })
})
