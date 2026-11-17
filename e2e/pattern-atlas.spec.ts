import { expect, test } from '@playwright/test'
import { PATTERN_ATLAS_BATCHES } from '../lib/generative-svg/pattern-atlas'
import { gotoSettled } from './settled'

for (const [batchIndex, batch] of PATTERN_ATLAS_BATCHES.entries()) for (const width of [1180, 390]) for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`pattern atlas batch ${batchIndex + 1}, ${width}px ${colorScheme}`, () => {
    test.use({ viewport: { width, height: 900 }, colorScheme })
    test('discovers each construction, tunes it by keyboard and exports its displayed recipe', async ({ page }, testInfo) => {
      await gotoSettled(page, `/vectors/?study=${batch[0].id}`)
      const selected = page.getByRole('region', { name: 'Selected study' })
      const collection = page.getByRole('region', { name: 'The collection', exact: true })
      await expect(selected.getByRole('heading', { name: batch[0].title, exact: true })).toBeVisible()
      await collection.getByRole('combobox', { name: 'Tag', exact: true }).selectOption('pattern')
      await page.getByRole('combobox', { name: 'Preview surface', exact: true }).selectOption(colorScheme)
      await page.getByRole('combobox', { name: 'Ink', exact: true }).selectOption('monochrome')
      await page.getByRole('slider', { name: 'Line weight', exact: true }).press('End')
      await page.getByRole('checkbox', { name: 'Construction lines', exact: true }).uncheck()
      for (const study of batch) {
        const card = collection.getByRole('button', { name: `Open ${study.title}`, exact: true })
        await card.scrollIntoViewIfNeeded()
        await expect(card.locator('img')).toHaveJSProperty('naturalWidth', 320)
        await expect(card.locator('img')).toHaveJSProperty('naturalHeight', 240)
        await card.click()
        await expect(selected).toBeFocused()
        const parameter = study.parameters[0]
        const slider = selected.getByRole('slider', { name: parameter.label, exact: true })
        await slider.press('Home')
        await slider.press('ArrowRight')
        // Native range values serialize the decimal step, not binary addition
        // noise such as 1.1 + 0.1 === 1.2000000000000002.
        const value = Number((parameter.min + parameter.step).toPrecision(12))
        await expect(slider).toHaveValue(String(value))
        await expect(page).toHaveURL(new RegExp(`study=${study.id}$`))
        const download = selected.getByRole('link', { name: 'Download SVG', exact: true })
        await expect(download).toHaveAttribute('download', `${study.id}.svg`)
        const result = await selected.evaluate(el => {
          const href = el.querySelector('a[download]')!.getAttribute('href')!
          const doc = new DOMParser().parseFromString(decodeURIComponent(href.slice(href.indexOf(',') + 1)), 'image/svg+xml')
          const preview = new DOMParser().parseFromString(el.querySelector('svg')!.outerHTML, 'image/svg+xml')
          return { equal: doc.documentElement.isEqualNode(preview.documentElement), safe: !doc.querySelector('rect,script,image,foreignObject,parsererror'), recipe: JSON.parse(doc.querySelector('metadata')!.textContent!) }
        })
        expect(result.equal).toBe(true)
        expect(result.safe).toBe(true)
        expect(result.recipe.study).toBe(study.id)
        expect(result.recipe.parameters[parameter.key]).toBe(value)
        expect(result.recipe.appearance).toMatchObject({ theme: colorScheme, palette: 'monochrome', weight: 4, guides: false })
      }
      await testInfo.attach('pattern-atlas-workbench', { body: await selected.screenshot(), contentType: 'image/png' })
      await page.getByRole('button', { name: 'Search the site' }).click()
      const dialog = page.getByRole('dialog', { name: 'Search', exact: true })
      await dialog.getByRole('textbox', { name: 'Search posts and assets' }).fill(batch[0].aliases[0])
      const result = dialog.getByRole('link', { name: new RegExp(batch[0].title) })
      await expect(result).toHaveAttribute('href', `/vectors/?study=${batch[0].id}`)
      await result.click()
      await expect(dialog).toHaveCount(0)
      await expect(selected.getByRole('heading', { name: batch[0].title, exact: true })).toBeVisible()
    })
  })
}
