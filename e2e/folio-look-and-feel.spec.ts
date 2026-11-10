import { test, expect } from '@playwright/test'

// Browser acceptance for the look-and-feel slices (#129 Uses/Now, #130 project
// detail, #131 vector gallery, #132 home continuity). Runs against the exported
// site, so it exercises the real routes, keyboard order and native dialog.

test('home has one main the skip link can reach, and both entry sections share a hierarchy', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('main')).toHaveCount(1)
  await expect(page.locator('main#main-content')).toHaveCount(1)
  await expect(page.getByLabel('Primary')).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.locator('.skip-link')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#main-content$/)
  await expect(page.getByRole('heading', { name: 'Latest writing' })).toHaveClass(/latest-writing__title/)
  await expect(page.getByRole('heading', { name: 'From the lab' })).toHaveClass(/latest-writing__title/)
  await expect(page.getByRole('link', { name: /All \d+ effects/ })).toHaveAttribute('href', /\/lab\/?$/)
  // Lab matrix labels take the theme ink, so they read on a light canvas too.
  const label = page.locator('section[aria-labelledby="from-the-lab-heading"] a[href^="/lab/"] h3').first()
  await expect(label).toBeVisible() // waits for LabMatrix to replace its placeholders
  const ink = await page.evaluate(() => {
    const probe = document.body.appendChild(document.createElement('span'))
    probe.style.color = 'var(--fg)'
    const color = getComputedStyle(probe).color
    probe.remove()
    return color
  })
  await expect(label).toHaveCSS('color', ink)
})

test('project detail reads title → description → emblem and returns to the index', async ({ page }) => {
  await page.goto('/projects/nutry/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nutry')
  const header = page.locator('main header')
  await expect(header.getByRole('list', { name: 'Built with' })).toBeVisible()
  await expect(header.locator('img[alt="Nutry emblem"]')).toBeVisible()
  const order = await header.evaluate((el) => {
    const copy = [...el.querySelectorAll('p')].find((p) => p.textContent?.includes('Aggregated nutritional'))
    const plate = el.querySelector('img')
    return Boolean(copy && plate && copy.compareDocumentPosition(plate) & Node.DOCUMENT_POSITION_FOLLOWING)
  })
  expect(order).toBe(true)
  await expect(page.locator('[data-slot="badge"]')).toHaveCount(0)
  await expect(page.locator('main')).not.toContainText('Writeup')
  // No page overflow on the real detail routes at desktop and phone widths (<=650px collapses the hero).
  for (const slug of ['this-site', 'nutry']) {
    await page.goto(`/projects/${slug}/`)
    await page.evaluate(() => document.fonts.ready)
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 844 })
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
        `/projects/${slug}/ at ${width}px`,
      ).toBe(true)
    }
  }
  await page.setViewportSize({ width: 1280, height: 720 })
  const more = page.getByRole('navigation', { name: 'More projects' })
  await expect(more.getByRole('link', { name: /Next project: This Site/ })).toBeVisible()
  await more.getByRole('link', { name: /All projects/ }).click()
  await expect(page).toHaveURL(/\/projects\/?$/)
})

test('Uses and Now keep their authored entries under readable headings', async ({ page }) => {
  await page.goto('/uses/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What I use')
  await expect(page.locator('main section h2')).toHaveCount(5)
  await expect(page.locator('main dl dt')).toHaveCount(20)
  await page.getByRole('navigation', { name: 'Uses sections' }).getByRole('link', { name: 'Machine' }).click()
  await expect(page).toHaveURL(/#machine$/)
  await page.goto('/now/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What I’m doing now')
  // The authored date and labels are pinned by the unit test; here, check the structure survives the export.
  await expect(page.locator('main header time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/)
  const sections = page.locator('main section')
  await expect(sections.first()).toBeVisible()
  expect(await page.locator('main section h2').count()).toBe(await sections.count())
})

test('vector gallery filters, recovers from no results and inspects in a native dialog', async ({ page }) => {
  await page.goto('/vectors/originals/')
  const count = page.locator('[data-vector-count]')
  await expect(count).toContainText('Showing 25 of 25 vectors')
  await page.getByRole('group', { name: 'Filter by category' }).getByRole('button', { name: /RF & Electronics/ }).click()
  await expect(count).toContainText('Showing 5 of 25 vectors in RF & Electronics')
  const search = page.getByRole('textbox', { name: 'Search vectors' })
  await search.fill('quasar')
  await expect(page.locator('[data-vector-empty]')).toContainText('Nothing in RF & Electronics matching “quasar”')
  await page.getByRole('button', { name: 'Clear search and filters' }).click()
  await expect(search).toBeFocused()
  await expect(count).toContainText('Showing 25 of 25 vectors')

  const stage = page.getByRole('button', { name: 'Inspect Sine Wave' })
  await stage.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Sine Wave' })
  await expect(dialog).toBeVisible()
  expect(await page.evaluate(() => document.activeElement?.closest('dialog') !== null)).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(stage).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
})
