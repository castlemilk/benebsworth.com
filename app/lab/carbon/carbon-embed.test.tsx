// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { act, render } from '@testing-library/react'

import { CarbonEmbed, isValidCarbonHeight, normalizeCarbonOrigin } from './carbon-embed'

describe('Carbon embed contract', () => {
  it('normalizes configured URLs to their exact origin', () => {
    expect(normalizeCarbonOrigin('https://carbon.example/path?embed=1')).toBe('https://carbon.example')
  })

  it('accepts only finite integer heights in the inclusive range', () => {
    expect(isValidCarbonHeight(200)).toBe(true)
    expect(isValidCarbonHeight(20_000)).toBe(true)
    expect(isValidCarbonHeight(199)).toBe(false)
    expect(isValidCarbonHeight(20_001)).toBe(false)
    expect(isValidCarbonHeight(200.5)).toBe(false)
    expect(isValidCarbonHeight(Number.NaN)).toBe(false)
    expect(isValidCarbonHeight('720')).toBe(false)
  })

  it('accepts height messages only from the mounted Carbon iframe', async () => {
    const { container } = render(<CarbonEmbed />)
    const iframe = container.querySelector('iframe')!

    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', {
        origin: 'https://carbon.benebsworth.com',
        source: iframe.contentWindow,
        data: { type: 'carbon:height', height: 480 },
      }))
    })

    expect(iframe.style.height).toBe('480px')

    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', {
        origin: 'https://evil.example',
        source: iframe.contentWindow,
        data: { type: 'carbon:height', height: 960 },
      }))
    })
    expect(iframe.style.height).toBe('480px')

    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', {
        origin: 'https://carbon.benebsworth.com',
        source: window,
        data: { type: 'carbon:height', height: 960 },
      }))
    })
    expect(iframe.style.height).toBe('480px')
  })
})
