import { test, expect, type Locator } from '@playwright/test'
import sharp from 'sharp'
import { SPATIAL_CATALOG } from '../lib/lab/spatial/catalog'

const pixels = async (canvas: Locator) => canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL())

test.describe('spatial science collection', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })
  for (const entry of SPATIAL_CATALOG) {
    test(`${entry.slug}: published essay, model, controls and assets`, async ({ page, request }) => {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`/blog/${entry.blogSlug}/`)
      await expect(page.locator('h1')).toBeVisible()
      const toc = page.getByRole('navigation', { name: 'Table of contents', exact: true })
      await expect(toc).toBeVisible()
      for (const links of [toc.locator('a'), page.locator('article details nav a')]) {
        const anchors = await links.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))
        expect(anchors.length).toBeGreaterThan(0)
        expect(new Set(anchors).size).toBe(anchors.length)
      }
      await expect(page.locator('.katex-error')).toHaveCount(0)
      expect(await page.locator('[data-equation]').count()).toBeGreaterThanOrEqual(3)
      const workbench = page.locator(`[data-workbench="${entry.slug}"]`)
      await page.locator(`[data-spatial-lab="${entry.slug}"]`).scrollIntoViewIfNeeded()
      await expect(workbench).toBeVisible()
      await expect(workbench).toHaveAttribute('data-playing', 'false')
      const canvas = workbench.locator('canvas')
      await expect(canvas).toBeVisible()
      await expect.poll(async () => {
        const data = await pixels(canvas)
        const { data: rgb, info } = await sharp(Buffer.from(data.split(',')[1], 'base64')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
        let bright = 0
        for (let i = 0; i < rgb.length; i += 4) if (rgb[i + 3] > 50 && Math.max(rgb[i], rgb[i + 1], rgb[i + 2]) > 100) bright++
        return bright / (info.width * info.height)
      }).toBeGreaterThan(0.0001)
      // Compare after elapsed time: changing packet speed cannot move its initial condition.
      const timeline = workbench.getByRole('slider', { name: /Animation timeline/ })
      await timeline.focus(); await timeline.press('End')
      await expect(workbench).toHaveAttribute('data-phase', '6.2832')
      const before = await pixels(canvas)
      const defaults = await workbench.getAttribute('data-params')
      const readouts = await workbench.locator('[data-readouts]').innerText()
      // Timeline is first. The first physical parameter must update geometry AND feedback.
      const parameter = workbench.getByRole('slider').nth(1)
      await parameter.focus()
      await parameter.press('End')
      await expect(workbench).not.toHaveAttribute('data-params', defaults!)
      await expect(workbench.locator('[data-readouts]')).not.toHaveText(readouts)
      await expect.poll(async () => (await pixels(canvas)) !== before).toBe(true)
      await workbench.getByRole('button', { name: 'Reset experiment' }).click()
      await expect(workbench).toHaveAttribute('data-params', defaults!)
      await timeline.focus(); await timeline.press('End')
      await expect(workbench).toHaveAttribute('data-phase', '6.2832')
      await workbench.getByRole('button', { name: 'Front view', exact: true }).click()
      await expect(workbench.getByRole('button', { name: 'Front view', exact: true })).toHaveAttribute('aria-pressed', 'true')
      await workbench.getByRole('button', { name: 'Play animation' }).click()
      await expect(workbench).toHaveAttribute('data-playing', 'true')
      await expect.poll(() => workbench.getAttribute('data-phase')).not.toBe('6.2832')
      await workbench.getByRole('button', { name: 'Pause animation' }).click()
      const paused = await workbench.getAttribute('data-phase')
      await page.waitForTimeout(150)
      await expect(workbench).toHaveAttribute('data-phase', paused!)
      const md = await request.get(`/blog/${entry.blogSlug}/index.md`)
      expect(md.ok()).toBe(true)
      expect(await md.text()).toContain('Interactive spatial science workbench')
      for (const path of [`/blog/${entry.blogSlug}/hero.webp`, `/blog/${entry.blogSlug}/opengraph-image.png`]) expect((await request.get(path)).ok()).toBe(true)
      await page.goto(`/lab/${entry.slug}/`)
      await expect(page.getByRole('heading', { level: 1, name: entry.title, exact: true })).toBeVisible()
      await expect(page.locator(`[data-workbench="${entry.slug}"]`)).toBeVisible()
      await page.locator(`[data-workbench="${entry.slug}"] canvas`).waitFor()
      await page.locator(`[data-workbench="${entry.slug}"]`).screenshot({ path: `test-results/spatial-${entry.slug}.png` })
      expect(errors).toEqual([])
    })
  }

  test('all spatial labs appear in their category with loaded posters', async ({ page }) => {
    await page.goto('/lab/')
    for (const entry of SPATIAL_CATALOG) {
      const card = page.locator(`#cat-${entry.category} a[href="/lab/${entry.slug}/"]`)
      await expect(card).toHaveCount(1)
      await card.scrollIntoViewIfNeeded()
      await expect.poll(() => card.locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(100)
    }
  })
})

