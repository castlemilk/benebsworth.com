// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, within } from '@testing-library/react'
import { SiteNav } from './site-nav'
import { Breadcrumb } from './breadcrumb'

const route = vi.hoisted(() => ({ pathname: '/blog/istio-patterns/' }))
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }))
vi.mock('@/components/theme/theme-toggle', () => ({ ThemeToggle: () => <button>Theme</button> }))
vi.mock('@/components/search/site-search', () => ({ SiteSearch: () => <button>Search</button> }))
vi.mock('@/components/mdx/use-scroll-activity', () => ({ useScrollActivity: () => false }))

let desktop = false
let headerHeight = 69
let breadcrumbHeight = 37
let breakpointListeners: Set<() => void>
let observers: { callback: () => void; disconnect: ReturnType<typeof vi.fn> }[]
beforeEach(() => {
  desktop = false
  headerHeight = 69
  breadcrumbHeight = 37
  route.pathname = '/blog/istio-patterns/'
  breakpointListeners = new Set()
  observers = []
  vi.stubGlobal('matchMedia', () => ({
    get matches() { return desktop },
    addEventListener: (_: string, listener: () => void) => breakpointListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => breakpointListeners.delete(listener),
  }))
  vi.stubGlobal('ResizeObserver', class {
    disconnect = vi.fn()
    constructor(callback: () => void) { observers.push({ callback, disconnect: this.disconnect }) }
    observe() {}
  })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return { height: this.matches('[data-site-nav]') ? headerHeight : breadcrumbHeight } as DOMRect
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.documentElement.removeAttribute('style') })

function menu(container: HTMLElement) { return container.querySelector('#mobile-nav') as HTMLElement }

describe('preserved site navigation', () => {
  it('names primary landmarks and identifies exact pages versus current sections', () => {
    const view = render(<SiteNav />)
    const nav = view.container.querySelector('[data-desktop-nav]') as HTMLElement
    expect(nav.getAttribute('aria-label')).toBe('Primary')
    expect(within(nav).getByRole('link', { name: 'blog' }).getAttribute('aria-current')).toBe('location')
    route.pathname = '/blog/'
    view.rerender(<SiteNav />)
    expect(within(nav).getByRole('link', { name: 'blog' }).getAttribute('aria-current')).toBe('page')
    route.pathname = '/blogroll/'
    view.rerender(<SiteNav />)
    expect(nav.querySelector('[aria-current]')).toBeNull()
  })

  it('keeps a real closed disclosure target; Escape closes and returns focus', () => {
    const view = render(<SiteNav />)
    const trigger = view.getByRole('button', { name: 'Open menu' })
    expect(trigger.getAttribute('aria-controls')).toBe(menu(view.container).id)
    expect(menu(view.container).hidden).toBe(true)
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    const link = within(menu(view.container)).getByRole('link', { name: 'blog' })
    expect(link.getAttribute('aria-current')).toBe('location')
    link.focus()
    fireEvent.keyDown(link, { key: 'Escape' })
    expect(menu(view.container).hidden).toBe(true)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
  })

  it('closes on selection and route changes, without reopening when returning', () => {
    const view = render(<SiteNav />)
    fireEvent.click(view.getByRole('button', { name: 'Open menu' }))
    const selected = within(menu(view.container)).getByRole('link', { name: 'blog' })
    selected.addEventListener('click', event => event.preventDefault())
    fireEvent.click(selected)
    expect(menu(view.container).hidden).toBe(true)
    fireEvent.click(view.getByRole('button', { name: 'Open menu' }))
    route.pathname = '/about/'
    view.rerender(<SiteNav />)
    expect(menu(view.container).hidden).toBe(true)
    route.pathname = '/blog/istio-patterns/'
    view.rerender(<SiteNav />)
    expect(menu(view.container).hidden).toBe(true)
  })

  it('closes at the desktop breakpoint and moves hidden menu focus to its desktop counterpart', () => {
    const view = render(<SiteNav />)
    fireEvent.click(view.getByRole('button', { name: 'Open menu' }))
    within(menu(view.container)).getByRole('link', { name: 'projects' }).focus()
    act(() => { desktop = true; breakpointListeners.forEach(listener => listener()) })
    expect(menu(view.container).hidden).toBe(true)
    expect(document.activeElement).toBe(within(view.container.querySelector('[data-desktop-nav]') as HTMLElement).getByRole('link', { name: 'projects' }))
    act(() => { desktop = false; breakpointListeners.forEach(listener => listener()) })
    expect(menu(view.container).hidden).toBe(true)
  })

  it('moves a disappearing mobile trigger to the current desktop link', () => {
    const view = render(<SiteNav />)
    view.getByRole('button', { name: 'Open menu' }).focus()
    act(() => { desktop = true; breakpointListeners.forEach(listener => listener()) })
    const nav = view.container.querySelector('[data-desktop-nav]') as HTMLElement
    expect(document.activeElement).toBe(within(nav).getByRole('link', { name: 'blog' }))
  })

  it('publishes actual header and wrapped breadcrumb sizes, reacts to resize and cleans up', () => {
    const view = render(<><SiteNav /><Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'A long title' }]} /></>)
    const root = document.documentElement.style
    expect(root.getPropertyValue('--site-nav-height')).toBe('69px')
    expect(root.getPropertyValue('--site-breadcrumb-height')).toBe('37px')
    expect(view.getByRole('navigation', { name: 'Breadcrumb' }).className).toContain('top-[var(--site-nav-height,69px)]')
    headerHeight = 310; breadcrumbHeight = 58
    act(() => observers.forEach(observer => observer.callback()))
    expect(root.getPropertyValue('--site-nav-height')).toBe('310px')
    expect(root.getPropertyValue('--site-breadcrumb-height')).toBe('58px')
    expect(view.getByText('A long title').getAttribute('aria-current')).toBe('page')
    view.unmount()
    expect(root.getPropertyValue('--site-nav-height')).toBe('0px')
    expect(root.getPropertyValue('--site-breadcrumb-height')).toBe('0px')
    expect(observers.every(observer => observer.disconnect.mock.calls.length === 1)).toBe(true)
    expect(breakpointListeners.size).toBe(0)
  })

  it('does not count non-sticky breadcrumbs as sticky clearance', () => {
    const view = render(<Breadcrumb sticky={false} items={[{ label: 'Inline' }]} />)
    expect(view.container.querySelector('[data-site-breadcrumb]')).toBeNull()
    expect(document.documentElement.style.getPropertyValue('--site-breadcrumb-height')).toBe('')
    expect(observers).toHaveLength(0)
  })
})
