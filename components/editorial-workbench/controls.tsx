'use client'

import { useCallback, useEffect, useId, useRef, type RefObject } from 'react'
import { GammaButton } from '@/components/gamma/GammaButton'
import { RangeSlider } from '@/components/gamma/RangeSlider'
import { FolioInspectorBody } from './primitives'
import { DEFAULT_READING, type FolioEntity, type FolioFacet, type FolioReadingPreferences, type FolioSelection } from './types'
import s from './workbench.module.css'

export function FolioFilters({ query, onQueryChange, groups, selection, onSelectionChange, resultCount, inputRef: suppliedInputRef, description = 'Search the supplied entries. Select one or more filters to narrow the result.' }: {
  query: string; onQueryChange: (query: string) => void; groups: readonly FolioFacet[]
  selection: FolioSelection; onSelectionChange: (selection: FolioSelection) => void
  resultCount?: number; inputRef?: RefObject<HTMLInputElement | null>; description?: string
}) {
  const id = useId()
  const localInputRef = useRef<HTMLInputElement>(null)
  const inputRef = suppliedInputRef ?? localInputRef
  const clear = () => { onQueryChange(''); inputRef.current?.focus() }
  const active = groups.flatMap(group => group.options.filter(option => selection[group.id]?.includes(option.id)).map(option => ({ group, option })))
  const unknown = groups.flatMap(group => (selection[group.id] ?? []).filter(value => !group.options.some(option => option.id === value)))
  const activeCount = active.length + unknown.length
  return <div className={s.filters}>
    <label className={s.controlLabel} htmlFor={`${id}-query`}>Find a source-backed entry</label>
    <div className={s.searchRow}><input id={`${id}-query`} ref={inputRef} type="search" value={query}
      aria-describedby={`${id}-hint`} onChange={event => onQueryChange(event.currentTarget.value)} placeholder="Try circuits, transient or band-pass" />
      <GammaButton type="button" variant="quiet" className={s.button} disabled={!query} onClick={clear}>Clear search</GammaButton></div>
    <p className={s.small} id={`${id}-hint`}>{description}</p>
    <div className={s.facetGroups}>{groups.map(group => <fieldset key={group.id}><legend>{group.label}</legend><div className={s.checkOptions}>
      {group.options.map(option => <label key={option.id}><input type="checkbox" checked={selection[group.id]?.includes(option.id) ?? false} disabled={option.disabled}
        onChange={event => {
          const current = selection[group.id] ?? []
          onSelectionChange({ ...selection, [group.id]: event.currentTarget.checked ? [...current, option.id] : current.filter(value => value !== option.id) })
        }} /><span>{option.label}</span>{option.count !== undefined && <span className={s.count}>({option.count})</span>}</label>)}
    </div></fieldset>)}</div>
    {unknown.length > 0 && <p className={s.small}>{unknown.length} selected {unknown.length === 1 ? 'filter is' : 'filters are'} no longer in the supplied options. Reset filters to recover.</p>}
    <div className={s.filterSummary}><p role="status" aria-live="polite">{resultCount === undefined ? 'Result count not supplied' : `${resultCount} ${resultCount === 1 ? 'entry' : 'entries'}`}<span className={s.small}> · {activeCount} active {activeCount === 1 ? 'filter' : 'filters'}</span></p>
      <GammaButton type="button" variant="quiet" className={s.button} disabled={!query && !activeCount} onClick={() => {
        const next = { ...selection }
        for (const group of groups) delete next[group.id]
        onQueryChange(''); onSelectionChange(next); inputRef.current?.focus()
      }}>Reset filters</GammaButton></div>
  </div>
}

export function FolioReadingControls({ value, onChange }: { value: FolioReadingPreferences; onChange: (value: FolioReadingPreferences) => void }) {
  const id = useId()
  return <fieldset className={s.readingControls}><legend>Reading sample preferences</legend>
    <RangeSlider label="Text size" value={value.size} min={16} max={24} step={1} formatValue={size => `${size} px`}
      className={s.range} onChange={size => onChange({ ...value, size })} />
    <div className={s.selectControl}><label htmlFor={`${id}-measure`}>Line length</label><select id={`${id}-measure`} value={value.measure}
      onChange={event => onChange({ ...value, measure: event.currentTarget.value as FolioReadingPreferences['measure'] })}>
      <option value="comfortable">Comfortable · 54ch</option><option value="wide">Wide · 68ch</option></select></div>
    <label className={s.checkbox}><input type="checkbox" checked={value.notes} onChange={event => onChange({ ...value, notes: event.currentTarget.checked })} />Show reading note</label>
    <GammaButton type="button" variant="quiet" className={s.button} onClick={() => onChange({ ...DEFAULT_READING })}>Reset reading sample</GammaButton>
  </fieldset>
}

/** Native modal semantics stay separate from the reusable inline inspector body. */
export function FolioInspectorDialog({ entity, open, onDismiss, fallbackFocusRef }: {
  entity: FolioEntity; open: boolean; onDismiss: () => void; fallbackFocusRef?: RefObject<HTMLElement | null>
}) {
  const id = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const latestFallbackRef = useRef(fallbackFocusRef)
  useEffect(() => { latestFallbackRef.current = fallbackFocusRef }, [fallbackFocusRef])
  const restoreFocus = useCallback(() => {
    const fallback = latestFallbackRef.current?.current
    const target = openerRef.current?.isConnected ? openerRef.current : fallback?.isConnected ? fallback : null
    openerRef.current = null
    target?.focus({ preventScroll: true })
  }, [])
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
      titleRef.current?.focus({ preventScroll: true })
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])
  useEffect(() => {
    const dialog = dialogRef.current
    return () => {
      if (dialog?.open) dialog.close()
      // Native close events can arrive after React detaches the surface.
      restoreFocus()
    }
  }, [restoreFocus])
  return <dialog ref={dialogRef} className={s.dialog} aria-labelledby={`${id}-title`} onClose={() => {
    // A queued close from a previous cycle must not steal focus after reopening.
    if (!dialogRef.current?.open) restoreFocus()
  }}
    onCancel={event => { event.preventDefault(); onDismiss() }}>
    <header className={s.dialogHeader}><p className={s.eyebrow}>Inspecting · {entity.kindLabel}</p>
      <GammaButton type="button" variant="quiet" className={s.button} onClick={onDismiss}>Close inspector</GammaButton></header>
    <div className={s.dialogScroll}><h2 ref={titleRef} id={`${id}-title`} tabIndex={-1}>{entity.title}</h2><FolioInspectorBody entity={entity} /></div>
  </dialog>
}
