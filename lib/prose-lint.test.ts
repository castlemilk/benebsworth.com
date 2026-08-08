import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('prose source manifest', () => {
  it('covers the source boundary and excludes generated/internal files', async () => {
    const { readManifest, resolveManifestFiles } = await import('../scripts/prose-lint.mjs')
    const manifest = readManifest(resolve(root, 'scripts/prose-sources.json'))
    expect(manifest.include).toEqual(expect.arrayContaining([
      'content/blog/**/index.mdx',
      'content/lab/**/*.mdx',
      'content/projects/**/*.mdx',
      'content/about.ts',
      'content/hiking.ts',
      'app/**/*.tsx',
      'app/**/*.ts',
      'components/**/*.tsx',
      'app/llms.txt/route.ts',
      'lib/topics.ts',
      'lib/skill-provenance.ts',
      'lib/content.ts',
    ]))
    expect(manifest.exclude).toEqual(expect.arrayContaining([
      'content/blog/_article-backlog.mdx',
      '**/*.test.*',
      'out/**',
      'public/blog/**/*.md',
      'lib/lab/llm-benchmark/*.json',
      '.claude/skills/writing-trail-guides/**',
    ]))

    const files = resolveManifestFiles(root, manifest)
    expect(files).toContain('content/blog/hello-world/index.mdx')
    expect(files).toContain('content/lab/inverse-kinematics.mdx')
    expect(files).toContain('content/projects/this-site.mdx')
    expect(files).toContain('content/about.ts')
    expect(files).not.toContain('content/blog/_article-backlog.mdx')
    expect(files.every((file: string) => !file.includes('.test.'))).toBe(true)
    expect(files.some((file: string) => file.startsWith('out/'))).toBe(false)
  })
})

