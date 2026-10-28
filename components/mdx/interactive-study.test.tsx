// @vitest-environment jsdom
import React from 'react'
import { readFileSync } from 'node:fs'
import { act, cleanup, fireEvent, render, within, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InteractiveStudy } from './interactive-study'

function setup(observer = true) {
  const observers: { callback: IntersectionObserverCallback; targets: Set<Element> }[] = []
  const resizeCallbacks: (() => void)[] = []
  let targetX = 32
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.matches('[data-interactive-study]')) return new DOMRect(0, 0, 640, 600)
    if (this.matches('[data-study-target]')) return new DOMRect(targetX, 400, 560, 60)
    if (this.tagName === 'P') return new DOMRect(32, 300, 400, 40)
    return new DOMRect(32, 150, 560, 100)
  })
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => setTimeout(() => fn(0), 0))
  vi.stubGlobal('cancelAnimationFrame', clearTimeout)
  vi.stubGlobal('ResizeObserver', class {
    constructor(fn: () => void) { resizeCallbacks.push(fn) }
    observe() {} unobserve() {} disconnect() {}
  })
  if (observer) vi.stubGlobal('IntersectionObserver', class {
    item: typeof observers[number]
    constructor(callback: IntersectionObserverCallback) { this.item = { callback, targets: new Set() }; observers.push(this.item) }
    observe(target: Element) { this.item.targets.add(target) }
    unobserve(target: Element) { this.item.targets.delete(target) }
    disconnect() { this.item.targets.clear() }
  })
  else vi.stubGlobal('IntersectionObserver', undefined)
  function visible(target: Element, isVisible = true, ratio = 1) {
    act(() => observers.filter(observer => observer.targets.has(target)).forEach(observer => observer.callback([{ target, isIntersecting: isVisible, intersectionRatio: ratio } as IntersectionObserverEntry], {} as IntersectionObserver)))
  }
  return {
    visible,
    guideVisible(target: Element, isVisible = true, ratio = 1) {
      visible(target, isVisible, ratio)
      const root = target.closest('[data-interactive-study]')!
      const note = [...root.querySelectorAll('[data-open]')].find(node => node.closest('[data-interactive-study]') === root)!
      visible(note, isVisible, 1)
    },
    moveTarget(x: number) { targetX = x; act(() => resizeCallbacks.forEach(fn => fn())) },
  }
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const control = <label data-study-target>Resistance<input type="range" aria-label="Resistance" defaultValue="2" min="0" max="5" /></label>
function study(ready = true) {
  return <InteractiveStudy title="RLC" hint="Try changing Resistance." ready={ready} controls={control}><figure><canvas /><figcaption>Original caption.</figcaption></figure></InteractiveStudy>
}

