// @vitest-environment jsdom
import React from 'react'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import type { EffectModule, Params } from '@/lib/lab/types'
import { useEffectModule } from '@/lib/lab/use-effect-module'
import { LabCanvas, LabSide } from './lab-canvas'
import { Controls } from '@/components/lab/controls'
import styles from './lab-canvas.module.css'
import controlStyles from '@/components/lab/controls.module.css'
import studyStyles from './interactive-study.module.css'

vi.mock('@/lib/lab/registry', () => ({
  getEffect: (slug: string) => slug === 'missing' ? undefined : { title: 'Response' },
}))
vi.mock('@/lib/lab/use-effect-module', () => ({ useEffectModule: vi.fn() }))
vi.mock('@/components/lab/effect-canvas', () => ({
  EffectCanvas: ({ ariaLabel, params, quality }: { ariaLabel: string; params: Params; quality: string }) => (
    <canvas aria-label={ariaLabel} data-params={JSON.stringify(params)} data-quality={quality} />
  ),
}))

const effect: EffectModule = {
  defaults: { speed: 2, colour: '#ff0000' },
  controls: [{ type: 'range', key: 'speed', label: 'Speed', min: 0, max: 10, step: 1 }],
  createRenderer: () => ({ step: () => {} }),
}

beforeEach(() => vi.mocked(useEffectModule).mockReturnValue(effect))
afterEach(() => { cleanup(); vi.clearAllMocks() })

function composition(container: HTMLElement) {
  return ['section', `.${styles.layout}`, `.${styles.figure}`, 'figure', `.${studyStyles.title}`, `.${styles.stage}`, 'figcaption', `.${styles.commentary}`]
    .map(selector => container.querySelector(selector)?.className)
}

const commentary = <><h3>Observe the response</h3><p>All the extended explanation remains readable.</p><ul><li>Keep the boundary fixed.</li></ul><a href="#method">Read the method</a></>

