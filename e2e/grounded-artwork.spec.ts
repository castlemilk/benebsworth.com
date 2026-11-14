import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { GROUNDED_ARTWORK } from '../lib/grounded-artwork/registry'
import { gotoSettled, waitForSettled } from './settled'

async function screenshotEvidence(page: Page, testInfo: TestInfo, name: string) {
  // Cross-document transitions keep the old page in a viewport-sized overlay.
  // A full-page capture during that animation distorts both pages into the
  // viewport, even though the new DOM and image are already ready.
  await page.waitForFunction(() => !document.documentElement.matches(':active-view-transition'))
  await page.evaluate(() => document.fonts.ready)
  const file = testInfo.outputPath(name)
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' })
  await testInfo.attach(name, { path: file, contentType: 'image/png' })
}
async function waitForPreview(page: Page, path: string) {
  await page.waitForFunction(expected => {
    const image = document.querySelector<HTMLImageElement>('[data-grounded-preview]')
    return image?.complete && image.naturalWidth === 960 && new URL(image.currentSrc).pathname === expected
  }, path)
}
async function collectionEvidence(page: Page, testInfo: TestInfo, name: string) {
  // Exercise the real lazy thumbnails, then capture a complete review sheet.
  for (const image of await page.locator('[data-grounded-card] img').all()) {
    await image.scrollIntoViewIfNeeded()
    await expect(image).toHaveJSProperty('naturalWidth', 480)
  }
  await page.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded()
  await screenshotEvidence(page, testInfo, name)
}