describe('InteractiveStudy guide', () => {
  it('auto-shows only for a ready visible target, dismisses on real input and never reopens on re-entry/reset', () => {
    const env = setup()
    const { container, getByRole, rerender } = render(study(false))
    const target = container.querySelector('[data-study-target]')!
    env.guideVisible(target)
    expect(getByRole('button', { name: 'Show guide' }).getAttribute('aria-expanded')).toBe('false')
    rerender(study())
    expect(getByRole('button', { name: 'Show guide' }).getAttribute('aria-expanded')).toBe('false')
    env.guideVisible(target, true, .1)
    expect(getByRole('button', { name: 'Show guide' })).toBeTruthy()
    env.guideVisible(target)
    const hide = getByRole('button', { name: 'Hide guide' })
    expect(hide.getAttribute('aria-expanded')).toBe('true')
    const hint = document.getElementById(hide.getAttribute('aria-controls')!)!
    expect(hint.textContent).toBe('Try changing Resistance.')
    expect(hint.getAttribute('aria-hidden')).toBe('false')
    fireEvent.input(getByRole('slider'), { target: { value: '3' } })
    expect(hint.getAttribute('aria-hidden')).toBe('true')
    env.guideVisible(target, false); env.guideVisible(target)
    rerender(study())
    expect(getByRole('button', { name: 'Show guide' }).getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(getByRole('button', { name: 'Show guide' }))
    expect(getByRole('button', { name: 'Hide guide' }).getAttribute('aria-expanded')).toBe('true')
    expect(container.querySelector('figcaption')?.textContent).toBe('Original caption.')
  })

  it('waits for both the real target and readable hint, independently for tall frames', () => {
    const env = setup()
    const { container } = render(<>{study()}<InteractiveStudy title="Other" hint="Other hint" controls={<button data-study-target>Other target</button>}><p>Other plot</p></InteractiveStudy></>)
    const [first, second] = [...container.querySelectorAll('[data-interactive-study]')]
    const target = first.querySelector('[data-study-target]')!
    const note = first.querySelector('[data-open]')!
    const help = first.querySelector('button[aria-expanded]')!
    env.visible(target)
    env.visible(note, false, 0)
    expect(help.getAttribute('aria-expanded')).toBe('false')
    expect(first.querySelector('svg')).toBeNull()
    env.visible(note, true, .74)
    expect(help.getAttribute('aria-expanded')).toBe('false')
    env.visible(note, true, .75)
    expect(help.getAttribute('aria-expanded')).toBe('true')
    expect(second.querySelector('button[aria-expanded]')?.getAttribute('aria-expanded')).toBe('false')
    fireEvent.input(within(first as HTMLElement).getByRole('slider'))
    env.visible(note, false, 0); env.visible(target, false, 0)
    env.visible(target); env.visible(note)
    expect(help.getAttribute('aria-expanded')).toBe('false')
    // A different frame with no simultaneous target/note intersection retains
    // manual replay, rather than automatically scrolling or moving content.
    const otherHelp = second.querySelector('button[aria-expanded]')!
    env.visible(second.querySelector('[data-open]')!)
    expect(otherHelp.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(otherHelp)
    expect(otherHelp.getAttribute('aria-expanded')).toBe('true')
  })

  it('ignores hover, focus, Tab, scrolling and background clicks, but handles enabled keyboard/direct actions', () => {
    const env = setup()
    const { container, getByRole, getByText } = render(<InteractiveStudy title="Study" hint="Try this." controls={<>{control}<button disabled>Unavailable</button><div role="button" tabIndex={0} data-study-action>Direct action</div></>}><p>Background</p></InteractiveStudy>)
    env.guideVisible(container.querySelector('[data-study-target]')!)
    const slider = getByRole('slider')
    fireEvent.mouseOver(slider); fireEvent.focus(slider); fireEvent.keyDown(slider, { key: 'Tab' })
    fireEvent.scroll(container); fireEvent.click(getByText('Background')); fireEvent.pointerDown(getByText('Unavailable'))
    expect(getByRole('button', { name: 'Hide guide' })).toBeTruthy()
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(getByRole('button', { name: 'Show guide' })).toBeTruthy()
    fireEvent.click(getByRole('button', { name: 'Show guide' }))
    fireEvent.keyDown(getByText('Direct action'), { key: 'Enter' })
    expect(getByRole('button', { name: 'Show guide' })).toBeTruthy()
  })

  it('does not dismiss readonly fields or remeasure unrelated animated plot changes', async () => {
    const env = setup()
    const { container, getByRole } = render(<InteractiveStudy title="Read" hint="Adjust resistance." controls={<>{control}<input aria-label="Read only" readOnly value="2" /><textarea aria-label="Read only note" readOnly value="Note" /></>}><svg><path d="M0 0L1 1" /></svg></InteractiveStudy>)
    env.guideVisible(container.querySelector('[data-study-target]')!)
    fireEvent.input(getByRole('textbox', { name: 'Read only' }))
    fireEvent.keyDown(getByRole('textbox', { name: 'Read only note' }), { key: ' ' })
    fireEvent.click(getByRole('textbox', { name: 'Read only' }))
    expect(getByRole('button', { name: 'Hide guide' })).toBeTruthy()
    // Clear measurements after the initial layout; animated SVG attributes and
    // chart text must not cause repeated root/target measurement work.
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) })
    const measured = vi.mocked(HTMLElement.prototype.getBoundingClientRect)
    measured.mockClear()
    container.querySelector('svg path')!.setAttribute('d', 'M0 0L2 2')
    container.querySelector('svg')!.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) })
    expect(measured).not.toHaveBeenCalled()
  })

  it.each([false, true])('manual replay reveals an offscreen hint without moving focus (reduced=%s)', reduced => {
    setup(false)
    vi.stubGlobal('matchMedia', () => ({ matches: reduced }))
    const scrollIntoView = vi.fn()
    vi.stubGlobal('innerHeight', 200)
    const { getByRole, container } = render(study())
    const hint = container.querySelector('p')!
    hint.scrollIntoView = scrollIntoView
    const help = getByRole('button', { name: 'Show guide' })
    help.focus()
    fireEvent.click(help)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
    expect(document.activeElement).toBe(help)
  })

  it('keeps nested frames independent and ignores nested targets in the parent', () => {
    const env = setup()
    const { container } = render(<InteractiveStudy title="Outer" hint="Outer hint" controls={control}><InteractiveStudy title="Inner" hint="Inner hint" controls={<button data-study-target>Inner action</button>}><p>Inner content</p></InteractiveStudy></InteractiveStudy>)
    const [outer, inner] = [...container.querySelectorAll<HTMLElement>('[data-interactive-study]')]
    const outerTarget = [...outer.querySelectorAll('[data-study-target]')].find(node => node.closest('[data-interactive-study]') === outer)!
    const innerTarget = inner.querySelector('[data-study-target]')!
    env.guideVisible(innerTarget)
    expect(outer.querySelector('button[aria-expanded]')?.getAttribute('aria-expanded')).toBe('false')
    env.guideVisible(outerTarget)
    fireEvent.click(within(inner).getByRole('button', { name: 'Inner action' }))
    expect(inner.querySelector('button[aria-expanded]')?.getAttribute('aria-expanded')).toBe('false')
    expect(outer.querySelector('button[aria-expanded]')?.getAttribute('aria-expanded')).toBe('true')
  })

  it('offers manual fallback without an observer and disables missing-target guides', () => {
    setup(false)
    const { getByRole, rerender, container } = render(study())
    expect(getByRole('button', { name: 'Show guide' }).hasAttribute('disabled')).toBe(false)
    fireEvent.click(getByRole('button', { name: 'Show guide' }))
    expect(getByRole('button', { name: 'Hide guide' })).toBeTruthy()
    rerender(<InteractiveStudy title="No target" hint="Try this."><p>Loading</p></InteractiveStudy>)
    // Mutation measurement is asynchronous; ready=false makes loading safe immediately.
    rerender(<InteractiveStudy title="No target" hint="Try this." ready={false}><p>Loading</p></InteractiveStudy>)
    expect(getByRole('button', { name: 'Show guide' }).hasAttribute('disabled')).toBe(true)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('measures deterministic gutter geometry and suppresses unsafe inset targets', async () => {
    const env = setup()
    const { container, getByRole } = render(study())
    env.guideVisible(container.querySelector('[data-study-target]')!)
    const path = container.querySelector('svg path')?.getAttribute('d')
    expect(path).toBeTruthy()
    expect(container.querySelector('svg circle')?.getAttribute('cx')).toBe('25')
    expect(container.querySelector('svg circle')?.getAttribute('cy')).toBe('430')
    expect(container.querySelector('svg')?.getAttribute('focusable')).toBe('false')
    fireEvent.click(getByRole('button', { name: 'Hide guide' })); fireEvent.click(getByRole('button', { name: 'Show guide' }))
    expect(container.querySelector('svg path')?.getAttribute('d')).toBe(path)
    env.moveTarget(100)
    await waitFor(() => expect(container.querySelector('svg')).toBeNull())
    env.moveTarget(32)
    await waitFor(() => expect(container.querySelector('svg path')?.getAttribute('d')).toBe(path))
  })

  it('reaches padded SVG/canvas targets through their measured empty left padding', async () => {
    const env = setup()
    const { container } = render(<InteractiveStudy title="Padded plot" hint="Try the plot." controls={<div style={{ paddingLeft: 16 }}>{control}</div>}><p>Plot</p></InteractiveStudy>)
    env.guideVisible(container.querySelector('[data-study-target]')!)
    env.moveTarget(48)
    await waitFor(() => expect(container.querySelector('svg circle')?.getAttribute('cx')).toBe('41'))
    expect(container.querySelector('svg path')).not.toBeNull()
    env.moveTarget(100)
    await waitFor(() => expect(container.querySelector('svg')).toBeNull())
  })

  it.each(['disabled', 'readOnly'] as const)('does not offer a guide to a %s target', kind => {
    const env = setup()
    const { container, getByRole } = render(<InteractiveStudy title="Unavailable" hint="Try this."><input data-study-target aria-label="Unavailable target" {...{[kind]: true}} /></InteractiveStudy>)
    env.guideVisible(container.querySelector('[data-study-target]')!)
    expect((getByRole('button', {name: 'Show guide'}) as HTMLButtonElement).disabled).toBe(true)
    expect(container.querySelector('[data-open="true"]')).toBeNull()
  })

  it('keeps light/dark red ink, open-right rules, noninteractive overlays and stable hidden hint space', () => {
    const css = readFileSync('components/mdx/interactive-study.module.css', 'utf8')
    expect(css).toContain('--study-ink: #b32624')
    expect(css).toContain(':global(.dark) .study { --study-ink: #ffaaa5; }')
    expect(css).toContain('border-left: 1px solid var(--color-border)')
    expect(css).not.toContain('border-right:')
    expect(css).toContain('pointer-events: none')
    expect(css).toContain('visibility: hidden')
    expect(css).toContain('visibility: visible')
    expect(css).toContain('prefers-reduced-motion: reduce')
  })
})
