// @vitest-environment jsdom
import { useRef, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { FolioFilters, FolioInspectorDialog } from './controls'
import { FOLIO_ENTITIES, FOLIO_RELATIONSHIPS } from './fixtures'
import { FolioEntityCard, FolioRelationshipCard, FolioSourceCitation, FolioStatus } from './primitives'
import { FolioWorkbench } from './workbench'
import type { FolioSelection } from './types'

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')

beforeEach(() => {
  // jsdom has no layout or native top layer. These tests exercise React/DOM
  // ownership and focus callbacks, not actual modal containment or rendering.
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 0))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) { this.setAttribute('open', '') },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    },
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.documentElement.className = ''
  localStorage.clear()
  if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal)
  else delete (HTMLDialogElement.prototype as unknown as Record<string, unknown>).showModal
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose)
  else delete (HTMLDialogElement.prototype as unknown as Record<string, unknown>).close
})

function FilterHarness({ initialQuery = 'transient', initialSelection = { kind: ['lab'], ownerFacet: ['preserve-me'] } }: {
  initialQuery?: string; initialSelection?: FolioSelection
} = {}) {
  const [query, setQuery] = useState(initialQuery)
  const [selection, setSelection] = useState<FolioSelection>(initialSelection)
  return <>
    <FolioFilters query={query} onQueryChange={setQuery} selection={selection} onSelectionChange={setSelection}
      groups={[{ id: 'kind', label: 'Entry type', options: [{ id: 'lab', label: 'Lab' }, { id: 'study', label: 'Study' }] }]} />
    <output aria-label="Consumer selection">{JSON.stringify(selection)}</output>
  </>
}

const discovery = () => screen.getByRole('region', { name: 'Find. Read. Inspect.' })
const resultArticles = () => within(discovery()).queryAllByRole('article')

