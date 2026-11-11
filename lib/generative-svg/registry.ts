import type { Study } from './definition'

export const STUDY_CATEGORIES = ['Mathematics', 'Algorithms', 'Physics', 'Electronics', 'Distributed systems'] as const
const PROVENANCE = ['math-derived', 'topology', 'illustrative', 'simulated']
const slug = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim() === value && value.length > 0

/** Scientific claims stay in basis/description, outside the curated discovery index. */
export function normalizeStudySearch(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').replace(/([a-zA-Z])(\d)|(\d)([a-zA-Z])/g, '$1$3 $2$4')
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

export interface StudyRegistry {
  readonly studies: readonly Study[]
  readonly tags: readonly string[]
  get: (id: string) => Study | undefined
}

/** Registration rejects ambiguous identity and unsafe controls before any page is rendered. */
export function createStudyRegistry(definitions: readonly Study[]): StudyRegistry {
  const ids = new Set<string>()
  const studies = definitions.map(study => {
    if (!nonempty(study.id) || !slug.test(study.id) || ids.has(study.id)) throw new Error(`Invalid or duplicate study ID: ${study.id}`)
    ids.add(study.id)
    if (![study.title, study.description, study.basis].every(nonempty)
      || !STUDY_CATEGORIES.includes(study.category) || !PROVENANCE.includes(study.provenance)
      || typeof study.model !== 'function') throw new Error(`Incomplete study definition: ${study.id}`)
    if (!Array.isArray(study.tags) || study.tags.length === 0 || study.tags.some(tag => !nonempty(tag) || !slug.test(tag))
      || new Set(study.tags).size !== study.tags.length) throw new Error(`Invalid tags: ${study.id}`)
    if (!Array.isArray(study.aliases) || !study.aliases.every(nonempty)
      || study.aliases.some(alias => !normalizeStudySearch(alias))
      || new Set(study.aliases.map(normalizeStudySearch)).size !== study.aliases.length) throw new Error(`Invalid aliases: ${study.id}`)
    const keys = new Set<string>()
    if (!Array.isArray(study.parameters)) throw new Error(`Invalid parameters: ${study.id}`)
    for (const parameter of study.parameters) {
      const { key, label, min, max, step, initial } = parameter
      const aligned = (value: number) => Math.abs((value - min) / step - Math.round((value - min) / step)) < 1e-7
      if (!nonempty(key) || !/^[a-z][a-zA-Z0-9]*$/.test(key) || keys.has(key) || !nonempty(label)
        || ![min, max, step, initial].every(Number.isFinite) || step <= 0 || max < min
        || initial < min || initial > max || !aligned(initial) || !aligned(max)) throw new Error(`Invalid control: ${study.id}/${key}`)
      keys.add(key)
    }
    return Object.freeze({ ...study, tags: Object.freeze([...study.tags]), aliases: Object.freeze([...study.aliases]), parameters: Object.freeze(study.parameters.map(p => Object.freeze({ ...p }))) })
  })
  const byId = new Map(studies.map(study => [study.id, study]))
  return Object.freeze({ studies: Object.freeze(studies), tags: Object.freeze([...new Set(studies.flatMap(s => [...s.tags]))].sort()), get: (id: string) => byId.get(id) })
}

export function studyUrl(study: Pick<Study, 'id'>): string {
  return `/vectors/?study=${encodeURIComponent(study.id)}`
}

export function studySearchText(study: Study): string {
  return [study.title, study.id, study.category, ...study.tags, ...study.aliases].join(' ')
}

/** All query terms must match a word prefix; selected subject/tag also intersect. */
export function searchStudies(registry: StudyRegistry, query = '', filters: { category?: string; tag?: string } = {}): readonly Study[] {
  const normalized = normalizeStudySearch(query), terms = normalized.split(' ').filter(Boolean)
  return registry.studies.filter(study => {
    if (filters.category && study.category !== filters.category || filters.tag && !study.tags.includes(filters.tag)) return false
    const words = normalizeStudySearch(studySearchText(study)).split(' ')
    return terms.every(term => words.some(word => word.startsWith(term)))
  }).map((study, index) => {
    const exact = (value: string) => normalized !== '' && normalizeStudySearch(value) === normalized
    const rank = exact(study.title) ? 100 : study.aliases.some(exact) ? 90 : exact(study.id) ? 85 : study.tags.some(exact) ? 80 : 0
    return { study, index, rank }
  }).sort((a, b) => b.rank - a.rank || a.index - b.index).map(result => result.study)
}

/** One existing Pagefind record per study; no negated caveats in searchable content. */
export function studySearchRecords(registry: StudyRegistry) {
  return registry.studies.map(study => ({
    url: studyUrl(study), language: 'en', content: [studySearchText(study), ...study.aliases.filter(alias => /\d/.test(alias)).map(alias => alias.replace(/[\s-]+/g, ''))].join(' '),
    meta: { title: study.title, description: `SVG study · ${study.category}. ${study.tags.map(tag => tag.replaceAll('-', ' ')).join(', ')}.`, kind: 'SVG study' },
    filters: { kind: ['SVG study'], subject: [study.category], tag: [...study.tags] },
  }))
}
