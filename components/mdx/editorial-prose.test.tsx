// @vitest-environment jsdom
import React from 'react'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import postcss from 'postcss'
import { PostBrief, MethodSteps } from './post-patterns'
import { FieldNote } from './research-folio'

const css = postcss.parse(readFileSync('app/editorial.css', 'utf8'))
afterEach(cleanup)

describe('editorial prose boundaries', () => {
  it('applies reading rules only to prose, not the actual authored component internals', () => {
    const { container } = render(<article className="research-article"><div className="prose">
      <p id="ordinary">Ordinary prose</p><h2 id="section">Section</h2>
      <PostBrief kind="explainer"><p className="font-sans">Brief summary</p></PostBrief>
      <FieldNote title="Observation"><p className="font-sans">Note copy</p></FieldNote>
      <MethodSteps steps={[{ title: 'Observe', content: <p>Step copy</p> }]} />
    </div></article>)
    const rules: string[] = []
    css.walkRules(rule => { if (rule.selector.startsWith('.research-article .prose')) rules.push(rule.selector) })
    expect(rules.length).toBeGreaterThan(0)
    for (const selector of rules) {
      const matches = [...container.querySelectorAll(selector)]
      expect(matches.every(el => !el.closest('.not-prose'))).toBe(true)
    }
    expect(rules.some(selector => container.querySelector('#ordinary')!.matches(selector))).toBe(true)
    expect(rules.some(selector => container.querySelector('#section')!.matches(selector))).toBe(true)
    // These are declarations from the shipped CSS, checked against real components.
    const declarations = (selector: string) => {
      const found: Record<string,string> = {}
      css.walkRules(rule => { if (rule.selector === selector) rule.walkDecls(d => { found[d.prop] = d.value }) })
      return found
    }
    expect(declarations('.folio-pattern-label').font).toContain("'Folio Condensed'")
    expect(declarations('.folio-brief-summary').font).toContain('1.25rem/1.6')
    const copySelector = '.folio-brief-summary :where(p),.folio-note-content :where(p,li),.folio-method li :where(p)'
    expect(container.querySelectorAll(copySelector)).toHaveLength(3)
    expect(declarations(copySelector)).toEqual({ 'font-family': 'inherit', 'font-size': 'inherit', 'line-height': 'inherit' })
  })
})
