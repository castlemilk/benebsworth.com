import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { getPublishedPosts } from './content'
import { topicFor } from './topics'

const SLUG = 'dspark-speculative-decoding'

describe('DSpark blog post', () => {
  it('publishes a researched DeepSpec/DSpark post with skimmable metadata', () => {
    const post = getPublishedPosts().find((candidate) => candidate.slug === SLUG)

    expect(post, `${SLUG} is published`).toBeTruthy()
    expect(post?.title).toBe('DSpark turns speculation into a scheduler')
    expect(post?.description).toMatch(/speculative decoding/i)
    expect(post?.takeaways?.length ?? 0).toBeGreaterThanOrEqual(4)
    expect(post?.wordCount ?? 0).toBeGreaterThan(1700)
    expect(post?.tags).toEqual(expect.arrayContaining(['ai', 'software', 'inference', 'llm']))
    expect(post?.body).toContain('<DeepSpecEli5Flow')
    expect(post?.body).toContain('<DeepSpecArchitecture')
    expect(post?.body).toMatch(/Why the simple idea is novel/i)
    expect(post?.body).toMatch(/neurology parallel/i)
    expect(post?.body).toMatch(/predictive coding/i)
    expect(post ? topicFor(post).label : '').toBe('Software')
  })

  it('wires the bespoke DSpark diagrams into MDX and markdown siblings', () => {
    const root = process.cwd()
    const architecture = path.join(root, 'components/mdx/deepspec-architecture.tsx')
    const eli5Flow = path.join(root, 'components/mdx/deepspec-eli5-flow.tsx')
    const lazy = fs.readFileSync(path.join(root, 'components/mdx/lazy-mdx-components.tsx'), 'utf8')
    const registration = fs.readFileSync(path.join(root, 'components/mdx/mdx-components.tsx'), 'utf8')
    const siblingGenerator = fs.readFileSync(path.join(root, 'scripts/gen-md-siblings.mjs'), 'utf8')

    expect(fs.existsSync(architecture)).toBe(true)
    expect(fs.existsSync(eli5Flow)).toBe(true)
    expect(lazy).toContain('DeepSpecArchitecture')
    expect(lazy).toContain('DeepSpecEli5Flow')
    expect(registration).toContain('DeepSpecArchitecture')
    expect(registration).toContain('DeepSpecEli5Flow')
    expect(siblingGenerator).toContain('DeepSpecArchitecture:')
    expect(siblingGenerator).toContain('DeepSpecEli5Flow:')
  })
})