describe('format-aware prose extraction', () => {
  it('keeps reader-facing MDX frontmatter and prose while masking code, math, URLs, and JSX attrs', async () => {
    const { extractProse } = await import('../scripts/prose-lint.mjs')
    const source = `---
title: "A useful title"
description: "A short description"
date: "2026-01-01"
takeaways:
  - "A useful takeaway"
labels: technology
---

The prose stays visible. [A link](https://example.com/ensure) is not prose.

\`utilize\` and $\\text{leverage}$ stay masked.

\`\`\`ts
const hidden = "ensure robust code";
\`\`\`

<Callout title="leverage this">Quoted prose remains visible.</Callout>
`
    const result = extractProse('content/blog/example/index.mdx', source)
    expect(result.errors).toEqual([])
    expect(result.maskedText).toContain('A useful title')
    expect(result.maskedText).toContain('A useful takeaway')
    expect(result.maskedText).toContain('The prose stays visible.')
    expect(result.maskedText).toContain('Quoted prose remains visible.')
    expect(result.maskedText).not.toContain('utilize')
    expect(result.maskedText).not.toContain('ensure robust code')
    expect(result.maskedText).not.toContain('https://example.com/ensure')
    expect(result.spans.find((span: { text: string }) => span.text.includes('The prose stays visible'))?.line).toBe(10)
  })

  it('masks JSX tags with quoted greater-than signs and preserves Unicode offsets', async () => {
    const { extractProse } = await import('../scripts/prose-lint.mjs')
    const source = '😀\n<Callout title="a > b">Visible prose.</Callout>\n'
    const result = extractProse('content/blog/example/index.mdx', source)
    expect(result.errors).toEqual([])
    expect(result.maskedText).toContain('Visible prose.')
    expect(result.maskedText).not.toContain('a > b')
    expect(result.spans.find((span: { text: string }) => span.text.includes('Visible prose'))?.line).toBe(2)
  })

  it('masks JSX tags with operators in expression attributes', async () => {
    const { extractProse } = await import('../scripts/prose-lint.mjs')
    const result = extractProse('content/blog/example/index.mdx', '<Tag foo={a > b}>Visible.</Tag>')
    expect(result.errors).toEqual([])
    expect(result.maskedText).toContain('Visible.')
    expect(result.maskedText).not.toContain('b}>')
    const commentAttr = extractProse('content/blog/example/index.mdx', '<Tag foo={/* } > */ bar}>Visible.</Tag>')
    expect(commentAttr.errors).toEqual([])
    expect(commentAttr.maskedText).not.toContain('*/ bar}')
  })

  it('supports CRLF frontmatter and rejects malformed delimiter lines', async () => {
    const { extractProse } = await import('../scripts/prose-lint.mjs')
    const good = extractProse('post.mdx', '---\r\ntitle: Visible\r\ndate: hidden\r\n---\r\nBody\r\n')
    expect(good.errors).toEqual([])
    expect(good.maskedText).toContain('Visible')
    expect(good.maskedText).toContain('Body')
    const bad = extractProse('post.mdx', '---\r\ntitle: Leaked\r\n---oops\r\nBody')
    expect(bad.errors.some((error: { rule: string }) => error.rule === 'masking')).toBe(true)
    expect(bad.maskedText).not.toContain('Leaked')
  })

  it('extracts visible TSX strings and selected attributes but excludes comments, imports, identifiers, and code strings', async () => {
    const { extractProse } = await import('../scripts/prose-lint.mjs')
    const source = `import React from 'react'
// ensure this comment is not visible prose
const hidden = "utilize this code string"
const title = "Visible heading"
export function Page() {
  return <main aria-label="Visible label" data-test="ignore me">
    <h1>Visible body</h1>
    <img alt="Visible image" src="/x.png" />
  </main>
}
`
    const result = extractProse('app/example/page.tsx', source)
    expect(result.errors).toEqual([])
    expect(result.maskedText).toContain('Visible heading')
    expect(result.maskedText).toContain('Visible label')
    expect(result.maskedText).toContain('Visible body')
    expect(result.maskedText).toContain('Visible image')
    expect(result.maskedText).not.toContain('ensure this comment')
    expect(result.maskedText).not.toContain('utilize this code string')
    expect(result.maskedText).not.toContain('ignore me')
  })

  it('reports deterministic masking errors for unterminated fences and strings', async () => {
    const { extractProse } = await import('../scripts/prose-lint.mjs')
    expect(extractProse('post.mdx', '```ts\nconst x = 1').errors).toEqual([
      expect.objectContaining({ rule: 'masking', severity: 'error' }),
    ])
    expect(extractProse('app/page.tsx', 'const title = "unterminated').errors).toEqual([
      expect.objectContaining({ rule: 'masking', severity: 'error' }),
    ])
  })

  it('preserves TS/TSX newlines while masking non-prose code', async () => {
    const { extractProse } = await import('../scripts/prose-lint.mjs')
    const source = `const hidden = "not prose"
const title = "Visible title"
const value = 42
return <p>Line one
Line two</p>`
    const result = extractProse('app/page.tsx', source)
    expect(result.maskedText.split('\n')).toHaveLength(source.split('\n').length)
    expect(result.spans.find((span: { text: string }) => span.text.includes('Line two'))?.line).toBe(5)
  })

  it('does not treat JSX contractions, regex literals, or nested templates as malformed strings', async () => {
    const { extractProse } = await import('../scripts/prose-lint.mjs')
    const source = [
      `const matcher = /it's "quoted"/gi`,
      'const title = `Outer visible ${`nested code`} heading`',
      `return <p>It's visible and we're safe.</p>`,
    ].join('\n')
    const result = extractProse('app/page.tsx', source)
    expect(result.errors).toEqual([])
    expect(result.maskedText).toContain('Outer visible')
    expect(result.maskedText).toContain('heading')
    expect(result.maskedText).toContain("It's visible and we're safe.")
    expect(result.maskedText).not.toContain('matcher')
    expect(result.maskedText).not.toContain('nested code')
  })

  it('keeps comment-like text inside strings and regexes masked as code', async () => {
    const { extractProse } = await import('../scripts/prose-lint.mjs')
    const source = `const internal = "https://example.com // not a comment"
const matcher = /https?:\\/\\/example\\.com\\/\\/safe/gi
// leverage this comment
return <p>Visible copy.</p>`
    const result = extractProse('app/page.tsx', source)
    expect(result.errors).toEqual([])
    expect(result.maskedText).toContain('Visible copy.')
    expect(result.maskedText).not.toContain('not a comment')
    expect(result.maskedText).not.toContain('safe')
  })

  it('does not expose selected attrs from comments, strings, or templates', async () => {
    const { extractProse } = await import('../scripts/prose-lint.mjs')
    const source = `/* <p>ensure</p><img alt="ensure"> */
const template = \`<img alt="utilize">\`
const code = '<button title="leverage">'
return <img alt="Visible alt" src="/x.png" />`
    const result = extractProse('app/page.tsx', source)
    expect(result.errors).toEqual([])
    expect(result.maskedText).toContain('Visible alt')
    expect(result.maskedText).not.toContain('ensure')
    expect(result.maskedText).not.toContain('utilize')
    expect(result.maskedText).not.toContain('leverage')
    expect(result.maskedText).not.toContain('ensure')
  })

  it('handles apostrophes in TS single-quoted visible strings', async () => {
    const { extractProse } = await import('../scripts/prose-lint.mjs')
    const result = extractProse('app/page.tsx', `const title = 'It's visible and we're safe'`)
    expect(result.errors).toEqual([])
    expect(result.maskedText).toContain("It's visible and we're safe")
  })

  it('extracts representative reader-facing app/page copy without code strings', async () => {
    const { extractProse } = await import('../scripts/prose-lint.mjs')
    const source = `import Link from 'next/link'
const metadata = { description: 'A visible page description' }
const query = /ensure\\s+robust/g
export default function Page() {
  const internal = 'utilize this implementation detail'
  return <main aria-label="Reader label"><h1>About this site</h1><button>Read the notes</button></main>
}`
    const result = extractProse('app/about/page.tsx', source)
    expect(result.errors).toEqual([])
    expect(result.maskedText).toContain('A visible page description')
    expect(result.maskedText).toContain('Reader label')
    expect(result.maskedText).toContain('About this site')
    expect(result.maskedText).toContain('Read the notes')
    expect(result.maskedText).not.toContain('utilize this implementation detail')
  })

  it('masks JSX expression placeholders while retaining surrounding text', async () => {
    const { extractProse } = await import('../scripts/prose-lint.mjs')
    const result = extractProse('app/page.tsx', 'return <p>Hello {t.title}, {children}.</p>')
    expect(result.errors).toEqual([])
    expect(result.maskedText).toContain('Hello')
    expect(result.maskedText).toContain('.')
    expect(result.maskedText).not.toContain('t.title')
    expect(result.maskedText).not.toContain('children')
  })

  it('masks nested JSX expressions containing strings and nested objects', async () => {
    const { extractProse } = await import('../scripts/prose-lint.mjs')
    const source = 'return <Callout>{fn({label: "utilize this", nested: {x: "ensure"}})}Visible {ensure}</Callout>'
    const result = extractProse('app/page.tsx', source)
    expect(result.errors).toEqual([])
    expect(result.maskedText).toContain('Visible')
    expect(result.maskedText).not.toContain('utilize')
    expect(result.maskedText).not.toContain('ensure')
  })

  it('accepts division in JSX expressions while masking regex literals', async () => {
    const { extractProse } = await import('../scripts/prose-lint.mjs')
    const result = extractProse('app/page.tsx', 'return <p>{a / b}Visible {x / 2} { /\\}/.test(value) }</p>')
    expect(result.errors).toEqual([])
    expect(result.maskedText).toContain('Visible')
    expect(result.maskedText).not.toContain('value')
  })

  it('masks MDX HTML and JSX comments and reports unterminated JSX expressions', async () => {
    const { extractProse } = await import('../scripts/prose-lint.mjs')
    const comments = extractProse('post.mdx', '<!-- ensure hidden -->\n<Callout>{/* } leverage hidden */}Visible {// } ensure hidden\n}</Callout>')
    expect(comments.errors).toEqual([])
    expect(comments.maskedText).not.toContain('ensure')
    expect(comments.maskedText).not.toContain('leverage')
    const broken = extractProse('app/page.tsx', 'return <p>{fn({label: "ensure"})</p>')
    expect(broken.errors.some((error: { rule: string }) => error.rule === 'masking')).toBe(true)
    expect(extractProse('app/page.tsx', '<p>{unterminated<span>Visible</span></p>').errors.some((error: { rule: string }) => error.rule === 'masking')).toBe(true)
    expect(extractProse('app/page.tsx', '<p>Visible {unterminated<span>More</span></p>').errors.some((error: { rule: string }) => error.rule === 'masking')).toBe(true)
    const fenced = extractProse('post.mdx', '```md\n<p>{unterminated</p>\n```\nBody')
    expect(fenced.errors).toEqual([])
  })
})

