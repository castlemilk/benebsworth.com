// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { TokenSampler } from './token-sampler'
import { ThresholdCurve } from './threshold-curve'
import { GameOfLife } from './game-of-life'
import { DemoFrame } from '@/components/lab/llm-benchmark/demos/demo-frame'
import { CANDIDATES, STEM, sampleDistribution } from './sampling-data'

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })))
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal('PointerEvent', MouseEvent)
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 600, 430))
  // All studies are visible; unit tests do not assert visual connector geometry.
  vi.stubGlobal('IntersectionObserver', class {
    constructor(private callback: IntersectionObserverCallback) {}
    observe(target: Element) { this.callback([{ target, isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry], this as unknown as IntersectionObserver) }
    unobserve() {} disconnect() {}
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('keeps sampling parameters, exact distribution and draw affordance in the DOM study', () => {
  const { container, getByRole } = render(<TokenSampler />)
  expect(container.textContent).toContain(STEM)
  expect(container.querySelector('figure')?.className).not.toContain('rounded-2xl')
  expect(container.querySelector('[data-study-target] input')).not.toBeNull()
  expect(container.querySelector('.ts-row')?.closest('[data-study-action]')).toBeNull()
  const sliders = within(container).getAllByRole('slider') as HTMLInputElement[]
  expect(sliders.map(x => [x.min, x.max, x.step, x.value])).toEqual([['0.1','2','0.05','1'], ['1','8','1','8'], ['0.1','1','0.05','1']])
  fireEvent.change(sliders[0], { target: { value: '2' } })
  const rows = container.querySelectorAll('.ts-row')
  sampleDistribution(2, 8, 1).forEach((p, i) => {
    expect(rows[i].textContent).toContain(CANDIDATES[i])
    expect(rows[i].textContent).toContain(`${(p * 100).toFixed(1)}%`)
  })
  fireEvent.click(getByRole('button', { name: 'sample →' }))
  expect(container.textContent).toContain('recent draws')
})

it('preserves threshold math, SVG viewBox, direct surface and keyboard-equivalent range', () => {
  const { container, getByRole, getByTestId } = render(<ThresholdCurve />)
  const plot = getByRole('img')
  expect(plot.getAttribute('viewBox')).toBe('0 0 600 430')
  expect(plot.hasAttribute('data-study-target')).toBe(true)
  expect(plot.hasAttribute('data-study-action')).toBe(true)
  const readout = getByTestId('threshold-readout')
  expect(readout.getAttribute('data-p')).toBe('2.000e-3')
  expect(readout.getAttribute('data-lambda')).toBe('2.2361')
  fireEvent.change(getByRole('slider'), { target: { value: '500' } })
  expect(readout.getAttribute('data-p')).toBe('1.000e-2')
  expect(readout.getAttribute('data-lambda')).toBe('1.0000')
  expect(container.textContent).toContain('Willow · Λ≈2.14')
  vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 600, 430))
  fireEvent.pointerDown(plot, { clientX: 578 })
  expect(readout.getAttribute('data-p')).toBe('1.000e-1')
  fireEvent.pointerUp(window)
})

it('preserves manual Life evolution under reduced motion and direct cell drawing', () => {
  const { container, getByRole } = render(<GameOfLife />)
  const canvas = getByRole('img') as HTMLCanvasElement
  expect(canvas.hasAttribute('data-study-target')).toBe(true)
  expect(canvas.hasAttribute('data-study-action')).toBe(true)
  const readout = () => canvas.parentElement!.nextElementSibling!.textContent
  fireEvent.click(getByRole('button', { name: 'Glider' }))
  expect(readout()).toMatch(/gen 0live 5 \/ 1500/)
  for (let i = 0; i < 4; i++) fireEvent.click(getByRole('button', { name: 'step' }))
  expect(readout()).toMatch(/gen 4live 5 \/ 1500/)
  fireEvent.click(getByRole('button', { name: 'play ▶' }))
  expect(readout()).toMatch(/gen 5live 5 \/ 1500/)
  fireEvent.click(getByRole('button', { name: 'clear' }))
  expect(readout()).toMatch(/gen 0live 0 \/ 1500/)
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 500, 300))
  canvas.setPointerCapture = vi.fn(); canvas.hasPointerCapture = () => false
  fireEvent.pointerDown(canvas, { clientX: 5, clientY: 5 })
  expect(readout()).toMatch(/live 1 \/ 1500/)
  fireEvent.pointerUp(canvas)
  expect(container.textContent).toContain('Three local rules (B3/S23)')
})

it('DemoFrame preserves stage and controls without inventing an interaction on static content', () => {
  const onClick = vi.fn()
  const { container, getByRole, rerender } = render(<DemoFrame title="Example" accent="#123456" blurb="Exact existing explanation" controls={<button onClick={onClick}>Step</button>}><canvas aria-label="Static output" /></DemoFrame>)
  expect(container.textContent).toContain('Exact existing explanation')
  expect(container.querySelector('canvas')?.hasAttribute('data-study-action')).toBe(false)
  expect(container.querySelector('[data-study-target] button')).toBe(getByRole('button', { name: 'Step' }))
  fireEvent.click(getByRole('button', { name: 'Step' })); expect(onClick).toHaveBeenCalledOnce()
  rerender(<DemoFrame title="Static" accent="#123456"><p>Read only</p></DemoFrame>)
  expect(container.querySelector('[data-study-target]')).toBeNull()
  expect(container.textContent).not.toContain('Watch this change')
})

it('keeps guides independent across real DOM, SVG and canvas adapters', () => {
  const { container } = render(<><TokenSampler /><ThresholdCurve /><GameOfLife /></>)
  const frames = [...container.querySelectorAll<HTMLElement>('[data-interactive-study]')]
  const guide = (index: number) => frames[index].querySelector('[data-open]')!
  expect(frames).toHaveLength(3)
  expect(frames.map((_, i) => guide(i).getAttribute('data-open'))).toEqual(['true', 'true', 'true'])
  // A passive chart pointer is not an action; changing a real value is.
  fireEvent.pointerDown(frames[0].querySelector('.ts-row')!)
  expect(guide(0).getAttribute('data-open')).toBe('true')
  fireEvent.change(within(frames[0]).getAllByRole('slider')[0], { target: { value: '1.5' } })
  expect(frames.map((_, i) => guide(i).getAttribute('data-open'))).toEqual(['false', 'true', 'true'])
  fireEvent.pointerDown(within(frames[1]).getByRole('img'), { clientX: 300 })
  fireEvent.pointerUp(window)
  expect(frames.map((_, i) => guide(i).getAttribute('data-open'))).toEqual(['false', 'false', 'true'])
  fireEvent.click(within(frames[2]).getByRole('button', { name: 'step' }))
  expect(frames.map((_, i) => guide(i).getAttribute('data-open'))).toEqual(['false', 'false', 'false'])
  fireEvent.click(within(frames[0]).getByRole('button', { name: 'Show guide' }))
  expect(frames.map((_, i) => guide(i).getAttribute('data-open'))).toEqual(['true', 'false', 'false'])
})
