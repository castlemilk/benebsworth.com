'use client'

import { useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { GammaButton } from '@/components/gamma/GammaButton'
import { AnnotatedBlock, AnnotationTarget, MarginNote } from '@/components/mdx/annotated-block'
import { HandUnderline } from '@/components/mdx/hand-underline'
import { FolioFilters, FolioInspectorDialog, FolioReadingControls } from './controls'
import { FOLIO_ENTITIES, FOLIO_RELATIONSHIPS, FOLIO_TOPICS, FIXTURE_REVISION } from './fixtures'
import { FolioCategoryHeading, FolioContext, FolioEntityCard, FolioInspectorBody, FolioNavigation, FolioRelationshipCard, FolioSourceCitation, FolioStatus, FolioSurface } from './primitives'
import { DEFAULT_READING, type FolioCollectionState, type FolioEntity, type FolioFacet, type FolioReadingPreferences, type FolioSelection, type FolioTheme } from './types'
import s from './workbench.module.css'

const facetGroups: readonly FolioFacet[] = [
  { id: 'kind', label: 'Entry type', options: FOLIO_ENTITIES.map(entity => ({ id: entity.kind, label: entity.kindLabel, count: 1 })) },
  { id: 'tag', label: 'Exact source tag', options: ['circuits', 'transient', 'resonance', 'rf'].map(tag => ({
    id: tag, label: tag, count: FOLIO_ENTITIES.filter(entity => entity.tags.includes(tag)).length,
  })) },
]

function Section({ id, label, title, intro, children }: { id: string; label: string; title: string; intro: string; children: ReactNode }) {
  return <section id={id} className={s.section} aria-labelledby={`${id}-heading`}>
    <header className={s.sectionLabel}><p className={s.eyebrow}>{label}</p><h2 id={`${id}-heading`}>{title}</h2><p className={s.small}>{intro}</p></header>
    <div className={s.sectionContent}>{children}</div>
  </section>
}

function Contract({ children }: { children: ReactNode }) {
  return <details className={s.contract}><summary>Anatomy &amp; integration contract</summary><div>{children}</div></details>
}

export function FolioWorkbench() {
  const [theme, setTheme] = useState<FolioTheme>('inherit')
  const [query, setQuery] = useState('')
  const [selection, setSelection] = useState<FolioSelection>({})
  const [selectedEntity, setSelectedEntity] = useState<FolioEntity>(FOLIO_ENTITIES[2])
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [topicKey, setTopicKey] = useState('ee')
  const [reading, setReading] = useState<FolioReadingPreferences>({ ...DEFAULT_READING })
  const [stateKind, setStateKind] = useState<'ready' | 'empty' | 'collection' | 'loading' | 'error' | 'missing'>('empty')
  const searchRef = useRef<HTMLInputElement>(null)
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const noteTarget = `folio-source-${instanceId}`
  const selectedTopic = FOLIO_TOPICS.find(item => item.key === topicKey) ?? FOLIO_TOPICS[0]
  const visibleEntities = FOLIO_ENTITIES.filter(entity => {
    const matchesQuery = [entity.title, entity.summary, ...entity.tags].join(' ').toLowerCase().includes(query.trim().toLowerCase())
    const matchesKind = !selection.kind?.length || selection.kind.includes(entity.kind)
    const matchesTag = !selection.tag?.length || entity.tags.some(tag => selection.tag.includes(tag))
    return matchesQuery && matchesKind && matchesTag
  })
  const resetFilters = () => { setQuery(''); setSelection({}); searchRef.current?.focus() }
  const inspect = (entity: FolioEntity) => { setSelectedEntity(entity); setInspectorOpen(true) }
  const statusState: FolioCollectionState = stateKind === 'loading'
    ? { kind: 'loading', message: 'A real consumer keeps the current selection and announces completion when its request settles.' }
    : stateKind === 'error'
      ? { kind: 'error', message: 'The request failed. Previously loaded records and the selected entry remain available.' }
      : stateKind === 'missing'
        ? { kind: 'missing', message: 'Keep the requested identity visible. Let the reader clear the selection or return to a known root.' }
        : { kind: 'empty', reason: stateKind === 'collection' ? 'collection' : 'filters', message: stateKind === 'collection'
          ? 'There are no records in the supplied collection. A future import is a separate action.'
          : 'Change the search or clear a filter. An empty result is not a request failure.' }

  return <FolioSurface theme={theme} className={s.page}>
    <main id="main-content" className={s.sheet}>
      <header className={s.workbenchHeader}>
        <FolioNavigation label="Workbench location" items={[{ label: 'Ben Ebsworth', href: '/' }, { label: 'Lab', href: '/lab/' }, { label: 'Folio components', current: true }]} />
        <fieldset className={s.themeControl}><legend>Workbench theme</legend>{(['inherit', 'light', 'dark'] as const).map(mode =>
          <label key={mode}><input type="radio" name={`theme-${instanceId}`} checked={theme === mode} onChange={() => setTheme(mode)} />{mode === 'inherit' ? 'Follow site' : mode === 'light' ? 'Light' : 'Dark'}</label>)}</fieldset>
      </header>

      <div className={s.masthead}>
        <div><p className={s.eyebrow}>Design 03 · Editorial component workbench</p><h1>Keep the source<br /><em><HandUnderline>in view.</HandUnderline></em></h1>
          <p className={s.lede}>A reading language for finding an idea, examining its connections, and returning to the work behind it.</p>
          <p className={s.small}>Working component specimens with three source-backed entries. Graph integration remains a separate review.</p></div>
        <div className={s.mastheadSource}><AnnotatedBlock placement="above">
          <AnnotationTarget id={noteTarget}><FolioSourceCitation source={FOLIO_ENTITIES[0].sources[0]} /></AnnotationTarget>
          <MarginNote target={noteTarget} label="Reading principle">A connection needs<br />a reason.</MarginNote>
        </AnnotatedBlock></div>
      </div>

      <nav className={s.sectionNav} aria-label="Workbench sections">
        <a href="#context">Context</a><a href="#entries">Entries &amp; filters</a><a href="#relationships">Connections</a>
        <a href="#categories">Categories</a><a href="#reading">Reading</a><a href="#states">Recovery</a>
      </nav>

      <Section id="context" label="Navigation" title="A root is not a selection." intro="Keep ancestry, exploration context and the item under inspection distinct.">
        <FolioContext root="Source-backed RLC fixture" selection={`${selectedEntity.kindLabel}: ${selectedEntity.title}`} />
        <p className={s.body}>The context above describes this workbench. Inspecting another entry changes the selection while the root remains in place.</p>
        <Contract><p>Native links preserve modified activation and browser navigation. The consuming graph view owns traversal, URL state and history; these primitives do not write them. Names and values wrap without ellipsis.</p><p>Spacing: 24px between context fields, 8px between label and value. On narrow layouts, fields stack in the same reading order.</p></Contract>
      </Section>

      <Section id="entries" label="Discovery" title="Find. Read. Inspect." intro="A heading link opens the original work. A separate button opens its source trail.">
        <FolioFilters query={query} onQueryChange={setQuery} groups={facetGroups} selection={selection} onSelectionChange={setSelection} resultCount={visibleEntities.length} inputRef={searchRef}
          description="Search this three-entry source fixture. Filter choices are supplied by the consuming view." />
        <div className={s.entryLayout}>
          <div>{visibleEntities.length ? <ul className={s.entryList}>{visibleEntities.map(entity => <li key={entity.id}>
            <FolioEntityCard entity={entity} selected={selectedEntity.id === entity.id} onInspect={inspect} />
          </li>)}</ul> : <FolioStatus state={{ kind: 'empty', reason: 'filters', message: 'Try circuits to find all three entries, or reset the local filters.' }} action={{ label: 'Reset filters and search', onClick: resetFilters }} />}</div>
          <aside className={s.inlineInspector} aria-labelledby="inline-inspector-title"><p className={s.eyebrow}>Inline inspector specimen</p>
            <h3 id="inline-inspector-title">{selectedEntity.title}</h3><FolioInspectorBody entity={selectedEntity} />
            <p className={s.small}>The selected record stays available when filters change.</p></aside>
        </div>
        <Contract><p>Entity anatomy: type → title → summary → exact tags → primary destination and separate Inspect action. No nested interactive controls. Selection has a written label and an ink rule.</p><p>Filters are controlled native inputs. OR within a facet; AND between facets. Missing counts remain unknown. Clear and Reset return focus to Search. The three-record demonstration is not a production graph index.</p><p>Inspector anatomy: persistent Close row → scrollable title → source links → context → reading action → identity disclosure. The modal uses native dialog semantics, Escape and opener focus return. The exported body can also live in a non-modal complementary region.</p></Contract>
      </Section>

      <Section id="relationships" label="Relationships" title="Say what connects them." intro="Put the relationship basis beside the sentence, with its original source below.">
        <div className={s.relationList}>{FOLIO_RELATIONSHIPS.map(relationship => <FolioRelationshipCard key={relationship.id} relationship={relationship} />)}</div>
        <Contract><p>Subject, predicate and object are supplied strings. Authored references, shared metadata and proposals remain distinct. The component does not create edges, merge aliases or calculate confidence.</p><p>The RLC lab and the SVG study have the same raw slug. One displays capacitor-voltage transients; the other displays resistor-voltage frequency response. Their opaque fixture identities and destinations stay separate.</p><p>Source anatomy: availability text → title link → exact locator → optional revision and limits. “Source recorded” means a locator exists at the cited repository snapshot; it does not mean scientific review.</p></Contract>
      </Section>

      <Section id="categories" label="Topic identity" title="Keep the vocabulary." intro="The six custom marks belong to a larger set of science and technology topics.">
        <div className={s.categoryDemo}><div className={s.selectControl}><label htmlFor={`topic-${instanceId}`}>Topic marker from the current registry</label>
          <select id={`topic-${instanceId}`} value={topicKey} onChange={event => setTopicKey(event.currentTarget.value)}>
            {FOLIO_TOPICS.map(({ key, topic }) => <option key={key} value={key}>{topic.label} · {key}</option>)}
          </select><p className={s.small}>{FOLIO_TOPICS.length} topic entries supplied by lib/topics.ts.</p></div>
          <FolioCategoryHeading topic={selectedTopic.topic} categoryKey={selectedTopic.key} registry="Blog topic" description="Original registry label and artwork. This heading specimen does not reclassify an article." />
        </div>
        <dl className={s.vocabulary}>{FOLIO_ENTITIES.map(entity => <div key={entity.id}><dt>{entity.category?.registry}</dt><dd>{entity.category?.label}<code>{entity.category?.key}</code></dd></div>)}</dl>
        <Contract><p>Keep Blog topic ee, Lab category engineering and Study category Electronics as separate source vocabularies. The graph model owner supplies any mapping with provenance.</p><p>Custom monochrome marks use the existing theme-aware mask. Canonical technology images retain their colours and geometry. A readable heading remains present independently of artwork.</p></Contract>
      </Section>

      <Section id="reading" label="Reading controls" title="Comfort, within the page." intro="Change this sample’s measure and type size. Keep its evidence and destinations readable.">
        <FolioReadingControls value={reading} onChange={setReading} />
        <div className={s.readingSample} style={{ '--sample-size': `${reading.size / 16}rem`, '--sample-measure': reading.measure === 'comfortable' ? '54ch' : '68ch' } as CSSProperties}>
          <p className={s.eyebrow}>Editorial sample · authored for this workbench</p><h3>A title is a beginning.</h3>
          <p>Follow the source before following the connection. The title introduces a subject; the entry type and locator tell you what you are opening. Leave that context visible while moving between an article, a lab and a study.</p>
          <p>A shared tag is a useful invitation to read. Its presence alone does not settle whether two scientific models describe the same thing.</p>
          {reading.notes && <aside className={s.readingNote} aria-label="Reading note">Same spelling,<br />different outputs.</aside>}
        </div>
        <Contract><p>Text size uses the existing Gamma native range (16–24, step 1); line length is a native select. The checkbox controls only the optional editorial note. Evidence limits stay visible. Values are controlled by the consumer and reset only this sample.</p><p>Theme changes are scoped to the workbench. No document-root class, cookie, storage, site preference or UI SDK setting is changed. No motion is required for content or controls.</p></Contract>
      </Section>

      <Section id="states" label="Recovery" title="Leave a way forward." intro="Distinguish no matches, no records, missing selection, loading and a failed request.">
        <div className={s.stateTools}><div className={s.selectControl}><label htmlFor={`state-${instanceId}`}>Preview a specimen state</label>
          <select id={`state-${instanceId}`} value={stateKind} onChange={event => setStateKind(event.currentTarget.value as typeof stateKind)}>
            <option value="empty">No matches</option><option value="collection">Empty collection</option><option value="loading">Loading</option>
            <option value="error">Request failed</option><option value="missing">Missing selection</option><option value="ready">Ready</option>
          </select></div><p className={s.small}>Specimen only. No network request, retry or data import is performed.</p></div>
        {stateKind === 'ready' ? <div className={s.ready}><p className={s.eyebrow}>Ready specimen</p><h3>The original context is still here.</h3><p>Three source-backed fixture entries are available in the discovery section above.</p><a className={s.textAction} href="#entries">Return to entries ↑</a></div>
          : <FolioStatus state={statusState} announce={false} action={stateKind === 'loading' ? undefined : { label: 'Show ready specimen', onClick: () => setStateKind('ready') }} />}
        <div className={s.sourceStates} aria-label="Source availability specimens">
          <FolioSourceCitation source={{ id: 'fixture-missing', title: 'A source without a locator', state: 'missing', detail: 'Missing-source specimen. No invented link or successful-review badge.' }} />
          <FolioSourceCitation source={{ id: 'fixture-unavailable', title: 'A source request that did not complete', state: 'unavailable', detail: 'Unavailable-source specimen. A failed lookup is not an empty successful response.' }} />
          <FolioSourceCitation source={{ id: 'fixture-unchecked', title: 'A supplied record awaiting review', state: 'unchecked', detail: 'Unchecked specimen. No review date or confidence value is fabricated.' }} />
        </div>
        <Contract><p>Real consuming views supply request state and a retry/clear callback. This selector changes only the specimen. Loading placeholders are decorative and static; live consumers provide a polite status message without moving focus.</p><p>Missing data stays missing. Do not convert unavailable sources, unknown counts or absent relations to a zero or a checked state. Keep the source ID and the user’s root/selection through recovery.</p></Contract>
      </Section>

      <footer className={s.footer}><p>Source-backed fixtures · <a href={`https://github.com/castlemilk/benebsworth.com/tree/${FIXTURE_REVISION}`}>{FIXTURE_REVISION.slice(0, 8)}</a></p>
        <p>Source Serif 4 / Barlow Condensed / Caveat · Existing Gamma controls · Original topic assets</p>
        <div className={s.actions}><Link href="/lab/editorial-system/">Accepted editorial study ↗</Link><Link href="/blog/">Writing archive ↗</Link>
          <GammaButton type="button" variant="quiet" className={s.button} onClick={() => inspect(selectedEntity)}>Reopen selected inspector</GammaButton></div>
      </footer>
      <FolioInspectorDialog entity={selectedEntity} open={inspectorOpen} onDismiss={() => setInspectorOpen(false)} fallbackFocusRef={searchRef} />
    </main>
  </FolioSurface>
}
