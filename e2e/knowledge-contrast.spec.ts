import { test, expect } from '@playwright/test'

for (const theme of ['light', 'dark'] as const) {
  test(`knowledge chassis captions retain readable contrast in ${theme} mode`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ colorScheme: theme, baseURL })
    const page = await context.newPage()
    try {
      await page.goto('/knowledge/')
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`))
      const captions = page.locator('.kg-console [data-kit="label"]').filter({ hasText: /^(find|layout|zoom)$/i })
      await expect(captions).toHaveCount(3)
      const printedControls = captions.or(page.locator('.kg-console [data-kit="slider"] [data-kit="value"]'))
      await expect(printedControls).toHaveCount(4)
      const readings = await printedControls.evaluateAll((elements) => elements.map((element) => {
        const panel = element.closest('.kg-console')!
        return { color: getComputedStyle(element).color, background: getComputedStyle(panel).backgroundColor }
      }))
      const luminance = (color: string) => {
        const rgb = color.match(/^rgb\((\d+), (\d+), (\d+)\)$/)
        expect(rgb, `expected opaque RGB color, got ${color}`).not.toBeNull()
        const channels = rgb!.slice(1).map(Number).map((channel) => {
          const value = channel / 255
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
        })
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
      }
      for (const reading of readings) {
        const foreground = luminance(reading.color)
        const background = luminance(reading.background)
        expect((Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)).toBeGreaterThanOrEqual(4.5)
      }
      // Theme still applies outside the fixed light device.
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`))
    } finally {
      await context.close()
    }
  })
}

test('layout symbols are distinct and keep their text and keyboard behavior', async ({ page }) => {
  await page.goto('/knowledge/')
  const symbols: string[] = []
  for (const name of ['drift', 'lanes', 'orbit']) {
    const radio = page.getByRole('radio', { name, exact: true })
    await expect(radio).toBeVisible()
    const icon = radio.locator('[data-kit="segment-icon"]')
    await expect(icon).toHaveAttribute('aria-hidden', 'true')
    await expect(icon.locator('svg')).toBeVisible()
    symbols.push(await icon.locator('svg').innerHTML())
  }
  expect(new Set(symbols).size).toBe(3)
  const drift = page.getByRole('radio', { name: 'drift', exact: true })
  await drift.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: 'lanes', exact: true })).toBeChecked()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: 'orbit', exact: true })).toBeChecked()
})
