import { describe, expect, it } from 'vitest'
import { extractMdxReferences } from './extract-mdx'

describe('source-backed MDX reference extraction', () => {
  it('keeps inline, reference and autolink destinations with exact query and fragment', () => {
    const body = '[Read **this**](/blog/a/?mode=full#part)\n\n[Paper][primary]\n\nhttps://example.org/path?q=two#figure\n\n[primary]: https://example.org/paper?version=1#s2'
    const result = extractMdxReferences(body)
    expect(result.diagnostics).toEqual([])
    expect(result.references.map(({ predicate, target, label }) => ({ predicate, target, label }))).toEqual([
      { predicate: 'links_to', target: { href: '/blog/a/?mode=full#part' }, label: 'Read this' },
      { predicate: 'links_to', target: { href: 'https://example.org/paper?version=1#s2' }, label: 'Paper' },
      { predicate: 'links_to', target: { href: 'https://example.org/path?q=two#figure' }, label: 'https://example.org/path?q=two#figure' },
    ])
    expect(result.references[1].locator.selector).toContain('definition["primary"]')
    expect(result.references[1].locator.rawValue).toContain('[primary]: https://example.org/paper?version=1#s2')
  })

  it('extracts literal embeds and links inside nested authored captions', () => {
    const result = extractMdxReferences('<LabSide effect="rlc-resonance">\n\nCaption [source](https://example.org/rlc).\n\n<LabCanvas effect="pid-tuner" />\n\n<SpatialLab slug="parallel-transport" />\n\n</LabSide>')
    expect(result.diagnostics).toEqual([])
    expect(result.references.map(({ predicate, target }) => ({ predicate, target }))).toEqual([
      { predicate: 'embeds_lab', target: { labSlug: 'rlc-resonance' } },
      { predicate: 'links_to', target: { href: 'https://example.org/rlc' } },
      { predicate: 'embeds_lab', target: { labSlug: 'pid-tuner' } },
      { predicate: 'embeds_lab', target: { labSlug: 'parallel-transport' } },
    ])
  })

  it('scopes citations to explicit bibliography headings and their subsections', () => {
    const result = extractMdxReferences([
      '[Before](https://example.org/before)',
      '## Reading further',
      '[Paper](https://doi.org/10.example/one?x=1#part)',
      '### Books',
      '[Book](https://example.org/book)',
      '[Internal](/blog/one/)',
      '[Absolute internal](https://benebsworth.com/lab/rlc-resonance/)',
      '## Next experiment',
      '[After](https://example.org/after)',
      '## Sources of energy',
      '[Ordinary](https://example.org/ordinary)',
    ].join('\n\n'))
    expect(result.diagnostics).toEqual([])
    expect(result.references.map((reference) => reference.predicate)).toEqual(['links_to', 'cites', 'cites', 'links_to', 'links_to', 'links_to', 'links_to'])
  })

  it('extracts citations from referenced footnotes but excludes invisible orphan footnotes', () => {
    const result = extractMdxReferences('Claim[^one].\n\n[^one]: [Paper](https://example.org/paper) and [Internal](/blog/a/).\n\n[^unused]: [Unused](https://example.org/unused)')
    expect(result.diagnostics).toEqual([])
    expect(result.references.map(({ predicate, target }) => ({ predicate, target }))).toEqual([
      { predicate: 'cites', target: { href: 'https://example.org/paper' } },
      { predicate: 'links_to', target: { href: '/blog/a/' } },
    ])
  })

  it('matches first-definition footnote rendering and diagnoses shadowed citation content', () => {
    const result = extractMdxReferences('Claim[^x].\n\n[^x]: [First](https://example.org/one)\n\n[^X]: [Shadowed](https://example.org/two) and hidden chain[^hidden].\n\n[^hidden]: [Unrendered](https://example.org/hidden)')
    expect(result.references).toHaveLength(1)
    expect(result.references[0]).toMatchObject({ predicate: 'cites', target: { href: 'https://example.org/one' } })
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0]).toMatchObject({ code: 'duplicate_footnote_definition', locator: { lineStart: 5 } })
  })

  it('extracts literal JSX links without executing expressions', () => {
    const result = extractMdxReferences('<a href="/blog/a/?x=1#two">Read <strong>more</strong></a> and <Link href="/lab/rlc-resonance/">Try</Link>')
    expect(result.diagnostics).toEqual([])
    expect(result.references.map(({ target, label }) => ({ target, label }))).toEqual([
      { target: { href: '/blog/a/?x=1#two' }, label: 'Read more' },
      { target: { href: '/lab/rlc-resonance/' }, label: 'Try' },
    ])
  })

  it('does not treat code, math, comments, ESM or expression samples as outgoing relationships', () => {
    const body = [
      'export const sample = "[fake](https://example.org/esm)"',
      '```mdx\n<LabSide effect="fake" />\n[code](https://example.org/code)\n[broken][missing]\n```',
      '`[inline](https://example.org/inline)`',
      '{/* [comment](https://example.org/comment) <LabSide effect="comment" /> */}',
      '{"[expression](https://example.org/expression)"}',
      '$[math](https://example.org/math)$',
      '<code>[code element](https://example.org/html-code)</code>',
      '<pre>\n\n[Pre](https://example.org/pre)\n\n</pre>',
      '[Real](/blog/real/)',
    ].join('\n\n')
    const result = extractMdxReferences(body)
    expect(result.diagnostics).toEqual([expect.objectContaining({ code: 'unsupported_local_binding' })])
    expect(result.references).toHaveLength(1)
    expect(result.references[0].target).toEqual({ href: '/blog/real/' })
  })

  it('does not guess JSX component identity when real MDX ESM can shadow the provider', () => {
    const result = extractMdxReferences([
      'import { LabSide, LabCanvas, SpatialLab, Link } from "./custom-bindings-that-must-not-be-loaded.js"',
      '<LabSide effect="not-a-proven-lab" />',
      '<LabCanvas effect="also-not-proven" />',
      '<SpatialLab slug="not-proven-either" />',
      '<Link href="/blog/unknown/">Local component</Link>',
      '<a href="https://example.org/unknown">JSX provider mapping</a>',
      '[Authored Markdown](/blog/one/?view=full#source)',
    ].join('\n\n'))
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0]).toMatchObject({ code: 'unsupported_local_binding', locator: { lineStart: 1 } })
    expect(result.references).toHaveLength(1)
    expect(result.references[0]).toMatchObject({ predicate: 'links_to', target: { href: '/blog/one/?view=full#source' } })
  })

  it('does not mistake a fenced import example for a local component binding', () => {
    const result = extractMdxReferences('```js\nimport LabSide from "./custom.js"\n```\n\n<LabSide effect="rlc-resonance" />')
    expect(result.diagnostics).toEqual([])
    expect(result.references).toHaveLength(1)
    expect(result.references[0]).toMatchObject({ predicate: 'embeds_lab', target: { labSlug: 'rlc-resonance' } })
  })

  it('reports destination expressions and spread attributes without evaluating or guessing', () => {
    const result = extractMdxReferences([
      '<LabSide effect={"literal-but-expression"} />',
      '<LabCanvas effect={(() => { throw new Error("must not execute") })()} />',
      '<SpatialLab {...settings} slug="cannot-assume" />',
      '<Link href={resolveHref()}>Dynamic</Link>',
      '<a href="/safe/" {...attributes}>May be overridden</a>',
    ].join('\n\n'))
    expect(result.references).toEqual([])
    expect(result.diagnostics).toHaveLength(5)
    expect(result.diagnostics.every((diagnostic) => diagnostic.code === 'dynamic_attribute')).toBe(true)
  })

  it('reports missing, empty and duplicate destination attributes', () => {
    const result = extractMdxReferences('<LabSide />\n\n<LabCanvas effect="" />\n\n<SpatialLab slug="one" slug="two" />')
    expect(result.references).toEqual([])
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(['missing_attribute', 'empty_target', 'ambiguous_attribute'])
  })

  it('diagnoses unresolved full, collapsed and footnote references without interpreting ordinary brackets', () => {
    const result = extractMdxReferences('[Missing][absent]\n\n[Collapsed][]\n\n[**Formatted**][unknown]\n\nClaim[^missing].\n\nOrdinary [vector], \\[literal][escaped], and `[code][missing]`.')
    expect(result.references).toEqual([])
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(['unresolved_reference', 'unresolved_reference', 'unresolved_reference', 'unresolved_footnote'])
    expect(result.diagnostics[2].locator?.rawValue).toBe('[**Formatted**][unknown]')
  })

  it('does not turn conflicting reference definitions into a silently selected target', () => {
    const result = extractMdxReferences('[Read][paper]\n\n[paper]: https://example.org/a\n\n[paper]: https://example.org/b')
    expect(result.references).toEqual([])
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(['conflicting_definition', 'unresolved_reference'])
  })

  it('does not promote every external URL in prose to a citation', () => {
    const result = extractMdxReferences('Visit [a site](https://example.org) or email [someone](mailto:test@example.org).\n\n## References\n\n[Mail](mailto:test@example.org)\n\n[Source](//example.org/paper)')
    expect(result.references.map((reference) => reference.predicate)).toEqual(['links_to', 'links_to', 'links_to', 'cites'])
  })

  it('preserves offset line evidence and repeats deterministically', () => {
    const body = 'Opening.\n\n[Article](/blog/a/#figure)\n\n<LabSide effect="rlc-resonance" />'
    const first = extractMdxReferences(body, 8)
    expect(first).toEqual(extractMdxReferences(body, 8))
    expect(first.references.map((reference) => [reference.locator.lineStart, reference.locator.lineEnd])).toEqual([[11, 11], [13, 13]])
    expect(first.references[0].locator.rawValue).toBe('[Article](/blog/a/#figure)')
  })

  it('reports parse failure instead of pretending the document has no references', () => {
    const result = extractMdxReferences('<LabSide effect={unclosed />', 4)
    expect(result.references).toEqual([])
    expect(result.diagnostics[0].code).toBe('mdx_parse_error')
    expect(result.diagnostics[0].locator?.lineStart).toBeGreaterThanOrEqual(5)
  })

  it('rejects invalid offsets explicitly', () => {
    expect(extractMdxReferences('[A](/a/)', -1).diagnostics[0].code).toBe('invalid_line_offset')
  })

  it('handles authored literal HTML bibliography headings without collecting script content', () => {
    const result = extractMdxReferences('<h2>References</h2>\n\n[Source](https://example.org/paper)\n\n<script>\n\n[Sample](https://example.org/sample)\n\n</script>\n\n<h2>Next</h2>\n\n[Elsewhere](https://example.org/elsewhere)')
    expect(result.diagnostics).toEqual([])
    expect(result.references.map((reference) => reference.predicate)).toEqual(['cites', 'links_to'])
  })

  it('uses the compact literal embed attribute as evidence instead of copying child content', () => {
    const result = extractMdxReferences('<LabSide effect="rlc-resonance">\n\nLong authored explanation.\n\n</LabSide>')
    expect(result.references[0].locator.rawValue).toBe('effect="rlc-resonance"')
    expect(result.references[0].locator.lineStart).toBe(1)
    expect(result.references[0].locator.lineEnd).toBe(1)
  })
})