for (const width of [390, 1180]) test.describe(`Grounded forms ${width}px`, () => {
  test.use({ viewport: { width, height: 900 } })
  test('paginates all five bounded pages without loading SVG masters', async ({ page }, testInfo) => {
    const masters: string[] = []
    page.on('request', request => { if (request.url().includes('/artwork/grounded/') && request.url().endsWith('.svg')) masters.push(request.url()) })
    await gotoSettled(page, '/vectors/grounded/')
    await expect(page.locator('[data-grounded-card]')).toHaveCount(24)
    await collectionEvidence(page, testInfo, `gallery-view-grounded-${width}.png`)
    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(page.locator('[data-grounded-card]')).toHaveCount(24)
    await collectionEvidence(page, testInfo, `gallery-view-grounded-page2-${width}.png`)
    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(page.locator('[data-grounded-card]')).toHaveCount(24)
    await collectionEvidence(page, testInfo, `gallery-view-grounded-page3-${width}.png`)
    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(page.locator('[data-grounded-card]')).toHaveCount(24)
    await collectionEvidence(page, testInfo, `gallery-view-grounded-page4-${width}.png`)
    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(page.locator('[data-grounded-card]')).toHaveCount(9)
    await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled()
    await collectionEvidence(page, testInfo, `gallery-view-grounded-page5-${width}.png`)
    await page.getByRole('button', { name: 'Previous page' }).click()
    await expect(page.locator('[data-grounded-card]')).toHaveCount(24)
    expect(masters).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
  test('filters, restores history and finds artwork through global search', async ({ page }, testInfo) => {
    const masters: string[] = []
    page.on('request', request => { if (request.url().includes('/artwork/grounded/') && request.url().endsWith('.svg')) masters.push(request.url()) })
    await gotoSettled(page, '/vectors/grounded/')
    await page.getByRole('button', { name: 'Next page' }).click()
    await page.goBack()
    await expect(page).toHaveURL(/\/vectors\/grounded\/$/)
    await expect(page.locator('[data-grounded-card]').first()).toHaveAttribute('data-grounded-card', GROUNDED_ARTWORK[0].slug)
    await expect(page.locator('[data-grounded-card]')).toHaveCount(24)
    await page.goForward()
    await expect(page).toHaveURL(/\?page=2$/)
    await expect(page.locator('[data-grounded-card]').first()).toHaveAttribute('data-grounded-card', GROUNDED_ARTWORK[24].slug)
    await expect(page.locator('[data-grounded-card]')).toHaveCount(24)
    await page.getByRole('searchbox', { name: 'Find grounded artwork' }).fill('no matching artwork anywhere')
    await expect(page.getByRole('heading', { name: 'No matching artwork' })).toBeVisible()
    await page.getByRole('button', { name: 'Show all artwork' }).click()
    await expect(page.getByRole('searchbox', { name: 'Find grounded artwork' })).toBeFocused()
    await expect(page.locator('[data-grounded-card]')).toHaveCount(24)
    await page.getByLabel('Subject', { exact: true }).selectOption('biology')
    await page.getByLabel('Tag', { exact: true }).selectOption('gills')
    await expect(page.locator('[data-grounded-card]')).toHaveCount(2)
    await collectionEvidence(page, testInfo, `gallery-view-grounded-filtered-${width}.png`)
    await page.getByRole('button', { name: 'Clear filters', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('searchbox', { name: 'Find grounded artwork' })).toBeFocused()
    expect(masters).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Search the site' }).click()
    const dialog = page.getByRole('dialog', { name: 'Search', exact: true })
    await dialog.getByRole('textbox', { name: 'Search posts and assets' }).fill('Jurin law')
    await dialog.getByRole('link', { name: /Capillary rise/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Capillary rise' })).toBeVisible()
    await expect(dialog).toHaveCount(0)
  })
  test('finds Set05 aliases and renders each new group without loading masters', async ({ page }, testInfo) => {
    const masters: string[] = []
    page.on('request', request => { if (request.url().includes('/artwork/grounded/') && request.url().endsWith('.svg')) masters.push(request.url()) })
    for (const [alias, slug] of [['leaf pore','stomatal-gate'], ['asconoid','sponge-canal'], ['Young interference','double-slit-interference'], ['piston','slider-crank'], ['polyhedral dual','polyhedral-dual']]) {
      const artwork = GROUNDED_ARTWORK.find(a => a.slug === slug)!
      await gotoSettled(page, '/vectors/grounded/')
      await page.getByRole('searchbox', { name: 'Find grounded artwork' }).fill(alias)
      await page.locator(`[data-grounded-card="${slug}"]`).getByRole('link').click()
      await expect(page.getByRole('heading', { level: 1, name: artwork.title })).toBeVisible()
      await expect(page.locator('[data-grounded-preview]')).toHaveJSProperty('naturalWidth', 960)
      await expect(page.locator('[data-grounded-limitations]')).toHaveText(artwork.limitations)
      const notes = await page.request.get(await page.locator('[data-grounded-scientific-notes]').getAttribute('href') || '')
      expect(notes.ok()).toBe(true)
      expect(createHash('sha256').update(await notes.body()).digest('hex')).toBe('5034a810f35404eb90896c95352b1395ce826e69bfa3b743a0aba8998386e98a')
      await screenshotEvidence(page, testInfo, `gallery-view-grounded-set05-${slug}-${width}.png`)
    }
    expect(masters).toEqual([])
    await page.getByRole('button', { name: 'Search the site' }).click()
    const dialog = page.getByRole('dialog', { name: 'Search', exact: true })
    await dialog.getByRole('textbox', { name: 'Search posts and assets' }).fill('Young interference')
    await dialog.getByRole('link', { name: /Double.slit interference/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Double-slit interference' })).toBeVisible()
    const artwork = GROUNDED_ARTWORK.find(a => a.slug === 'double-slit-interference')!
    for (const [label, palette] of [['Light', 'light'], ['Dark', 'dark'], ['Monochrome', 'mono']] as const) {
      await page.getByRole('radio', { name: label, exact: true }).check()
      await expect(page.locator('[data-grounded-preview]')).toHaveAttribute('src', artwork.variants[palette].preview)
      const downloadEvent = page.waitForEvent('download')
      await page.locator('[data-grounded-download]').click()
      const download = await downloadEvent
      expect(createHash('sha256').update(await readFile((await download.path())!)).digest('hex')).toBe(artwork.variants[palette].sha256)
    }
  })
  test('preserves Set06 science and rights notes across five discovery families', async ({ page }, testInfo) => {
    const masters: string[] = []
    page.on('request', request => { if (request.url().includes('/artwork/grounded/') && request.url().endsWith('.svg')) masters.push(request.url()) })
    for (const [alias, slug] of [['mitotic spindle','mitotic-spindle'], ['horseshoe carapace','horseshoe-carapace'], ['normal fault','normal-fault'], ['Venturi','venturi-throat'], ['circle inversion','circle-inversion']]) {
      const artwork = GROUNDED_ARTWORK.find(a => a.slug === slug)!
      await gotoSettled(page, '/vectors/grounded/')
      await page.getByRole('searchbox', { name: 'Find grounded artwork' }).fill(alias)
      await page.locator(`[data-grounded-card="${slug}"]`).getByRole('link').click()
      await waitForSettled(page)
      await expect(page.getByRole('heading', { level: 1, name: artwork.title })).toBeVisible()
      await expect(page.locator('[data-grounded-preview]')).toHaveJSProperty('naturalWidth', 960)
      await expect(page.locator('[data-grounded-limitations]')).toHaveText(artwork.limitations)
      await expect(page.locator('[data-grounded-provenance]')).toHaveText(artwork.provenance)
      const notes = await page.request.get(await page.locator('[data-grounded-scientific-notes]').getAttribute('href') || '')
      expect(notes.ok()).toBe(true)
      expect(createHash('sha256').update(await notes.body()).digest('hex')).toBe('6d16ad6fe8cd49a4ec007bba55c7abee9560f598c6ee7e486f98d88065650df3')
      if (slug === 'horseshoe-carapace') {
        await expect(page.locator('[data-grounded-provenance]')).toContainText('current media license not fully verified')
        await expect(page.getByRole('link', { name: /Smithsonian NMNH/ })).toHaveAttribute('href', 'https://qrius.si.edu/browse/object/10795203')
      }
      await screenshotEvidence(page, testInfo, `gallery-view-grounded-set06-${slug}-${width}.png`)
    }
    expect(masters).toEqual([])
  })
  test('finds Set06 globally and preserves themes, download and print', async ({ page }, testInfo) => {
    await gotoSettled(page, '/vectors/grounded/')
    await page.getByRole('button', { name: 'Search the site' }).click()
    const dialog = page.getByRole('dialog', { name: 'Search', exact: true })
    await dialog.getByRole('textbox', { name: 'Search posts and assets' }).fill('Pascal principle')
    await dialog.getByRole('link', { name: /Hydraulic area ratio/ }).click()
    await waitForSettled(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Hydraulic area ratio' })).toBeVisible()
    const artwork = GROUNDED_ARTWORK.find(a => a.slug === 'hydraulic-area-ratio')!
    for (const [label, palette] of [['Light', 'light'], ['Dark', 'dark'], ['Monochrome', 'mono']] as const) {
      await page.getByRole('radio', { name: label, exact: true }).check()
      await expect(page.locator('[data-grounded-preview]')).toHaveAttribute('src', artwork.variants[palette].preview)
      await waitForPreview(page, artwork.variants[palette].preview)
      const downloadEvent = page.waitForEvent('download')
      await page.locator('[data-grounded-download]').click()
      const download = await downloadEvent
      expect(createHash('sha256').update(await readFile((await download.path())!)).digest('hex')).toBe(artwork.variants[palette].sha256)
      await screenshotEvidence(page, testInfo, `gallery-view-grounded-set06-hydraulic-${palette}-${width}.png`)
    }
    await page.getByRole('radio', { name: 'Dark', exact: true }).check()
    await waitForPreview(page, artwork.variants.dark.preview)
    await page.emulateMedia({ forcedColors: 'active' })
    await expect(page.locator('[data-palette=dark]')).toHaveCSS('background-color', 'rgb(23, 27, 32)')
    await screenshotEvidence(page, testInfo, `forced-colors-grounded-set06-${width}.png`)
    await page.emulateMedia({ forcedColors: 'none', media: 'print' })
    await expect(page.locator('[data-grounded-provenance]')).toHaveText(artwork.provenance)
    const printed = testInfo.outputPath(`gallery-print-grounded-set06-${width}.pdf`)
    await page.pdf({ path: printed, printBackground: true })
    await testInfo.attach(`gallery-print-grounded-set06-${width}.pdf`, { path: printed, contentType: 'application/pdf' })
  })
  test('preserves Set07 science and rights notes across five discovery families', async ({ page }, testInfo) => {
    const masters: string[] = []
    page.on('request', request => { if (request.url().includes('/artwork/grounded/') && request.url().endsWith('.svg')) masters.push(request.url()) })
    for (const [alias, slug] of [['motile cilium','motile-cilium'], ['grain boundary','grain-boundary'], ['eclipse cones','eclipse-cones'], ['thin lens image','thin-lens-image'], ['archimedean bounds','archimedean-bounds']]) {
      const artwork = GROUNDED_ARTWORK.find(a => a.slug === slug)!
      await gotoSettled(page, '/vectors/grounded/')
      await page.getByRole('searchbox', { name: 'Find grounded artwork' }).fill(alias)
      await page.locator(`[data-grounded-card="${slug}"]`).getByRole('link').click()
      await waitForSettled(page)
      await expect(page.getByRole('heading', { level: 1, name: artwork.title })).toBeVisible()
      await expect(page.locator('[data-grounded-preview]')).toHaveJSProperty('naturalWidth', 960)
      await expect(page.locator('[data-grounded-limitations]')).toHaveText(artwork.limitations)
      await expect(page.locator('[data-grounded-provenance]')).toHaveText(artwork.provenance)
      const notes = await page.request.get(await page.locator('[data-grounded-scientific-notes]').getAttribute('href') || '')
      expect(notes.ok()).toBe(true)
      expect(createHash('sha256').update(await notes.body()).digest('hex')).toBe('d7416b7d71060fa9921008e41250dc92e0d078e5c2e31b591ff5eadb6acc98a9')
      if (slug === 'motile-cilium') {
        await expect(page.locator('[data-grounded-provenance]')).toContainText('direct full-text access to the original PMC references was limited')
        await expect(page.getByRole('link', { name: /PLOS Biology: primary research/ })).toHaveAttribute('href', 'https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3003442')
      }
      if (slug === 'eclipse-cones') await expect(page.locator('[data-grounded-provenance]')).toContainText('retrieval of the original OUP endpoint failed')
      if (slug === 'archimedean-bounds') await expect(page.locator('[data-grounded-provenance]')).toContainText('fine twelve-gon and circle separation is clearest at 640px')
      await screenshotEvidence(page, testInfo, `gallery-view-grounded-set07-${slug}-${width}.png`)
    }
    expect(masters).toEqual([])
  })
  test('finds Set07 globally and preserves themes, download and print', async ({ page }, testInfo) => {
    await gotoSettled(page, '/vectors/grounded/')
    await page.getByRole('button', { name: 'Search the site' }).click()
    const dialog = page.getByRole('dialog', { name: 'Search', exact: true })
    await dialog.getByRole('textbox', { name: 'Search posts and assets' }).fill('stellar-parallax')
    await dialog.getByRole('link', { name: /Stellar parallax/ }).click()
    await waitForSettled(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Stellar parallax' })).toBeVisible()
    const artwork = GROUNDED_ARTWORK.find(a => a.slug === 'stellar-parallax')!
    for (const [label, palette] of [['Light', 'light'], ['Dark', 'dark'], ['Monochrome', 'mono']] as const) {
      await page.getByRole('radio', { name: label, exact: true }).check()
      await expect(page.locator('[data-grounded-preview]')).toHaveAttribute('src', artwork.variants[palette].preview)
      await waitForPreview(page, artwork.variants[palette].preview)
      const downloadEvent = page.waitForEvent('download')
      await page.locator('[data-grounded-download]').click()
      const download = await downloadEvent
      expect(createHash('sha256').update(await readFile((await download.path())!)).digest('hex')).toBe(artwork.variants[palette].sha256)
      await screenshotEvidence(page, testInfo, `gallery-view-grounded-set07-parallax-${palette}-${width}.png`)
    }
    await page.getByRole('radio', { name: 'Dark', exact: true }).check()
    await waitForPreview(page, artwork.variants.dark.preview)
    await page.emulateMedia({ forcedColors: 'active' })
    await expect(page.locator('[data-palette=dark]')).toHaveCSS('background-color', 'rgb(23, 27, 32)')
    await screenshotEvidence(page, testInfo, `forced-colors-grounded-set07-${width}.png`)
    await page.emulateMedia({ forcedColors: 'none', media: 'print' })
    await expect(page.locator('[data-grounded-provenance]')).toHaveText(artwork.provenance)
    const printed = testInfo.outputPath(`gallery-print-grounded-set07-${width}.pdf`)
    await page.pdf({ path: printed, printBackground: true })
    await testInfo.attach(`gallery-print-grounded-set07-${width}.pdf`, { path: printed, contentType: 'application/pdf' })
  })
  test('preserves palette files, print caption and forced-colors matte', async ({ page }, testInfo) => {
    const artwork = GROUNDED_ARTWORK[0]
    const masters: string[] = []
    page.on('request', request => { if (request.url().includes('/artwork/grounded/') && request.url().endsWith('.svg')) masters.push(request.url()) })
    await gotoSettled(page, `/vectors/grounded/${artwork.slug}/`)
    for (const [label, palette] of [['Light', 'light'], ['Dark', 'dark'], ['Monochrome', 'mono']] as const) {
      await page.getByRole('radio', { name: label, exact: true }).check()
      await expect(page.locator('[data-grounded-preview]')).toHaveAttribute('src', artwork.variants[palette].preview)
      await expect(page.locator('[data-grounded-preview]')).toHaveJSProperty('naturalWidth', 960)
      await expect(page.locator('[data-grounded-download]')).toHaveAttribute('href', artwork.variants[palette].master)
      await screenshotEvidence(page, testInfo, `gallery-view-grounded-${palette}-${width}.png`)
    }
    expect(masters).toEqual([])
    for (const [label, palette] of [['Light', 'light'], ['Dark', 'dark'], ['Monochrome', 'mono']] as const) {
      await page.getByRole('radio', { name: label, exact: true }).check()
      const downloadEvent = page.waitForEvent('download')
      await page.locator('[data-grounded-download]').click()
      const download = await downloadEvent
      const saved = await download.path()
      expect(saved).not.toBeNull()
      expect(createHash('sha256').update(await readFile(saved!)).digest('hex')).toBe(artwork.variants[palette].sha256)
      expect(download.suggestedFilename()).toBe(artwork.variants[palette].master.split('/').pop())
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.getByRole('radio', { name: 'Dark', exact: true }).check()
    await page.emulateMedia({ forcedColors: 'active' })
    await expect(page.locator('[data-grounded-preview]')).toBeVisible()
    await expect(page.locator('[data-palette=dark]')).toHaveCSS('background-color', 'rgb(23, 27, 32)')
    await screenshotEvidence(page, testInfo, `forced-colors-grounded-${width}.png`)
    await page.emulateMedia({ forcedColors: 'none', media: 'print' })
    await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeHidden()
    await expect(page.locator('figcaption')).toHaveText(artwork.caption)
    const printed = testInfo.outputPath(`gallery-print-grounded-${width}.pdf`)
    await page.pdf({ path: printed, printBackground: true })
    await testInfo.attach(`gallery-print-grounded-${width}.pdf`, { path: printed, contentType: 'application/pdf' })
  })
})
