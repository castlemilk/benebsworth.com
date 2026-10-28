// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, render } from '@testing-library/react'
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