test('mobile, light theme, reduced motion and WebGL fallback retain the experiment', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce', colorScheme: 'light' })
  const page = await context.newPage()
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'light')
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
      return original.apply(this, [type, ...args] as Parameters<typeof original>)
    } as typeof original
  })
  for (const entry of SPATIAL_CATALOG) {
    await page.goto(`/lab/${entry.slug}/`)
    const workbench = page.locator(`[data-workbench="${entry.slug}"]`)
    await expect(workbench).toBeVisible()
    await expect(workbench.locator('[data-renderer="svg"]')).toBeVisible()
    await expect(workbench).toHaveAttribute('data-playing', 'false')
    await workbench.getByRole('slider', { name: /Animation timeline/ }).focus()
    await page.keyboard.press('End')
    await expect(workbench).toHaveAttribute('data-phase', '6.2832')
    const before = await workbench.locator('svg[data-renderer]').innerHTML()
    await workbench.getByRole('slider').nth(1).focus()
    await page.keyboard.press('End')
    await expect.poll(async () => (await workbench.locator('svg[data-renderer]').innerHTML()) !== before).toBe(true)
    await workbench.getByRole('button', { name: 'Top view', exact: true }).click()
    await expect(workbench.getByRole('button', { name: 'Top view', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  }
  await context.close()
})

test('background work pauses offscreen and context loss keeps controls usable', async ({ page }) => {
  await page.goto('/lab/singular-values/')
  const workbench = page.locator('[data-workbench="singular-values"]')
  await expect(workbench).toHaveAttribute('data-running', 'true')
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
  await expect(workbench).toHaveAttribute('data-running', 'false')
  const phase = await workbench.getAttribute('data-phase')
  await page.waitForTimeout(150)
  await expect(workbench).toHaveAttribute('data-phase', phase!)
  await workbench.locator('canvas').scrollIntoViewIfNeeded()
  await expect(workbench).toHaveAttribute('data-running', 'true')
  // The controls can remain onscreen after the animated stage has left it.
  await workbench.locator('[data-readouts]').evaluate(node => node.scrollIntoView({ block: 'start' }))
  await expect(workbench.locator('[data-readouts]')).toBeVisible()
  await expect(workbench).toHaveAttribute('data-running', 'false')
  await workbench.locator('canvas').scrollIntoViewIfNeeded()
  await expect(workbench).toHaveAttribute('data-running', 'true')
  await workbench.locator('canvas').evaluate(node => {
    const gl = (node as HTMLCanvasElement).getContext('webgl2')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  })
  await expect(workbench.locator('[data-renderer="svg"]')).toBeVisible()
  await expect(workbench).toHaveAttribute('data-playing', 'false')
  await expect(workbench.locator('canvas')).toHaveCount(0)
  await expect(workbench.getByText('Drag to orbit · pinch to zoom')).toHaveCount(0)
  await workbench.getByRole('button', { name: 'Flatten to a plane', exact: true }).click()
  await expect(workbench.locator('[data-readouts]')).toContainText('∞ (singular)')
})

test('mobile WebGL scenes support dark mode, orbit and camera reset', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce', colorScheme: 'dark' })
  const page = await context.newPage()
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'))
  for (const entry of SPATIAL_CATALOG) {
    await page.goto(`/lab/${entry.slug}/`)
    const workbench = page.locator(`[data-workbench="${entry.slug}"]`)
    const canvas = workbench.locator('canvas')
    await expect(canvas).toBeVisible()
    await canvas.scrollIntoViewIfNeeded()
    const box = (await canvas.boundingBox())!
    expect(box.width).toBeLessThanOrEqual(375)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    const before = await pixels(canvas)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2, { steps: 8 })
    await page.mouse.up()
    await expect.poll(async () => (await pixels(canvas)) !== before).toBe(true)
    await workbench.getByRole('button', { name: 'Reset experiment' }).click()
    await expect(workbench).toHaveAttribute('data-phase', '0.0000')
    // Keep the article header outside the capture: fixed navigation must not obscure the stage.
    await canvas.evaluate(node => node.scrollIntoView({ block: 'center' }))
    await canvas.screenshot({ path: `test-results/spatial-mobile-${entry.slug}.png` })
  }
  await context.close()
})
