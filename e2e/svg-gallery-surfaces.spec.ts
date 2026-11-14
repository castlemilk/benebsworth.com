import { expect, test } from '@playwright/test'
import { STUDIES } from '../lib/generative-svg/model'
import { gotoSettled } from './settled'

for (const theme of ['light', 'dark'] as const) {
  test(`vector thumbnails preserve their ${theme} artwork surface in forced colors`, async ({ page }, testInfo) => {
    await gotoSettled(page, '/vectors/')
    await page.getByRole('combobox', { name: 'Preview surface', exact: true }).selectOption(theme)
    await page.emulateMedia({ forcedColors: 'active' })
    const collection = page.getByRole('region', { name: 'The collection', exact: true })
    const card = collection.getByRole('button', { name: 'Open Sine wave', exact: true })
    await card.scrollIntoViewIfNeeded()
    await expect(card.locator('img')).toHaveJSProperty('naturalWidth', 320)
    const surface = card.locator('[data-surface]')
    await expect(surface).toHaveCSS('forced-color-adjust', 'none')
    await expect(surface).toHaveCSS('background-color', theme === 'dark' ? 'rgb(17, 23, 27)' : 'rgb(244, 241, 232)')
    // Only the art opts out; text, selection and keyboard focus use system colors.
    await expect(card).toHaveCSS('forced-color-adjust', 'auto')
    await collection.getByRole('button', { name: 'Clear filters', exact: true }).focus()
    await page.keyboard.press('Tab')
    await expect(card).toBeFocused()
    await expect(card).toHaveCSS('outline-style', 'solid')
    await expect(card).toHaveCSS('outline-width', '2px')
    await expect(card).toHaveAttribute('aria-pressed', 'true')
    await expect(card).toHaveCSS('border-bottom-width', '3px')
    const screenshot = testInfo.outputPath(`forced-colors-${theme}.png`)
    await card.screenshot({ path: screenshot })
    await testInfo.attach(`forced-colors-${theme}`, { path: screenshot, contentType: 'image/png' })
  })

  test(`all ${theme} vector thumbnails are print-ready before scrolling`, async ({ page }, testInfo) => {
    await gotoSettled(page, '/vectors/')
    await page.getByRole('combobox', { name: 'Preview surface', exact: true }).selectOption(theme)
    const collection = page.getByRole('region', { name: 'The collection', exact: true })
    const images = collection.locator('img')
    await expect(images).toHaveCount(STUDIES.length)
    // Eager data-URI decoding avoids a print race for unvisited catalogue rows.
    await expect.poll(() => images.evaluateAll(elements => elements.every(el => {
      const image = el as HTMLImageElement
      return image.complete && image.naturalWidth === 320 && image.naturalHeight === 240 && image.loading === 'eager'
    }))).toBe(true)
    await images.evaluateAll(elements => Promise.all(elements.map(el => (el as HTMLImageElement).decode())))
    expect(await collection.evaluate(el => window.scrollY < el.getBoundingClientRect().top + window.scrollY)).toBe(true)
    await page.emulateMedia({ media: 'print' })
    const surfaces = collection.locator('[data-surface]')
    await expect(surfaces.last()).toHaveCSS('print-color-adjust', 'exact')
    await expect(surfaces.last()).toHaveCSS('background-color', theme === 'dark' ? 'rgb(17, 23, 27)' : 'rgb(244, 241, 232)')
    const printed = testInfo.outputPath(`gallery-print-${theme}.pdf`)
    await page.pdf({ path: printed, format: 'A4', printBackground: false })
    await testInfo.attach(`gallery-print-${theme}`, { path: printed, contentType: 'application/pdf' })
  })
}
