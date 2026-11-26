// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import { createAgent } from '@ui-sdk/react/agent'
import { afterEach, expect, test, vi } from 'vitest'
import { KolibriExplorers } from './kolibri-explorers'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('ui-sdk exposes the diagram controls by name and applies an agent change', async () => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  Element.prototype.getAnimations = () => []
  const agent = createAgent()
  render(<KolibriExplorers />)

  const tabs = agent.snapshot().find((entry) => entry.label === 'Kolibri diagrams')
  if (!tabs) throw new Error('Kolibri diagrams tabs were not discoverable')
  expect(tabs.actions).toContain('setValue')
  await act(async () => {
    const result = await agent.act({ steps: [{ ref: tabs.ref, action: 'setValue', args: ['Expert router'] }] })
    expect(result.ok).toBe(true)
  })

  const slider = agent.snapshot().find((entry) => entry.label === 'Expert C selection bias')
  if (!slider) throw new Error('Expert C bias slider was not discoverable')
  expect(slider.actions).toContain('setValue')
  await act(async () => {
    const result = await agent.act({ steps: [{ ref: slider.ref, action: 'setValue', args: [3] }] })
    expect(result.ok).toBe(true)
  })
  expect(screen.getByText('A + C + shared')).toBeTruthy()
})
