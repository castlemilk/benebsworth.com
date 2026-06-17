import { test, expect } from '@playwright/test'

test('toggle switches theme and persists', async ({ page }) => {
  await page.goto('/about/')
  const html = page.locator('html')
  const before = (await html.getAttribute('class')) ?? ''
  await page.getByRole('switch', { name: 'Toggle dark mode' }).click()
  const after = (await html.getAttribute('class')) ?? ''
  expect(after).not.toBe(before) // dark class added/removed
  const hadDark = after.includes('dark')
  await page.reload()
  expect(((await html.getAttribute('class')) ?? '').includes('dark')).toBe(hadDark) // persisted (localStorage)
})

test('key pages render in light mode with no console errors', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'light' })
  const page = await ctx.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  for (const path of ['/', '/about/', '/projects/', '/blog/', '/blog/istio-patterns/', '/lab/']) {
    await page.goto(path)
    await expect(page.locator('body')).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('dark mode body background differs from light', async ({ browser }) => {
  // The body uses a `background:` gradient shorthand, so backgroundColor is
  // transparent in both themes — assert on backgroundImage (the gradient),
  // which is driven by the themed --bg/--fg tokens.
  const light = await (await browser.newContext({ colorScheme: 'light' })).newPage()
  await light.goto('/about/')
  const lbg = await light.evaluate(() => getComputedStyle(document.body).backgroundImage)
  const dark = await (await browser.newContext({ colorScheme: 'dark' })).newPage()
  await dark.goto('/about/')
  const dbg = await dark.evaluate(() => getComputedStyle(document.body).backgroundImage)
  expect(lbg).not.toBe(dbg)
})
