// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { getAllVectors, getVectorBatches } from '@/lib/vectors/registry'
import { VectorStudioModal } from './vector-studio-modal'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 12h20"/></svg>'
const item = getAllVectors()[0]
const batch = getVectorBatches().find((b) => b.items.some((i) => i.id === item.id))

let writes: string[] = []
let refuseNext = 0

function stubFetch(ok: boolean) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, status: ok ? 200 : 404, text: async () => SVG })))
}

beforeEach(() => {
  writes = []
  refuseNext = 0
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: vi.fn(async (text: string) => {
        if (refuseNext > 0) {
          refuseNext -= 1
          throw new DOMException('denied', 'NotAllowedError')
        }
        writes.push(text)
      }),
    },
  })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

// jsdom does not render the native dialog as a modal top layer, so query the DOM directly.
const status = () => document.querySelector('[role="status"]')!.textContent
const button = (label: RegExp) =>
  Array.from(document.querySelectorAll('button')).find((b) => label.test((b.textContent ?? '').trim())) as HTMLButtonElement
async function click(label: RegExp) {
  await act(async () => {
    fireEvent.click(button(label))
    await Promise.resolve()
    await Promise.resolve()
  })
}
async function openCodeTab() {
  stubFetch(true)
  render(<VectorStudioModal item={item} batch={batch} onClose={() => {}} />)
  await waitFor(() => expect(button(/^Copy SVG$/).disabled).toBe(false))
  fireEvent.click(button(/^SVG \/ JSX$/))
  vi.useFakeTimers()
}

describe('VectorStudioModal', () => {
  it('announces the latest copy rather than a fixed priority over SVG and JSX', async () => {
    await openCodeTab()
    await click(/^Copy SVG$/)
    expect(status()).toBe('SVG copied to clipboard.')
    await act(async () => { vi.advanceTimersByTime(1000) })
    await click(/^Copy JSX$/)
    expect(writes[writes.length - 1]).toContain('Icon(props')
    expect(status()).toBe('React component copied to clipboard.')
    // The SVG reset fires first; the line must keep describing the JSX copy, then clear.
    await act(async () => { vi.advanceTimersByTime(1600) })
    expect(status()).toBe('React component copied to clipboard.')
    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(status()).toBe('')
  })

  it('reports a refused clipboard, then a later success', async () => {
    await openCodeTab()
    refuseNext = 1
    await click(/^Copy SVG$/)
    expect(status()).toBe('Copy failed — download the file instead.')
    await click(/^Copy JSX$/)
    expect(status()).toBe('React component copied to clipboard.')
  })

  it('says the preview is unavailable and offers no SVG download when the file is missing', async () => {
    stubFetch(false)
    render(<VectorStudioModal item={item} batch={batch} onClose={() => {}} />)
    fireEvent.error(document.querySelector('dialog img')!)
    expect(document.body.textContent).toContain('Preview unavailable')
    await waitFor(() => expect(document.body.textContent).toContain('SVG source unavailable'))
    const links = Array.from(document.querySelectorAll('a')).map((a) => (a.textContent ?? '').trim())
    expect(links).not.toContain('Download SVG')
    expect(links).toContain('Download PNG')
  })
})
