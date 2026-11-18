import { useId, type ReactNode } from 'react'
import type { Topic } from '@/lib/topics'
import { TopicGlyph } from '@/components/blog/topic-marker'
import { GammaButton } from '@/components/gamma/GammaButton'
import { folioHref, type FolioCollectionState, type FolioEntity, type FolioRelationship, type FolioSource, type FolioTheme } from './types'
import s from './workbench.module.css'

export function FolioSurface({ children, theme = 'inherit', className = '' }: {
  children: ReactNode; theme?: FolioTheme; className?: string
}) {
  return <div className={`${s.surface} ${className}`} data-theme={theme}>{children}</div>
}

export function FolioNavigation({ label, items }: {
  label: string; items: readonly { label: string; href?: string; current?: boolean }[]
}) {
  return <nav aria-label={label} className={s.navigation}><ol>
    {items.map((item, index) => <li key={`${item.label}-${index}`}>
      {folioHref(item.href)
        ? <a href={folioHref(item.href)} aria-current={item.current ? 'page' : undefined}>{item.label}</a>
        : <span aria-current={item.current ? 'page' : undefined}>{item.label}</span>}
    </li>)}
  </ol></nav>
}

export function FolioContext({ root, selection }: { root: string; selection?: string }) {
  return <dl className={s.context}>
    <div><dt>Exploring</dt><dd>{root}</dd></div>
    <div><dt>Inspecting</dt><dd>{selection ?? 'Nothing selected'}</dd></div>
  </dl>
}

const sourceLabels: Record<FolioSource['state'], string> = {
  recorded: 'Source recorded', unchecked: 'Not yet checked', unavailable: 'Source unavailable', missing: 'Locator missing',
}

export function FolioSourceCitation({ source, compact = false }: { source: FolioSource; compact?: boolean }) {
  const href = source.state === 'missing' ? undefined : folioHref(source.href)
  // A printed or archival locator can be recorded without an online destination.
  const state = source.state === 'recorded' && !href && !source.locator?.trim() ? 'missing' : source.state
  return <div className={s.citation} data-source-state={state}>
    <div className={s.citationTop}><span className={s.eyebrow}>{sourceLabels[state]}</span>
      {source.revision && <span className={s.revision} title={source.revision}>{source.revision.slice(0, 8)}</span>}
    </div>
    {href ? <a className={s.sourceLink} href={href}>{source.title}<span aria-hidden="true">&nbsp;↗</span></a>
      : <span className={s.sourceLink}>{source.title}</span>}
    {source.locator && <p className={s.locator}>{source.locator}</p>}
    {!href && <p className={s.small}>No usable source link supplied.</p>}
    {!compact && source.detail && <p className={s.small}>{source.detail}</p>}
  </div>
}

