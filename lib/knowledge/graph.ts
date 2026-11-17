import { getPublishedPosts } from '@/lib/content'
import { CATEGORIES, LAB_EFFECTS } from '@/lib/lab/registry'
import { getCourse, getGlossaryIndex } from '@/lib/study/load'
import { CATEGORY_ART, TOPIC_ART } from './topic-art'

export type NodeKind = 'blog' | 'lab' | 'study' | 'tag' | 'concept' | 'category'
export type EdgeKind = 'tag' | 'concept' | 'category'

export type KGNode = {
  id: string
  kind: NodeKind
  label: string
  href?: string
  blurb?: string
  meta?: string
  /** Category artwork path under /topics/artwork, when one exists for this hub. */
  art?: string
}

export type KGEdge = { source: string; target: string; kind: EdgeKind }
export type KnowledgeGraph = { nodes: KGNode[]; edges: KGEdge[] }

/** Shared normalizer so a glossary term and a content tag collapse onto one hub. */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/**
 * Bipartite content graph: blog posts, lab effects and study packets are
 * leaves; shared tags, lab categories and packet glossary terms are hubs.
 * A glossary term whose normalized form equals a tag merges into one
 * `concept` hub — that's the edge that bridges study packets into the
 * blog/lab world.
 */
export function buildKnowledgeGraph(): KnowledgeGraph {
  const nodes = new Map<string, KGNode>()
  const edges: KGEdge[] = []
  const conceptHubs = new Map<string, KGNode>() // norm(term) → hub
  const tagHubs = new Map<string, KGNode>() // norm(tag) → hub

  const hub = (map: Map<string, KGNode>, key: string, n: Omit<KGNode, 'id'>): KGNode => {
    let h = map.get(key)
    if (!h) {
      h = { id: `${n.kind}:${key}`, ...n }
      map.set(key, h)
      nodes.set(h.id, h)
    }
    return h
  }

  // Study glossary terms first — concept hubs must exist before tags merge in.
  for (const e of getGlossaryIndex()) {
    hub(conceptHubs, norm(e.term), {
      kind: 'concept',
      label: e.term,
      href: '/study/concepts/',
      blurb: e.def,
      art: TOPIC_ART[norm(e.term)],
    })
  }

  const course = getCourse()
  for (const vol of course.volumes) {
    for (const ch of vol.chapters) {
      if (!ch.hasPacket) continue
      nodes.set(`study:${ch.slug}`, {
        id: `study:${ch.slug}`,
        kind: 'study',
        label: ch.title,
        href: `/study/${vol.id}/${ch.slug}/`,
        meta: `chapter ${ch.id.split('/')[1]?.split('_')[0] ?? ''}`,
      })
    }
  }
  for (const e of getGlossaryIndex()) {
    const c = conceptHubs.get(norm(e.term))
    if (c) edges.push({ source: `study:${e.slug}`, target: c.id, kind: 'concept' })
  }

  for (const p of getPublishedPosts()) {
    nodes.set(`blog:${p.slug}`, {
      id: `blog:${p.slug}`,
      kind: 'blog',
      label: p.title,
      href: `/blog/${p.slug}/`,
      blurb: p.description,
      meta: p.date?.slice(0, 7),
    })
    for (const raw of p.tags ?? []) {
      const key = norm(raw)
      if (!key) continue
      const concept = conceptHubs.get(key)
      const t = concept ?? hub(tagHubs, key, { kind: 'tag', label: raw, art: TOPIC_ART[key] })
      edges.push({ source: `blog:${p.slug}`, target: t.id, kind: concept ? 'concept' : 'tag' })
    }
  }

  for (const cat of CATEGORIES) {
    hub(tagHubs, `cat-${cat.key}`, {
      kind: 'category',
      label: cat.label.toLowerCase(),
      blurb: cat.blurb,
      art: CATEGORY_ART[cat.key],
    })
  }

  for (const fx of LAB_EFFECTS) {
    nodes.set(`lab:${fx.slug}`, {
      id: `lab:${fx.slug}`,
      kind: 'lab',
      label: fx.title,
      href: `/lab/${fx.slug}/`,
      blurb: fx.blurb,
      meta: fx.category,
    })
    edges.push({ source: `lab:${fx.slug}`, target: `category:cat-${fx.category}`, kind: 'category' })
    for (const raw of fx.tags ?? []) {
      const key = norm(raw)
      if (!key) continue
      const concept = conceptHubs.get(key)
      const t = concept ?? hub(tagHubs, key, { kind: 'tag', label: raw, art: TOPIC_ART[key] })
      edges.push({ source: `lab:${fx.slug}`, target: t.id, kind: concept ? 'concept' : 'tag' })
    }
  }

  return { nodes: [...nodes.values()], edges }
}