describe('controlled folio discovery', () => {
  it('clears search into its input without resetting consumer selection or inventing a result count', () => {
    render(<FilterHarness />)
    const query = screen.getByRole('searchbox', { name: 'Find a source-backed entry' }) as HTMLInputElement
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(query.value).toBe('')
    expect(document.activeElement).toBe(query)
    expect((screen.getByRole('checkbox', { name: 'Lab' }) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByLabelText('Consumer selection').textContent).toContain('preserve-me')
    expect(screen.getByRole('status', { name: '' }).textContent).toContain('Result count not supplied')
    expect(screen.getByRole('status', { name: '' }).textContent).not.toContain('0 entries')
    expect((screen.getByRole('button', { name: 'Clear search' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('emits the next facet selection while preserving unrelated consumer-owned groups', () => {
    render(<FilterHarness />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Study' }))
    expect(JSON.parse(screen.getByLabelText('Consumer selection').textContent!)).toEqual({
      kind: ['lab', 'study'], ownerFacet: ['preserve-me'],
    })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Lab' }))
    expect(JSON.parse(screen.getByLabelText('Consumer selection').textContent!)).toEqual({
      kind: ['study'], ownerFacet: ['preserve-me'],
    })
  })

  it('resets only the supplied facets and query, preserving unrelated consumer state and returning focus', () => {
    render(<FilterHarness />)
    const query = screen.getByRole('searchbox', { name: 'Find a source-backed entry' }) as HTMLInputElement
    const reset = screen.getByRole('button', { name: 'Reset filters' }) as HTMLButtonElement
    fireEvent.click(reset)
    const selection = JSON.parse(screen.getByLabelText('Consumer selection').textContent!) as FolioSelection
    expect(query.value).toBe('')
    expect(selection.kind ?? []).toEqual([])
    expect(selection.ownerFacet).toEqual(['preserve-me'])
    expect(screen.getAllByRole('checkbox').every(input => !(input as HTMLInputElement).checked)).toBe(true)
    expect(screen.getByRole('status', { name: '' }).textContent).toContain('0 active filters')
    expect(document.activeElement).toBe(query)
    expect(reset.disabled).toBe(true)
  })

  it('counts and recovers a selected value no longer present in supplied facet options', () => {
    render(<FilterHarness initialQuery="" initialSelection={{ kind: ['retired-study-kind'], ownerFacet: ['preserve-me'] }} />)
    const query = screen.getByRole('searchbox', { name: 'Find a source-backed entry' })
    const reset = screen.getByRole('button', { name: 'Reset filters' }) as HTMLButtonElement
    expect(screen.getAllByRole('checkbox').every(input => !(input as HTMLInputElement).checked)).toBe(true)
    expect(screen.getByRole('status', { name: '' }).textContent).toContain('1 active filter')
    expect(screen.getByText(/selected filter is no longer in the supplied options/)).toBeTruthy()
    expect(reset.disabled).toBe(false)
    fireEvent.click(reset)
    const selection = JSON.parse(screen.getByLabelText('Consumer selection').textContent!) as FolioSelection
    expect(selection.kind ?? []).toEqual([])
    expect(selection.ownerFacet).toEqual(['preserve-me'])
    expect(screen.getByRole('status', { name: '' }).textContent).toContain('0 active filters')
    expect(screen.queryByText(/no longer in the supplied options/)).toBeNull()
    expect(document.activeElement).toBe(query)
    expect(reset.disabled).toBe(true)
  })

  it('uses OR within a facet and AND between facets, then resets into Search', () => {
    render(<FolioWorkbench />)
    const entries = within(discovery())
    expect(resultArticles()).toHaveLength(3)
    fireEvent.click(entries.getByRole('checkbox', { name: /^Lab\b/ }))
    fireEvent.click(entries.getByRole('checkbox', { name: /^SVG study\b/ }))
    expect(resultArticles().map(article => within(article).getByRole('heading').textContent)).toEqual([
      'RLC Resonance', 'RLC band-pass response',
    ])
    fireEvent.click(entries.getByRole('checkbox', { name: /^rf\b/ }))
    expect(resultArticles()).toHaveLength(0)
    expect(entries.getByRole('heading', { name: 'No entries match these filters' })).toBeTruthy()
    fireEvent.click(entries.getByRole('checkbox', { name: /^transient\b/ }))
    expect(resultArticles()).toHaveLength(1)
    expect(within(resultArticles()[0]).getByRole('heading').textContent).toBe('RLC Resonance')
    fireEvent.change(entries.getByRole('searchbox'), { target: { value: 'not-a-record' } })
    expect(resultArticles()).toHaveLength(0)
    fireEvent.click(entries.getByRole('button', { name: 'Reset filters and search' }))
    expect(resultArticles()).toHaveLength(3)
    expect((entries.getByRole('searchbox') as HTMLInputElement).value).toBe('')
    expect(entries.getAllByRole('checkbox').every(input => !(input as HTMLInputElement).checked)).toBe(true)
    expect(document.activeElement).toBe(entries.getByRole('searchbox'))
  })

  it('keeps the selected source and root when filtering the selected entry out of the list', () => {
    render(<FolioWorkbench />)
    const entries = within(discovery())
    const context = screen.getByRole('region', { name: 'A root is not a selection.' })
    const root = within(context).getByText('Source-backed RLC fixture')
    const selectedContext = within(context).getByText('SVG study: RLC band-pass response')
    fireEvent.change(entries.getByRole('searchbox'), { target: { value: 'transient' } })
    expect(resultArticles()).toHaveLength(1)
    expect(within(resultArticles()[0]).getByRole('heading').textContent).toBe('RLC Resonance')
    expect(root.isConnected).toBe(true)
    expect(selectedContext.isConnected).toBe(true)
    const inspector = screen.getByRole('complementary', { name: 'RLC band-pass response' })
    expect(within(inspector).getByRole('link', { name: 'Open study' }).getAttribute('href')).toBe('/vectors/?study=rlc-resonance')
  })

  it('gives repeated filter instances distinct label and description targets', () => {
    render(<><FilterHarness /><FilterHarness /></>)
    const searches = screen.getAllByRole('searchbox', { name: 'Find a source-backed entry' })
    expect(new Set(searches.map(input => input.id)).size).toBe(2)
    for (const input of searches) {
      expect(document.querySelector(`label[for="${input.id}"]`)?.textContent).toBe('Find a source-backed entry')
      const description = document.getElementById(input.getAttribute('aria-describedby')!)
      expect(description?.textContent?.length).toBeGreaterThan(0)
    }
  })
})

describe('source-first cards and truthful missing data', () => {
  it('keeps reading links and Inspect as sibling actions with distinct behavior', () => {
    const onInspect = vi.fn()
    render(<FolioEntityCard entity={FOLIO_ENTITIES[0]} selected onInspect={onInspect} />)
    const headingLink = screen.getByRole('link', { name: FOLIO_ENTITIES[0].title })
    const readLink = screen.getByRole('link', { name: 'Read article' })
    const inspect = screen.getByRole('button', { name: `Inspect Article: ${FOLIO_ENTITIES[0].title}` })
    expect(headingLink.getAttribute('href')).toBe(FOLIO_ENTITIES[0].href)
    expect(readLink.getAttribute('href')).toBe(FOLIO_ENTITIES[0].href)
    expect(inspect.closest('a')).toBeNull()
    expect(readLink.closest('button')).toBeNull()
    expect(screen.getByText('Selected')).toBeTruthy()
    fireEvent.click(inspect)
    expect(onInspect).toHaveBeenCalledExactlyOnceWith(FOLIO_ENTITIES[0])
  })

  it.each([undefined, '', 'javascript:alert(1)', '//untrusted.example/source', '/\\untrusted.example/source'])('does not manufacture a recorded-source link from %j', href => {
    render(<FolioSourceCitation source={{ id: 'missing', title: 'Source title', state: 'recorded', href }} />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Locator missing')).toBeTruthy()
    expect(screen.queryByText('Source recorded')).toBeNull()
    expect(screen.getByText('No usable source link supplied.')).toBeTruthy()
  })

  it('retains an unavailable source locator without presenting the lookup as successful', () => {
    const href = 'https://example.org/source'
    render(<FolioSourceCitation source={{ id: 'unavailable', title: 'Original source', state: 'unavailable', href, detail: 'The source lookup failed.' }} />)
    expect(screen.getByRole('link', { name: 'Original source' }).getAttribute('href')).toBe(href)
    expect(screen.getByText('Source unavailable')).toBeTruthy()
    expect(screen.queryByText('Source recorded')).toBeNull()
    expect(screen.getByText('The source lookup failed.')).toBeTruthy()
  })

  it('retains a recorded print locator without fabricating an online source link', () => {
    const source = { id: 'print-specimen', title: 'Printed source specimen', state: 'recorded' as const, locator: 'Print specimen · chapter 4, page 91' }
    const { rerender } = render(<FolioSourceCitation source={source} />)
    expect(screen.getByText('Source recorded')).toBeTruthy()
    expect(screen.getByText(source.title)).toBeTruthy()
    expect(screen.getByText(source.locator)).toBeTruthy()
    expect(screen.queryByText('Locator missing')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('No usable source link supplied.')).toBeTruthy()
    rerender(<FolioSourceCitation source={{ ...source, locator: '   ' }} />)
    expect(screen.getByText('Locator missing')).toBeTruthy()
    expect(screen.queryByText('Source recorded')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders a missing destination without an invented navigation action', () => {
    render(<FolioEntityCard entity={{ ...FOLIO_ENTITIES[1], href: undefined }} />)
    expect(screen.getByRole('heading', { name: 'RLC Resonance' })).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Destination not supplied')).toBeTruthy()
  })

  it('labels the unsourced relationship proposal without implying an evidence-backed edge', () => {
    render(<FolioRelationshipCard relationship={FOLIO_RELATIONSHIPS[2]} />)
    expect(screen.getByText(/Proposal · Unimplemented proposal/)).toBeTruthy()
    expect(screen.getByText('No source-backed relationship asserted.')).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('announces actual loading separately from empty and error states without inventing a count', () => {
    const { rerender, container } = render(<FolioStatus state={{ kind: 'loading', message: 'Waiting for records.' }} />)
    expect(screen.getByRole('status').textContent).toContain('Waiting for records.')
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
    rerender(<FolioStatus state={{ kind: 'empty', reason: 'collection', message: 'No records were supplied.' }} />)
    expect(screen.getByRole('heading', { name: 'No entries have been added' })).toBeTruthy()
    rerender(<FolioStatus state={{ kind: 'error', message: 'The request failed.' }} />)
    expect(screen.getByRole('heading', { name: 'Source records could not be loaded' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).not.toContain('0 entries')
  })
})

describe('inspector DOM ownership — native top layer is mocked', () => {
  it('opens the selected record, closes on cancel and restores its connected opener repeatedly', () => {
    render(<FolioWorkbench />)
    const opener = within(discovery()).getByRole('button', { name: 'Inspect Lab: RLC Resonance' })
    for (let attempt = 0; attempt < 2; attempt += 1) {
      opener.focus()
      fireEvent.click(opener)
      const dialog = screen.getByRole('dialog', { name: 'RLC Resonance' }) as HTMLDialogElement
      const title = within(dialog).getByRole('heading', { name: 'RLC Resonance' })
      expect(document.activeElement).toBe(title)
      expect(within(dialog).getByRole('link', { name: 'Open lab' }).getAttribute('href')).toBe('/lab/rlc-resonance/')
      expect(within(dialog).getByRole('link', { name: 'Lab registry entry' }).getAttribute('href')).toContain('/lib/lab/registry.ts')
      const cancel = new Event('cancel', { cancelable: true })
      fireEvent(dialog, cancel)
      expect(cancel.defaultPrevented).toBe(true)
      expect(dialog.open).toBe(false)
      expect(document.activeElement).toBe(opener)
    }
    const context = screen.getByRole('region', { name: 'A root is not a selection.' })
    expect(within(context).getByText('Source-backed RLC fixture')).toBeTruthy()
    expect(within(context).getByText('Lab: RLC Resonance')).toBeTruthy()
  })

  it('ignores a simulated stale close event after reopening and retains the new opener', () => {
    // Explicitly deliver close events after another open cycle. This checks the
    // owner's event guard, not native event timing or top-layer containment.
    const pendingCloses: HTMLDialogElement[] = []
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute('open')
        pendingCloses.push(this)
      },
    })
    render(<FolioWorkbench />)
    const entries = within(discovery())
    const firstOpener = entries.getByRole('button', { name: 'Inspect Lab: RLC Resonance' })
    firstOpener.focus()
    fireEvent.click(firstOpener)
    fireEvent.click(screen.getByRole('button', { name: 'Close inspector' }))
    expect(pendingCloses).toHaveLength(1)

    const nextOpener = entries.getByRole('button', { name: 'Inspect SVG study: RLC band-pass response' })
    nextOpener.focus()
    fireEvent.click(nextOpener)
    const dialog = screen.getByRole('dialog', { name: 'RLC band-pass response' }) as HTMLDialogElement
    const title = within(dialog).getByRole('heading', { name: 'RLC band-pass response' })
    expect(document.activeElement).toBe(title)
    fireEvent(pendingCloses.shift()!, new Event('close'))
    expect(dialog.open).toBe(true)
    expect(document.activeElement).toBe(title)

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close inspector' }))
    expect(pendingCloses).toHaveLength(1)
    fireEvent(pendingCloses.shift()!, new Event('close'))
    expect(dialog.open).toBe(false)
    expect(document.activeElement).toBe(nextOpener)
  })

  it('uses the consumer fallback when the opener is removed while the inspector is open', () => {
    function RemovedOpenerHarness() {
      const [open, setOpen] = useState(false)
      const [showOpener, setShowOpener] = useState(true)
      const fallback = useRef<HTMLInputElement>(null)
      return <><label>Search fallback<input ref={fallback} /></label>
        {showOpener && <button onClick={() => setOpen(true)}>Open inspector fixture</button>}
        <button onClick={() => setShowOpener(false)}>Remove opener fixture</button>
        <FolioInspectorDialog entity={FOLIO_ENTITIES[1]} open={open} onDismiss={() => setOpen(false)} fallbackFocusRef={fallback} /></>
    }
    render(<RemovedOpenerHarness />)
    const opener = screen.getByRole('button', { name: 'Open inspector fixture' })
    opener.focus()
    fireEvent.click(opener)
    fireEvent.click(screen.getByRole('button', { name: 'Remove opener fixture' }))
    expect(opener.isConnected).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Close inspector' }))
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Search fallback' }))
  })

  it('restores the latest connected fallback when an open inspector and its opener are unmounted', () => {
    function TeardownHarness({ showInspector = true, showOpener = true, useUpdatedFallback = false }: {
      showInspector?: boolean; showOpener?: boolean; useUpdatedFallback?: boolean
    }) {
      const [open, setOpen] = useState(false)
      const initialFallback = useRef<HTMLInputElement>(null)
      const updatedFallback = useRef<HTMLInputElement>(null)
      return <><label>Original search fallback<input ref={initialFallback} /></label>
        <label>Updated search fallback<input ref={updatedFallback} /></label>
        {showOpener && <button onClick={() => setOpen(true)}>Open inspector fixture</button>}
        {showInspector && <FolioInspectorDialog entity={FOLIO_ENTITIES[1]} open={open} onDismiss={() => setOpen(false)}
          fallbackFocusRef={useUpdatedFallback ? updatedFallback : initialFallback} />}</>
    }
    const { rerender } = render(<TeardownHarness />)
    const opener = screen.getByRole('button', { name: 'Open inspector fixture' })
    opener.focus()
    fireEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'RLC Resonance' })
    expect(document.activeElement).toBe(within(dialog).getByRole('heading', { name: 'RLC Resonance' }))
    // Consumer rerenders model route/list teardown without pretending an inert
    // background control can be activated through a real native modal.
    rerender(<TeardownHarness showOpener={false} useUpdatedFallback />)
    expect(opener.isConnected).toBe(false)
    rerender(<TeardownHarness showInspector={false} showOpener={false} useUpdatedFallback />)
    expect(dialog.isConnected).toBe(false)
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Updated search fallback' }))
  })
})

describe('workbench-only preferences and simulated recovery', () => {
  it('changes and resets the reading sample without changing discovery, host theme, storage or history', () => {
    document.documentElement.className = 'dark host-preference'
    localStorage.setItem('theme', 'system')
    const push = vi.spyOn(history, 'pushState')
    const replace = vi.spyOn(history, 'replaceState')
    const { container } = render(<FolioWorkbench />)
    const entries = within(discovery())
    fireEvent.change(entries.getByRole('searchbox'), { target: { value: 'transient' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Light' }))
    expect(container.querySelector('[data-theme]')?.getAttribute('data-theme')).toBe('light')
    fireEvent.change(screen.getByRole('slider', { name: 'Text size' }), { target: { value: '24' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Line length' }), { target: { value: 'wide' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show reading note' }))
    expect((screen.getByRole('slider', { name: 'Text size' }) as HTMLInputElement).value).toBe('24')
    expect((screen.getByRole('combobox', { name: 'Line length' }) as HTMLSelectElement).value).toBe('wide')
    expect(screen.queryByRole('complementary', { name: 'Reading note' })).toBeNull()
    const sample = screen.getByRole('heading', { name: 'A title is a beginning.' }).parentElement!
    expect(sample.style.getPropertyValue('--sample-size')).toBe('1.5rem')
    expect(sample.style.getPropertyValue('--sample-measure')).toBe('68ch')
    fireEvent.click(screen.getByRole('button', { name: 'Reset reading sample' }))
    expect((screen.getByRole('slider', { name: 'Text size' }) as HTMLInputElement).value).toBe('19')
    expect((screen.getByRole('combobox', { name: 'Line length' }) as HTMLSelectElement).value).toBe('comfortable')
    expect(screen.getByRole('complementary', { name: 'Reading note' })).toBeTruthy()
    expect((entries.getByRole('searchbox') as HTMLInputElement).value).toBe('transient')
    expect(resultArticles()).toHaveLength(1)
    expect(document.documentElement.className).toBe('dark host-preference')
    expect(localStorage.getItem('theme')).toBe('system')
    expect(push).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })

  it('shows recovery specimens without performing or claiming a successful request', () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    render(<FolioWorkbench />)
    const recovery = screen.getByRole('region', { name: 'Leave a way forward.' })
    const controls = within(recovery)
    fireEvent.change(controls.getByRole('combobox', { name: 'Preview a specimen state' }), { target: { value: 'error' } })
    expect(controls.getByRole('heading', { name: 'Source records could not be loaded' })).toBeTruthy()
    expect(controls.getByText('Specimen only. No network request, retry or data import is performed.')).toBeTruthy()
    fireEvent.click(controls.getByRole('button', { name: 'Show ready specimen' }))
    expect(controls.getByRole('heading', { name: 'The original context is still here.' })).toBeTruthy()
    expect(controls.getByText('Ready specimen')).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
    expect(resultArticles()).toHaveLength(3)
  })
})