describe('prose rules and reporting', () => {
  it('hard-fails explicit AI tells and em-dash budget but warns on style heuristics', async () => {
    const { lintProse } = await import('../scripts/prose-lint.mjs')
    const source = `---\ntitle: Test\n---\nThis comprehensive guide will leverage a robust approach; it is important to note that it is useful — perhaps.\n`
    const report = lintProse('content/blog/test/index.mdx', source, { mode: 'ci' })
    expect(report.findings.some((finding: { rule: string; severity: string }) => finding.rule === 'ai-tell' && finding.severity === 'error')).toBe(true)
    expect(report.findings.some((finding: { rule: string; severity: string }) => finding.rule === 'marketing-adjective' && finding.severity === 'warning')).toBe(true)
    expect(report.findings.some((finding: { rule: string }) => finding.rule === 'semicolon')).toBe(true)
    expect(report.mode).toBe('ci')
  })

  it('allows Australian spelling, contractions, technical terms, quoted copy, and permitted hedges', async () => {
    const { lintProse } = await import('../scripts/prose-lint.mjs')
    const source = `---\ntitle: Test\n---\nI think we can utilise the optimiser; "leverage" is a quoted label. Perhaps this could work.`
    const report = lintProse('post.mdx', source)
    expect(report.findings.filter((finding: { severity: string }) => finding.severity === 'error')).toHaveLength(0)
  })

  it('sorts findings by file, line, column, then rule', async () => {
    const { sortFindings } = await import('../scripts/prose-lint.mjs')
    const findings = sortFindings([
      { file: 'b.mdx', line: 1, column: 1, rule: 'z' },
      { file: 'a.mdx', line: 2, column: 1, rule: 'a' },
      { file: 'a.mdx', line: 1, column: 4, rule: 'z' },
    ])
    expect(findings.map((finding: { file: string; line: number }) => `${finding.file}:${finding.line}`)).toEqual(['a.mdx:1', 'a.mdx:2', 'b.mdx:1'])
  })

  it('maps duplicate sentences to their own source lines', async () => {
    const { lintProse } = await import('../scripts/prose-lint.mjs')
    const report = lintProse('post.mdx', 'A sentence that is deliberately long enough to trigger the sentence warning because it contains many words and details for this duplicate mapping check.\n\nA sentence that is deliberately long enough to trigger the sentence warning because it contains many words and details for this duplicate mapping check.')
    const lines = report.findings.filter((finding: { rule: string }) => finding.rule === 'long-sentence').map((finding: { line: number }) => finding.line)
    expect(lines).toEqual([1, 3])
  })

  it('counts em dashes only in visible prose', async () => {
    const { lintProse } = await import('../scripts/prose-lint.mjs')
    const source = `const hidden = "— — — — — —"\nreturn <div data-note="— — — —">Plain prose.</div>`
    expect(lintProse('app/page.tsx', source).findings.some((finding: { rule: string }) => finding.rule === 'em-dash-budget')).toBe(false)
  })

  it('points em-dash findings at the first visible dash', async () => {
    const { lintProse } = await import('../scripts/prose-lint.mjs')
    const source = `hidden\n<p>${'word '.repeat(160)}— visible — one — two — three</p>`
    const finding = lintProse('app/page.tsx', source).findings.find((item: { rule: string }) => item.rule === 'em-dash-budget')
    expect(finding?.line).toBe(2)
    expect(finding?.column).toBe(source.split('\n')[1].indexOf('—') + 1)
  })

  it('maps long paragraphs after CRLF and multiple blank lines', async () => {
    const { lintProse } = await import('../scripts/prose-lint.mjs')
    const paragraph = Array.from({ length: 7 }, (_, index) => `Sentence ${index + 1}.`).join(' ')
    const report = lintProse('post.mdx', `${paragraph}\r\n\r\n\r\nShort.`)
    const finding = report.findings.find((item: { rule: string }) => item.rule === 'long-paragraph')
    expect(finding?.line).toBe(1)
  })
})

