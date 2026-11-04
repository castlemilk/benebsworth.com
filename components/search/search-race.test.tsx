// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
const mocks = vi.hoisted(() => ({ search: vi.fn(), loadPagefind: vi.fn() }))
vi.mock('./pagefind-loader', () => ({ loadPagefind: mocks.loadPagefind }))
import { SiteSearch } from './site-search'

beforeEach(() => {
  vi.useFakeTimers()
  mocks.search.mockReset()
  mocks.loadPagefind.mockReset().mockResolvedValue({ search: mocks.search })
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable:true, value:function(this:HTMLDialogElement){this.open=true} })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable:true, value:function(this:HTMLDialogElement){this.open=false} })
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks() })
const result = (title:string) => ({results:[{id:title,data:async()=>({url:`/${title}`,excerpt:'',meta:{title}})}]})
const tick = async () => { await act(async()=>{ await vi.advanceTimersByTimeAsync(141) }) }

it('retries the retained query when reopening after initialization recovers', async () => {
  mocks.loadPagefind.mockResolvedValue(null)
  mocks.search.mockResolvedValue(result('recovered'))
  render(<SiteSearch />)
  const trigger = screen.getByRole('button', { name: 'Search the site' })
  fireEvent.click(trigger)
  fireEvent.change(screen.getByRole('textbox', { name: 'Search posts' }), { target: { value: 'retained' } })
  await tick()
  expect(screen.getByRole('status').textContent).toContain('Search is unavailable')

  fireEvent.click(screen.getByRole('button', { name: 'Close search' }))
  mocks.loadPagefind.mockResolvedValue({ search: mocks.search })
  fireEvent.click(trigger)
  expect((screen.getByRole('textbox', { name: 'Search posts' }) as HTMLInputElement).value).toBe('retained')
  await tick()

  expect(mocks.search).toHaveBeenCalledExactlyOnceWith('retained')
  expect(screen.getByRole('link', { name: 'recovered' })).toBeTruthy()
  expect(screen.getByRole('status').textContent).toBe('')
})

it('ignores a search completed while closed and refreshes the retained query on reopen', async () => {
  let finishClosed!: (value: ReturnType<typeof result>) => void
  mocks.search.mockImplementationOnce(() => new Promise(resolve => { finishClosed = resolve }))
    .mockResolvedValue(result('refreshed'))
  render(<SiteSearch />)
  const trigger = screen.getByRole('button', { name: 'Search the site' })
  fireEvent.click(trigger)
  fireEvent.change(screen.getByRole('textbox', { name: 'Search posts' }), { target: { value: 'retained' } })
  await tick()
  fireEvent.click(screen.getByRole('button', { name: 'Close search' }))
  await act(async () => finishClosed(result('closed result')))
  expect(screen.queryByRole('dialog', { name: 'Search' })).toBeNull()

  fireEvent.click(trigger)
  expect(screen.queryByRole('link', { name: 'closed result' })).toBeNull()
  await tick()
  expect(mocks.search).toHaveBeenCalledTimes(2)
  expect(mocks.search).toHaveBeenLastCalledWith('retained')
  expect(screen.getByRole('link', { name: 'refreshed' })).toBeTruthy()
})

function captureNavigation<T>(navigate: (url: string) => void, action: () => T): T {
  // Capture the assignment, not a simulated successful page load. jsdom does
  // not implement cross-document navigation; leave the real Window intact
  // except during this synchronous event, and restore it even on failure.
  const location = { set href(url: string) { navigate(url) } }
  vi.stubGlobal('window', new Proxy(window, {
    get: (target, key) => key === 'location' ? location : Reflect.get(target, key, target),
  }))
  try {
    return action()
  } finally {
    vi.unstubAllGlobals()
  }
}

