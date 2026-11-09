// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { getAllVectors } from '@/lib/vectors/registry'
import { VectorCard, copySvgSource } from './vector-card'

const item = getAllVectors()[0]
const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1"/></svg>'

function stubFetch(ok: boolean) {
  const fetchMock = vi.fn(async () => ({ ok, status: ok ? 200 : 404, text: async () => svg }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
function stubClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  return writeText
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('VectorCard', () => {
  it('is a keyboard-reachable stage that opens inspection and names its actions', () => {
    const onInspect = vi.fn()
    render(<VectorCard item={item} previewBg="dark" scaleSize="md" onInspect={onInspect} />)
    fireEvent.click(screen.getByRole('button', { name: `Inspect ${item.name}` }))
    expect(onInspect).toHaveBeenCalledWith(item)
    expect(screen.getByRole('heading', { level: 3 }).textContent).toContain(item.name)
    expect(screen.getByText(item.semantic_role)).not.toBeNull()
    const download = screen.getByRole('link', { name: `Download ${item.name} SVG` })
    expect(download.getAttribute('href')).toBe(item.svgPath)
    expect(download.getAttribute('download')).toBe(`${item.filename_stem}.svg`)
    // The stage is the card: no role pill, index or description competes with the mark.
    expect(screen.queryByText(`#${item.grid_index + 1}`)).toBeNull()
    expect(screen.queryByText(item.description)).toBeNull()
  })

  it('reports a successful copy of the actual SVG markup', async () => {
    stubFetch(true)
    const writeText = stubClipboard(vi.fn(async () => {}))
    render(<VectorCard item={item} previewBg="dark" scaleSize="md" onInspect={() => {}} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: `Copy ${item.name} SVG` })) })
    expect(writeText).toHaveBeenCalledWith(svg)
    expect(screen.getByRole('status').textContent).toContain('SVG copied to clipboard')
    await act(async () => { vi.advanceTimersByTime(2600) })
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('reports failure when the file is missing instead of copying a path under a success tick', async () => {
    stubFetch(false)
    const writeText = stubClipboard(vi.fn(async () => {}))
    render(<VectorCard item={item} previewBg="dark" scaleSize="md" onInspect={() => {}} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: `Copy ${item.name} SVG` })) })
    expect(writeText).not.toHaveBeenCalled()
    expect(screen.getByRole('status').textContent).toContain('Copy failed — download the SVG instead')
  })

  it('reports failure when the clipboard refuses', async () => {
    stubFetch(true)
    stubClipboard(vi.fn(async () => { throw new DOMException('denied', 'NotAllowedError') }))
    render(<VectorCard item={item} previewBg="dark" scaleSize="md" onInspect={() => {}} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: `Copy ${item.name} SVG` })) })
    expect(screen.getByRole('status').textContent).toContain('Copy failed')
    await expect(copySvgSource(item.svgPath)).resolves.toBe(false)
  })

  it('tells the truth when a mark cannot be previewed', () => {
    render(<VectorCard item={item} previewBg="light" scaleSize="sm" onInspect={() => {}} />)
    fireEvent.error(screen.getByRole('button', { name: `Inspect ${item.name}` }).querySelector('img')!)
    expect(screen.getByText('Preview unavailable')).not.toBeNull()
    expect(screen.queryByText(/generating/i)).toBeNull()
  })
})
