import { test, expect } from '@playwright/test'

test('landing shows nav words and routes', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByLabel('Primary')).toBeVisible()
  // Click a concrete glyph <text> inside the blog link, not the L-shaped group
  // centroid (which can land on a gap cell and intercept the pointer). The
  // layout is seed-randomized, so force the click on a specific glyph.
  await page.locator('a[aria-label="blog"] text').first().click({ force: true })
  await expect(page).toHaveURL(/\/blog\/?$/)
})

test('reduced motion still renders words', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto('/')
  await expect(page.getByLabel('Primary')).toBeVisible()
})
