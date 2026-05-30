import { test, expect } from '@playwright/test'

test('landing shows nav words and routes', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByLabel('Primary')).toBeVisible()
  await page.getByLabel('blog').click()
  await expect(page).toHaveURL(/\/blog\/?$/)
})

test('reduced motion still renders words', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto('/')
  await expect(page.getByLabel('Primary')).toBeVisible()
})