export function FolioEntityCard({ entity, selected = false, onInspect }: {
  entity: FolioEntity; selected?: boolean; onInspect?: (entity: FolioEntity) => void
}) {
  const id = useId()
  const href = folioHref(entity.href)
  return <article className={s.entity} data-selected={selected} aria-labelledby={id}>
    <div className={s.entityMeta}><span className={s.eyebrow}>{entity.kindLabel}</span>
      {selected && <span className={s.selection}>Selected</span>}
      {entity.category && <span className={s.small}>{entity.category.registry}: {entity.category.label}</span>}
    </div>
    <h3 id={id}>{href ? <a href={href}>{entity.title}</a> : entity.title}</h3>
    {entity.summary && <p className={s.entitySummary}>{entity.summary}</p>}
    <ul className={s.tags} aria-label={`Tags for ${entity.title}`}>{entity.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
    <div className={s.actions}>
      {href ? <a className={s.textAction} href={href}>{entity.actionLabel}<span aria-hidden="true"> ↗</span></a>
        : <span className={s.small}>Destination not supplied</span>}
      {onInspect && <GammaButton type="button" variant="quiet" className={s.button}
        aria-label={`Inspect ${entity.kindLabel}: ${entity.title}`} onClick={() => onInspect(entity)}>Inspect <span aria-hidden="true">↗</span></GammaButton>}
    </div>
  </article>
}

export function FolioRelationshipCard({ relationship }: { relationship: FolioRelationship }) {
  const id = useId()
  return <article className={s.relationship} aria-labelledby={id} data-basis={relationship.basis}>
    <p className={s.eyebrow}>{relationship.basis === 'proposal' ? 'Proposal · ' : ''}{relationship.basisLabel}</p>
    <h3 id={id} className={s.relationSentence}><span>{relationship.subject}</span>
      <em>{relationship.predicate}</em><span>{relationship.object}</span></h3>
    <p className={s.small}>{relationship.explanation}</p>
    <div className={s.relationshipSources}>
      {relationship.sources.length ? relationship.sources.map(source => <FolioSourceCitation key={source.id} source={source} compact />)
        : <p className={s.missing}>{relationship.basis === 'proposal' ? 'No source-backed relationship asserted.' : 'No source locator supplied.'}</p>}
    </div>
  </article>
}

export function FolioCategoryHeading({ topic, registry, categoryKey, description }: {
  topic: Topic; registry: string; categoryKey: string; description?: string
}) {
  return <header className={s.categoryHeading}>
    <div className={s.categoryIcon}><TopicGlyph topic={topic} size={42} /></div>
    <div><p className={s.eyebrow}>{registry} · {categoryKey}</p><h3>{topic.label}</h3>
      {description && <p className={s.small}>{description}</p>}</div>
  </header>
}

export function FolioStatus({ state, action, announce = true }: {
  state: FolioCollectionState; action?: { label: string; onClick: () => void }; announce?: boolean
}) {
  const titles = {
    loading: 'Loading source records',
    empty: state.kind === 'empty' && state.reason === 'filters' ? 'No entries match these filters' : 'No entries have been added',
    error: 'Source records could not be loaded',
    missing: 'This selection is not in the supplied records',
  }
  return <div className={s.status} data-state={state.kind}>
    <div role={announce ? 'status' : undefined} aria-live={announce ? 'polite' : undefined}>
      <p className={s.eyebrow}>{state.kind === 'error' ? 'Error' : state.kind}</p>
      <h3>{titles[state.kind]}</h3><p>{state.message}</p>
    </div>
    {state.kind === 'loading' && <div className={s.skeleton} aria-hidden="true"><span /><span /><span /></div>}
    {action && <GammaButton type="button" variant="secondary" className={s.button} onClick={action.onClick}>{action.label}</GammaButton>}
  </div>
}

/** Non-modal body: the consumer can place it in an aside, route, or native dialog. */
export function FolioInspectorBody({ entity }: { entity: FolioEntity }) {
  const href = folioHref(entity.href)
  return <div className={s.inspectorBody}>
    <p className={s.eyebrow}>{entity.kindLabel} · Source trail</p>
    {entity.sources.length ? entity.sources.map(source => <FolioSourceCitation key={source.id} source={source} />)
      : <p className={s.missing}>No source locator supplied. This is not a reviewed claim.</p>}
    <div className={s.inspectorDescription}><p>{entity.summary ?? 'No summary supplied.'}</p>
      {entity.context && <p className={s.small}>{entity.context}</p>}
      {entity.category && <dl className={s.metadata}><div><dt>{entity.category.registry}</dt><dd>{entity.category.label} <code>({entity.category.key})</code></dd></div></dl>}
    </div>
    {href && <a className={s.primaryLink} href={href}>{entity.actionLabel}<span aria-hidden="true"> ↗</span></a>}
    <details className={s.disclosure}><summary>Identity and original tags</summary>
      <dl className={s.metadata}><div><dt>Opaque entry ID</dt><dd><code>{entity.id}</code></dd></div>
        <div><dt>Tags as supplied</dt><dd>{entity.tags.length ? entity.tags.join(', ') : 'No tags supplied'}</dd></div></dl>
    </details>
  </div>
}
