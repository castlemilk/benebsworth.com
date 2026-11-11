import { test, expect } from '@playwright/test'

test.use({ launchOptions: process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {} })

test('folio connectors survive narrow and wide resize cycles and track the actual feature', async ({ page }) => {
  await page.goto('/lab/editorial-system/')
  await page.evaluate(() => document.fonts.ready)
  for (const width of [1440, 900, 761, 760, 706, 390, 320, 760, 761, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    const hero = page.locator('.folio-study-opening .annotation-layout')
    const connector = hero.locator('.annotation-connector-layer')
    await expect(connector).toBeVisible()
    await expect.poll(() => hero.evaluate(root => {
      const svg = root.querySelector<SVGSVGElement>('.annotation-connector-layer')!
      const path = svg.querySelector('path')!
      const anchor = root.querySelector('[data-annotation-anchor]')!.getBoundingClientRect()
      const nums = path.getAttribute('d')!.split(' M')[0].match(/-?\d+(?:\.\d+)?/g)!.map(Number)
      const end = new DOMPoint(nums.at(-2), nums.at(-1)).matrixTransform(svg.getScreenCTM()!)
      return Math.hypot(end.x - anchor.x - anchor.width / 2, end.y - anchor.y - anchor.height / 2)
    })).toBeLessThan(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
})
