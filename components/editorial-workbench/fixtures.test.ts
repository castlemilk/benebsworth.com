import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import matter from 'gray-matter'
import { CATEGORIES, LAB_EFFECTS } from '@/lib/lab/registry'
import { ADDITIONAL_STUDIES } from '@/lib/generative-svg/additional-studies'
import { studyUrl } from '@/lib/generative-svg/registry'
import { TOPIC, topicFor } from '@/lib/topics'
import { FIXTURE_REVISION, FOLIO_ENTITIES, FOLIO_RELATIONSHIPS, FOLIO_TOPICS } from './fixtures'

// These imports contain metadata and lazy loader declarations. No effect loader,
// canvas renderer, scientific model function or browser is executed here.
const articlePath = 'content/blog/every-wire-is-an-rlc-circuit/index.mdx'
const articleMdx = readFileSync(new URL(`../../${articlePath}`, import.meta.url), 'utf8')
const articleMetadata = matter(articleMdx).data
const articleTags = String(articleMetadata.labels).split(',').map(tag => tag.trim())
const article = FOLIO_ENTITIES.find(entity => entity.kind === 'blog')!
const lab = FOLIO_ENTITIES.find(entity => entity.kind === 'lab')!
const study = FOLIO_ENTITIES.find(entity => entity.kind === 'study')!
const labRecord = LAB_EFFECTS.find(entry => entry.slug === 'rlc-resonance')!
const studyRecord = ADDITIONAL_STUDIES.find(entry => entry.id === 'rlc-resonance')!

