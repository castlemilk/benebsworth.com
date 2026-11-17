import { TOPIC } from '@/lib/topics'
import type { FolioEntity, FolioRelationship, FolioSource } from './types'

export const FIXTURE_REVISION = '1121edc4ae6ac8de415b5395d8fadc11450fc55f'
const sourceRoot = `https://github.com/castlemilk/benebsworth.com/blob/${FIXTURE_REVISION}/`

const articleSource: FolioSource = {
  id: 'fixture-source:rlc-article',
  title: 'Article MDX and authored lab reference',
  state: 'recorded',
  href: `${sourceRoot}content/blog/every-wire-is-an-rlc-circuit/index.mdx`,
  locator: 'content/blog/every-wire-is-an-rlc-circuit/index.mdx',
  revision: FIXTURE_REVISION,
  detail: 'The source contains LabSide with effect="rlc-resonance" and the exact tag circuits.',
}

const labSource: FolioSource = {
  id: 'fixture-source:rlc-lab',
  title: 'Lab registry entry',
  state: 'recorded',
  href: `${sourceRoot}lib/lab/registry.ts`,
  locator: 'lib/lab/registry.ts · rlc-resonance',
  revision: FIXTURE_REVISION,
  detail: 'Category engineering; tags circuits and transient. The lab models the capacitor-voltage step response.',
}

const studySource: FolioSource = {
  id: 'fixture-source:rlc-study',
  title: 'SVG study definition',
  state: 'recorded',
  href: `${sourceRoot}lib/generative-svg/additional-studies.ts`,
  locator: 'lib/generative-svg/additional-studies.ts · rlc-resonance',
  revision: FIXTURE_REVISION,
  detail: 'Category Electronics; math-derived. This study shows frequency response across the resistor.',
}

/** Snapshot fixtures, not an alternative graph model or production ID scheme. */
export const FOLIO_ENTITIES: readonly FolioEntity[] = [
  {
    id: 'fixture:blog:every-wire-is-an-rlc-circuit',
    kind: 'blog',
    kindLabel: 'Article',
    title: 'Every Wire Is an RLC Circuit: Why Your Digital Signal Rings',
    summary: 'Article fixture with an authored reference to the RLC Resonance lab. Inspect its source before following a connection.',
    href: '/blog/every-wire-is-an-rlc-circuit/',
    actionLabel: 'Read article',
    category: { registry: 'Blog topic', key: 'ee', label: TOPIC.ee.label },
    tags: ['electrical engineering', 'signal integrity', 'circuits', 'rf'],
    sources: [articleSource],
    context: 'Published article metadata · 17 June 2026 · Ben Ebsworth',
  },
  {
    id: 'fixture:lab:rlc-resonance',
    kind: 'lab',
    kindLabel: 'Lab',
    title: 'RLC Resonance',
    summary: 'Transient step response of a series RLC circuit — underdamped ringing vs critical damping.',
    href: '/lab/rlc-resonance/',
    actionLabel: 'Open lab',
    category: { registry: 'Lab category', key: 'engineering', label: 'Electrical Engineering' },
    tags: ['circuits', 'transient'],
    sources: [labSource],
    context: 'Capacitor voltage · transient response',
  },
  {
    id: 'fixture:study:rlc-resonance',
    kind: 'study',
    kindLabel: 'SVG study',
    title: 'RLC band-pass response',
    summary: 'A series RLC circuit measured across its resistor. Tune Q to change bandwidth while preserving the unit resonant peak.',
    href: '/vectors/?study=rlc-resonance',
    actionLabel: 'Open study',
    category: { registry: 'Study category', key: 'Electronics', label: 'Electronics' },
    tags: ['circuits', 'resonance', 'filters'],
    sources: [studySource],
    context: 'Resistor voltage · frequency response · math-derived',
  },
]

export const FOLIO_RELATIONSHIPS: readonly FolioRelationship[] = [
  {
    id: 'fixture-relation:authored-lab',
    subject: FOLIO_ENTITIES[0].title,
    predicate: 'embeds the lab',
    object: FOLIO_ENTITIES[1].title,
    basis: 'source-record',
    basisLabel: 'Authored component reference',
    explanation: 'The MDX explicitly names this lab. This records an authored reference; it does not validate the article’s scientific claims.',
    sources: [articleSource],
  },
  {
    id: 'fixture-relation:shared-tag',
    subject: 'RLC Resonance / RLC band-pass response',
    predicate: 'share the exact metadata tag',
    object: 'circuits',
    basis: 'source-record',
    basisLabel: 'Shared metadata',
    explanation: 'These sources describe different outputs. Shared tags and identical slug spellings do not establish scientific equivalence.',
    sources: [labSource, studySource],
  },
  {
    id: 'fixture-relation:proposal',
    subject: 'A future glossary entry',
    predicate: 'could provide a reading path to',
    object: 'related articles and experiments',
    basis: 'proposal',
    basisLabel: 'Unimplemented proposal',
    explanation: 'Illustrative contract only. The model owner must supply the meaning, mapping and source locators before this becomes a graph relationship.',
    sources: [],
  },
]

/** Every current topic is supplied. No six-symbol taxonomy is invented here. */
export const FOLIO_TOPICS = Object.entries(TOPIC).map(([key, topic]) => ({ key, topic }))
