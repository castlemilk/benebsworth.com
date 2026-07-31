import { test, expect } from '@playwright/test'

const readerRoutes = [
  '/',
  '/about/',
  '/now/',
  '/uses/',
  '/projects/this-site/',
  '/blog/',
  '/blog/hello-world/',
  '/blog/how-space-itself-expands/',
  '/blog/overland-track-guide/',
  '/lab/fourier-series/',
]

for (const colorScheme of ['light', 'dark'] as const) {
  test(`reader-facing copy renders in ${colorScheme} mode`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme })
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(String(error)))

    for (const route of readerRoutes) {
      await page.goto(route, { waitUntil: 'networkidle' })
      await expect(page.locator('body')).toBeVisible()
      await expect(page.locator('body')).not.toContainText('Application error')
      await expect(page.locator('h1').first()).toBeVisible()
    }

    expect(errors).toEqual([])
    await context.close()
  })
}
