// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, render, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EffectCanvas } from './effect-canvas'
import { rlcResonance } from './effects/rlc-resonance'
import type { EffectModule } from '@/lib/lab/types'

const scroll = vi.hoisted(() => ({ active: false }))
vi.mock('@/components/mdx/use-scroll-activity', () => ({ useScrollActivity: () => scroll.active }))
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); scroll.active = false })

function setup(reduced = false) {
  let box = { width: 0, height: 0 }
  let resize = () => {}
  let intersect = (_visible: boolean) => {}
  let theme = () => {}
  const callbacks = new Map<number, FrameRequestCallback>()
  let id = 0
  const methods = {
    setTransform: vi.fn(), fillRect: vi.fn(),
    arc: vi.fn((_x: number, _y: number, radius: number) => {
      if (!Number.isFinite(radius) || radius < 0) throw new Error('Invalid arc radius')
    }),
  }
  const ctx = new Proxy<Record<string, unknown>>({ ...methods }, {
    get: (target, key: string) => key in target ? target[key] : () => {},
  }) as unknown as CanvasRenderingContext2D
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ ...box } as DOMRect))
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }))
  vi.stubGlobal('ResizeObserver', class {
    constructor(fn: () => void) { resize = fn }
    observe() {} disconnect() {}
  })
  vi.stubGlobal('IntersectionObserver', class {
    constructor(fn: (entries: { isIntersecting: boolean }[]) => void) { intersect = visible => fn([{ isIntersecting: visible }]) }
    observe() {} disconnect() {}
  })
  vi.stubGlobal('MutationObserver', class {
    constructor(fn: () => void) { theme = fn }
    observe() {} disconnect() {}
  })
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callbacks.set(++id, callback); return id })
  vi.stubGlobal('cancelAnimationFrame', (key: number) => callbacks.delete(key))
  return {
    methods,
    resize: (width: number, height: number) => act(() => { box = { width, height }; resize() }),
    visible: (value: boolean) => act(() => intersect(value)),
    theme: () => act(theme),
    frame: (time: number) => act(() => { const frame = [...callbacks.values()]; callbacks.clear(); frame.forEach(callback => callback(time)) }),
    pending: () => callbacks.size,
  }
}

function mockEffect() {
  const step = vi.fn(), destroy = vi.fn()
  const createRenderer = vi.fn<EffectModule['createRenderer']>(() => ({ step, destroy }))
  const effect: EffectModule = { controls: [], defaults: {}, createRenderer }
  return { effect, createRenderer, step, destroy }
}