it('invalidates old results immediately and ignores superseded responses', async () => {
  let resolveOld!:(x:ReturnType<typeof result>)=>void
  mocks.search.mockImplementation((q:string)=>q==='old' ? new Promise(resolve=>{resolveOld=resolve}) : Promise.resolve(result(q)))
  render(<SiteSearch/>);fireEvent.click(screen.getByRole('button',{name:'Search the site'}))
  const input=screen.getByRole('textbox',{name:'Search posts'})
  fireEvent.change(input,{target:{value:'old'}});await tick()
  fireEvent.change(input,{target:{value:'new'}})
  await act(async()=>resolveOld(result('old')))
  expect(screen.queryByRole('link',{name:'old'})).toBeNull()
  expect(fireEvent.keyDown(input,{key:'Enter',cancelable:true})).toBe(true)
  await tick(); expect(screen.getByRole('link',{name:'new'}).getAttribute('href')).toBe('/new')
  expect(fireEvent.keyDown(input,{key:'Enter',cancelable:true})).toBe(false)
})
it('does not activate previous results while new search fails', async () => {
  mocks.search.mockImplementation((q:string)=>q==='first'?Promise.resolve(result(q)):Promise.reject(Error('unavailable')))
  render(<SiteSearch/>);fireEvent.click(screen.getByRole('button',{name:'Search the site'}))
  const input=screen.getByRole('textbox',{name:'Search posts'})
  fireEvent.change(input,{target:{value:'first'}});await tick()
  expect(screen.getByRole('link',{name:'first'})).toBeTruthy()
  fireEvent.change(input,{target:{value:'second'}})
  expect(screen.queryByRole('link',{name:'first'})).toBeNull()
  expect(fireEvent.keyDown(input,{key:'Enter',cancelable:true})).toBe(true)
  await tick()
  expect(screen.queryByRole('link',{name:'first'})).toBeNull()
  expect(fireEvent.keyDown(input,{key:'Enter',cancelable:true})).toBe(true)
})
it('clearing the query prevents a pending response from restoring results', async () => {
  let finish!:(x:ReturnType<typeof result>)=>void
  mocks.search.mockImplementation(()=>new Promise(resolve=>{finish=resolve}))
  render(<SiteSearch/>);fireEvent.click(screen.getByRole('button',{name:'Search the site'}))
  const input=screen.getByRole('textbox',{name:'Search posts'})
  fireEvent.change(input,{target:{value:'first'}});await tick()
  fireEvent.change(input,{target:{value:''}})
  await act(async()=>finish(result('first')))
  expect(screen.queryByRole('link',{name:'first'})).toBeNull()
  expect(fireEvent.keyDown(input,{key:'Enter',cancelable:true})).toBe(true)
})
it('ignores old result data that resolves after a newer query', async () => {
  let finish!:(x:{url:string;excerpt:string;meta:{title:string}})=>void
  mocks.search.mockImplementation((q:string)=>Promise.resolve(q==='old'?{results:[{id:'old',data:()=>new Promise(resolve=>{finish=resolve})}]}:result(q)))
  render(<SiteSearch/>);fireEvent.click(screen.getByRole('button',{name:'Search the site'}))
  const input=screen.getByRole('textbox',{name:'Search posts'})
  fireEvent.change(input,{target:{value:'old'}});await tick()
  fireEvent.change(input,{target:{value:'new'}});await tick()
  await act(async()=>finish({url:'/old',excerpt:'',meta:{title:'old'}}))
  expect(screen.queryByRole('link',{name:'old'})).toBeNull()
  expect(screen.getByRole('link',{name:'new'})).toBeTruthy()
})
it('does not intercept keys while an IME composition is active', async () => {
  mocks.search.mockResolvedValue(result('first'))
  render(<SiteSearch/>);fireEvent.click(screen.getByRole('button',{name:'Search the site'}))
  const input=screen.getByRole('textbox',{name:'Search posts'})
  fireEvent.change(input,{target:{value:'first'}});await tick()
  expect(screen.getByRole('link',{name:'first'})).toBeTruthy()
  expect(fireEvent.keyDown(input,{key:'Enter',isComposing:true,cancelable:true})).toBe(true)
  expect(fireEvent.keyDown(input,{key:'ArrowDown',isComposing:true,cancelable:true})).toBe(true)
  expect(fireEvent.keyDown(input,{key:'Enter',keyCode:229,cancelable:true})).toBe(true)
})

