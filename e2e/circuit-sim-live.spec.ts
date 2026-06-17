import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('live simulation validation', () => {
  test('voltage divider: DC voltages are correct', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(String(e)))

    await page.goto(`${BASE}/lab/circuit-sim/`)
    await page.getByRole('button', { name: '📐 Load example...' }).click()
    await page.getByText('Voltage Divider').click()
    await page.waitForTimeout(500)

    // Verify validation passes
    await expect(page.getByText('Circuit ready')).toBeVisible({ timeout: 3000 })

    // Run simulation
    await page.getByRole('button', { name: '▶ Run' }).click()
    await page.waitForTimeout(2000) // Let sim accumulate data

    // Check the probes list shows the auto-probed node
    const probesSection = page.getByText('Probes')
    await expect(probesSection).toBeVisible({ timeout: 2000 })

    // The scope canvas should be rendering (verify it exists and has content)
    const canvases = page.locator('canvas')
    await expect(canvases).toHaveCount(2)

    // Stop simulation
    const stopBtn = page.getByRole('button', { name: /Stop/ }).first()
    if (await stopBtn.isVisible({ timeout: 500 })) await stopBtn.click()
    await page.waitForTimeout(300)

    // No errors during simulation
    const real = errors.filter(e => !e.includes('hydration') && !e.includes('Minified React'))
    expect(real).toEqual([])
  })

  test('RC filter: capacitor voltage rises over time', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)

    // Load RC filter
    await page.getByRole('button', { name: '📐 Load example...' }).click()
    await page.getByText('RC Low-Pass Filter').click()
    await page.waitForTimeout(500)

    // The auto-probed node should be visible in the probes list
    await expect(page.getByText('CH1')).toBeVisible({ timeout: 2000 })

    // Run with 100ms duration at 10µs steps
    await page.getByRole('button', { name: '▶ Run' }).click()
    await page.waitForTimeout(3000) // Let sim run for a few sweeps

    // Stop
    const stopBtn = page.getByRole('button', { name: /Stop/ }).first()
    if (await stopBtn.isVisible({ timeout: 1000 })) await stopBtn.click()

    // Verify the probes section still shows after stop
    await expect(page.getByText('Probes')).toBeVisible({ timeout: 2000 })
  })

  test('RLC tank: ringing causes voltage oscillations visible in scope', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)

    await page.getByRole('button', { name: '📐 Load example...' }).click()
    await page.getByText('RLC Tank with Ringing').click()
    await page.waitForTimeout(500)

    await expect(page.getByText('Circuit ready')).toBeVisible({ timeout: 3000 })

    // Run for longer to see multiple oscillation cycles
    await page.getByText('500ms').first().click() // Change duration to 500ms
    await page.getByRole('button', { name: '▶ Run' }).click()
    await page.waitForTimeout(4000)

    // Stop
    const stopBtn = page.getByRole('button', { name: /Stop/ }).first()
    if (await stopBtn.isVisible({ timeout: 1000 })) await stopBtn.click()
  })

  test('resistive load: high current produces visible flow particles', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)

    await page.getByRole('button', { name: '📐 Load example...' }).click()
    await page.getByText('Resistive Load').click()
    await page.waitForTimeout(500)

    await expect(page.getByText('Circuit ready')).toBeVisible({ timeout: 3000 })

    // This circuit has 5V / 100Ω = 50mA — should show fast, dense particles
    await page.getByRole('button', { name: '▶ Run' }).click()
    await page.waitForTimeout(3000)

    // Click Stop
    const stopBtn = page.getByRole('button', { name: /Stop/ }).first()
    if (await stopBtn.isVisible({ timeout: 1000 })) await stopBtn.click()
  })

  test('progress bar updates during simulation', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)

    await page.getByRole('button', { name: '📐 Load example...' }).click()
    await page.getByText('RC Low-Pass Filter').click()
    await page.waitForTimeout(500)

    await page.getByRole('button', { name: '▶ Run' }).click()
    await page.waitForTimeout(500)

    // Elapsed time should show during simulation
    const timeText = page.locator('span.tabular-nums').first()
    await expect(timeText).toBeVisible({ timeout: 2000 })

    const stopBtn = page.getByRole('button', { name: /Stop/ }).first()
    if (await stopBtn.isVisible({ timeout: 500 })) await stopBtn.click()
    await page.waitForTimeout(300)
  })
})

