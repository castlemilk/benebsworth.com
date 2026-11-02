// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SiteSearch } from './site-search'
import { revealSearchSelection } from './search-hit'

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable:true, value:vi.fn(function (this: HTMLDialogElement) { this.open = true }) })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable:true, value:vi.fn(function (this: HTMLDialogElement) { this.open = false }) })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.body.style.overflow = '' })

describe('site search modal', () => {
  it('escapes the filtered header and invokes the browser top layer', () => {
    const view = render(<header style={{ backdropFilter:'blur(4px)' }}><SiteSearch /></header>)
    const trigger = screen.getByRole('button', { name:'Search the site' })
    trigger.focus()
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name:'Search' })
    expect(dialog.parentElement).toBe(document.body)
    expect(view.container.contains(dialog)).toBe(false)
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name:'Search posts' }))
    expect(document.body.style.overflow).toBe('hidden')
    const closeButton = screen.getByRole('button', { name:'Close search' })
    expect(fireEvent.keyDown(closeButton, { key:'ArrowDown', cancelable:true })).toBe(true)
    expect(fireEvent.keyDown(closeButton, { key:'Enter', cancelable:true })).toBe(true)
    fireEvent.click(closeButton)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(document.body.style.overflow).toBe('')
  })
  it('handles Escape, backdrop dismissal and repeated shortcut opening', () => {
    render(<SiteSearch />)
    fireEvent.keyDown(window, { key:'k', ctrlKey:true })
    fireEvent.keyDown(screen.getByRole('textbox'), { key:'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.keyDown(window, { key:'k', metaKey:true })
    fireEvent.click(screen.getByRole('dialog'))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.keyDown(window, { key:'k', ctrlKey:true })
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles:true }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('does not close on content click and restores pre-existing scroll state', () => {
    document.body.style.overflow = 'clip'
    const view = render(<SiteSearch />)
    fireEvent.click(screen.getByRole('button', { name:'Search the site' }))
    fireEvent.click(screen.getByRole('heading', { name:'Find a field note' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    view.unmount()
    expect(document.body.style.overflow).toBe('clip')
  })
})

 it('reveals only the selected result without smooth motion', () => {
   const dialog = document.createElement('div')
   dialog.innerHTML = '<a data-active="false">First</a><a data-active="true">Second</a>'
   const first = dialog.children[0] as HTMLElement
   const selected = dialog.children[1] as HTMLElement
   first.scrollIntoView = vi.fn()
   selected.scrollIntoView = vi.fn()
   revealSearchSelection(dialog)
   expect(first.scrollIntoView).not.toHaveBeenCalled()
   expect(selected.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
   expect(() => revealSearchSelection(null)).not.toThrow()
 })
