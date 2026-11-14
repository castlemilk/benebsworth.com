import { expect, test } from '@playwright/test'
import { ARTISTIC_NATURE } from '../lib/generative-svg/artistic-nature'
import { ARTISTIC_PAPER_INK } from '../lib/generative-svg/artistic-paper-ink'
import { gotoSettled } from './settled'

for (const width of [1180, 390]) for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`bespoke vector factory ${width}px ${colorScheme}`, () => {
    test.use({ viewport: { width, height: 900 }, colorScheme })
    test('discovers authored art, retains tuning and exports the exact transparent paths', async ({ page }, testInfo) => {
      await gotoSettled(page, '/vectors/?study=offset-portal')
      const selected = page.getByRole('region', { name: 'Selected study' })
      const collection = page.getByRole('region', { name: 'The collection', exact: true })
      await collection.getByRole('combobox', { name: 'Subject', exact: true }).selectOption('Illustration')
      await collection.getByRole('combobox', { name: 'Tag', exact: true }).selectOption('bespoke-vector')
      await expect(collection.getByRole('button', { name: /^Open / })).toHaveCount(6)
      await page.getByRole('combobox', { name: 'Preview surface', exact: true }).selectOption(colorScheme)
      await page.getByRole('combobox', { name: 'Ink', exact: true }).selectOption('monochrome')
      await page.getByRole('slider', { name: 'Line weight', exact: true }).press('End')
      for (const study of [...ARTISTIC_NATURE, ...ARTISTIC_PAPER_INK]) {
        const card = collection.getByRole('button', { name: `Open ${study.title}`, exact: true })
        await card.scrollIntoViewIfNeeded()
        await expect(card.locator('img')).toHaveJSProperty('naturalWidth', 320)
        await card.click()
        await expect(selected).toBeFocused()
        if (study.parameters.length) await selected.getByRole('slider', { name: study.parameters[0].label, exact: true }).press('End')
        else await expect(selected.getByRole('slider')).toHaveCount(0)
        const exported = await selected.evaluate(el => {
          const link = el.querySelector('a[download]')!
          const href = link.getAttribute('href')!
          const doc = new DOMParser().parseFromString(decodeURIComponent(href.slice(href.indexOf(',') + 1)), 'image/svg+xml')
          const preview = new DOMParser().parseFromString(el.querySelector('svg')!.outerHTML, 'image/svg+xml')
          return { equal: doc.documentElement.isEqualNode(preview.documentElement), safe: !doc.querySelector('rect,image,text,script,foreignObject,parsererror'), fills: doc.querySelectorAll('path[fill-rule="evenodd"]').length, recipe: JSON.parse(doc.querySelector('metadata')!.textContent!) }
        })
        expect(exported.equal && exported.safe).toBe(true)
        expect(exported.fills).toBeGreaterThan(0)
        expect(exported.recipe.study).toBe(study.id)
        expect(exported.recipe.parameters).toEqual(study.parameters.length ? { arrangement: 3 } : {})
        expect(exported.recipe.appearance).toMatchObject({ theme: colorScheme, palette: 'monochrome', weight: 4 })
      }
      await collection.getByRole('button', { name: 'Clear filters', exact: true }).click()
      await expect(collection.getByRole('searchbox', { name: 'Find a study' })).toBeFocused()
      await expect(selected.getByRole('slider', { name: 'Ember lean' })).toHaveValue('3')
      await testInfo.attach('artistic-vector-workbench', { body: await selected.screenshot(), contentType: 'image/png' })
      await page.getByRole('button', { name: 'Search the site' }).click()
      const search = page.getByRole('dialog', { name: 'Search', exact: true })
      await search.getByRole('textbox', { name: 'Search posts and assets' }).fill('paper doorway')
      await search.getByRole('link', { name: /Offset portal/ }).click()
      await expect(search).toHaveCount(0)
      await expect(selected.getByRole('heading', { name: 'Offset portal', exact: true })).toBeVisible()
    })
  })
}
