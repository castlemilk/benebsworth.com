import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import matter from 'gray-matter'
import { SPATIAL_CATALOG } from './catalog'
import { loadSpatialLesson } from './loaders'
import { getEffect } from '../registry'
import { labPosterFor } from '../posters'
import { topicFor } from '@/lib/topics'

const DESK_LABEL: Record<string, RegExp> = { maths: /Math/, physics: /Physics/, engineering: /Electrical/, chemistry: /Chemistry/, biology: /Life Sciences/, earth: /Earth/ }

describe('spatial science publishing contract', () => {
  it('publishes every catalogued essay with a distinct, discoverable experiment', async () => {
    expect(SPATIAL_CATALOG.length).toBeGreaterThanOrEqual(10)
    expect(new Set(SPATIAL_CATALOG.map(entry => entry.blogSlug)).size).toBe(SPATIAL_CATALOG.length)
    expect(new Set(SPATIAL_CATALOG.map(entry => entry.slug)).size).toBe(SPATIAL_CATALOG.length)
    for (const entry of SPATIAL_CATALOG) {
      const lesson = await loadSpatialLesson(entry.slug)
      expect(lesson.blogSlug).toBe(entry.blogSlug)
      expect(getEffect(entry.slug)?.category).toBe(entry.category)
      expect(labPosterFor(entry.slug)).toBe(`/blog/${entry.blogSlug}/hero.webp`)
      const { data, content } = matter(fs.readFileSync(`content/blog/${entry.blogSlug}/index.mdx`, 'utf8'))
      expect(data.release).toBe(true)
      expect(data.takeaways.length).toBeGreaterThanOrEqual(3)
      expect(content).toContain(`<SpatialLab slug="${entry.slug}"`)
      expect(content).toContain(`/lab/${entry.slug}/`)
      expect(content.match(/<Equation /g)?.length).toBeGreaterThanOrEqual(3)
      const sourceHero = fs.readFileSync(`content/blog/${entry.blogSlug}/hero.webp`)
      const servedHero = fs.readFileSync(`public/blog/${entry.blogSlug}/hero.webp`)
      expect(sourceHero.equals(servedHero), `${entry.slug}: source and served hero match`).toBe(true)
      expect(sourceHero.byteLength).toBeLessThan(250_000)
      const topic = topicFor({ slug: entry.blogSlug, tags: [] })
      expect(topic.label).toMatch(DESK_LABEL[entry.category])
      expect(fs.existsSync(`content/lab/${entry.slug}.mdx`)).toBe(true)
      for (const control of lesson.controls) {
        expect(lesson.defaults[control.key]).toBeGreaterThanOrEqual(control.min)
        expect(lesson.defaults[control.key]).toBeLessThanOrEqual(control.max)
      }
    }
  })
})
