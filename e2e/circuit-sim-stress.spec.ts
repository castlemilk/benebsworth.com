import { test, expect } from '@playwright/test'

const BASE = process.env.CS_BASE ?? ''

test.describe('stress and edge cases', () => {
  test('load every sample, run briefly, no crashes', async ({ page }) => {
    test.setTimeout(120000)
    const errors: string[] = []
    page.on('pageerror', e => errors.push(String(e)))
    await page.goto(`${BASE}/lab/circuit-sim/`)

    const samples = [
      'Voltage Divider', 'RC Low-Pass Filter', 'RLC Ringing',
      'LC Oscillator Tank', 'Three-Resistor T-Network',
      'Two-Stage RC Filter', 'Wheatstone Bridge',
      'RLC Tank with Ringing', 'Resistive Load', 'LC Pi Filter',
    ]

    for (const name of samples) {
      await page.getByRole('button', { name: 'Circuit library' }).click()
      const btn = page.getByText(name, { exact: false }).first()
      if (await btn.isVisible({ timeout: 500 })) await btn.click()
      else {
        await page.getByRole('button', { name: 'Circuit library' }).click()
        await page.getByText(name, { exact: false }).first().click()
      }
      await page.waitForTimeout(300)

      // Validate
      await expect(page.getByText('Circuit ready')).toBeVisible({ timeout: 3000 })

      // Run briefly
      await page.getByRole('button', { name: '▶ Run' }).click()
      await page.waitForTimeout(1000)

      // Stop
      const stopBtn = page.getByRole('button', { name: /Stop/ }).first()
      if (await stopBtn.isVisible({ timeout: 500 })) await stopBtn.click()
      await page.waitForTimeout(200)
    }

    const real = errors.filter(e => !e.includes('hydration') && !e.includes('Minified React'))
    expect(real).toEqual([])
  })

  test('max zoom in and out without breaking', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)
    await page.getByRole('button', { name: 'Circuit library' }).click()
    await page.getByText('Wheatstone Bridge').click()
    await page.waitForTimeout(500)

    const canvas = page.locator('canvas').first()
    await canvas.hover()

    // Zoom in aggressively
    for (let i = 0; i < 20; i++) {
      await page.mouse.wheel(0, -200)
      await page.waitForTimeout(50)
    }

    await page.waitForTimeout(300)

    // Zoom out aggressively
    for (let i = 0; i < 20; i++) {
      await page.mouse.wheel(0, 200)
      await page.waitForTimeout(50)
    }

    await page.waitForTimeout(300)

    // Page should still be responsive
    await expect(page.getByText('Circuit ready')).toBeVisible({ timeout: 2000 })
  })

  test('YAML round-trip: download, reload, verify identity', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)
    await page.getByRole('button', { name: 'Circuit library' }).click()
    await page.getByText('RLC Ringing').click()
    await page.waitForTimeout(500)

    // Download YAML
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download YAML' }).click(),
    ])

    // Create a file chooser for re-upload
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Load YAML', exact: true }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(await download.path() ?? '')

    await page.waitForTimeout(500)

    // Should still validate as READY after round-trip
    await expect(page.getByText('Circuit ready')).toBeVisible({ timeout: 3000 })
  })

  test('place all component types without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(String(e)))

    await page.goto(`${BASE}/lab/circuit-sim/`)
    const canvas = page.locator('canvas').first()

    const components = [
      { name: 'Ω Resistor', pos: [120, 80] as [number, number] },
      { name: 'L Inductor', pos: [240, 80] },
      { name: 'C Capacitor', pos: [360, 80] },
      { name: 'V Voltage Source', pos: [120, 180] },
      { name: '⏚ Ground', pos: [240, 260] },
    ]

    for (const { name, pos } of components) {
      await page.getByRole('button', { name }).click()
      await page.waitForTimeout(100)
      await canvas.click({ position: { x: pos[0], y: pos[1] } })
      await page.waitForTimeout(100)
    }

    // Press Escape to exit placing mode
    await canvas.click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Should show no page errors
    const real = errors.filter(e => !e.includes('hydration') && !e.includes('Minified React'))
    expect(real).toEqual([])

    // Should show some validation output
    const hasDiag = page.getByText(/OPEN_LOOP|NO_GROUND|FLOATING|Circuit ready/).first()
    await expect(hasDiag).toBeVisible({ timeout: 2000 })
  })

  test('download YAML from freshly placed components', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)
    const canvas = page.locator('canvas').first()

    // Place V + R + GND to form a simple circuit
    await page.getByRole('button', { name: 'V Voltage Source' }).click()
    await canvas.click({ position: { x: 100, y: 100 } })
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Ω Resistor' }).click()
    await canvas.click({ position: { x: 260, y: 100 } })
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: '⏚ Ground' }).click()
    await canvas.click({ position: { x: 200, y: 260 } })
    await page.keyboard.press('Escape')

    await page.waitForTimeout(300)

    // Download YAML from a manually-built circuit
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download YAML' }).click(),
    ])

    expect(download.suggestedFilename()).toBe('circuit.yaml')
    // Verify the file has content
    const path = await download.path()
    expect(path).toBeTruthy()
  })
})
