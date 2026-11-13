import { expect, test } from '@playwright/test'
import { gotoSettled } from './settled'

for (const width of [1180, 390]) for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`engraved studies ${width}px ${colorScheme}`, () => {
    test.use({ viewport: { width, height: 900 }, colorScheme })
    test('finds original ornaments, tunes with keyboard and exports the displayed geometry', async ({ page }, testInfo) => {
      await gotoSettled(page, '/vectors/?study=guilloche-rosette')
      const selected = page.getByRole('region', { name: 'Selected study' })
      await expect(selected.getByRole('heading', { name: 'Guilloché rosette', exact: true })).toBeVisible()
      await page.getByRole('searchbox', { name: 'Find a study' }).fill('ornament')
      await expect(page.getByRole('button', { name: /^Open / })).toHaveCount(3)
      await page.getByLabel('Preview surface', { exact: true }).selectOption(colorScheme)
      await page.getByLabel('Ink', { exact: true }).selectOption('monochrome')
      for (const [title, id, parameter] of [
        ['Guilloché rosette', 'guilloche-rosette', 'Rosette lobes'],
        ['Phyllotaxis bloom', 'phyllotaxis-bloom', 'Bloom rotation (degrees)'],
        ['Harmonic medallion', 'harmonic-medallion', 'Medallion lobes'],
      ]) {
        await page.getByRole('button', { name: `Open ${title}`, exact: true }).click()
        await expect(selected).toBeFocused()
        await page.getByRole('slider', { name: parameter, exact: true }).press('ArrowRight')
        await expect(page).toHaveURL(new RegExp(`study=${id}$`))
        const link = selected.getByRole('link', { name: 'Download SVG' })
        await expect(link).toHaveAttribute('download', `${id}.svg`)
        const same = await selected.evaluate(el => {
          const href = el.querySelector('a[download]')!.getAttribute('href')!
          const source = decodeURIComponent(href.slice(href.indexOf(',') + 1))
          const doc = new DOMParser().parseFromString(source, 'image/svg+xml')
          return el.querySelector('svg')!.isEqualNode(doc.documentElement) && !doc.querySelector('rect,script,image,foreignObject,parsererror')
        })
        expect(same).toBe(true)
      }
      await testInfo.attach('engraved-workbench', { body: await selected.screenshot(), contentType: 'image/png' })
      await page.getByRole('button', { name: 'Search the site' }).click()
      const dialog = page.getByRole('dialog', { name: 'Search', exact: true })
      await dialog.getByRole('textbox', { name: 'Search posts and assets' }).fill('guilloche')
      const result = dialog.getByRole('link', { name: /Guilloché rosette/ })
      await expect(result).toHaveAttribute('href', '/vectors/?study=guilloche-rosette')
      await result.click()
      await expect(dialog).toHaveCount(0)
      await expect(selected.getByRole('heading', { name: 'Guilloché rosette', exact: true })).toBeVisible()
    })
  })
}
