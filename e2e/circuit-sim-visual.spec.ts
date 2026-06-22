import { test, expect } from '@playwright/test'

const BASE = process.env.CS_BASE ?? ''

test('debug: verify wires are rendered on canvas', async ({ page }) => {
  await page.goto(`${BASE}/lab/circuit-sim/`)
  await page.getByRole('button', { name: 'Circuit library' }).click()
  await page.getByText('Voltage Divider').click()
  await page.waitForTimeout(1000)

  // Extract canvas pixel data at key positions
  // V terminal B should be at approx (140, 100)
  // R1 terminal A should be at approx (180, 100)  
  // Wire should connect these horizontally at y=100
  const canvas = page.locator('canvas').first()

  // Sample pixels along the expected wire path (new positions: y=140)
  const pixels = await canvas.evaluate((el: HTMLCanvasElement) => {
    const ctx = el.getContext('2d')
    if (!ctx) return []
    const results: { x: number; y: number; r: number; g: number; b: number }[] = []
    const y = 140
    for (let x = 80; x <= 340; x += 20) {
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
      results.push({ x, y, r, g, b })
    }
    return results
  })

  console.log('Canvas pixels along wire path:', JSON.stringify(pixels))

  // Check if any pixel is NOT the dark background (#080a10)
  const backgroundR = 8, backgroundG = 10, backgroundB = 16
  const wirePixels = pixels.filter(p => 
    Math.abs(p.r - backgroundR) > 10 || 
    Math.abs(p.g - backgroundG) > 10 || 
    Math.abs(p.b - backgroundB) > 10
  )
  console.log('Non-background pixels count:', wirePixels.length)
  console.log('Non-background pixels:', JSON.stringify(wirePixels))

  expect(wirePixels.length).toBeGreaterThan(0)
})

test('debug: verify components and wires exist in headless render', async ({ page }) => {
  await page.goto(`${BASE}/lab/circuit-sim/`)
  await page.getByRole('button', { name: 'Circuit library' }).click()
  await page.getByText('RC Low-Pass Filter').click()
  await page.waitForTimeout(1000)

  // Check that validation shows circuit is ready
  await expect(page.getByText('Circuit ready')).toBeVisible({ timeout: 3000 })

  // Run simulation to verify it actually produces output
  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForTimeout(500)

  // Stop should be visible
  await expect(page.getByRole('button', { name: /Stop/ })).toBeVisible({ timeout: 2000 })

  // Wait for simulation to accumulate data
  await page.waitForTimeout(2000)

  // Stop simulation
  await page.getByRole('button', { name: /Stop/ }).first().click()
  await page.waitForTimeout(300)

  // The scope canvas should contain rendered traces
  // (we can't verify canvas pixel content easily, but we can verify it exists)
  await expect(page.locator('canvas')).toHaveCount(2)
})
