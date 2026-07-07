import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { getPublishedPosts } from './content'
import { EFFECT_LOADERS, LAB_DEMO_EFFECTS, LAB_EFFECTS, isLabConceptGuide } from './lab/registry'
import { labPosterFor } from './lab/posters'

const BLOG_ADDITIONS = [
  {
    slug: 'how-dram-remembers-a-bit',
    title: 'How DRAM remembers a bit',
    tags: ['hardware', 'semiconductors', 'memory'],
  },
  {
    slug: 'backpressure-is-the-system-saying-no',
    title: 'Backpressure is the system saying no',
    tags: ['software', 'systems'],
  },
] as const

const LAB_ADDITIONS = [
  { slug: 'aliasing-and-nyquist', title: 'Aliasing and Nyquist', category: 'engineering' },
  { slug: 'feedback-stability-margins', title: 'Feedback Stability Margins', category: 'engineering' },
  { slug: 'complex-maps-and-airfoils', title: 'Complex Maps and Airfoils', category: 'maths' },
  { slug: 'chaos-sensitivity', title: 'Sensitive Dependence', category: 'maths' },
  { slug: 'turing-patterns', title: 'Turing Patterns', category: 'maths' },
] as const

describe('requested content expansion', () => {
  it('publishes the two requested blog posts with skimmable metadata', () => {
    const posts = getPublishedPosts()

    for (const expected of BLOG_ADDITIONS) {
      const post = posts.find((p) => p.slug === expected.slug)
      expect(post, `${expected.slug} is published`).toBeTruthy()
      expect(post?.title).toBe(expected.title)
      expect(post?.takeaways?.length ?? 0).toBeGreaterThanOrEqual(3)
      expect(post?.wordCount ?? 0).toBeGreaterThan(900)
      expect(post?.heroImage).toBe(`/blog/${expected.slug}/hero.webp`)
      expect(fs.existsSync(path.join(process.cwd(), 'public', `blog/${expected.slug}/hero.webp`))).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'content/blog', expected.slug, 'hero.webp'))).toBe(true)
      for (const tag of expected.tags) {
        expect(post?.tags).toContain(tag)
      }
    }
  })

  it('registers five additional lab topic pages with explainer content', () => {
    for (const expected of LAB_ADDITIONS) {
      const entry = LAB_EFFECTS.find((effect) => effect.slug === expected.slug)
      expect(entry, `${expected.slug} is registered`).toBeTruthy()
      expect(entry?.title).toBe(expected.title)
      expect(entry?.category).toBe(expected.category)
      expect(isLabConceptGuide(expected.slug)).toBe(true)
      expect(LAB_DEMO_EFFECTS.some((effect) => effect.slug === expected.slug)).toBe(false)
      expect(EFFECT_LOADERS[expected.slug], `${expected.slug} has a live effect loader`).toBeTypeOf('function')

      const explainerPath = path.join(process.cwd(), 'content/lab', `${expected.slug}.mdx`)
      expect(fs.existsSync(explainerPath), `${expected.slug} has an MDX explainer`).toBe(true)
      expect(fs.readFileSync(explainerPath, 'utf8').split(/\s+/).length).toBeGreaterThan(350)

      const poster = labPosterFor(expected.slug)
      expect(poster, `${expected.slug} has a static preview poster`).toBe(`/lab/previews/${expected.slug}.webp`)
      expect(fs.existsSync(path.join(process.cwd(), 'public', poster!.replace(/^\//, '')))).toBe(true)
    }
  })
})
