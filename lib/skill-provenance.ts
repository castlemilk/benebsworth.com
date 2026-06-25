import type { Skill, SkillSource, TimelineEntry } from '@/lib/gen/content'

/**
 * Skills carry provenance — where each one traces back to. The work/education
 * sources are DERIVED from the career timeline (the single source of truth):
 * when a skill's name matches a role's `tech`, that role's company becomes a
 * source, with its dates and accent colour. Skills the timeline can't supply
 * (AI-native work, the web stack, signal theory) get hand-listed `extra`
 * sources. Notes are always hand-written.
 *
 * Keeping work/edu provenance derived means it can never drift from the resume:
 * edit the timeline and the skill sources follow.
 */

/** Author-facing per-skill metadata (lives in content/about.ts). */
export type SkillMeta = {
  name: string
  /** one-line "how I acquired / use it" */
  note: string
  /** grouping label, e.g. "AI-Native" */
  category: string
  /** company names (resolve to the timeline-aggregated source) OR full custom
   *  sources (for personal / non-timeline provenance). */
  extra?: Array<string | SkillSource>
  /** override the auto-computed span shown next to the name */
  since?: string
}

/** A reusable "independent work" source for skills the resume doesn't cover. */
export const SELF: SkillSource = {
  label: 'This site & labs',
  kind: 'personal',
  when: 'ongoing',
  color: '#ffcc80',
}

const norm = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '')

// near-miss aliases: normalized skill key → normalized timeline-tech key
const ALIAS: Record<string, string> = {
  postgresql: 'postgres',
  golang: 'go',
}

type YearSpan = { start: number; end: number | 'now' }

function years(when: string): YearSpan | null {
  const present = /present|now|current/i.test(when)
  const nums = (when.match(/\d{4}/g) ?? []).map(Number)
  if (!nums.length && !present) return null
  const start = nums.length ? Math.min(...nums) : NaN
  const end: number | 'now' = present ? 'now' : Math.max(...nums)
  return { start, end }
}

function span(start: number, end: number | 'now'): string {
  if (Number.isNaN(start)) return ''
  if (end === 'now') return `${start} → now`
  if (start === end) return `${start}`
  return `${start} → ${end}`
}

const rankYear = (end: number | 'now') => (end === 'now' ? Infinity : end)
function rank(s: SkillSource): number {
  const y = years(s.when)
  return y ? rankYear(y.end) : -1
}

type CompanyAgg = { label: string; kind: string; color: string; start: number; end: number | 'now' }

function buildIndex(timeline: TimelineEntry[]) {
  const byCompany = new Map<string, CompanyAgg>()
  const techToCompanies = new Map<string, Set<string>>()
  for (const t of timeline) {
    const y = years(t.when)
    const start = y?.start ?? NaN
    const end = y?.end ?? NaN
    const prev = byCompany.get(t.company)
    if (!prev) {
      byCompany.set(t.company, { label: t.company, kind: t.kind, color: t.color, start, end })
    } else {
      prev.start = Math.min(prev.start, start)
      prev.end =
        prev.end === 'now' || end === 'now'
          ? 'now'
          : Math.max(prev.end as number, end as number)
    }
    for (const tech of t.tech) {
      const k = norm(tech)
      if (!techToCompanies.has(k)) techToCompanies.set(k, new Set())
      techToCompanies.get(k)!.add(t.company)
    }
  }
  return { byCompany, techToCompanies }
}

function overallSpan(sources: SkillSource[]): string {
  let start = Infinity
  let end: number | 'now' = -Infinity
  for (const s of sources) {
    const y = years(s.when)
    if (!y || Number.isNaN(y.start)) continue
    start = Math.min(start, y.start)
    end = end === 'now' || y.end === 'now' ? 'now' : Math.max(end as number, y.end as number)
  }
  if (!Number.isFinite(start)) return ''
  return span(start, end)
}

export function buildSkills(metas: SkillMeta[], timeline: TimelineEntry[]): Skill[] {
  const { byCompany, techToCompanies } = buildIndex(timeline)
  const companySource = (name: string): SkillSource | null => {
    const a = byCompany.get(name)
    if (!a) return null
    return { label: a.label, kind: a.kind, when: span(a.start, a.end), color: a.color }
  }

  return metas.map((m) => {
    const sources = new Map<string, SkillSource>() // dedupe by label
    // 1. auto-derive from the timeline (exact / aliased name match)
    const key = ALIAS[norm(m.name)] ?? norm(m.name)
    for (const c of techToCompanies.get(key) ?? []) {
      const s = companySource(c)
      if (s) sources.set(s.label, s)
    }
    // 2. hand-listed extras (company name → derived source, or a custom source)
    for (const e of m.extra ?? []) {
      if (typeof e === 'string') {
        const s = companySource(e)
        if (s) sources.set(s.label, s)
      } else {
        sources.set(e.label, e)
      }
    }
    const list = [...sources.values()].sort((a, b) => rank(b) - rank(a))
    return {
      name: m.name,
      note: m.note,
      category: m.category,
      since: m.since ?? overallSpan(list),
      sources: list,
    }
  })
}