describe('EffectCanvas measured renderer lifecycle', () => {
  it('defers zero/one-pixel rendering, preserves valid bitmap on collapse and resumes latest params', () => {
    const env = setup()
    const { effect, createRenderer, step, destroy } = mockEffect()
    const { container, rerender, unmount } = render(<EffectCanvas effect={effect} params={{ R: 1 }} />)
    env.visible(true)
    env.resize(1, 320)
    env.frame(16)
    expect(createRenderer).not.toHaveBeenCalled()
    expect(step).not.toHaveBeenCalled()
    expect(env.pending()).toBe(0)
    env.resize(640, 320)
    env.frame(32)
    expect(createRenderer).toHaveBeenCalledTimes(1)
    expect(createRenderer.mock.calls[0][1]).toEqual({ w: 640, h: 320, dpr: 1 })
    expect(step).toHaveBeenLastCalledWith(32, { R: 1 })
    const canvas = container.querySelector('canvas')!
    env.resize(1, 320)
    expect(canvas.width).toBe(640)
    expect(canvas.height).toBe(320)
    expect(destroy).not.toHaveBeenCalled()
    expect(env.pending()).toBe(0)
    rerender(<EffectCanvas effect={effect} params={{ R: 2 }} />)
    env.resize(640, 320)
    env.frame(64)
    expect(createRenderer).toHaveBeenCalledTimes(1)
    expect(step).toHaveBeenLastCalledWith(64, { R: 2 })
    unmount()
    expect(destroy).toHaveBeenCalledOnce()
    expect(env.pending()).toBe(0)
  })

  it('defers theme recreation while collapsed and paints a valid reduced-motion frame', () => {
    const env = setup(true)
    const { effect, createRenderer, step, destroy } = mockEffect()
    render(<EffectCanvas effect={effect} params={{ R: 1 }} />)
    env.theme()
    expect(createRenderer).not.toHaveBeenCalled()
    env.resize(640, 320)
    expect(step).toHaveBeenCalledOnce()
    expect(env.pending()).toBe(0)
    env.resize(0, 0)
    env.theme()
    expect(createRenderer).toHaveBeenCalledOnce()
    expect(destroy).not.toHaveBeenCalled()
    env.resize(640, 320)
    expect(createRenderer).toHaveBeenCalledTimes(2)
    expect(destroy).toHaveBeenCalledOnce()
    expect(step).toHaveBeenCalledTimes(2)
    expect(env.pending()).toBe(0)
  })

  it('repaints changed parameters once under reduced motion without restarting animation', () => {
    const env = setup(true)
    const { effect, createRenderer, step, destroy } = mockEffect()
    const first = { R: 1 }, next = { R: 2 }
    const { rerender } = render(<EffectCanvas effect={effect} params={first} />)
    env.resize(640, 320)
    expect(step).toHaveBeenCalledTimes(1)
    rerender(<EffectCanvas effect={effect} params={next} />)
    expect(step).toHaveBeenCalledTimes(2)
    expect(step).toHaveBeenLastCalledWith(0, next)
    rerender(<EffectCanvas effect={effect} params={next} />)
    expect(step).toHaveBeenCalledTimes(2)
    expect(createRenderer).toHaveBeenCalledOnce()
    expect(destroy).not.toHaveBeenCalled()
    expect(env.pending()).toBe(0)
  })

  it('defers reduced-motion edits during collapse and repaints the latest values on same-size restore', () => {
    const env = setup(true)
    const { effect, createRenderer, step } = mockEffect()
    const { rerender } = render(<EffectCanvas effect={effect} params={{ R: 1 }} />)
    env.resize(640, 320)
    env.resize(0, 0)
    rerender(<EffectCanvas effect={effect} params={{ R: 2 }} />)
    rerender(<EffectCanvas effect={effect} params={{ R: 3 }} />)
    expect(step).toHaveBeenCalledTimes(1)
    env.resize(640, 320)
    expect(createRenderer).toHaveBeenCalledOnce()
    expect(step).toHaveBeenCalledTimes(2)
    expect(step).toHaveBeenLastCalledWith(0, { R: 3 })
    env.resize(640, 320)
    expect(step).toHaveBeenCalledTimes(2)
    expect(env.pending()).toBe(0)
  })

  it('binds reduced-motion repaint to the current renderer and avoids duplicate initial frames', () => {
    const env = setup(true)
    const first = mockEffect(), replacement = mockEffect()
    const { rerender, unmount } = render(<EffectCanvas effect={first.effect} params={{ R: 1 }} />)
    env.resize(640, 320)
    rerender(<EffectCanvas effect={replacement.effect} params={{ R: 2 }} />)
    expect(first.step).toHaveBeenCalledTimes(1)
    expect(first.destroy).toHaveBeenCalledOnce()
    expect(replacement.step).toHaveBeenCalledTimes(1)
    expect(replacement.step).toHaveBeenLastCalledWith(0, { R: 2 })
    expect(env.pending()).toBe(0)
    unmount()
    expect(replacement.destroy).toHaveBeenCalledOnce()
    expect(env.pending()).toBe(0)
  })

  it('paints the first on-screen frame while scrolling, then retains scroll and intersection pauses', () => {
    const env = setup()
    scroll.active = true
    const { effect, step } = mockEffect()
    render(<EffectCanvas effect={effect} params={{}} />)
    env.resize(640, 320)
    env.frame(16)
    expect(step).not.toHaveBeenCalled()
    env.visible(true)
    env.frame(32)
    expect(step).toHaveBeenCalledOnce()
    env.frame(64)
    expect(step).toHaveBeenCalledOnce()
    env.visible(false)
    expect(env.pending()).toBe(0)
  })

  it.each([false, true])('runs actual RLC through invalid→valid→collapse→reset without negative arcs (reduced=%s)', reduced => {
    const env = setup(reduced)
    const { rerender } = render(<EffectCanvas effect={rlcResonance} params={rlcResonance.defaults} />)
    env.visible(true)
    env.resize(1, 320)
    env.frame(16)
    expect(env.methods.arc).not.toHaveBeenCalled()
    env.resize(640, 320)
    env.frame(32)
    expect(env.methods.arc).toHaveBeenCalled()
    env.resize(0, 0)
    rerender(<EffectCanvas effect={rlcResonance} params={{ ...rlcResonance.defaults }} />)
    env.resize(641, 320)
    env.frame(64)
    expect(env.methods.fillRect).toHaveBeenCalledWith(0, 0, 641, 320)
  })
})


