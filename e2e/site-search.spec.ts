import { expect, test } from '@playwright/test'

test.use({ launchOptions: process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {} })

// These checks require the current full static export, including Pagefind.
// The first journey uses the generated index without routing or mocking it.
// The second uses a controlled module only to hold a search request pending;
// its destination still loads the real exported article in the browser.
for (const viewport of [{ width: 1180, height: 900 }, { width: 390, height: 844 }]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`${viewport.width}px ${colorScheme}`, () => {
      test.use({ viewport, colorScheme })

      test('built Pagefind opens an article and search remains usable after Back', async ({ page }, testInfo) => {
        await page.goto('/blog/')
        const archiveUrl = page.url()
        const trigger = page.getByRole('button', { name: 'Search the site' })
        await trigger.click()
        const dialog = page.getByRole('dialog', { name: 'Search', exact: true })
        const input = dialog.getByRole('textbox', { name: 'Search posts' })
        await expect(input).toBeFocused()
        await input.fill('RLC')
        const result = dialog.locator('a[data-active]').first()
        await expect(result).toBeVisible()
        const href = await result.getAttribute('href')
        expect(href).toMatch(/^\/blog\//)
        const destination = new URL(href!, archiveUrl).href
        await testInfo.attach('built-search-results', { body: await page.screenshot(), contentType: 'image/png' })

        await input.press('Enter')
        await expect(page).toHaveURL(destination)
        await expect(page.locator('article')).toBeVisible()
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await page.goBack()
        await expect(page).toHaveURL(archiveUrl)
        // A browser may restore the open dialog from its back/forward cache.
        if (await dialog.isVisible()) await input.press('Escape')
        await trigger.click()
        await expect(input).toBeFocused()
        await dialog.getByRole('button', { name: 'Close search' }).click()
        await expect(dialog).toHaveCount(0)
        await expect(trigger).toBeFocused()
        expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')

        await trigger.click()
        await input.fill('M5')
        await expect(dialog.locator('a[data-active]').first()).toBeVisible()
        await input.fill('')
        await expect(dialog.locator('a[data-active]')).toHaveCount(0)
        await expect(dialog.getByRole('status')).toHaveText('Start with a subject, a title, or a question.')
        await input.press('Enter')
        await expect(page).toHaveURL(archiveUrl)
        await input.press('Escape')
        await expect(trigger).toBeFocused()
      })

      test('Enter cannot navigate to an old result during debounce or a pending request', async ({ page }, testInfo) => {
        await page.clock.install()
        let startPending!: () => void
        let finishPending!: () => void
        const pendingStarted = new Promise<void>(resolve => { startPending = resolve })
        const pendingFinished = new Promise<void>(resolve => { finishPending = resolve })
        await page.route('**/pagefind/pagefind.js', route => route.fulfill({
          contentType: 'text/javascript',
          body: `export async function options() {}
            export async function search(query) {
              const response = await fetch('/__search_test__?q=' + encodeURIComponent(query));
              const data = await response.json();
              return { results: [{ id: query, data: async () => data }] };
            }`,
        }))
        const destinationPath = '/blog/every-wire-is-an-rlc-circuit/?from=search-regression#search-target'
        await page.route('**/__search_test__?*', async route => {
          const query = new URL(route.request().url()).searchParams.get('q')
          if (query === 'new query') {
            startPending()
            await pendingFinished
          }
          await route.fulfill({ json: {
            url: query === 'old query' ? '/blog/istio-patterns/' : destinationPath,
            excerpt: 'Controlled result for the native browser navigation regression.',
            meta: { title: query === 'old query' ? 'Old result' : 'Current result' },
          } })
        })
        await page.goto('/blog/')
        const archiveUrl = page.url()
        await page.getByRole('button', { name: 'Search the site' }).click()
        const dialog = page.getByRole('dialog', { name: 'Search', exact: true })
        const input = dialog.getByRole('textbox', { name: 'Search posts' })
        await input.fill('old query')
        await expect(dialog.getByRole('link', { name: 'Old result', exact: false })).toBeVisible()
        // Freeze time so the first Enter is provably inside the 140ms debounce,
        // rather than depending on how quickly the test machine sends keys.
        await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000))
        await input.fill('new query')
        await input.press('Enter')
        await expect(page).toHaveURL(archiveUrl)
        await expect(dialog.locator('a[data-active]')).toHaveCount(0)
        try {
          await page.clock.runFor(140)
          await pendingStarted
          await expect(dialog.getByRole('status')).toHaveText('Searching…')
          await input.press('Enter')
          await expect(page).toHaveURL(archiveUrl)
          await testInfo.attach('pending-search', { body: await page.screenshot(), contentType: 'image/png' })
        } finally {
          finishPending()
          await page.clock.resume()
        }
        await expect(dialog.getByRole('link', { name: 'Current result', exact: false })).toBeVisible()
        await input.press('Enter')
        await expect(page).toHaveURL(new URL(destinationPath, archiveUrl).href)
        await expect(page.locator('article')).toBeVisible()
      })
    })
  }
}