it.each([
  { mode: 'standard IME composition', keyboard: { isComposing: true } },
  { mode: 'legacy IME key code 229', keyboard: { keyCode: 229 } },
])('keeps selection, dialog and navigation unchanged during $mode', async ({ keyboard }) => {
  mocks.search.mockResolvedValue({
    results: [...result('first').results, ...result('second').results],
  })
  render(<SiteSearch />)
  fireEvent.click(screen.getByRole('button', { name: 'Search the site' }))
  const input = screen.getByRole('textbox', { name: 'Search posts' })
  fireEvent.change(input, { target: { value: 'query' } })
  await tick()

  const first = screen.getByRole('link', { name: 'first' })
  const second = screen.getByRole('link', { name: 'second' })
  expect(first.getAttribute('data-active')).toBe('true')
  expect(fireEvent.keyDown(input, { key: 'ArrowDown', cancelable: true, ...keyboard })).toBe(true)
  expect(first.getAttribute('data-active')).toBe('true')

  fireEvent.keyDown(input, { key: 'ArrowDown' })
  expect(second.getAttribute('data-active')).toBe('true')
  expect(fireEvent.keyDown(input, { key: 'ArrowUp', cancelable: true, ...keyboard })).toBe(true)
  expect(second.getAttribute('data-active')).toBe('true')
  expect(fireEvent.keyDown(input, { key: 'Escape', cancelable: true, ...keyboard })).toBe(true)
  expect(screen.getByRole('dialog', { name: 'Search' })).toBeTruthy()

  const navigate = vi.fn()
  expect(captureNavigation(navigate, () => fireEvent.keyDown(input, {
    key: 'Enter', cancelable: true, ...keyboard,
  }))).toBe(true)
  expect(navigate).not.toHaveBeenCalled()

  expect(captureNavigation(navigate, () => fireEvent.keyDown(input, {
    key: 'Enter', cancelable: true,
  }))).toBe(false)
  expect(navigate).toHaveBeenCalledExactlyOnceWith('/second')
})

it('does not start an obsolete search when the loader resolves during a newer debounce', async () => {
  let finishLoading!: (pagefind: { search: typeof mocks.search }) => void
  mocks.loadPagefind.mockReturnValue(new Promise(resolve => { finishLoading = resolve }))
  mocks.search.mockImplementation((query: string) => Promise.resolve(result(query)))
  render(<SiteSearch />)
  fireEvent.click(screen.getByRole('button', { name: 'Search the site' }))
  const input = screen.getByRole('textbox', { name: 'Search posts' })

  fireEvent.change(input, { target: { value: 'old' } })
  await tick()
  fireEvent.change(input, { target: { value: 'new' } })
  await act(async () => finishLoading({ search: mocks.search }))

  expect(mocks.search).not.toHaveBeenCalled()
  expect(screen.getByRole('status').textContent).toBe('Searching…')
  expect(fireEvent.keyDown(input, { key: 'Enter', cancelable: true })).toBe(true)

  await tick()
  expect(mocks.search).toHaveBeenCalledExactlyOnceWith('new')
  expect(screen.queryByRole('link', { name: 'old' })).toBeNull()
  expect(screen.getByRole('link', { name: 'new' }).getAttribute('href')).toBe('/new')
})

it('keeps newer successful results when an obsolete search rejects', async () => {
  let rejectOld!: (reason: Error) => void
  mocks.search.mockImplementation((query: string) => query === 'old'
    ? new Promise((_resolve, reject) => { rejectOld = reject })
    : Promise.resolve(result(query)))
  render(<SiteSearch />)
  fireEvent.click(screen.getByRole('button', { name: 'Search the site' }))
  const input = screen.getByRole('textbox', { name: 'Search posts' })

  fireEvent.change(input, { target: { value: 'old' } })
  await tick()
  fireEvent.change(input, { target: { value: 'new' } })
  await tick()
  expect(screen.getByRole('link', { name: 'new' })).toBeTruthy()

  await act(async () => rejectOld(Error('old search failed')))

  expect(screen.getByRole('link', { name: 'new' }).getAttribute('href')).toBe('/new')
  expect(screen.getByRole('status').textContent).toBe('')
  expect(screen.queryByRole('link', { name: 'Browse the archive' })).toBeNull()
})

