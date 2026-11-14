import { expect, test } from '@playwright/test'
import { ARTISTIC_OBJECTS } from '../lib/generative-svg/artistic-objects'
import { ARTISTIC_PLACES } from '../lib/generative-svg/artistic-places'
import { gotoSettled } from './settled'

const subjects = [...ARTISTIC_OBJECTS, ...ARTISTIC_PLACES]

for (const width of [1180, 390]) for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`authored objects and places ${width}px ${colorScheme}`, () => {
    test.use({ viewport: { width, height: 900 }, colorScheme })
    test('finds each fixed illustration and preserves chosen inks through discovery and reset', async ({ page }, testInfo) => {
      await gotoSettled(page, '/vectors/?study=index-cabinet')
      const selected = page.getByRole('region', { name: 'Selected study' })
      const collection = page.getByRole('region', { name: 'The collection', exact: true })
      const query = collection.getByRole('searchbox', { name: 'Find a study' })
      await page.getByRole('combobox', { name: 'Ink', exact: true }).selectOption('custom')
      await page.getByLabel('Drawing ink', { exact: true }).fill('#345678')
      await page.getByLabel('Accent ink', { exact: true }).fill('#c94c2f')
      await page.getByRole('slider', { name: 'Line weight', exact: true }).press('End')
      await page.getByRole('combobox', { name: 'Preview surface', exact: true }).selectOption(colorScheme)
      for (const study of subjects) {
        await query.fill(study.title)
        const card = collection.getByRole('button', { name: `Open ${study.title}`, exact: true })
        await expect(card).toBeVisible()
        await expect(card.locator('img')).toHaveJSProperty('naturalWidth', 320)
        await card.click()
        await expect(selected).toBeFocused()
        await expect(selected.getByRole('heading', { name: study.title, exact: true })).toBeVisible()
        await expect(selected.getByRole('slider')).toHaveCount(0)
        const exported = await selected.evaluate(el => {
          const href = el.querySelector('a[download]')!.getAttribute('href')!
          const doc = new DOMParser().parseFromString(decodeURIComponent(href.slice(href.indexOf(',') + 1)), 'image/svg+xml')
          const preview = new DOMParser().parseFromString(el.querySelector('svg')!.outerHTML, 'image/svg+xml')
          return {
            equal: doc.documentElement.isEqualNode(preview.documentElement),
            safe: !doc.querySelector('rect,image,text,script,foreignObject,parsererror'),
            fills: doc.querySelectorAll('path[fill-rule="evenodd"]').length,
            recipe: JSON.parse(doc.querySelector('metadata')!.textContent!),
          }
        })
        expect(exported.equal && exported.safe).toBe(true)
        expect(exported.fills).toBeGreaterThan(0)
        expect(exported.recipe).toMatchObject({ study: study.id, parameters: {}, appearance: { palette: 'custom', theme: colorScheme, weight: 4, inkColor: '#345678', accentColor: '#c94c2f' } })
      }
      await collection.getByRole('button', { name: 'Clear filters', exact: true }).click()
      await expect(query).toBeFocused()
      await expect(query).toHaveValue('')
      await expect(selected.getByRole('heading', { name: subjects.at(-1)!.title, exact: true })).toBeVisible()
      await expect(page.getByLabel('Drawing ink', { exact: true })).toHaveValue('#345678')
      await page.getByRole('combobox', { name: 'Preview surface', exact: true }).selectOption(colorScheme === 'dark' ? 'light' : 'dark')
      await expect(page.getByLabel('Drawing ink', { exact: true })).toHaveValue('#345678')
      await page.getByRole('button', { name: 'Reset appearance', exact: true }).click()
      await expect(selected.getByRole('heading', { name: subjects.at(-1)!.title, exact: true })).toBeVisible()
      await expect(page.getByRole('combobox', { name: 'Ink', exact: true })).toHaveValue('folio')
      await expect(page.getByRole('slider', { name: 'Line weight', exact: true })).toHaveValue('2.4')
      await testInfo.attach('objects-and-places-workbench', { body: await selected.screenshot(), contentType: 'image/png' })
      await page.getByRole('button', { name: 'Search the site' }).click()
      const search = page.getByRole('dialog', { name: 'Search', exact: true })
      await search.getByRole('textbox', { name: 'Search posts and assets' }).fill(subjects[0].aliases[0])
      await search.getByRole('link', { name: new RegExp(subjects[0].title) }).click()
      await expect(search).toHaveCount(0)
      await expect(selected.getByRole('heading', { name: subjects[0].title, exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })
  })
}
