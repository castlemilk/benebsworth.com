import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import {
  METHODOLOGY_CUTOFF,
  benchmarkSignals,
  classifyPost,
  parseBenchRepro,
  postDay,
  summarize,
  type PostInput,
} from './methodology'

const post = (over: Partial<PostInput> = {}): PostInput => ({
  slug: 'a-post',
  frontmatter: { title: 'T', date: '2026-01-01' },
  body: 'prose',
  ...over,
})

const VALID = { commit: '6f9ed47', sweeps: ['2026-08-16T09-30-12'] }

describe('benchmarkSignals', () => {
  it('detects a post that links the benchmark section', () => {
    expect(benchmarkSignals(post({ body: 'our [benchmark](/lab/llm-benchmark/) says' }))).toEqual([
      'links /lab/llm-benchmark',
    ])
  })

  it('detects a post labelled benchmarking, comma-string or list', () => {
    expect(benchmarkSignals(post({ frontmatter: { labels: 'software,llm,benchmarking' } }))).toEqual([
      'labelled benchmarking',
    ])
    expect(benchmarkSignals(post({ frontmatter: { tags: ['LLM', 'Benchmarking'] } }))).toEqual([
      'labelled benchmarking',
    ])
  })

  it('reports both signals when both fire', () => {
    expect(
      benchmarkSignals(post({ body: 'see /lab/llm-benchmark/', frontmatter: { labels: 'benchmarking' } })),
    ).toHaveLength(2)
  })

  it('does not fire on a post that merely names models and scores', () => {
    // The K3 architecture teardown quotes vendor numbers and claims nothing of
    // its own — over-triggering here would train the reader to ignore the check.
    expect(
      benchmarkSignals(
        post({ body: 'Kimi K3 scores 90.5 on the vendor board, ahead of GPT-5.', frontmatter: { labels: 'llm' } }),
      ),
    ).toEqual([])
  })
})

describe('parseBenchRepro', () => {
  it('reads a well-formed block', () => {
    expect(parseBenchRepro({ benchRepro: VALID })).toEqual({ kind: 'ok', repro: VALID })
  })

  it('accepts optional bundle hashes', () => {
    const withBundles = { ...VALID, bundles: ['4f1c9a02b3d7e155'] }
    expect(parseBenchRepro({ benchRepro: withBundles })).toEqual({ kind: 'ok', repro: withBundles })
  })

  it('reports absence distinctly from malformation', () => {
    expect(parseBenchRepro({}).kind).toBe('absent')
    expect(parseBenchRepro({ benchRepro: null }).kind).toBe('absent')
  })

  it('rejects a non-mapping block', () => {
    expect(parseBenchRepro({ benchRepro: 'commit=6f9ed47' }).kind).toBe('malformed')
    expect(parseBenchRepro({ benchRepro: ['6f9ed47'] }).kind).toBe('malformed')
  })

  it('requires a commit that looks like a sha', () => {
    expect(parseBenchRepro({ benchRepro: { sweeps: VALID.sweeps } })).toMatchObject({
      kind: 'malformed',
      errors: [expect.stringContaining('commit is required')],
    })
    expect(parseBenchRepro({ benchRepro: { ...VALID, commit: 'HEAD' } })).toMatchObject({
      kind: 'malformed',
      errors: [expect.stringContaining('not a git sha')],
    })
  })

  it('requires at least one sweep id in the sweepRunId() shape', () => {
    expect(parseBenchRepro({ benchRepro: { commit: VALID.commit, sweeps: [] } })).toMatchObject({
      kind: 'malformed',
      errors: [expect.stringContaining('sweeps is required')],
    })
    expect(parseBenchRepro({ benchRepro: { commit: VALID.commit, sweeps: ['yesterday'] } })).toMatchObject({
      kind: 'malformed',
      errors: [expect.stringContaining('not a sweep run id')],
    })
  })

  it('rejects a bundle hash that is not 16 hex', () => {
    expect(parseBenchRepro({ benchRepro: { ...VALID, bundles: ['4f1c9a02'] } })).toMatchObject({
      kind: 'malformed',
      errors: [expect.stringContaining('bundle hash')],
    })
  })

  it('returns every error, not just the first', () => {
    const parsed = parseBenchRepro({ benchRepro: { commit: 'zz', sweeps: ['nope'] } })
    expect(parsed.kind).toBe('malformed')
    expect(parsed.kind === 'malformed' && parsed.errors).toHaveLength(2)
  })
})