it('shows unavailable without previous results when current result data rejects', async () => {
  let rejectData!: (reason: Error) => void
  mocks.search.mockImplementation((query: string) => Promise.resolve(query === 'first'
    ? result(query)
    : { results: [{ id: 'second', data: () => new Promise((_resolve, reject) => { rejectData = reject }) }] }))
  render(<SiteSearch />)
  fireEvent.click(screen.getByRole('button', { name: 'Search the site' }))
  const input = screen.getByRole('textbox', { name: 'Search posts' })

  fireEvent.change(input, { target: { value: 'first' } })
  await tick()
  expect(screen.getByRole('link', { name: 'first' })).toBeTruthy()
  fireEvent.change(input, { target: { value: 'second' } })
  await tick()
  expect(screen.queryByRole('link', { name: 'first' })).toBeNull()
  expect(screen.getByRole('status').textContent).toBe('Searching…')

  await act(async () => rejectData(Error('result data failed')))

  expect(screen.queryByRole('link', { name: 'first' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'second' })).toBeNull()
  expect(screen.getByRole('status').textContent).toBe('Search is unavailable right now. You can still browse every post.')
  expect(screen.getByRole('link', { name: 'Browse the archive' }).getAttribute('href')).toMatch(/^\/blog\/?$/)
  expect(fireEvent.keyDown(input, { key: 'Enter', cancelable: true })).toBe(true)
})

it('resets keyboard selection to the first result after the query changes', async () => {
  mocks.search.mockImplementation((query: string) => Promise.resolve({
    results: [...result(`${query}-first`).results, ...result(`${query}-second`).results],
  }))
  render(<SiteSearch />)
  fireEvent.click(screen.getByRole('button', { name: 'Search the site' }))
  const input = screen.getByRole('textbox', { name: 'Search posts' })

  fireEvent.change(input, { target: { value: 'old' } })
  await tick()
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  expect(screen.getByRole('link', { name: 'old-second' }).getAttribute('data-active')).toBe('true')

  fireEvent.change(input, { target: { value: 'new' } })
  expect(screen.queryByRole('link', { name: 'old-second' })).toBeNull()
  await tick()

  expect(screen.getByRole('link', { name: 'new-first' }).getAttribute('data-active')).toBe('true')
  expect(screen.getByRole('link', { name: 'new-second' }).getAttribute('data-active')).toBe('false')
})

it('requests the exact current selected destination and never the previous query destination', async () => {
  const entry = (title: string, url: string) => ({
    id: title,
    data: async () => ({ url, excerpt: '', meta: { title } }),
  })
  let resolveNew!: (value: ReturnType<typeof result>) => void
  mocks.search.mockImplementation((query: string) => query === 'old'
    ? Promise.resolve({ results: [entry('Old first', '/blog/old-first/'), entry('Old second', '/blog/old-second/?from=search#details')] })
    : new Promise(resolve => { resolveNew = resolve }))
  render(<SiteSearch />)
  fireEvent.click(screen.getByRole('button', { name: 'Search the site' }))
  const input = screen.getByRole('textbox', { name: 'Search posts' })
  const navigate = vi.fn()
  const pressEnter = () => captureNavigation(navigate, () =>
    fireEvent.keyDown(input, { key: 'Enter', cancelable: true }))

  fireEvent.change(input, { target: { value: 'old' } })
  await tick()
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  expect(pressEnter()).toBe(false)
  expect(navigate).toHaveBeenCalledExactlyOnceWith('/blog/old-second/?from=search#details')
  navigate.mockClear()

  fireEvent.change(input, { target: { value: 'new' } })
  expect(pressEnter()).toBe(true)
  expect(navigate).not.toHaveBeenCalled()
  await tick()
  expect(pressEnter()).toBe(true)
  expect(navigate).not.toHaveBeenCalled()

  await act(async () => resolveNew({ results: [
    entry('New first', '/blog/new-first/?from=search#summary'),
    entry('New second', '/blog/new-second/'),
  ] }))
  expect(pressEnter()).toBe(false)
  expect(navigate).toHaveBeenCalledExactlyOnceWith('/blog/new-first/?from=search#summary')
})