describe('container-aware lab figures', () => {
  it.each([false, true])('shares loading and mounted composition, including reverse=%s', reverse => {
    vi.mocked(useEffectModule).mockReturnValue(undefined)
    const view = <LabSide effect="response" height={280} caption="A response trace" reverse={reverse}>{commentary}</LabSide>
    const { container, rerender, getByText } = render(view)
    const loadingClasses = composition(container)
    expect(container.querySelector(`.${styles.stage}`)?.getAttribute('style')).toBe('height: 280px;')
    expect(container.querySelector('figcaption')?.textContent).toBe('A response trace')
    expect(container.querySelector('.motion-safe\\:animate-pulse')).not.toBeNull()
    expect(getByText('All the extended explanation remains readable.')).toBeTruthy()
    expect(container.querySelector(`.${styles.layout}`)?.classList.contains(styles.reversed)).toBe(reverse)

    vi.mocked(useEffectModule).mockReturnValue(effect)
    // A fresh element makes React revisit the module hook, as its subscription would.
    rerender(<LabSide effect="response" height={280} caption="A response trace" reverse={reverse}>{commentary}</LabSide>)
    expect(composition(container)).toEqual(loadingClasses)
    expect(container.querySelector(`.${styles.stage}`)?.getAttribute('style')).toBe('height: 280px;')
    expect(container.querySelector('figure > figcaption')?.textContent).toBe('A response trace')
    expect(container.querySelector(`.${styles.commentary} h3`)?.textContent).toBe('Observe the response')
    expect(container.querySelector(`.${styles.commentary} li`)?.textContent).toBe('Keep the boundary fixed.')
    expect(container.querySelector(`.${styles.commentary} a`)?.getAttribute('href')).toBe('#method')
    expect(container.querySelector('canvas')?.getAttribute('aria-label')).toBe('Response diagram')
    expect(container.querySelector('canvas')?.getAttribute('data-quality')).toBe('mini')
    expect(container.querySelector(`.${styles.layout}`)?.firstElementChild?.classList.contains(styles.figure)).toBe(true)
  })

  it.each([LabCanvas, LabSide])('retains native controls, overridden params, reconciliation and reset', Component => {
    const reconcileParams = vi.fn((params: Params, change?: { key: string; value: number | boolean | string }) =>
      change ? { ...params, [change.key]: change.value } : params)
    vi.mocked(useEffectModule).mockReturnValue({ ...effect, reconcileParams })
    const { container, getByRole } = render(<Component effect="response" params={{ speed: 4 }}>{commentary}</Component>)
    const slider = getByRole('slider', { name: 'Speed' }) as HTMLInputElement
    expect(slider.type).toBe('range')
    expect(slider.value).toBe('4')
    expect(slider.min).toBe('0')
    expect(slider.max).toBe('10')
    fireEvent.change(slider, { target: { value: '7' } })
    expect(reconcileParams).toHaveBeenCalledWith(expect.objectContaining({ speed: 4 }), { key: 'speed', value: 7 })
    expect(JSON.parse(container.querySelector('canvas')!.getAttribute('data-params')!)).toEqual({ speed: 7, colour: '#ff0000' })
    fireEvent.click(getByRole('button', { name: /reset/ }))
    expect(slider.value).toBe('4')
  })

  it.each([LabCanvas, LabSide])('opts article figures into transparent ruled controls without changing the stage', Component => {
    const { container, getByText, getByRole } = render(<Component effect="response">{commentary}</Component>)
    const controls = getByText('knobs').parentElement!.parentElement!
    expect(controls.classList.contains('border-t')).toBe(true)
    expect(controls.classList.contains('bg-transparent')).toBe(true)
    expect(controls.classList.contains('bg-surface')).toBe(false)
    expect(controls.classList.contains('rounded-2xl')).toBe(false)
    expect(getByRole('slider', { name: 'Speed' })).toBeTruthy()
    expect(getByRole('button', { name: /reset/ })).toBeTruthy()
    expect(container.querySelectorAll('button')).toHaveLength(2)
    expect(getByRole('button', { name: 'Show guide' })).toBeTruthy()
    expect(container.querySelector('[data-study-target]')?.textContent).toContain('Speed')
    expect(container.textContent).not.toContain('copy')
    expect(container.querySelector(`.${styles.stage} canvas`)).not.toBeNull()
    const css = readFileSync('components/mdx/lab-canvas.module.css', 'utf8')
    expect(css).toContain('background: var(--color-stage);')
  })

  it('keeps the standalone lab controls in their original panel by default', () => {
    const { getByText } = render(<Controls specs={effect.controls} params={effect.defaults} onChange={() => {}} onCopy={() => {}} onReset={() => {}} />)
    const controls = getByText('knobs').parentElement!.parentElement!
    expect(controls.className).toBe('rounded-2xl border border-[var(--color-border)] bg-surface p-5 font-mono')
  })

  it('keeps supplied standalone copy actions functional and omits absent actions', () => {
    const onCopy = vi.fn()
    const props = { specs: effect.controls, params: effect.defaults, onChange: () => {}, onReset: () => {} }
    const { getByRole, queryByRole, rerender } = render(<Controls {...props} onCopy={onCopy} />)
    fireEvent.click(getByRole('button', { name: /copy/ }))
    expect(onCopy).toHaveBeenCalledOnce()
    rerender(<Controls {...props} />)
    expect(queryByRole('button', { name: /copy/ })).toBeNull()
    expect(getByRole('button', { name: /reset/ })).toBeTruthy()
  })

  it('retains the standalone figure and caption before and after loading', () => {
    vi.mocked(useEffectModule).mockReturnValue(undefined)
    const { container, rerender } = render(<LabCanvas effect="response" caption="Trace caption" height={220} />)
    const before = container.querySelector('figure')?.outerHTML
    expect(before).toContain('<figcaption')
    vi.mocked(useEffectModule).mockReturnValue(effect)
    rerender(<LabCanvas effect="response" caption="Trace caption" height={220} controls={false} />)
    expect(container.querySelector('figure')?.className).toBe(styles.media)
    expect(container.querySelector('figcaption')?.textContent).toBe('Trace caption')
    expect(container.querySelector(`.${styles.stage}`)?.getAttribute('style')).toBe('height: 220px;')
    expect(container.querySelector('input')).toBeNull()
  })

  it('preserves controls=false and unknown-effect feedback', () => {
    const { container, rerender, getByText } = render(<LabSide effect="response" controls={false}>{commentary}</LabSide>)
    expect(container.querySelector('input')).toBeNull()
    expect(container.querySelector('canvas')).not.toBeNull()
    rerender(<LabSide effect="missing">Commentary</LabSide>)
    expect(getByText('Unknown effect: missing')).toBeTruthy()
  })

  it.each([LabCanvas, LabSide])('places exact caption between the stage and actions, with loading parity', Component => {
    const caption = 'Watch the response: keep R fixed, then change C.'
    vi.mocked(useEffectModule).mockReturnValue(undefined)
    const { container, rerender, getByRole } = render(<Component effect="response" caption={caption}>{commentary}</Component>)
    const assertFigure = () => {
      const figure = getByRole('figure', { name: 'Response' })
      expect(figure.closest('[data-interactive-study]')?.querySelector(`.${studyStyles.title}`)?.textContent).toBe('Response')
      const stage = figure.querySelector(`.${styles.stage}`)!
      expect(stage.nextElementSibling?.tagName).toBe('FIGCAPTION')
      expect(stage.nextElementSibling?.textContent).toBe(caption)
      expect(figure.lastElementChild).toBe(stage.nextElementSibling)
      expect(figure.querySelector('input')).toBeNull()
      return figure
    }
    assertFigure()
    expect(container.querySelector(`.${styles.actions}`)).toBeNull()
    vi.mocked(useEffectModule).mockReturnValue(effect)
    rerender(<Component effect="response" caption={caption}>{commentary}</Component>)
    const figure = assertFigure()
    const actions = container.querySelector(`.${styles.actions}`)!
    expect(figure.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(actions.querySelector('input[type="range"]')).not.toBeNull()
    expect(container.textContent).toContain('Try changing Speed.')
  })

  it('groups all editorial controls in authored order without hiding labels, ranges or values', () => {
    const specs: EffectModule['controls'] = [
      { type: 'range', key: 'R', label: 'Resistance R (Ω)', min: .1, max: 5, step: .1 },
      { type: 'range', key: 'L', label: 'Inductance L (H)', min: .01, max: 1, step: .01 },
      { type: 'range', key: 'C', label: 'Capacitance C (F)', min: .0001, max: .01, step: .0001 },
      { type: 'range', key: 'amplitude', label: 'Step amplitude (V)', min: .5, max: 5, step: .1 },
    ]
    const params = { R: 1, L: .5, C: .001, amplitude: 2 }
    const onChange = vi.fn()
    const { container, getAllByRole } = render(<Controls variant="editorial" specs={specs} params={params} onChange={onChange} onReset={() => {}} />)
    expect(container.querySelector(`.${controlStyles.fields}`)?.children).toHaveLength(4)
    const inputs = getAllByRole('slider') as HTMLInputElement[]
    specs.forEach((spec, index) => {
      expect(inputs[index].labels?.[0].textContent).toBe(spec.label)
      expect(inputs[index].value).toBe(String(params[spec.key as keyof typeof params]))
      expect(inputs[index].getAttribute('aria-valuetext')).toBe(String(params[spec.key as keyof typeof params]))
    })
    fireEvent.change(inputs[2], { target: { value: '.002' } })
    expect(onChange).toHaveBeenCalledWith('C', .002)
    const css = readFileSync('components/lab/controls.module.css', 'utf8')
    expect(css).toContain('container: editorial-controls / inline-size')
    expect(css).toContain('@container editorial-controls (min-width: 34rem)')
    expect(css).toContain('.fields > :first-child')
    expect(css).toContain('grid-column: 1 / -1')
    expect(css).not.toMatch(/display:\s*none|visibility:\s*hidden|\border:/)
  })

  it('defines the named container and limits splitting/reversal to its width query', () => {
    // CSS contract only; browser geometry is verified separately, not by jsdom.
    const css = readFileSync('components/mdx/lab-canvas.module.css', 'utf8')
    expect(css).toContain('container: lab-side / inline-size')
    const [base, wide] = css.split('@container lab-side (min-width: 56rem)')
    expect(base).toContain('grid-template-columns: minmax(0, 1fr);')
    expect(base).not.toMatch(/\border:\s*[12]/)
    expect(wide).toContain('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);')
    expect(wide).toContain('.reversed > .figure')
    expect(wide).toContain('.reversed > .commentary')
    expect(css).not.toContain('@media')
  })
})
