import { describe, expect, it } from 'vitest'

import { createCarbonMessageHandler, isValidCarbonHeight, normalizeCarbonOrigin } from './carbon-embed'

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
    const frameWindow = {} as Window
    let height = 720
    const onMessage = createCarbonMessageHandler(
      () => frameWindow,
      (nextHeight) => { height = nextHeight },
    )

    onMessage({
      origin: 'https://carbon.benebsworth.com',
      source: frameWindow,
      data: { type: 'carbon:height', height: 480 },
    } as MessageEvent)
    expect(height).toBe(480)

    onMessage({
      origin: 'https://evil.example',
      source: frameWindow,
      data: { type: 'carbon:height', height: 960 },
    } as MessageEvent)
    expect(height).toBe(480)

    onMessage({
      origin: 'https://carbon.benebsworth.com',
      source: {} as Window,
      data: { type: 'carbon:height', height: 960 },
    } as MessageEvent)
    expect(height).toBe(480)
  })
})