describe('postDay', () => {
  it('takes the ISO day off any date shape', () => {
    expect(postDay({ date: '2026-08-09T12:00:00.000Z' })).toBe('2026-08-09')
    expect(postDay({ date: '2026-08-09' })).toBe('2026-08-09')
    expect(postDay({ date: new Date('2026-08-09T12:00:00.000Z') })).toBe('2026-08-09')
  })

  it('treats an unreadable date as newer than any cutoff', () => {
    // Ambiguity must not grant a grandfather pass.
    expect(postDay({})).toBe('9999-12-31')
    expect(postDay({ date: 'last Tuesday' })).toBe('9999-12-31')
  })
})

describe('classifyPost', () => {
  const cutoff = '2026-08-17'

  it('skips a post with no benchmark reference', () => {
    expect(classifyPost(post(), cutoff).status).toBe('skipped')
  })

  it('passes a new post that declares its repro block', () => {
    const verdict = classifyPost(
      post({ body: '/lab/llm-benchmark/', frontmatter: { date: '2026-09-01', benchRepro: VALID } }),
      cutoff,
    )
    expect(verdict.status).toBe('ok')
    expect(verdict.repro).toEqual(VALID)
  })

  it('fails a post newer than the cutoff with no repro block', () => {
    const verdict = classifyPost(
      post({ body: '/lab/llm-benchmark/', frontmatter: { date: '2026-09-01' } }),
      cutoff,
    )
    expect(verdict.status).toBe('failed')
    expect(verdict.reason).toContain('on or after')
  })

  it('grandfathers a post published before the cutoff', () => {
    const verdict = classifyPost(
      post({ body: '/lab/llm-benchmark/', frontmatter: { date: '2026-08-09T12:00:00.000Z' } }),
      cutoff,
    )
    expect(verdict.status).toBe('grandfathered')
    expect(verdict.reason).toContain('before the 2026-08-17 cutoff')
  })

  it('treats the cutoff day itself as in scope', () => {
    expect(
      classifyPost(post({ body: '/lab/llm-benchmark/', frontmatter: { date: cutoff } }), cutoff).status,
    ).toBe('failed')
  })

  it('fails a malformed repro block at ANY date — grandfathering covers absence, not lies', () => {
    const verdict = classifyPost(
      post({ body: '/lab/llm-benchmark/', frontmatter: { date: '2020-01-01', benchRepro: { commit: 'HEAD' } } }),
      cutoff,
    )
    expect(verdict.status).toBe('failed')
  })
})

describe('summarize', () => {
  it('counts each bucket and fails only on failures', () => {
    const verdicts = [
      classifyPost(post()),
      classifyPost(post({ body: '/lab/llm-benchmark/', frontmatter: { date: '2020-01-01' } })),
      classifyPost(post({ body: '/lab/llm-benchmark/', frontmatter: { date: '2026-09-01', benchRepro: VALID } })),
    ]
    expect(summarize(verdicts)).toEqual({
      total: 3,
      skipped: 1,
      ok: 1,
      grandfathered: 1,
      failed: 0,
      exitCode: 0,
    })
  })

  it('exits 1 when any post failed', () => {
    const failed = classifyPost(post({ body: '/lab/llm-benchmark/', frontmatter: { date: '2099-01-01' } }))
    expect(summarize([failed]).exitCode).toBe(1)
  })
})

describe('the real content tree', () => {
  const BLOG_DIR = path.join(process.cwd(), 'content/blog')

  const realPosts = (): PostInput[] =>
    fs
      .readdirSync(BLOG_DIR)
      .filter((slug) => fs.existsSync(path.join(BLOG_DIR, slug, 'index.mdx')))
      .map((slug) => {
        const parsed = matter(fs.readFileSync(path.join(BLOG_DIR, slug, 'index.mdx'), 'utf8'))
        return { slug, frontmatter: parsed.data as Record<string, unknown>, body: parsed.content }
      })

  it('classifies every shipped benchmark post as grandfathered, and nothing as failed', () => {
    const verdicts = realPosts().map((p) => classifyPost(p))
    const flagged = verdicts.filter((v) => v.status !== 'skipped')
    // The three published benchmark reports all predate the convention.
    expect(flagged.map((v) => v.slug).sort()).toEqual([
      'benchmarking-agy-frontier',
      'benchmarking-kimi-k3',
      'benchmarking-openrouter-free-tier',
    ])
    expect(flagged.every((v) => v.status === 'grandfathered')).toBe(true)
    expect(summarize(verdicts).exitCode).toBe(0)
  })

  it('keeps the cutoff after every existing benchmark post', () => {
    // A cutoff moved earlier than a shipped post would fail the build on
    // history that cannot be honestly back-stamped.
    const days = realPosts()
      .filter((p) => benchmarkSignals(p).length > 0)
      .map((p) => postDay(p.frontmatter))
    expect(days.every((d) => d < METHODOLOGY_CUTOFF)).toBe(true)
  })
})
