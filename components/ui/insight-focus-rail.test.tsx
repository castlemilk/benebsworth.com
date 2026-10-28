// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { InsightFocusRail } from './insight-focus-rail'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('redraws the same deterministic gesture to fit wrapped content and cleans up observers', () => {
  let height = 240
  let resize: () => void = () => {}
  const disconnect = vi.fn()
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resize = callback }
    observe = vi.fn()
    disconnect = disconnect
  })
  vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    x: 0, y: 0, width: 32, height, top: 0, left: 0, right: 32, bottom: height, toJSON: () => ({}),
  }))
  const { container, unmount } = render(<InsightFocusRail />)
  const svg = container.querySelector('svg')!
  const first = svg.querySelector('path')!.getAttribute('d')
  expect(svg.getAttribute('viewBox')).toBe('0 0 32 240')
  height = 640
  act(() => resize())
  expect(svg.getAttribute('viewBox')).toBe('0 0 32 640')
  expect(svg.querySelector('path')!.getAttribute('d')).not.toBe(first)
  height = 240
  act(() => resize())
  expect(svg.querySelector('path')!.getAttribute('d')).toBe(first)
  height = 0 // Hidden non-reading variant must not collapse its fallback geometry.
  act(() => resize())
  expect(svg.getAttribute('viewBox')).toBe('0 0 32 240')
  unmount()
  expect(disconnect).toHaveBeenCalledOnce()
})