it('reads the canvas wrapper palette so a study can inherit paper in either theme', () => {
  const env = setup(true)
  const effect = mockEffect()
  const { getByRole } = render(<EffectCanvas effect={effect.effect} params={{}} />)
  const wrapper = getByRole('img')
  wrapper.style.setProperty('--stage', '#f4f1e9')
  wrapper.style.setProperty('--fg', '#202c34')
  env.resize(640, 320)
  expect(effect.createRenderer).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), { bg: '#f4f1e9', fg: '#202c34' })
  wrapper.style.setProperty('--stage', '#0a0a0c')
  wrapper.style.setProperty('--fg', '#ececf0')
  env.theme()
  expect(effect.createRenderer).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), { bg: '#0a0a0c', fg: '#ececf0' })
})


describe('EffectCanvas inspection', () => {
  it('holds the rendered frame, supports keyboard movement and dismisses with Escape', () => {
    const env=setup(), {effect,step}=mockEffect()
    effect.inspect=vi.fn(()=>[{label:'Sum',value:'0.25'}])
    const ui=render(<EffectCanvas effect={effect} params={{}} ariaLabel="Test plot" />)
    env.resize(640,320); env.visible(true); env.frame(100)
    const chart=ui.getByRole('group')
    fireEvent.focus(chart)
    expect(ui.getByRole('tooltip').textContent).toContain('0.25')
    env.frame(200)
    expect(step).toHaveBeenLastCalledWith(100,{})
    fireEvent.keyDown(chart,{key:'End'})
    expect(effect.inspect).toHaveBeenLastCalledWith(1,100,{})
    fireEvent.keyDown(chart,{key:'Escape'})
    expect(ui.queryByRole('tooltip')).toBeNull()
    env.frame(300)
    expect(step).toHaveBeenLastCalledWith(300,{})
  })
  it('does not expose invented readouts on unsupported effects or mini cards', () => {
    setup();const {effect}=mockEffect()
    const ui=render(<EffectCanvas effect={effect} params={{}} ariaLabel="Unsupported" />)
    expect(ui.getByRole('img').getAttribute('tabindex')).toBeNull()
    expect(ui.getByRole('img').parentElement?.getAttribute('data-inspectable')).toBe('false')
    effect.inspect=()=>[]
    ui.rerender(<EffectCanvas effect={effect} params={{}} quality="mini" ariaLabel="Mini" />)
    expect(ui.getByRole('img').getAttribute('tabindex')).toBeNull()
    expect(ui.getByRole('img').parentElement?.getAttribute('data-inspectable')).toBe('false')
  })
})

it('docks narrow readouts outside the plot and closes without losing the controls', () => {
  const env=setup(), {effect}=mockEffect()
  effect.inspection={title:'Test instrument',caption:'Volts'}
  effect.inspect=()=>[
    {label:'Position',value:'50%',role:'position'},
    {label:'Result',value:'1.25',role:'primary',color:'#7755cc',y:.25},
    {label:'Component',value:'0.5',color:'#008877',y:.5},
  ]
  const ui=render(<EffectCanvas effect={effect} params={{}} ariaLabel="Inspectable plot" />)
  env.resize(390,240);env.visible(true);env.frame(100)
  const plot=ui.getByRole('group')
  fireEvent.focus(plot)
  const dock=ui.getByRole('region',{name:'Test instrument'})
  expect(plot.contains(dock)).toBe(false)
  expect(dock.textContent).toContain('1.25')
  expect(dock.textContent).toContain('Volts')
  expect(ui.queryByRole('tooltip')).toBeNull()
  fireEvent.scroll(window)
  expect(ui.getByRole('region',{name:'Test instrument'})).toBe(dock)
  fireEvent.click(ui.getByRole('button',{name:'Close graph readout'}))
  expect(ui.queryByRole('region')).toBeNull()
  expect(ui.getByRole('group')).toBe(plot)
})