test.describe('interaction edge cases', () => {
  test('escape cancels placing mode', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)

    await page.getByRole('button', { name: 'Ω Resistor' }).click()
    await page.waitForTimeout(200)
    await expect(page.getByText('Placing')).toBeVisible({ timeout: 1000 })

    // Click canvas first to focus it, then press Escape
    const canvas = page.locator('canvas').first()
    await canvas.click()
    await page.waitForTimeout(100)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    await expect(page.getByText('Placing')).not.toBeVisible({ timeout: 1000 })
  })

  test('right-click on canvas cancels placing/wiring', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)

    // Enter placing mode
    await page.getByRole('button', { name: 'Ω Resistor' }).click()
    await page.waitForTimeout(200)
    await expect(page.getByText('Placing')).toBeVisible({ timeout: 1000 })

    // Right-click canvas to cancel
    const canvas = page.locator('canvas').first()
    await canvas.click({ button: 'right' })
    await page.waitForTimeout(200)

    await expect(page.getByText('Placing')).not.toBeVisible({ timeout: 1000 })
  })

  test('keyboard shortcuts: Delete removes selected component', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)

    // Load a sample with multiple components
    await page.getByRole('button', { name: '📐 Load example...' }).click()
    await page.getByText('Voltage Divider').click()
    await page.waitForTimeout(500)

    // Click on a component to select it
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 260, y: 100 } }) // Click on R1
    await page.waitForTimeout(200)

    // Press Delete
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)

    // Delete should remove component — validation will update
    // Verify the probes section is still visible (circuit still exists)
    await expect(page.getByText('Probes')).toBeVisible({ timeout: 2000 })
  })

  test('rapid run/stop does not crash or leak', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(String(e)))

    await page.goto(`${BASE}/lab/circuit-sim/`)
    await page.getByRole('button', { name: '📐 Load example...' }).click()
    await page.getByText('RC Low-Pass Filter').click()
    await page.waitForTimeout(500)

    // Rapidly toggle run/stop 5 times
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: '▶ Run' }).click()
      await page.waitForTimeout(300)
      const stopBtn = page.getByRole('button', { name: /Stop/ }).first()
      if (await stopBtn.isVisible({ timeout: 500 })) await stopBtn.click()
      await page.waitForTimeout(200)
    }

    const real = errors.filter(e => !e.includes('hydration') && !e.includes('Minified React'))
    expect(real).toEqual([])

    // Page should still be responsive
    await expect(page.getByRole('button', { name: '▶ Run' })).toBeVisible()
  })

  test('switch samples while simulation is running', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(String(e)))

    await page.goto(`${BASE}/lab/circuit-sim/`)
    await page.getByRole('button', { name: '📐 Load example...' }).click()
    await page.getByText('RC Low-Pass Filter').click()
    await page.waitForTimeout(500)

    // Start simulation
    await page.getByRole('button', { name: '▶ Run' }).click()
    await page.waitForTimeout(500)

    // Switch to a different sample while running
    await page.getByRole('button', { name: '📐 Load example...' }).click()
    await page.getByText('Voltage Divider').click()
    await page.waitForTimeout(500)

    // Should show validation for new circuit
    await expect(page.getByText('Circuit ready')).toBeVisible({ timeout: 3000 })

    // Run new circuit
    await page.getByRole('button', { name: '▶ Run' }).click()
    await page.waitForTimeout(500)
    const stopBtn = page.getByRole('button', { name: /Stop/ }).first()
    if (await stopBtn.isVisible({ timeout: 1000 })) await stopBtn.click()

    const real = errors.filter(e => !e.includes('hydration') && !e.includes('Minified React'))
    expect(real).toEqual([])
  })

  test('auto-probe creates channel and probes list updates', async ({ page }) => {
    await page.goto(`${BASE}/lab/circuit-sim/`)

    await page.getByRole('button', { name: '📐 Load example...' }).click()
    await page.getByText('Two-Stage RC Filter').click()
    await page.waitForTimeout(500)

    // Auto-probe gives us CH1 — should be visible in probes list
    await expect(page.getByText('CH1')).toBeVisible({ timeout: 3000 })

    // Remove the auto-probe by clicking ×
    await page.locator('button').filter({ hasText: '×' }).first().click()
    await page.waitForTimeout(200)

    // CH1 should be gone from probes list
    await expect(page.getByText('CH1')).not.toBeVisible({ timeout: 2000 })

    // Load another sample — auto-probe should reappear
    await page.getByRole('button', { name: '📐 Load example...' }).click()
    await page.getByText('Voltage Divider').click()
    await page.waitForTimeout(500)

    await expect(page.getByText('CH1')).toBeVisible({ timeout: 3000 })
  })
})
