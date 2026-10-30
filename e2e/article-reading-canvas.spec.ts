import { test, expect } from '@playwright/test'

test.use({ launchOptions: process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {} })

// Test the real article ancestry: a component-only fixture missed the old
// 44rem ancestor that made LabSide's 56rem container query unreachable.
test('authored study chapters widen without widening prose or overlapping navigation', async ({ page }) => {
  await page.goto('/blog/every-wire-is-an-rlc-circuit/')
  await page.evaluate(() => document.fonts.ready)
  for (const width of [1440, 1600, 1199, 1200, 1201, 1216, 1232, 1180, 390, 320, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    const study = page.locator('.folio-reading-main > .prose > section[data-folio-width="wide"]').first()
    await expect(study).toBeVisible()
    await expect(study.locator('canvas').first()).toBeVisible()
    await expect(study.getByRole('slider').first()).toBeEnabled()
    const geometry = await study.evaluate(root => {
      const r = root.getBoundingClientRect()
      const layout = root.firstElementChild!
      const prose = document.querySelector('.folio-reading-main > .prose > p')!
      const rail = document.querySelector('.folio-article-grid > aside')!
      return {
        width: r.width,
        childrenFit: Array.from(layout.children).every(child => {
          const box = child.getBoundingClientRect()
          return box.left >= r.left - 1 && box.right <= r.right + 1 && child.scrollWidth <= child.clientWidth + 1
        }),
        columns: getComputedStyle(layout).gridTemplateColumns.split(' ').length,
        proseWidth: prose.getBoundingClientRect().width,
        right: r.right,
        railLeft: rail.getBoundingClientRect().left,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }
    })
    expect(geometry.proseWidth).toBeLessThanOrEqual(704)
    expect(geometry.overflow).toBe(false)
    expect(geometry.childrenFit).toBe(true)
    if (width >= 1440) expect(geometry.width).toBeGreaterThanOrEqual(896)
    // Scrollbar reservation varies by platform: the actual container, not
    // nominal viewport, is the authoritative split breakpoint.
    expect(geometry.columns).toBe(geometry.width >= 896 ? 2 : 1)
    if (width >= 1024) expect(geometry.right).toBeLessThan(geometry.railLeft)
  }
})
