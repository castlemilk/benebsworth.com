import { describe, it, expect } from 'vitest'
import { topicFor, TOPIC } from './topics'
import { tagColor } from './tag-colors'

describe('TOPIC constant', () => {
  const KEYS = ['kubernetes', 'istio', 'tekton', 'kustomize', 'minikube', 'gcp', 'react', 'algorithms', 'general', 'technology'] as const

  it('has expected keys', () => {
    for (const k of KEYS) {
      expect(TOPIC).toHaveProperty(k)
    }
  })

  it('each topic has icon, label, accent fields', () => {
    for (const k of KEYS) {
      const t = TOPIC[k]
      expect(t.icon).toBeTruthy()
      expect(t.icon).toMatch(/^\/topics\/.+\.\w+$/)
      expect(t.label).toBeTruthy()
      expect(typeof t.label).toBe('string')
      expect(t.accent).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('no duplicate labels', () => {
    const labels = KEYS.map((k) => TOPIC[k].label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe('topicFor()', () => {
  it('returns correct topic for known slugs via BY_SLUG', () => {
    const { label, accent } = topicFor({ slug: 'istio-patterns', tags: [] })
    expect(label).toBe('Service Mesh')
    expect(accent).toBe('#7c5cff')

    const t2 = topicFor({ slug: 'binary-search-tree', tags: [] })
    expect(t2.label).toBe('Algorithms')
    expect(t2.accent).toBe('#ff7a59')

    const t3 = topicFor({ slug: 'kustomize-examples', tags: [] })
    expect(t3.label).toBe('Config · Kustomize')
    expect(t3.accent).toBe('#00e0b8')

    const t4 = topicFor({ slug: 'hello-world', tags: [] })
    expect(t4.label).toBe('Field Notes')
    expect(t4.accent).toBe('#ff7a59')
  })

  it('falls through to tag rules when slug is unknown', () => {
    const t = topicFor({ slug: 'some-new-post', tags: ['kubernetes'] })
    expect(t.label).toBe('Kubernetes')
    expect(t.accent).toBe('#00e0b8')
  })

  it('matches case-insensitive tags', () => {
    const t = topicFor({ slug: 'unknown-slug', tags: ['Kubernetes'] })
    expect(t.label).toBe('Kubernetes')

    const t2 = topicFor({ slug: 'another-slug', tags: ['REACT', 'node'] })
    expect(t2.label).toBe('React')
  })

  it('returns technology for unknown slug with no matching tags', () => {
    const t = topicFor({ slug: 'totally-new-post', tags: ['machine-learning'] })
    expect(t.label).toBe('Engineering')
    expect(t.accent).toBe('#00e0b8')

    const t2 = topicFor({ slug: 'another-new-post', tags: [] })
    expect(t2.label).toBe('Engineering')
  })
})

describe('tagColor()', () => {
  it('returns known colors for known tags', () => {
    expect(tagColor('kubernetes')).toBe('#8ab4f8')
    expect(tagColor('istio')).toBe('#b39ddb')
    expect(tagColor('react')).toBe('#90caf9')
    expect(tagColor('gcp')).toBe('#f6a5c0')
    expect(tagColor('go')).toBe('#80deea')
    expect(tagColor('python')).toBe('#fff59d')
    expect(tagColor('machine-learning')).toBe('#f6a5c0')
    expect(tagColor('deep-learning')).toBe('#ce93d8')
    expect(tagColor('algorithms')).toBe('#b39ddb')
  })

  it('is case-insensitive', () => {
    expect(tagColor('Kubernetes')).toBe('#8ab4f8')
    expect(tagColor('KUBERNETES')).toBe('#8ab4f8')
    expect(tagColor('Machine-Learning')).toBe('#f6a5c0')
  })

  it('returns stable colors for unknown tags (same input = same output)', () => {
    const a1 = tagColor('zizobaloop')
    const a2 = tagColor('zizobaloop')
    expect(a1).toBe(a2)
    expect(a1).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('different unknown tags can return different colors', () => {
    const seen = new Set<string>()
    const inputs = ['xyzzy', 'floob', 'bazquux', 'wibble', 'frotz', 'snork', 'bloop', 'gleep', 'glorp', 'zizzle']
    for (const inp of inputs) {
      seen.add(tagColor(inp))
    }
    // If all 10 resolve to the same palette entry, something is wrong.
    // Given 14 palette slots and deterministic hashing, collisions are rare but possible;
    // we just assert that we got at least 2 distinct colors across 10 inputs.
    expect(seen.size).toBeGreaterThanOrEqual(2)
  })
})
