import { describe, expect, it } from 'vitest'
import { buildKnowledgeGraph, type NodeKind } from './graph'
import { existsSync } from 'node:fs'
import { CATEGORIES } from '@/lib/lab/registry'
import { CATEGORY_ART, TOPIC_ART } from './topic-art'

const graph = buildKnowledgeGraph()
const byId = new Map(graph.nodes.map((n) => [n.id, n]))

describe('buildKnowledgeGraph', () => {
  it('contains every node kind', () => {
    const kinds = new Set(graph.nodes.map((n) => n.kind))
    for (const k of ['blog', 'lab', 'study', 'tag', 'concept', 'category'] satisfies NodeKind[]) {
      expect(kinds, `missing kind ${k}`).toContain(k)
    }
  })

  it('retains explicit relationship evidence and volume-scoped study identity', () => {
    for (const e of graph.edges) expect(e.evidence).toBeTruthy()
    for (const n of graph.nodes.filter((n) => n.kind === 'study')) {
      expect(n.id).toBe(`study:${n.href!.replace(/^\/study\//, '').replace(/\/$/, '')}`)
    }
    for (const e of graph.edges.filter((e) => e.kind === 'concept' && !e.source.startsWith('study:'))) {
      expect(e.evidence).toBe('normalized-tag-match')
    }
  })

  it('has unique node ids', () => {
    expect(byId.size).toBe(graph.nodes.length)
  })

  it('every edge references existing nodes', () => {
    for (const e of graph.edges) {
      expect(byId.has(e.source), `edge source ${e.source}`).toBe(true)
      expect(byId.has(e.target), `edge target ${e.target}`).toBe(true)
    }
  })

  it('no tag hub and concept hub share a normalized key (the merge rule)', () => {
    const tagKeys = new Set(graph.nodes.filter((n) => n.kind === 'tag').map((n) => n.id.slice(4)))
    const conceptKeys = graph.nodes.filter((n) => n.kind === 'concept').map((n) => n.id.slice(8))
    for (const k of conceptKeys) {
      expect(tagKeys.has(k), `tag:${k} should have merged into concept:${k}`).toBe(false)
    }
  })

  it('concept-kind edges always target concept hubs', () => {
    for (const e of graph.edges.filter((e) => e.kind === 'concept')) {
      expect(e.target.startsWith('concept:'), `${e.source} -> ${e.target}`).toBe(true)
    }
  })

  it('content nodes carry hrefs; hubs may not', () => {
    for (const n of graph.nodes.filter((n) => n.kind === 'blog' || n.kind === 'lab' || n.kind === 'study')) {
      expect(n.href, `${n.id} missing href`).toMatch(/^\//)
    }
  })

  it('every lab category hub carries mapped artwork', () => {
    const cats = graph.nodes.filter((n) => n.kind === 'category')
    expect(cats.length).toBeGreaterThan(0)
    for (const c of cats) {
      expect(c.art, `${c.id} missing art`).toMatch(/^\/topics\/artwork\//)
      expect(Object.values(TOPIC_ART)).toContain(c.art)
    }
  })

  it('CATEGORY_ART covers exactly the registry categories and resolves to TOPIC_ART', () => {
    expect(Object.keys(CATEGORY_ART).sort()).toEqual(CATEGORIES.map((c) => c.key).sort())
    for (const file of Object.values(TOPIC_ART)) expect(existsSync(`public${file}`)).toBe(true)
    expect(Object.values(CATEGORY_ART).every((v) => Object.values(TOPIC_ART).includes(v))).toBe(true)
    for (const v of Object.values(CATEGORY_ART)) expect(v).toBeTruthy()
  })

  it.skip(/* TODO(knowledge-fluid-ui): unmet regression — feature WIP, see publish 2026-11-26 */ 'art only decorates hubs — content nodes never carry it', () => {
    for (const n of graph.nodes.filter((n) => n.kind === 'blog' || n.kind === 'lab' || n.kind === 'study')) {
      expect(n.art, `${n.id} should not have art`).toBeUndefined()
    }
  })
})