describe('editorial workbench source fixtures', () => {
  it('keeps one separately identified article, lab and study', () => {
    expect(FOLIO_ENTITIES.map(entity => entity.kind)).toEqual(['blog', 'lab', 'study'])
    expect(new Set(FOLIO_ENTITIES.map(entity => entity.id)).size).toBe(FOLIO_ENTITIES.length)
    expect(new Set(FOLIO_ENTITIES.map(entity => entity.href)).size).toBe(FOLIO_ENTITIES.length)
    expect(FOLIO_ENTITIES.every(entity => entity.id.startsWith('fixture:'))).toBe(true)
  })

  it('uses the published article title, tags, destination and curated topic', () => {
    expect(articleMetadata.release).toBe(true)
    expect(articleMetadata.draft).not.toBe(true)
    expect(article.title).toBe(articleMetadata.title)
    expect(article.tags).toEqual(articleTags)
    expect(article.href).toBe('/blog/every-wire-is-an-rlc-circuit/')
    expect(article.context).toContain(String(articleMetadata.author))
    expect(articleMetadata.date).toBe('2026-06-17T00:00:00.000Z')
    expect(article.context).toContain('17 June 2026')
    expect(article.category).toEqual({ registry: 'Blog topic', key: 'ee', label: topicFor({ slug: 'every-wire-is-an-rlc-circuit', tags: articleTags }).label })
  })

  it('preserves the lab registry metadata and category label verbatim', () => {
    expect(labRecord).toBeDefined()
    expect(lab.title).toBe(labRecord.title)
    expect(lab.summary).toBe(labRecord.blurb)
    expect(lab.tags).toEqual(labRecord.tags)
    expect(lab.href).toBe(`/lab/${labRecord.slug}/`)
    expect(lab.category).toEqual({
      registry: 'Lab category',
      key: labRecord.category,
      label: CATEGORIES.find(category => category.key === labRecord.category)!.label,
    })
    const explanation = readFileSync(new URL('../../content/lab/rlc-resonance.mdx', import.meta.url), 'utf8')
    expect(explanation).toContain('capacitor voltage')
    expect(lab.context).toContain('Capacitor voltage')
  })

  it('preserves the mathematical SVG study and its actual study destination', () => {
    expect(studyRecord).toBeDefined()
    expect(study.title).toBe(studyRecord.title)
    expect(study.summary).toBe(studyRecord.description)
    expect(study.tags).toEqual(studyRecord.tags)
    expect(study.href).toBe(studyUrl(studyRecord))
    expect(study.category).toEqual({ registry: 'Study category', key: studyRecord.category, label: studyRecord.category })
    expect(studyRecord.provenance).toBe('math-derived')
    expect(study.context).toContain(studyRecord.provenance)
    expect(studyRecord.basis).toContain('V_R/V_in')
    expect(study.context).toContain('Resistor voltage')
  })

  it('does not collapse equal raw slugs or the three source vocabularies', () => {
    expect(labRecord.slug).toBe(studyRecord.id)
    expect(lab.id).not.toBe(study.id)
    expect(lab.href).not.toBe(study.href)
    expect(lab.sources[0].href).not.toBe(study.sources[0].href)
    expect(FOLIO_ENTITIES.map(entity => entity.category?.key)).toEqual(['ee', 'engineering', 'Electronics'])
    expect(lab.context).not.toBe(study.context)
  })

  it('backs the authored reference and shared tag with the actual source records', () => {
    const authored = FOLIO_RELATIONSHIPS.find(relationship => relationship.basisLabel === 'Authored component reference')!
    expect(authored.basis).toBe('source-record')
    expect(authored.subject).toBe(articleMetadata.title)
    expect(authored.object).toBe(labRecord.title)
    expect(articleMdx).toMatch(new RegExp(`<LabSide\\s+effect=["']${labRecord.slug}["']`))
    expect(authored.sources).toEqual(article.sources)

    const shared = FOLIO_RELATIONSHIPS.find(relationship => relationship.basisLabel === 'Shared metadata')!
    expect(shared.basis).toBe('source-record')
    expect(articleTags).toContain(shared.object)
    expect(labRecord.tags).toContain(shared.object)
    expect(studyRecord.tags).toContain(shared.object)
    expect(shared.sources.map(source => source.id)).toEqual([lab.sources[0].id, study.sources[0].id])
    expect(shared.explanation).toContain('do not establish scientific equivalence')

    const proposal = FOLIO_RELATIONSHIPS.find(relationship => relationship.basis === 'proposal')!
    expect(proposal).toBeDefined()
    expect(proposal.sources).toEqual([])
  })

  it('supplies every current topic and preserves the original artwork record', () => {
    const suppliedKeys = FOLIO_TOPICS.map(item => item.key)
    expect(suppliedKeys).toEqual(Object.keys(TOPIC))
    expect(suppliedKeys.length).toBeGreaterThanOrEqual(20)
    for (const { key, topic } of FOLIO_TOPICS) {
      expect(topic).toEqual(TOPIC[key as keyof typeof TOPIC])
      expect(existsSync(new URL(`../../public${topic.icon}`, import.meta.url))).toBe(true)
    }
    for (const key of ['maths', 'chemistry', 'biology', 'earth', 'kubernetes', 'istio']) {
      expect(suppliedKeys).toContain(key)
    }
    expect(FOLIO_TOPICS.filter(({ topic }) => topic.icon.startsWith('/topics/custom-v6/'))).toHaveLength(6)
  })

  it('pins all recorded locators to the declared repository snapshot', () => {
    expect(FIXTURE_REVISION).toMatch(/^[0-9a-f]{40}$/)
    const expectedPaths = [articlePath, 'lib/lab/registry.ts', 'lib/generative-svg/additional-studies.ts']
    for (const [index, entity] of FOLIO_ENTITIES.entries()) {
      expect(entity.sources).toHaveLength(1)
      const source = entity.sources[0]
      expect(source.state).toBe('recorded')
      expect(source.revision).toBe(FIXTURE_REVISION)
      const url = new URL(source.href!)
      expect(url.origin).toBe('https://github.com')
      expect(url.pathname).toBe(`/castlemilk/benebsworth.com/blob/${FIXTURE_REVISION}/${expectedPaths[index]}`)
      expect(source.locator).toContain(expectedPaths[index])
      expect(existsSync(new URL(`../../${expectedPaths[index]}`, import.meta.url))).toBe(true)
    }
  })
})
