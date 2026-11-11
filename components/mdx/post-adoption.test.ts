import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { compile } from '@mdx-js/mdx'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import fixtures from './post-adoption-fixtures.json'
const hash = (text:string) => createHash('sha256').update(text).digest('hex')
describe('representative post adoption', () => {
  for (const fixture of fixtures) it(`preserves authored content and metadata for ${fixture.slug}`, async () => {
    const raw = readFileSync(new URL(`../../content/blog/${fixture.slug}/index.mdx`, import.meta.url), 'utf8')
    const [,frontmatter,body] = raw.split('---',3)
    expect(hash(frontmatter)).toBe(fixture.frontmatterSha)
    const content = body.replace(/<\/?(?:Callout|FieldNote|PostBrief)\b[^>]*>/g,'').trim().replace(/\s+/g,' ')
    expect(hash(content)).toBe(fixture.bodySha)
    expect(body.match(/<PostBrief /g)).toHaveLength(1)
    expect(body.match(/<FieldNote /g)).toHaveLength(1)
    await expect(compile(body, { remarkPlugins: [remarkMath, remarkGfm] })).resolves.toBeDefined()
  })
})
