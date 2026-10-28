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
    setTargetPosition(x: number) { targetX = x },
    observedTargets() { return observers.flatMap(observer => [...observer.targets]) },
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
    expect(first.querySelector('svg[data-study-connector]')).toBeNull()
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
    expect(container.querySelector('svg[data-study-connector]')).toBeNull()
  })

  it('measures deterministic gutter geometry and suppresses unsafe inset targets', async () => {
    const env = setup()
    const { container, getByRole } = render(study())
    env.guideVisible(container.querySelector('[data-study-target]')!)
    const path = container.querySelector('svg[data-study-connector] path')?.getAttribute('d')
    expect(path).toBeTruthy()
    expect(container.querySelector('svg circle')?.getAttribute('cx')).toBe('25')
    expect(container.querySelector('svg circle')?.getAttribute('cy')).toBe('430')
    expect(container.querySelector('svg[data-study-connector]')?.getAttribute('focusable')).toBe('false')
    fireEvent.click(getByRole('button', { name: 'Hide guide' })); fireEvent.click(getByRole('button', { name: 'Show guide' }))
    expect(container.querySelector('svg[data-study-connector] path')?.getAttribute('d')).toBe(path)
    env.moveTarget(100)
    await waitFor(() => expect(container.querySelector('svg[data-study-connector]')).toBeNull())
    env.moveTarget(32)
    await waitFor(() => expect(container.querySelector('svg[data-study-connector] path')?.getAttribute('d')).toBe(path))
  })

  it('reaches padded SVG/canvas targets through their measured empty left padding', async () => {
    const env = setup()
    const { container } = render(<InteractiveStudy title="Padded plot" hint="Try the plot." controls={<div style={{ paddingLeft: 16 }}>{control}</div>}><p>Plot</p></InteractiveStudy>)
    env.guideVisible(container.querySelector('[data-study-target]')!)
    env.moveTarget(48)
    await waitFor(() => expect(container.querySelector('svg circle')?.getAttribute('cx')).toBe('41'))
    expect(container.querySelector('svg[data-study-connector] path')).not.toBeNull()
    env.moveTarget(100)
    await waitFor(() => expect(container.querySelector('svg[data-study-connector]')).toBeNull())
  })

  it.each(['disabled', 'readOnly'] as const)('does not offer a guide to a %s target', kind => {
    const env = setup()
    const { container, getByRole } = render(<InteractiveStudy title="Unavailable" hint="Try this."><input data-study-target aria-label="Unavailable target" {...{[kind]: true}} /></InteractiveStudy>)
    env.guideVisible(container.querySelector('[data-study-target]')!)
    expect((getByRole('button', {name: 'Show guide'}) as HTMLButtonElement).disabled).toBe(true)
    expect(container.querySelector('[data-open="true"]')).toBeNull()
  })

  it('highlights inset targets without an unsafe curve or changing focus, values, or selection', async () => {
    const env = setup(false)
    const { container, getByRole } = render(<InteractiveStudy title="Text" hint="Edit the name."><input data-study-target aria-label="Name" defaultValue="unchanged" /></InteractiveStudy>)
    const input = getByRole('textbox') as HTMLInputElement
    input.focus(); input.setSelectionRange(1, 4)
    fireEvent.click(getByRole('button', { name: 'Show guide' }))
    env.moveTarget(300)
    await waitFor(() => expect((container.querySelector('[data-study-highlight]') as HTMLElement)?.style.left).toBe('296px'))
    expect(container.querySelector('svg[data-study-connector]')).toBeNull()
    expect(input.value).toBe('unchanged')
    expect([input.selectionStart, input.selectionEnd]).toEqual([1, 4])
    expect(document.activeElement).toBe(input)
    expect(container.querySelector('[data-study-highlight]')?.parentElement?.getAttribute('aria-hidden')).toBe('true')
    fireEvent.input(input, { target: { value: 'changed' } })
    expect(container.querySelector('[data-study-highlight]')).toBeNull()
  })

  it.each([
    { name: 'select', control: <select data-study-target aria-label="Choice" defaultValue="a"><option value="a">A</option><option value="b">B</option></select>, role: 'combobox', event: 'change' },
    { name: 'radio', control: <input data-study-target type="radio" aria-label="Choice" />, role: 'radio', event: 'click' },
    { name: 'custom slider', control: <div data-study-target role="slider" tabIndex={0} aria-label="Choice" aria-valuenow={2} aria-valuemin={0} aria-valuemax={5} />, role: 'slider', event: 'key' },
    { name: 'editable text', control: <div data-study-target role="textbox" contentEditable aria-label="Choice" />, role: 'textbox', event: 'input' },
  ])('supports an arbitrary $name target without replacing its semantics', ({ control: selected, role, event }) => {
    setup(false)
    const { container, getByRole } = render(<InteractiveStudy title="Arbitrary" hint="Try this.">{selected}</InteractiveStudy>)
    fireEvent.click(getByRole('button', { name: 'Show guide' }))
    expect(container.querySelector('[data-study-highlight]')).not.toBeNull()
    const input = getByRole(role, { name: 'Choice' })
    fireEvent.focus(input); fireEvent.keyDown(input, { key: 'Tab' })
    expect(container.querySelector('[data-study-highlight]')).not.toBeNull()
    if (event === 'key') fireEvent.keyDown(input, { key: 'ArrowRight' })
    else if (event === 'click') fireEvent.click(input)
    else if (event === 'change') fireEvent.change(input, { target: { value: 'b' } })
    else fireEvent.input(input)
    expect(container.querySelector('[data-study-highlight]')).toBeNull()
  })

  it('re-resolves dynamic selectors, malformed/missing selectors and replacement nodes safely', async () => {
    setup(false)
    const fixture = (selector: string, replaced = false) => <InteractiveStudy title="Targets" hint="Try the selected field." targetSelector={selector}>
      <input key={replaced ? 'replacement' : 'original'} id="first" data-study-target aria-label="First" />
      <input id="second" data-study-target aria-label="Second" />
    </InteractiveStudy>
    const { container, getByRole, rerender } = render(fixture('#first'))
    const first = getByRole('textbox', { name: 'First' })
    first.focus()
    fireEvent.click(getByRole('button', { name: 'Show guide' }))
    rerender(fixture('#second'))
    expect(container.querySelector('[data-study-highlight]')).not.toBeNull()
    expect(document.activeElement).toBe(first)
    rerender(fixture('['))
    expect((getByRole('button', { name: 'Show guide' }) as HTMLButtonElement).disabled).toBe(true)
    expect(container.querySelector('[data-study-highlight]')).toBeNull()
    rerender(fixture('#missing'))
    expect((getByRole('button', { name: 'Show guide' }) as HTMLButtonElement).disabled).toBe(true)
    rerender(fixture('#first', true))
    await waitFor(() => expect(container.querySelector('[data-study-highlight]')).not.toBeNull())
    expect(getByRole('textbox', { name: 'First' })).not.toBe(first)
  })

  it('tracks arbitrary selector attribute changes and disables wrappers with unavailable controls', async () => {
    setup(false)
    const { container, getByRole } = render(<InteractiveStudy title="Dynamic" hint="Try this." targetSelector='[data-picked="yes"]'>
      <label data-picked="yes">Choice<input aria-label="Dynamic" /></label>
    </InteractiveStudy>)
    const label = container.querySelector('label')!
    const input = getByRole('textbox') as HTMLInputElement
    fireEvent.click(getByRole('button', { name: 'Show guide' }))
    input.readOnly = true
    await waitFor(() => expect((getByRole('button', { name: 'Show guide' }) as HTMLButtonElement).disabled).toBe(true))
    expect(container.querySelector('[data-study-highlight]')).toBeNull()
    input.readOnly = false
    await waitFor(() => expect(container.querySelector('[data-study-highlight]')).not.toBeNull())
    label.dataset.picked = 'no'
    await waitFor(() => expect(container.querySelector('[data-study-highlight]')).toBeNull())
    label.dataset.picked = 'yes'
    await waitFor(() => expect(container.querySelector('[data-study-highlight]')).not.toBeNull())
    input.disabled = true
    await waitFor(() => expect(container.querySelector('[data-study-highlight]')).toBeNull())
  })

  it('never selects nested or guide UI controls even with a broad selector', () => {
    setup(false)
    const { container } = render(<InteractiveStudy title="Outer" hint="Outer" targetSelector="button">
      <InteractiveStudy title="Inner" hint="Inner"><button data-study-target>Nested</button></InteractiveStudy>
    </InteractiveStudy>)
    const [outer, inner] = [...container.querySelectorAll<HTMLElement>('[data-interactive-study]')]
    expect((outer.querySelector('button[aria-expanded]') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(within(inner).getByRole('button', { name: 'Show guide' }))
    expect(inner.querySelector('[data-study-highlight]')).not.toBeNull()
    expect([...outer.querySelectorAll('[data-study-highlight]')].filter(node => node.closest('[data-interactive-study]') === outer)).toHaveLength(0)
  })

  it('remeasures internal scrolls, bounds the padded perimeter and cleans up observers', async () => {
    const env = setup()
    const { container, unmount } = render(study())
    const target = container.querySelector('[data-study-target]')!
    env.guideVisible(target)
    const highlight = () => container.querySelector('[data-study-highlight]') as HTMLElement
    expect(highlight().style.left).toBe('28px')
    env.setTargetPosition(100)
    fireEvent.scroll(target.parentElement!)
    await waitFor(() => expect(highlight().style.left).toBe('96px'))
    expect(highlight().style.width).toBe('544px')
    env.setTargetPosition(700)
    fireEvent.scroll(target.parentElement!)
    await waitFor(() => expect(highlight()).toBeNull())
    expect(env.observedTargets().length).toBeGreaterThan(0)
    unmount()
    expect(env.observedTargets()).toHaveLength(0)
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