describe('prose linter CLI', () => {
  it('supports JSON output and CI exit statuses', () => {
    const cli = resolve(root, 'scripts/lint-prose.mjs')
    const clean = spawnSync(process.execPath, [cli, '--files', 'content/blog/hello-world/index.mdx', '--format', 'json'], { cwd: root, encoding: 'utf8' })
    expect(clean.status).toBe(0)
    expect(() => JSON.parse(clean.stdout)).not.toThrow()

    const fixture = resolve(root, 'content/blog/prose-lint-hard-failure/index.mdx')
    mkdirSync(resolve(root, 'content/blog/prose-lint-hard-failure'), { recursive: true })
    // The fixture is written into the REAL content/blog tree (the prose CLI only
    // accepts manifest paths), so a parallel vitest worker can observe it via
    // getAllPosts(). Give it complete frontmatter — a missing `date` throws
    // content-validation errors in lib/content.test.ts — plus an ancient date
    // and draft:true so it can never displace the "latest post" assertion.
    const frontmatter = '---\ntitle: Test\ndate: 1970-01-01\ndraft: true\n---\n'
    writeFileSync(fixture, frontmatter + Array.from({ length: 4 }, () => 'one — two — three — four — five').join(' '))
    const hard = spawnSync(process.execPath, [cli, '--files', fixture, '--ci', '--format', 'json'], { cwd: root, encoding: 'utf8' })
    rmSync(resolve(root, 'content/blog/prose-lint-hard-failure'), { recursive: true, force: true })
    expect(hard.status).toBe(1)

    const glob = spawnSync(process.execPath, [cli, '--files', 'app/**/*.tsx', '--format', 'json'], { cwd: root, encoding: 'utf8' })
    const globReports = JSON.parse(glob.stdout)
    expect(globReports.some((report: { file: string }) => report.file === 'app/blog/[slug]/page.tsx')).toBe(true)

    const excluded = spawnSync(process.execPath, [cli, '--files', 'public/blog/hello-world/index.md', '--ci', '--format', 'json'], { cwd: root, encoding: 'utf8' })
    expect(excluded.status).toBe(2)
  })
})
