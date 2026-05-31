import { test, expect } from '@playwright/test'

test('lab index lists effects and links to a detail page', async ({ page }) => {
  await page.goto('/lab/')
  await expect(page.getByRole('heading', { name: 'Generative experiments' })).toBeVisible()
  await page.getByRole('link', { name: /Orbits preview|Orbits/ }).first().click()
  await expect(page).toHaveURL(/\/lab\/[a-z-]+\/?/)
})

test('a knob updates the URL', async ({ page }) => {
  await page.goto('/lab/orbits/')
  const slider = page.locator('input[type="range"]').first()
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/\?/)
})

test('reduced motion renders without error', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/lab/starfield/')
  await expect(page.getByRole('img', { name: /Starfield animation/ })).toBeVisible()
  expect(errors).toEqual([])
})
